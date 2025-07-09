const { getAuth, getFirestore, admin } = require('../config/firebase');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/AppError');
const crypto = require('crypto');

exports.getProfile = asyncHandler(async (req, res, next) => {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  const userData = userDoc.data();
  delete userData.twoFactorSecret; // Remove sensitive data
  
  res.status(200).json({
    success: true,
    data: { profile: userData }
  });
});

exports.updateProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = ['displayName', 'phoneNumber', 'photoURL', 'bio', 'preferences'];
  const updates = {};
  
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });
  
  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }
  
  updates.updatedAt = new Date().toISOString();
  
  // Update Firestore
  const db = getFirestore();
  await db.collection('users').doc(req.user.uid).update(updates);
  
  // Update Firebase Auth if display name or photo changed
  const authUpdates = {};
  if (updates.displayName) authUpdates.displayName = updates.displayName;
  if (updates.photoURL) authUpdates.photoURL = updates.photoURL;
  
  if (Object.keys(authUpdates).length > 0) {
    await getAuth().updateUser(req.user.uid, authUpdates);
  }
  
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully'
  });
});

exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  // This is a placeholder - implement actual file upload logic
  // You would typically use Firebase Storage or another cloud storage service
  
  if (!req.files || !req.files.avatar) {
    throw new AppError('Please upload an avatar image', 400);
  }
  
  // Example: Upload to Firebase Storage
  // const bucket = admin.storage().bucket();
  // const file = bucket.file(`avatars/${req.user.uid}-${Date.now()}`);
  // await file.save(req.files.avatar.data);
  // const photoURL = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
  
  const photoURL = 'https://example.com/avatar.jpg'; // Placeholder
  
  // Update user profile
  await getAuth().updateUser(req.user.uid, { photoURL });
  
  const db = getFirestore();
  await db.collection('users').doc(req.user.uid).update({
    photoURL,
    updatedAt: new Date().toISOString()
  });
  
  res.status(200).json({
    success: true,
    data: { photoURL }
  });
});

exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, role, status } = req.query;
  
  const db = getFirestore();
  let query = db.collection('users');
  
  // Apply filters
  if (role) query = query.where('role', '==', role);
  if (status === 'active') query = query.where('isActive', '==', true);
  if (status === 'inactive') query = query.where('isActive', '==', false);
  
  // Note: Firestore doesn't support full-text search
  // In production, use Algolia or Elasticsearch for search functionality
  
  const snapshot = await query
    .limit(parseInt(limit))
    .offset((parseInt(page) - 1) * parseInt(limit))
    .get();
  
  const users = [];
  snapshot.forEach(doc => {
    const userData = doc.data();
    delete userData.twoFactorSecret;
    users.push({ uid: doc.id, ...userData });
  });
  
  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length
      }
    }
  });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  const userData = userDoc.data();
  delete userData.twoFactorSecret;
  
  res.status(200).json({
    success: true,
    data: { user: { uid: userId, ...userData } }
  });
});

exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  const validRoles = ['user', 'moderator', 'admin'];
  if (!validRoles.includes(role)) {
    throw new AppError('Invalid role', 400);
  }
  
  // Update custom claims in Firebase Auth
  await getAuth().setCustomUserClaims(userId, { role });
  
  // Update role in Firestore
  const db = getFirestore();
  await db.collection('users').doc(userId).update({
    role,
    roleUpdatedAt: new Date().toISOString(),
    roleUpdatedBy: req.user.uid
  });
  
  res.status(200).json({
    success: true,
    message: 'User role updated successfully'
  });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  
  // Soft delete in Firestore
  const db = getFirestore();
  await db.collection('users').doc(userId).update({
    isActive: false,
    deletedAt: new Date().toISOString(),
    deletedBy: req.user.uid
  });
  
  // Disable user in Firebase Auth
  await getAuth().updateUser(userId, { disabled: true });
  
  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});