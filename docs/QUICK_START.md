# PictoTale API Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide will help you get up and running with the PictoTale API quickly.

## Prerequisites

- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas account
- Firebase project with Authentication and Firestore enabled
- OpenAI API key (optional, for AI story generation)

## 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd pictotale-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

## 2. Environment Setup

Edit your `.env` file:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/pictotale
FIREBASE_PROJECT_ID=your-firebase-project-id

# AI Services (Optional)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-session-secret-here
```

## 3. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication and Firestore
3. Download the service account JSON file
4. Place it in your project root as `firebase-service-account.json`

## 4. Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

You should see:
```
🔥 Firebase initialized successfully
📊 MongoDB connected successfully
🚀 Server running on port 3001
```

## 5. Test the API

### Health Check
```bash
curl http://localhost:3001/api/auth/health
# Expected: {"status": "OK", "timestamp": "..."}
```

### Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "displayName": "Test User",
    "profile": {
      "childName": "Little Explorer",
      "age": 8,
      "preferredLanguage": "en"
    }
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Save the JWT token from the response for authenticated requests.

### Get Story Types
```bash
curl -X GET http://localhost:3001/api/v1/stories/types \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create a Story
```bash
curl -X POST http://localhost:3001/api/v1/stories/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storyTypeId": "adventure_forest_children_2_0",
    "userPrompt": "A happy little explorer discovers a magical forest",
    "characterNames": ["Explorer Sam"],
    "isShared": false
  }'
```

## 6. Using Postman Collections

1. Import the collections from `docs/api-collections/`:
   - `PictoTale-Auth.postman_collection.json`
   - `PictoTale-Stories.postman_collection.json`
   - `PictoTale-Users.postman_collection.json`

2. Import the environment:
   - `PictoTale.postman_environment.json`

3. Update the environment variables:
   - Set `baseUrl` to `http://localhost:3001`
   - Update `testEmail` and `testPassword` if needed

4. Run the "Register User" request to create an account
5. Run the "Login User" request to get a JWT token
6. The token will be automatically saved to the environment
7. Now you can test all other endpoints!

## 7. Key Features to Test

### Authentication Flow
1. Register → Login → Get Profile → Update Profile → Logout

### Story Creation Flow
1. Get Story Types → Create Story → Check Status → Get Story Details

### User Progress Flow
1. Update Progress → Get Dashboard → Manage Story Collections

### Admin Features (Requires Admin Role)
1. Get All Users → Get Specific User → Update User Role

## 8. Common Issues & Solutions

### "Firebase not initialized"
- Ensure `firebase-service-account.json` is in the project root
- Check that your Firebase project ID is correct in `.env`

### "MongoDB connection failed"
- Ensure MongoDB is running locally
- Check your `MONGODB_URI` in `.env`

### "Story creation failed"
- This is expected without OpenAI API key
- Stories will be created but AI generation will fail
- Add `OPENAI_API_KEY` to enable full story generation

### "Rate limit exceeded"
- Wait a few minutes and try again
- Rate limits are in place for security

### "Firestore index required"
- Some endpoints require Firestore composite indexes
- These are created automatically on first use
- Check Firebase Console → Firestore → Indexes

## 9. Next Steps

### For Flutter Developers
- **HTTP Client**: Use `dio` package for robust HTTP requests with interceptors
- **Authentication**: Store JWT tokens securely using `flutter_secure_storage`
- **State Management**: Use Provider, Riverpod, or Bloc for API state management
- **Token Refresh**: Implement automatic token refresh with interceptors
- **Error Handling**: Handle rate limiting and API errors gracefully with user feedback
- **Real-time Updates**: Use the story status endpoint to track generation progress
- **File Uploads**: Use `file_picker` for drawings and `permission_handler` for access
- **Offline Support**: Cache stories locally with `sqflite` or `hive`
- **Push Notifications**: Integrate Firebase Messaging for story completion alerts

### For Backend Developers
- Explore the codebase structure in `/src`
- Check out the middleware in `/src/middleware`
- Review the service layer in `/src/services`
- Understand the repository pattern in `/src/repositories`

### For DevOps
- Review the production deployment guide in README.md
- Set up monitoring and logging
- Configure SSL certificates
- Set up CI/CD pipelines

## 10. API Documentation

- **Full API Docs**: `docs/API_DOCUMENTATION.md`
- **Postman Collections**: `docs/api-collections/`
- **Swagger UI**: http://localhost:3001/api-docs (when server is running)

## 11. Support

- **GitHub Issues**: Report bugs and request features
- **Email**: api-support@pictotale.com
- **Documentation**: Check the `/docs` folder

## 12. Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT and session secrets
- [ ] Configure HTTPS with SSL certificates
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting for production load
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Test all endpoints thoroughly
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure CDN for static assets

---

**Happy coding! 🎨📚✨**

Need help? Check the full documentation or reach out to our support team!
