/**
 * User model schema for Firestore.
 * Includes gamification fields: xp, achievements, completedChallenges, etc.
 */

class User {
  constructor({
    id,
    email,
    displayName,
    avatarUrl = '',
    xp = 0,
    achievements = [],
    completedChallenges = [],
    createdAt = new Date(),
    updatedAt = new Date(),
    ...rest
  }) {
    this.id = id;
    this.email = email;
    this.displayName = displayName;
    this.avatarUrl = avatarUrl;
    this.xp = xp;
    this.achievements = achievements;
    this.completedChallenges = completedChallenges;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    Object.assign(this, rest);
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new User({ id: doc.id, ...data });
  }

  toFirestore() {
    return {
      email: this.email,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
      xp: this.xp,
      achievements: this.achievements,
      completedChallenges: this.completedChallenges,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };
  }
}

module.exports = User;