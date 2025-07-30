const { getAuth, getFirestore } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/AppError');
const { sendEmail } = require('../utils/email');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const signToken = (uid, email, role) => {
  return jwt.sign(
    { uid, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// -- Register
exports.register = asyncHandler(async (req, res, next) => {
  const { email, password, displayName } = req.body;
  logger.info(`Registering new user: ${email}`);

  const userRecord = await getAuth().createUser({
    email,
    password,
    displayName,
    emailVerified: false
  });

  const db = getFirestore();
  await db.collection('users').doc(userRecord.uid).set({
    email,
    displayName,
    role: 'user',
    createdAt: new Date().toISOString(),
    lastLogin: null,
    isActive: true,
    emailVerified: false,
    twoFactorEnabled: false
  });

  const verifyToken = crypto.randomBytes(32).toString('hex');
  await redis.setex(`email_verify_${verifyToken}`, 86400, userRecord.uid).catch(err =>
    logger.warn('Redis not available for email verification token:', err.message)
  );

  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;
  await sendEmail({
    email,
    subject: 'Email Verification',
    message: `Please verify your email by clicking: ${verifyUrl}`
  }).catch(err => logger.warn('Email sending failed:', err.message));

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please verify your email.'
  });
});

// -- Login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  logger.info(`Login attempt: ${email}`);

  const db = getFirestore();
  const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

  if (snapshot.empty) {
    logger.warn(`Login failed: No user found with email ${email}`);
    throw new AppError('Invalid credentials', 401);
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();

  let userRecord;
  try {
    userRecord = await getAuth().getUserByEmail(email);
  } catch {
    logger.warn(`Firebase Auth user not found: ${email}`);
    throw new AppError('Invalid credentials', 401);
  }

  if (!userData.emailVerified) {
    logger.warn(`Email not verified for ${email}`);
    throw new AppError('Please verify your email before logging in', 401);
  }

  if (userData.twoFactorEnabled) {
    const tempToken = crypto.randomBytes(32).toString('hex');
    await redis.setex(
      `2fa_temp_${tempToken}`,
      300,
      JSON.stringify({ uid: userRecord.uid, email: userRecord.email, role: userData.role })
    ).catch(err => logger.warn('Redis not available for 2FA temp token:', err.message));

    logger.info(`2FA temp token issued for ${email}`);
    return res.status(200).json({
      success: true,
      requiresTwoFactor: true,
      tempToken
    });
  }

  req.session.user = {
    uid: userRecord.uid,
    email: userRecord.email,
    role: userData.role,
    loginTime: new Date().toISOString(),
    isAuthenticated: true
  };

  const token = jwt.sign(
    {
      uid: userRecord.uid,
      email: userRecord.email,
      role: userData.role,
      sessionId: req.sessionID
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
  
  // Update last login
  await userDoc.ref.update({
    lastLogin: new Date().toISOString()
  });
  
  // Set cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.status(200).json({
    success: true,
    token,
    sessionId: req.sessionID,
    data: {
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        role: userData.role
      }
    }
  });
});

// -- Logout
exports.logout = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;

  if (token) {
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.setex(`blacklist_${token}`, ttl, '1').catch(err =>
        logger.warn('Redis not available for token blacklist:', err.message)
      );
    }
  }

  req.session.destroy((err) => {
    if (err) logger.error('Session destruction error:', err);
    else logger.info(`Session destroyed: ${req.sessionID}`);
  });

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// -- Logout All
exports.logoutAll = asyncHandler(async (req, res, next) => {
  await getAuth().revokeRefreshTokens(req.user.uid);

  req.session.destroy((err) => {
    if (err) logger.error('Session destruction error:', err);
    else logger.info(`All sessions revoked for user: ${req.user.uid}`);
  });

  res.status(200).json({
    success: true,
    message: 'Logged out from all devices'
  });
});

// -- Forgot Password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const userRecord = await getAuth().getUserByEmail(email);

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  await redis.setex(`password_reset_${hashedToken}`, 3600, userRecord.uid).catch(err =>
    logger.warn('Redis not available for password reset token:', err.message)
  );

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  await sendEmail({
    email,
    subject: 'Password Reset Request',
    message: `Reset your password by clicking: ${resetUrl}`
  }).catch(err => logger.warn('Email sending failed:', err.message));

  res.status(200).json({
    success: true,
    message: 'Password reset email sent'
  });
});

// -- Reset Password
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const uid = await redis.get(`password_reset_${hashedToken}`);

  if (!uid) throw new AppError('Invalid or expired reset token', 400);

  await getAuth().updateUser(uid, { password });

  await redis.del(`password_reset_${hashedToken}`).catch(err =>
    logger.warn('Redis not available for reset token cleanup:', err.message)
  );

  res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});

// -- Verify Email
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const uid = await redis.get(`email_verify_${token}`);

  if (!uid) throw new AppError('Invalid or expired verification token', 400);

  await getAuth().updateUser(uid, { emailVerified: true });

  const db = getFirestore();
  await db.collection('users').doc(uid).update({
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString()
  });

  await redis.del(`email_verify_${token}`).catch(err =>
    logger.warn('Redis cleanup failed for email verify token:', err.message)
  );

  logger.info(`Email verified: ${uid}`);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

// -- Resend Verification
exports.resendVerification = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const userRecord = await getAuth().getUserByEmail(email);

  if (userRecord.emailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  const verifyToken = crypto.randomBytes(32).toString('hex');
  await redis.setex(`email_verify_${verifyToken}`, 86400, userRecord.uid).catch(err =>
    logger.warn('Redis not available for email verification token:', err.message)
  );

  const verifyUrl = `${process.env.FRONTEND_URL}/api/auth/verify-email/${verifyToken}`;
  await sendEmail({
    email,
    subject: 'Email Verification',
    message: `Please verify your email by clicking: ${verifyUrl}`
  }).catch(err => logger.warn('Email sending failed:', err.message));

  logger.info(`Verification email resent to ${email}`);

  res.status(200).json({
    success: true,
    message: 'Verification email sent'
  });
});

// -- Update Password
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Firebase Admin SDK doesn't support password check.
  // In production, you'd verify using Firebase Auth client on frontend.
  await getAuth().updateUser(req.user.uid, { password: newPassword });

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});

// -- Update Email
exports.updateEmail = asyncHandler(async (req, res, next) => {
  const { newEmail } = req.body;

  // Update Firebase Auth
  await getAuth().updateUser(req.user.uid, {
    email: newEmail,
    emailVerified: false
  });

  const db = getFirestore();
  await db.collection('users').doc(req.user.uid).update({
    email: newEmail,
    emailVerified: false,
    emailUpdatedAt: new Date().toISOString()
  });

  if (req.session.user) {
    req.session.user.email = newEmail;
  }

  const verifyToken = crypto.randomBytes(32).toString('hex');
  await redis.setex(`email_verify_${verifyToken}`, 86400, req.user.uid).catch(err =>
    logger.warn('Redis not available for email verification token:', err.message)
  );

  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;
  await sendEmail({
    email: newEmail,
    subject: 'Verify Your New Email Address',
    message: `Please verify your new email by clicking: ${verifyUrl}`
  }).catch(err => logger.warn('Email sending failed:', err.message));

  res.status(200).json({
    success: true,
    message: 'Email updated. Please verify your new email address.'
  });
});

// -- Delete Account (Soft delete)
exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const db = getFirestore();

  await db.collection('users').doc(req.user.uid).update({
    isActive: false,
    deletedAt: new Date().toISOString()
  });

  await getAuth().updateUser(req.user.uid, { disabled: true });

  req.session.destroy((err) => {
    if (err) logger.error('Session destruction error:', err);
  });

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully'
  });
});

// -- Enable 2FA
exports.enable2FA = asyncHandler(async (req, res, next) => {
  const secret = speakeasy.generateSecret({
    name: `PictoTale (${req.user.email})`,
    length: 32
  });

  await redis.setex(
    `2fa_setup_${req.user.uid}`,
    600,
    secret.base32
  ).catch(err =>
    logger.warn('Redis not available for 2FA setup:', err.message)
  );

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  res.status(200).json({
    success: true,
    data: {
      secret: secret.base32,
      qrCode
    }
  });
});

// -- Verify 2FA (both setup & login)
exports.verify2FA = asyncHandler(async (req, res, next) => {
  const { token, tempToken } = req.body;
  let secret, uid, userData;

  if (tempToken) {
    const tempData = await redis.get(`2fa_temp_${tempToken}`);
    if (!tempData) throw new AppError('Invalid or expired temporary token', 400);

    const data = JSON.parse(tempData);
    uid = data.uid;
    userData = data;

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    secret = userDoc.data().twoFactorSecret;
  } else {
    uid = req.user.uid;
    secret = await redis.get(`2fa_setup_${uid}`);
    if (!secret) throw new AppError('2FA setup expired. Please try again', 400);
  }

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });

  if (!verified) throw new AppError('Invalid 2FA token', 400);

  if (tempToken) {
    req.session.user = {
      uid: userData.uid,
      email: userData.email,
      role: userData.role,
      loginTime: new Date().toISOString(),
      isAuthenticated: true
    };

    await redis.del(`2fa_temp_${tempToken}`).catch(() => {});

    const authToken = jwt.sign(
      {
        uid: userData.uid,
        email: userData.email,
        role: userData.role,
        sessionId: req.sessionID
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.cookie('token', authToken, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return res.status(200).json({
      success: true,
      token: authToken,
      sessionId: req.sessionID,
      data: {
        user: {
          uid: userData.uid,
          email: userData.email,
          role: userData.role
        }
      }
    });
  } else {
    const db = getFirestore();
    await db.collection('users').doc(uid).update({
      twoFactorEnabled: true,
      twoFactorSecret: secret
    });

    await redis.del(`2fa_setup_${uid}`).catch(() => {});

    return res.status(200).json({
      success: true,
      message: '2FA enabled successfully'
    });
  }
});

// -- Disable 2FA
exports.disable2FA = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  const db = getFirestore();
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  const { twoFactorSecret } = userDoc.data();

  const verified = speakeasy.totp.verify({
    secret: twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2
  });

  if (!verified) throw new AppError('Invalid 2FA token', 400);

  await userDoc.ref.update({
    twoFactorEnabled: false,
    twoFactorSecret: null
  });

  res.status(200).json({
    success: true,
    message: '2FA disabled successfully'
  });
});

// -- Refresh Token
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) throw new AppError('Refresh token is required', 400);

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (!req.session.user || req.session.user.uid !== decoded.uid) {
      throw new AppError('Session expired', 401);
    }

    const newToken = jwt.sign(
      {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role,
        sessionId: req.sessionID
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(200).json({
      success: true,
      token: newToken
    });
  } catch (err) {
    throw new AppError('Invalid refresh token', 401);
  }
});

// -- Get Current User
exports.getMe = asyncHandler(async (req, res, next) => {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(req.user.uid).get();

  if (!userDoc.exists) throw new AppError('User not found', 404);

  const sessionInfo = req.session.user
    ? {
        sessionId: req.sessionID,
        loginTime: req.session.user.loginTime,
        sessionActive: true
      }
    : {
        sessionActive: false
      };

  res.status(200).json({
    success: true,
    data: {
      user: {
        uid: req.user.uid,
        ...userDoc.data()
      },
      session: sessionInfo
    }
  });
});

// -- Admin: Get All Sessions for User (stub / extend with DB tracking if needed)
exports.getUserSessions = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  // If session tracking system is added, fetch from DB.
  // Currently stubbed to only show current session.
  res.status(200).json({
    success: true,
    data: {
      activeSessions: req.session.user ? 1 : 0,
      currentSession: {
        sessionId: req.sessionID,
        active: !!req.session.user
      }
    }
  });
});
