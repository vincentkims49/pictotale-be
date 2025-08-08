const jwt = require('jsonwebtoken');
const JWTUtils = require('./jwtUtils');

/**
 * JWT Testing Utility for development and testing
 * This utility helps test JWT functionality without requiring Firebase
 */

class JWTTester {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'test-secret-key-for-development';
  }

  /**
   * Generate a valid test token
   */
  generateValidToken() {
    const payload = {
      uid: 'test-user-123',
      email: 'test@pictotale.com',
      role: 'user',
      sessionId: 'test-session-123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    return jwt.sign(payload, this.secret);
  }

  /**
   * Generate an expired token
   */
  generateExpiredToken() {
    const payload = {
      uid: 'test-user-123',
      email: 'test@pictotale.com',
      role: 'user',
      sessionId: 'test-session-123',
      iat: Math.floor(Date.now() / 1000) - (8 * 24 * 60 * 60), // 8 days ago
      exp: Math.floor(Date.now() / 1000) - (1 * 24 * 60 * 60)  // 1 day ago (expired)
    };

    return jwt.sign(payload, this.secret);
  }

  /**
   * Generate a token with invalid signature
   */
  generateInvalidSignatureToken() {
    const payload = {
      uid: 'test-user-123',
      email: 'test@pictotale.com',
      role: 'user',
      sessionId: 'test-session-123'
    };

    return jwt.sign(payload, 'wrong-secret-key');
  }

  /**
   * Generate a malformed token
   */
  generateMalformedToken() {
    return 'invalid.token.format.missing.parts';
  }

  /**
   * Generate a token missing required fields
   */
  generateIncompleteToken() {
    const payload = {
      // Missing uid and email
      role: 'user',
      sessionId: 'test-session-123'
    };

    return jwt.sign(payload, this.secret);
  }

  /**
   * Generate a token that's not yet valid
   */
  generateNotYetValidToken() {
    const payload = {
      uid: 'test-user-123',
      email: 'test@pictotale.com',
      role: 'user',
      sessionId: 'test-session-123',
      nbf: Math.floor(Date.now() / 1000) + (1 * 60 * 60) // Valid in 1 hour
    };

    return jwt.sign(payload, this.secret);
  }

  /**
   * Test all token scenarios
   */
  testAllScenarios() {
    const scenarios = [
      {
        name: 'Valid Token',
        token: this.generateValidToken(),
        expectedResult: 'success'
      },
      {
        name: 'Expired Token',
        token: this.generateExpiredToken(),
        expectedResult: 'TokenExpiredError'
      },
      {
        name: 'Invalid Signature',
        token: this.generateInvalidSignatureToken(),
        expectedResult: 'JsonWebTokenError'
      },
      {
        name: 'Malformed Token',
        token: this.generateMalformedToken(),
        expectedResult: 'JsonWebTokenError'
      },
      {
        name: 'Incomplete Token',
        token: this.generateIncompleteToken(),
        expectedResult: 'Invalid token: missing user ID'
      },
      {
        name: 'Not Yet Valid Token',
        token: this.generateNotYetValidToken(),
        expectedResult: 'NotBeforeError'
      },
      {
        name: 'Empty Token',
        token: '',
        expectedResult: 'No authentication token provided'
      },
      {
        name: 'Null Token',
        token: null,
        expectedResult: 'No authentication token provided'
      }
    ];

    const results = [];

    for (const scenario of scenarios) {
      try {
        const result = JWTUtils.validateToken(scenario.token, this.secret);
        results.push({
          scenario: scenario.name,
          status: 'success',
          result: {
            uid: result.uid,
            email: result.email,
            role: result.role
          },
          expected: scenario.expectedResult,
          passed: scenario.expectedResult === 'success'
        });
      } catch (error) {
        results.push({
          scenario: scenario.name,
          status: 'error',
          error: {
            name: error.name,
            message: error.message,
            code: error.code
          },
          expected: scenario.expectedResult,
          passed: error.message.includes(scenario.expectedResult) ||
                  error.name === scenario.expectedResult ||
                  (scenario.expectedResult === 'TokenExpiredError' && error.message.includes('expired')) ||
                  (scenario.expectedResult === 'JsonWebTokenError' && error.message.includes('Invalid')) ||
                  (scenario.expectedResult === 'NotBeforeError' && error.message.includes('not yet valid'))
        });
      }
    }

    return results;
  }

  /**
   * Test token format validation
   */
  testTokenFormats() {
    const formats = [
      { token: this.generateValidToken(), expected: true },
      { token: 'invalid.format', expected: false },
      { token: 'too.many.parts.here.invalid', expected: false },
      { token: 'onlyonepart', expected: false },
      { token: '', expected: false },
      { token: null, expected: false },
      { token: undefined, expected: false }
    ];

    return formats.map(test => ({
      token: test.token ? test.token.substring(0, 20) + '...' : String(test.token),
      isValid: JWTUtils.isValidTokenFormat(test.token),
      expected: test.expected,
      passed: JWTUtils.isValidTokenFormat(test.token) === test.expected
    }));
  }

  /**
   * Test token expiration checking
   */
  testTokenExpiration() {
    const tests = [
      { 
        name: 'Valid Token',
        token: this.generateValidToken(), 
        expected: false 
      },
      { 
        name: 'Expired Token',
        token: this.generateExpiredToken(), 
        expected: true 
      },
      { 
        name: 'Malformed Token',
        token: 'invalid.token', 
        expected: true 
      }
    ];

    return tests.map(test => ({
      name: test.name,
      isExpired: JWTUtils.isTokenExpired(test.token),
      expected: test.expected,
      passed: JWTUtils.isTokenExpired(test.token) === test.expected
    }));
  }

  /**
   * Generate a comprehensive test report
   */
  generateTestReport() {
    console.log('\n🧪 JWT Testing Report\n');
    console.log('='.repeat(50));

    // Test token validation
    console.log('\n1. Token Validation Tests:');
    const validationResults = this.testAllScenarios();
    validationResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.scenario}: ${result.status}`);
      if (!result.passed) {
        console.log(`   Expected: ${result.expected}`);
        console.log(`   Got: ${result.error?.message || 'success'}`);
      }
    });

    // Test token formats
    console.log('\n2. Token Format Tests:');
    const formatResults = this.testTokenFormats();
    formatResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.token}: ${result.isValid}`);
    });

    // Test token expiration
    console.log('\n3. Token Expiration Tests:');
    const expirationResults = this.testTokenExpiration();
    expirationResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.isExpired ? 'expired' : 'valid'}`);
    });

    // Summary
    const totalTests = validationResults.length + formatResults.length + expirationResults.length;
    const passedTests = [
      ...validationResults,
      ...formatResults,
      ...expirationResults
    ].filter(r => r.passed).length;

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(50));

    return {
      validation: validationResults,
      format: formatResults,
      expiration: expirationResults,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        passRate: Math.round((passedTests / totalTests) * 100)
      }
    };
  }
}

module.exports = JWTTester;
