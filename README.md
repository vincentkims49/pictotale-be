# Firebase Authentication Backend

A professional Node.js authentication backend using Firebase Admin SDK with comprehensive security features.

## Features

- User registration and login
- Email verification
- Password reset functionality
- Two-factor authentication (2FA)
- JWT token-based authentication
- Rate limiting
- Input validation and sanitization
- Security headers with Helmet
- CORS protection
- Session management
- Role-based access control
- Request logging
- Error handling
- Redis for caching and blacklisting
- Email notifications

## Security Features

- Password strength requirements
- Account lockout after failed attempts
- Token blacklisting on logout
- XSS protection
- SQL injection prevention
- CSRF protection
- Security headers
- Input sanitization
- Rate limiting per IP and per account
- 2FA support

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example`

3. Add your Firebase service account JSON file

4. Set up Redis for caching

5. Configure email settings for notifications

6. Run the server:
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

## API Endpoints

### Public Routes
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh-token
- POST /api/auth/forgot-password
- POST /api/auth/reset-password/:token
- GET /api/auth/verify-email/:token
- POST /api/auth/resend-verification

### Protected Routes
- POST /api/auth/logout
- POST /api/auth/logout-all
- PUT /api/auth/update-password
- PUT /api/auth/update-email
- GET /api/auth/me
- DELETE /api/auth/delete-account
- POST /api/auth/2fa/enable
- POST /api/auth/2fa/verify
- POST /api/auth/2fa/disable

### User Routes (Protected)
- GET /api/user/profile
- PUT /api/user/profile
- POST /api/user/profile/avatar

### Admin Routes (Protected)
- GET /api/user/all
- GET /api/user/:userId
- PUT /api/user/:userId/role
- DELETE /api/user/:userId

## Testing

Run tests with:
```bash
npm test
```

## Production Considerations

1. Use HTTPS in production
2. Set secure environment variables
3. Configure proper CORS origins
4. Set up monitoring and alerting
5. Implement proper logging
6. Use a production-ready database
7. Set up automated backups
8. Configure CDN for static assets
9. Implement health checks
10. Set up CI/CD pipeline