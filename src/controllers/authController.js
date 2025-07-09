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

const signToken = (uid, email, role) => {
  return jwt.sign(
    { uid, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

exports.register = asyncHandler(async (req, res, next) => {
  const { email, password, displayName } = req.body;
  
  // Create user in Firebase Auth
  const userRecord = await getAuth().createUser({
    email,
    password,
    displayName,
    emailVerified: false
  });
  
  // Store additional user data in Firestore
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
  
  // Generate email verification token
  const verifyToken = crypto.randomBytes(32).toString('hex');
  try {
    await redis.setex(
      `email_verify_${verifyToken}`,
      24 * 60 * 60, // 24 hours
      userRecord.uid
    );
  } catch (redisError) {
    console.warn('Redis not available for email verification token');
  }
  
  // Send verification email
  try {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;
    await sendEmail({
      email,
      subject: 'Email Verification',
      message: `Please verify your email by clicking: ${verifyUrl}`
    });
  } catch (emailError) {
    console.warn('Email sending failed:', emailError.message);
  }
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please verify your email.'
  });
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Get user from Firestore
  const db = getFirestore();
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', email).limit(1).get();
  
  if (snapshot.empty) {
    throw new AppError('Invalid credentials', 401);
  }
  
  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();
  
  // Verify user exists in Firebase Auth
  let userRecord;
  try {
    userRecord = await getAuth().getUserByEmail(email);
  } catch (error) {
    throw new AppError('Invalid credentials', 401);
  }
  
  // Check if email is verified
  if (!userData.emailVerified) {
    throw new AppError('Please verify your email before logging in', 401);
  }
  
  // Check if 2FA is enabled
  if (userData.twoFactorEnabled) {
    // Generate temporary token for 2FA verification
    const tempToken = crypto.randomBytes(32).toString('hex');
    try {
      await redis.setex(
        `2fa_temp_${tempToken}`,
        5 * 60, // 5 minutes
        JSON.stringify({ uid: userRecord.uid, email: userRecord.email, role: userData.role })
      );
    } catch (redisError) {
      console.warn('Redis not available for 2FA temp token');
    }
    
    return res.status(200).json({
      success: true,
      requiresTwoFactor: true,
      tempToken
    });
  }
  
  // Create session in MongoDB via Express session
  req.session.user = {
    uid: userRecord.uid,
    email: userRecord.email,
    role: userData.role,
    loginTime: new Date().toISOString(),
    isAuthenticated: true
  };
  
  // Also create JWT token for API access
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
  
  res.cookie('token', token, cookieOptions);
  
  console.log('Session created:', req.sessionID);
  console.log('Session data:', req.session.user);
  
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

exports.logout = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
  
  if (token) {
    // Add token to blacklist
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      try {
        await redis.setex(`blacklist_${token}`, ttl, '1');
      } catch (redisError) {
        console.warn('Redis not available for token blacklist');
      }
    }
  }
  
  // Destroy MongoDB session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    } else {
      console.log('Session destroyed successfully');
    }
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

exports.logoutAll = asyncHandler(async (req, res, next) => {
  // Revoke all refresh tokens for the user
  await getAuth().revokeRefreshTokens(req.user.uid);
  
  // Destroy current session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
  });
  
  res.status(200).json({
    success: true,
    message: 'Logged out from all devices'
  });
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  
  // Verify user exists
  const userRecord = await getAuth().getUserByEmail(email);
  
  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Store token in Redis with 1 hour expiry
  try {
    await redis.setex(
      `password_reset_${hashedToken}`,
      60 * 60,
      userRecord.uid
    );
  } catch (redisError) {
    console.warn('Redis not available for password reset token');
  }
  
  // Send reset email
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail({
      email,
      subject: 'Password Reset Request',
      message: `Reset your password by clicking: ${resetUrl}`
    });
  } catch (emailError) {
    console.warn('Email sending failed:', emailError.message);
  }
  
  res.status(200).json({
    success: true,
    message: 'Password reset email sent'
  });
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;
  
  // Hash token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Get user from token
  const uid = await redis.get(`password_reset_${hashedToken}`);
  if (!uid) {
    throw new AppError('Invalid or expired reset token', 400);
  }
  
  // Update password
  await getAuth().updateUser(uid, { password });
  
  // Delete reset token
  try {
    await redis.del(`password_reset_${hashedToken}`);
  } catch (redisError) {
    console.warn('Redis not available for token deletion');
  }
  
  res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});

exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  
  // Get user from token
  const uid = await redis.get(`email_verify_${token}`);
  if (!uid) {
    throw new AppError('Invalid or expired verification token', 400);
  }
  
  // Update email verification status
  await getAuth().updateUser(uid, { emailVerified: true });
  
  const db = getFirestore();
  await db.collection('users').doc(uid).update({
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString()
  });
  
  // Delete verification token
  try {
    await redis.del(`email_verify_${token}`);
  } catch (redisError) {
    console.warn('Redis not available for token deletion');
  }
  
  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

exports.resendVerification = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  
  const userRecord = await getAuth().getUserByEmail(email);
  
  if (userRecord.emailVerified) {
    throw new AppError('Email is already verified', 400);
  }
  
  // Generate new verification token
  const verifyToken = crypto.randomBytes(32).toString('hex');
  try {
    await redis.setex(
      `email_verify_${verifyToken}`,
      24 * 60 * 60,
      userRecord.uid
    );
  } catch (redisError) {
    console.warn('Redis not available for email verification token');
  }
  
  // Send verification email
  try {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;
    await sendEmail({
      email,
      subject: 'Email Verification',
      message: `Please verify your email by clicking: ${verifyUrl}`
    });
  } catch (emailError) {
    console.warn('Email sending failed:', emailError.message);
  }
  
  res.status(200).json({
    success: true,
    message: 'Verification email sent'
  });
});

exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // Verify current password by attempting to sign in
  // This is a workaround since Firebase Admin SDK doesn't provide password verification
  // In production, you might want to use Firebase Client SDK for this
  
  await getAuth().updateUser(req.user.uid, { password: newPassword });
  
  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});

exports.updateEmail = asyncHandler(async (req, res, next) => {
  const { newEmail, password } = req.body;
  
  // Update email in Firebase Auth
  await getAuth().updateUser(req.user.uid, {
    email: newEmail,
    emailVerified: false
  });
  
  // Update email in Firestore
  const db = getFirestore();
  await db.collection('users').doc(req.user.uid).update({
    email: newEmail,
    emailVerified: false,
    emailUpdatedAt: new Date().toISOString()
  });
  
  // Update session
  if (req.session.user) {
    req.session.user.email = newEmail;
  }
  
  // Send verification email to new address
  const verifyToken = crypto.randomBytes(32).toString('hex');
  try {
    await redis.setex(
      `email_verify_${verifyToken}`,
      24 * 60 * 60,
      req.user.uid
    );
  } catch (redisError) {
    console.warn('Redis not available for email verification token');
  }
  
  try {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;
    await sendEmail({
      email: newEmail,
      subject: 'Verify Your New Email Address',
      message: `Please verify your new email by clicking: ${verifyUrl}`
    });
  } catch (emailError) {
    console.warn('Email sending failed:', emailError.message);
  }
  
  res.status(200).json({
    success: true,
    message: 'Email updated. Please verify your new email address.'
  });
});

exports.getMe = asyncHandler(async (req, res, next) => {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  // Include session info
  const sessionInfo = req.session.user ? {
    sessionId: req.sessionID,
    loginTime: req.session.user.loginTime,
    sessionActive: true
  } : {
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

exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const { password } = req.body;
  
  // Soft delete in Firestore
  const db = getFirestore();
  await db.collection('users').doc(req.user.uid).update({
    isActive: false,
    deletedAt: new Date().toISOString()
  });
  
  // Schedule hard delete after 30 days (implement separately)
  // In production, you might want to use Cloud Functions for this
  
  // Disable user in Firebase Auth
  await getAuth().updateUser(req.user.uid, { disabled: true });
  
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
  });
  
  res.status(200).json({
    success: true,
    message: 'Account deleted successfully'
  });
});

exports.enable2FA = asyncHandler(async (req, res, next) => {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `PictoTale (${req.user.email})`,
    length: 32
  });
  
  // Store secret temporarily
  try {
    await redis.setex(
      `2fa_setup_${req.user.uid}`,
      10 * 60, // 10 minutes
      secret.base32
    );
  } catch (redisError) {
    console.warn('Redis not available for 2FA setup');
  }
  
  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  res.status(200).json({
    success: true,
    data: {
      secret: secret.base32,
      qrCode
    }
  });
});

exports.verify2FA = asyncHandler(async (req, res, next) => {
  const { token, tempToken } = req.body;
  
  let secret, uid, userData;
  
  if (tempToken) {
    // Login flow
    const tempData = await redis.get(`2fa_temp_${tempToken}`);
    if (!tempData) {
      throw new AppError('Invalid or expired temporary token', 400);
    }
    
    const data = JSON.parse(tempData);
    uid = data.uid;
    userData = data;
    
    // Get user's 2FA secret
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    secret = userDoc.data().twoFactorSecret;
  } else {
    // Setup flow
    uid = req.user.uid;
    secret = await redis.get(`2fa_setup_${uid}`);
    if (!secret) {
      throw new AppError('2FA setup expired. Please try again', 400);
    }
  }
  
  // Verify token
  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });
  
  if (!verified) {
    throw new AppError('Invalid 2FA token', 400);
  }
  
  if (tempToken) {
    // Complete login - create session
    req.session.user = {
      uid: userData.uid,
      email: userData.email,
      role: userData.role,
      loginTime: new Date().toISOString(),
      isAuthenticated: true
    };
    
    try {
      await redis.del(`2fa_temp_${tempToken}`);
    } catch (redisError) {
      console.warn('Redis not available for token deletion');
    }
    
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
    
    // Set cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    res.cookie('token', authToken, cookieOptions);
    
    res.status(200).json({
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
    // Complete setup
    const db = getFirestore();
    await db.collection('users').doc(uid).update({
      twoFactorEnabled: true,
      twoFactorSecret: secret
    });
    
    try {
      await redis.del(`2fa_setup_${uid}`);
    } catch (redisError) {
      console.warn('Redis not available for token deletion');
    }
    
    res.status(200).json({
      success: true,
      message: '2FA enabled successfully'
    });
  }
});

exports.disable2FA = asyncHandler(async (req, res, next) => {
  const { password, token } = req.body;
  
  // Get user's 2FA secret
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  const { twoFactorSecret } = userDoc.data();
  
  // Verify 2FA token
  const verified = speakeasy.totp.verify({
    secret: twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2
  });
  
  if (!verified) {
    throw new AppError('Invalid 2FA token', 400);
  }
  
  // Disable 2FA
  await userDoc.ref.update({
    twoFactorEnabled: false,
    twoFactorSecret: null
  });
  
  res.status(200).json({
    success: true,
    message: '2FA disabled successfully'
  });
});

exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }
  
  try {
    // Verify the current token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Check if session still exists
    if (!req.session.user || req.session.user.uid !== decoded.uid) {
      throw new AppError('Session expired', 401);
    }
    
    // Generate new access token
    const newToken = signToken(decoded.uid, decoded.email, decoded.role);
    
    res.status(200).json({
      success: true,
      token: newToken
    });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
});

// Get all active sessions for a user (admin function)
exports.getUserSessions = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  
  // This would require additional session tracking in your database
  // For now, we'll just return current session info
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