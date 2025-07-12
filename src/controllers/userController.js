const { getAuth, getFirestore, admin } = require('../config/firebase');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/AppError');
const crypto = require('crypto');

/**
 * Get user profile with PictoTale-specific data
 */
exports.getProfile = asyncHandler(async (req, res, next) => {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  const userData = userDoc.data();
  
  // Remove sensitive data
  delete userData.parentalControls?.parentalPin;
  delete userData.subscriptionInfo?.paymentMethod;
  
  // Format response with PictoTale structure
  const profile = {
    uid: userData.uid,
    email: userData.email,
    displayName: userData.displayName,
    photoURL: userData.photoURL,
    profile: userData.profile || {},
    preferences: userData.preferences || {},
    progress: userData.progress || {},
    savedStoryIds: userData.savedStoryIds || [],
    favoriteStoryIds: userData.favoriteStoryIds || [],
    subscriptionInfo: userData.subscriptionInfo || null,
    createdAt: userData.createdAt,
    lastLoginAt: userData.lastLoginAt
  };
  
  res.status(200).json({
    success: true,
    data: { profile }
  });
});

/**
 * Update user profile with PictoTale-specific fields
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = [
    'displayName', 
    'photoURL', 
    'profile', 
    'preferences',
    'savedStoryIds',
    'favoriteStoryIds'
  ];
  
  const updates = {};
  
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });
  
  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }
  
  // Validate profile data if provided
  if (updates.profile) {
    const { childName, age, preferredLanguage, isChildAccount } = updates.profile;
    
    if (age && (age < 3 || age > 17)) {
      throw new AppError('Age must be between 3 and 17 for child accounts', 400);
    }
    
    if (preferredLanguage && !['en', 'es', 'fr', 'de', 'it'].includes(preferredLanguage)) {
      throw new AppError('Unsupported language', 400);
    }
  }
  
  // Validate preferences if provided
  if (updates.preferences) {
    const { narrationSpeed, maxStoryLength } = updates.preferences;
    
    if (narrationSpeed && (narrationSpeed < 0.5 || narrationSpeed > 2.0)) {
      throw new AppError('Narration speed must be between 0.5 and 2.0', 400);
    }
    
    if (maxStoryLength && (maxStoryLength < 100 || maxStoryLength > 1000)) {
      throw new AppError('Story length must be between 100 and 1000 words', 400);
    }
  }
  
  updates.lastLoginAt = new Date().toISOString();
  
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

/**
 * Update user progress (stories, achievements, badges)
 */
exports.updateProgress = asyncHandler(async (req, res, next) => {
  const { 
    totalStoriesCreated,
    totalStoriesCompleted,
    totalDrawingsMade,
    totalListeningTime,
    streakDays,
    achievements,
    badges,
    experiencePoints
  } = req.body;
  
  const db = getFirestore();
  const userRef = db.collection('users').doc(req.user.uid);
  
  // Get current progress
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  const currentProgress = userDoc.data().progress || {};
  
  // Update progress fields
  const progressUpdates = {};
  
  if (totalStoriesCreated !== undefined) {
    progressUpdates.totalStoriesCreated = Math.max(currentProgress.totalStoriesCreated || 0, totalStoriesCreated);
  }
  
  if (totalStoriesCompleted !== undefined) {
    progressUpdates.totalStoriesCompleted = Math.max(currentProgress.totalStoriesCompleted || 0, totalStoriesCompleted);
  }
  
  if (totalDrawingsMade !== undefined) {
    progressUpdates.totalDrawingsMade = Math.max(currentProgress.totalDrawingsMade || 0, totalDrawingsMade);
  }
  
  if (totalListeningTime !== undefined) {
    progressUpdates.totalListeningTime = Math.max(currentProgress.totalListeningTime || 0, totalListeningTime);
  }
  
  if (streakDays !== undefined) {
    progressUpdates.streakDays = streakDays;
  }
  
  if (achievements) {
    progressUpdates.achievements = [...(currentProgress.achievements || []), ...achievements];
  }
  
  if (badges) {
    progressUpdates.badges = [...(currentProgress.badges || []), ...badges];
  }
  
  if (experiencePoints !== undefined) {
    progressUpdates.experiencePoints = Math.max(currentProgress.experiencePoints || 0, experiencePoints);
    
    // Calculate creativity level based on XP
    const newLevel = Math.floor(progressUpdates.experiencePoints / 100) + 1;
    progressUpdates.creativityLevel = Math.min(newLevel, 50); // Cap at level 50
  }
  
  progressUpdates.lastActivityDate = new Date().toISOString();
  
  await userRef.update({
    progress: progressUpdates,
    lastLoginAt: new Date().toISOString()
  });
  
  res.status(200).json({
    success: true,
    message: 'Progress updated successfully',
    data: { progress: progressUpdates }
  });
});

/**
 * Add/remove saved stories
 */
exports.manageSavedStories = asyncHandler(async (req, res, next) => {
  const { storyId, action } = req.body; // action: 'add' or 'remove'
  
  if (!storyId || !action || !['add', 'remove'].includes(action)) {
    throw new AppError('Invalid story ID or action', 400);
  }
  
  const db = getFirestore();
  const userRef = db.collection('users').doc(req.user.uid);
  
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  const currentSavedStories = userDoc.data().savedStoryIds || [];
  
  let updatedSavedStories;
  if (action === 'add') {
    if (!currentSavedStories.includes(storyId)) {
      updatedSavedStories = [...currentSavedStories, storyId];
    } else {
      updatedSavedStories = currentSavedStories;
    }
  } else {
    updatedSavedStories = currentSavedStories.filter(id => id !== storyId);
  }
  
  await userRef.update({
    savedStoryIds: updatedSavedStories,
    lastLoginAt: new Date().toISOString()
  });
  
  res.status(200).json({
    success: true,
    message: `Story ${action === 'add' ? 'added to' : 'removed from'} saved stories`,
    data: { savedStoryIds: updatedSavedStories }
  });
});

/**
 * Manage favorite stories
 */
exports.manageFavoriteStories = asyncHandler(async (req, res, next) => {
  const { storyId, action } = req.body; // action: 'add' or 'remove'
  
  if (!storyId || !action || !['add', 'remove'].includes(action)) {
    throw new AppError('Invalid story ID or action', 400);
  }
  
  const db = getFirestore();
  const userRef = db.collection('users').doc(req.user.uid);
  
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  const currentFavorites = userDoc.data().favoriteStoryIds || [];
  
  let updatedFavorites;
  if (action === 'add') {
    if (!currentFavorites.includes(storyId)) {
      updatedFavorites = [...currentFavorites, storyId];
    } else {
      updatedFavorites = currentFavorites;
    }
  } else {
    updatedFavorites = currentFavorites.filter(id => id !== storyId);
  }
  
  await userRef.update({
    favoriteStoryIds: updatedFavorites,
    lastLoginAt: new Date().toISOString()
  });
  
  res.status(200).json({
    success: true,
    message: `Story ${action === 'add' ? 'added to' : 'removed from'} favorites`,
    data: { favoriteStoryIds: updatedFavorites }
  });
});

/**
 * Update parental controls (parent/guardian only)
 */
exports.updateParentalControls = asyncHandler(async (req, res, next) => {
  const { 
    parentalPin,
    requiresPinForSettings,
    requiresPinForPurchases,
    maxDailyUsageMinutes,
    allowedGenres,
    blockedWords,
    shareProgressWithParent,
    allowSocialFeatures
  } = req.body;
  
  const db = getFirestore();
  const userRef = db.collection('users').doc(req.user.uid);
  
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  const currentControls = userDoc.data().parentalControls || {};
  
  // Validate parental PIN if provided
  if (parentalPin && parentalPin.length !== 4) {
    throw new AppError('Parental PIN must be 4 digits', 400);
  }
  
  // Validate usage limits
  if (maxDailyUsageMinutes && (maxDailyUsageMinutes < 15 || maxDailyUsageMinutes > 480)) {
    throw new AppError('Daily usage must be between 15 and 480 minutes', 400);
  }
  
  const updatedControls = {
    ...currentControls,
    parentEmail: req.user.email,
    ...(parentalPin && { parentalPin: crypto.createHash('sha256').update(parentalPin).digest('hex') }),
    ...(requiresPinForSettings !== undefined && { requiresPinForSettings }),
    ...(requiresPinForPurchases !== undefined && { requiresPinForPurchases }),
    ...(maxDailyUsageMinutes !== undefined && { maxDailyUsageMinutes }),
    ...(allowedGenres && { allowedGenres }),
    ...(blockedWords && { blockedWords }),
    ...(shareProgressWithParent !== undefined && { shareProgressWithParent }),
    ...(allowSocialFeatures !== undefined && { allowSocialFeatures })
  };
  
  await userRef.update({
    parentalControls: updatedControls,
    lastLoginAt: new Date().toISOString()
  });
  
  // Remove sensitive data from response
  delete updatedControls.parentalPin;
  
  res.status(200).json({
    success: true,
    message: 'Parental controls updated successfully',
    data: { parentalControls: updatedControls }
  });
});

/**
 * Upload avatar with enhanced validation
 */
exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  if (!req.files || !req.files.avatar) {
    throw new AppError('Please upload an avatar image', 400);
  }
  
  const avatar = req.files.avatar;
  
  // Validate file type
  if (!avatar.mimetype.startsWith('image/')) {
    throw new AppError('Please upload an image file', 400);
  }
  
  // Validate file size (max 5MB)
  if (avatar.size > 5 * 1024 * 1024) {
    throw new AppError('Image size must be less than 5MB', 400);
  }
  
  try {
    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `avatars/${req.user.uid}-${Date.now()}.${avatar.mimetype.split('/')[1]}`;
    const file = bucket.file(fileName);
    
    await file.save(avatar.data, {
      metadata: {
        contentType: avatar.mimetype,
        cacheControl: 'public, max-age=3600'
      }
    });
    
    // Get download URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500'
    });
    
    // Update user profile
    await getAuth().updateUser(req.user.uid, { photoURL: url });
    
    const db = getFirestore();
    await db.collection('users').doc(req.user.uid).update({
      photoURL: url,
      'profile.avatarUrl': url,
      lastLoginAt: new Date().toISOString()
    });
    
    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { photoURL: url }
    });
    
  } catch (error) {
    throw new AppError('Failed to upload avatar', 500);
  }
});

/**
 * Get all users with enhanced filtering for PictoTale
 */
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    role, 
    status,
    ageRange,
    subscriptionTier,
    creativityLevel
  } = req.query;
  
  const db = getFirestore();
  let query = db.collection('users');
  
  // Apply filters
  if (role) query = query.where('role', '==', role);
  if (status === 'active') query = query.where('isActive', '==', true);
  if (status === 'inactive') query = query.where('isActive', '==', false);
  if (subscriptionTier) query = query.where('subscriptionInfo.tier', '==', subscriptionTier);
  
  const snapshot = await query
    .limit(parseInt(limit))
    .offset((parseInt(page) - 1) * parseInt(limit))
    .get();
  
  const users = [];
  snapshot.forEach(doc => {
    const userData = doc.data();
    
    // Remove sensitive data
    delete userData.parentalControls?.parentalPin;
    delete userData.subscriptionInfo?.paymentMethod;
    
    // Apply additional filters
    if (ageRange) {
      const [minAge, maxAge] = ageRange.split('-').map(Number);
      const userAge = userData.profile?.age;
      if (!userAge || userAge < minAge || userAge > maxAge) return;
    }
    
    if (creativityLevel) {
      const userLevel = userData.progress?.creativityLevel || 1;
      if (userLevel < parseInt(creativityLevel)) return;
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const childName = userData.profile?.childName?.toLowerCase() || '';
      const displayName = userData.displayName?.toLowerCase() || '';
      const email = userData.email?.toLowerCase() || '';
      
      if (!childName.includes(searchLower) && 
          !displayName.includes(searchLower) && 
          !email.includes(searchLower)) {
        return;
      }
    }
    
    users.push({ uid: doc.id, ...userData });
  });
  
  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        hasMore: users.length === parseInt(limit)
      }
    }
  });
});

/**
 * Get single user with enhanced data
 */
exports.getUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  const userData = userDoc.data();
  
  // Remove sensitive data
  delete userData.parentalControls?.parentalPin;
  delete userData.subscriptionInfo?.paymentMethod;
  
  // Get user's stories count
  const storiesSnapshot = await db.collection('stories')
    .where('userId', '==', userId)
    .get();
  
  const userStats = {
    totalStories: storiesSnapshot.size,
    progress: userData.progress || {},
    joinedDate: userData.createdAt,
    lastActive: userData.lastLoginAt
  };
  
  res.status(200).json({
    success: true,
    data: { 
      user: { uid: userId, ...userData },
      stats: userStats
    }
  });
});

/**
 * Update user role with PictoTale roles
 */
exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  const validRoles = ['child', 'parent', 'moderator', 'admin'];
  if (!validRoles.includes(role)) {
    throw new AppError('Invalid role. Must be one of: child, parent, moderator, admin', 400);
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

/**
 * Soft delete user account
 */
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  
  const db = getFirestore();
  
  // Check if user has active subscription
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    if (userData.subscriptionInfo?.isActive) {
      throw new AppError('Cannot delete user with active subscription', 400);
    }
  }
  
  // Soft delete in Firestore
  await db.collection('users').doc(userId).update({
    isActive: false,
    deletedAt: new Date().toISOString(),
    deletedBy: req.user.uid
  });
  
  // Disable user in Firebase Auth
  await getAuth().updateUser(userId, { disabled: true });
  
  res.status(200).json({
    success: true,
    message: 'User account deactivated successfully'
  });
});

/**
 * Get user dashboard data
 */
exports.getUserDashboard = asyncHandler(async (req, res, next) => {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }
  
  const userData = userDoc.data();
  const progress = userData.progress || {};
  
  // Get recent stories
  const recentStoriesSnapshot = await db.collection('stories')
    .where('userId', '==', req.user.uid)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  
  const recentStories = [];
  recentStoriesSnapshot.forEach(doc => {
    recentStories.push({ id: doc.id, ...doc.data() });
  });
  
  // Calculate achievement progress
  const achievementProgress = {
    nextBadge: calculateNextBadge(progress),
    streakStatus: calculateStreakStatus(progress),
    creativityGrowth: calculateCreativityGrowth(progress)
  };
  
  res.status(200).json({
    success: true,
    data: {
      profile: userData.profile,
      progress,
      recentStories,
      achievementProgress,
      preferences: userData.preferences
    }
  });
});

// Helper functions
function calculateNextBadge(progress) {
  const xp = progress.experiencePoints || 0;
  const nextLevel = Math.floor(xp / 100) + 1;
  const xpNeeded = (nextLevel * 100) - xp;
  
  return {
    nextLevel,
    xpNeeded,
    progress: (xp % 100) / 100
  };
}

function calculateStreakStatus(progress) {
  const streak = progress.streakDays || 0;
  const lastActivity = progress.lastActivityDate;
  
  if (!lastActivity) return { active: false, days: 0 };
  
  const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    active: daysSinceActivity <= 1,
    days: daysSinceActivity <= 1 ? streak : 0
  };
}

function calculateCreativityGrowth(progress) {
  const level = progress.creativityLevel || 1;
  const stories = progress.totalStoriesCreated || 0;
  const drawings = progress.totalDrawingsMade || 0;
  
  return {
    level,
    totalCreations: stories + drawings,
    rank: level > 10 ? 'Advanced Creator' : level > 5 ? 'Creative Explorer' : 'Budding Artist'
  };
}