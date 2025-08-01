const { getFirestore } = require('firebase-admin/firestore');
const User = require('../models/userModel');

const db = getFirestore();
const usersCollection = db.collection('users');

const userRepository = {
  async getUserById(userId) {
    const doc = await usersCollection.doc(userId).get();
    if (!doc.exists) return null;
    return User.fromFirestore(doc);
  },

  async updateUser(userId, userData) {
    await usersCollection.doc(userId).update({
      ...userData,
      updatedAt: new Date(),
    });
    const updatedDoc = await usersCollection.doc(userId).get();
    return User.fromFirestore(updatedDoc);
  },

  async incrementXP(userId, amount) {
    await usersCollection.doc(userId).update({
      xp: db.FieldValue.increment(amount),
      updatedAt: new Date(),
    });
  },

  async addAchievement(userId, achievement) {
    await usersCollection.doc(userId).update({
      achievements: db.FieldValue.arrayUnion(achievement),
      updatedAt: new Date(),
    });
  },

  async addCompletedChallenge(userId, challengeId) {
    await usersCollection.doc(userId).update({
      completedChallenges: db.FieldValue.arrayUnion(challengeId),
      updatedAt: new Date(),
    });
  }
};

module.exports = userRepository;