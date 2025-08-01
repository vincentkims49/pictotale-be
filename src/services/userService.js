const userRepository = require('../repositories/userRepository');

/**
 * Handles gamification logic for user progress, XP, achievements, and challenges.
 */
const userService = {
  /**
   * Call when a user completes a story.
   * Awards XP, achievements, and handles daily challenge completion.
   * @param {string} userId
   * @param {string} storyType
   * @param {string|null} challengeId
   * @returns {Promise<User>}
   */
  async completeStory(userId, storyType, challengeId = null) {
    // Award XP for story completion
    await userRepository.incrementXP(userId, 10);

    // Award achievement for first story
    const user = await userRepository.getUserById(userId);
    if (user.achievements && !user.achievements.includes('First Story')) {
      await userRepository.addAchievement(userId, 'First Story');
    }

    // Handle daily challenge completion
    if (challengeId && (!user.completedChallenges || !user.completedChallenges.includes(challengeId))) {
      await userRepository.addCompletedChallenge(userId, challengeId);
      await userRepository.incrementXP(userId, 20); // Bonus XP for challenge
      await userRepository.addAchievement(userId, 'Challenge Completed');
    }

    return await userRepository.getUserById(userId);
  },

  /**
   * Get user profile with gamification fields.
   * @param {string} userId
   * @returns {Promise<User>}
   */
  async getUserProfile(userId) {
    return await userRepository.getUserById(userId);
  },

  /**
   * Award a custom achievement to a user.
   * @param {string} userId
   * @param {string} achievement
   * @returns {Promise<void>}
   */
  async awardAchievement(userId, achievement) {
    await userRepository.addAchievement(userId, achievement);
  },

  /**
   * Increment user XP by a custom amount.
   * @param {string} userId
   * @param {number} amount
   * @returns {Promise<void>}
   */
  async addXP(userId, amount) {
    await userRepository.incrementXP(userId, amount);
  },
};

module.exports = userService;6