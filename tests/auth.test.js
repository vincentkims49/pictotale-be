const request = require('supertest');
const app = require('../src/server');

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test1234!',
          displayName: 'Test User'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });
    
    it('should not register user with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test1234!',
          displayName: 'Test User'
        });
      
      expect(res.statusCode).toBe(400);
    });
  });
  
  // Add more tests...
});
