# PictoTale API Documentation

## Overview

PictoTale is an AI-powered children's storytelling platform that creates personalized, age-appropriate stories. This API provides comprehensive endpoints for authentication, user management, and story creation.

## Base URL

```
Development: http://localhost:3001
Production: https://api.pictotale.com
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": true|false,
  "data": {}, // Response data (on success)
  "error": {  // Error details (on failure)
    "message": "Error description",
    "code": "ERROR_CODE"
  },
  "pagination": { // For paginated responses
    "page": 1,
    "limit": 10,
    "total": 100,
    "hasMore": true
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Rate Limiting

- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Story creation**: 10 requests per hour per user

## API Endpoints

### 🔐 Authentication (`/api/auth`)

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "User Name",
  "profile": {
    "childName": "Child Name",
    "age": 8,
    "preferredLanguage": "en"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "uid": "user-id",
      "email": "user@example.com",
      "emailVerified": false
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 👤 User Management (`/api/user`)

#### Get User Profile
```http
GET /api/user/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "email": "user@example.com",
      "displayName": "User Name",
      "profile": {
        "childName": "Child Name",
        "age": 8,
        "preferredLanguage": "en"
      },
      "preferences": {
        "narrationSpeed": 1.2,
        "maxStoryLength": 200
      },
      "progress": {
        "totalStoriesCreated": 5,
        "experiencePoints": 350,
        "creativityLevel": 4,
        "streakDays": 7
      },
      "savedStoryIds": ["story-id-1"],
      "favoriteStoryIds": ["story-id-2"]
    }
  }
}
```

#### Update User Profile
```http
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "New Name",
  "profile": {
    "childName": "Updated Child Name",
    "age": 9
  },
  "preferences": {
    "narrationSpeed": 1.5,
    "maxStoryLength": 300
  }
}
```

#### Get User Dashboard
```http
GET /api/user/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "childName": "Child Name",
      "age": 8
    },
    "progress": {
      "totalStoriesCreated": 5,
      "creativityLevel": 4,
      "experiencePoints": 350,
      "streakDays": 7
    },
    "recentStories": [
      {
        "id": "story-id",
        "title": "Story Title",
        "status": "completed",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "achievementProgress": {
      "nextBadge": {
        "nextLevel": 5,
        "xpNeeded": 150,
        "progress": 0.7
      },
      "streakStatus": {
        "active": true,
        "days": 7
      },
      "creativityGrowth": {
        "level": 4,
        "totalCreations": 13,
        "rank": "Creative Explorer"
      }
    }
  }
}
```

#### Update User Progress
```http
PUT /api/user/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "totalStoriesCreated": 8,
  "totalStoriesCompleted": 6,
  "totalDrawingsMade": 12,
  "experiencePoints": 500,
  "streakDays": 10,
  "achievements": ["master_storyteller"],
  "badges": ["creative_genius"]
}
```

#### Manage Saved Stories
```http
PUT /api/user/stories/saved
Authorization: Bearer <token>
Content-Type: application/json

{
  "storyId": "story-id",
  "action": "add" // or "remove"
}
```

#### Manage Favorite Stories
```http
PUT /api/user/stories/favorites
Authorization: Bearer <token>
Content-Type: application/json

{
  "storyId": "story-id",
  "action": "add" // or "remove"
}
```

### 📚 Story Management (`/api/v1/stories`)

#### Get All Story Types
```http
GET /api/v1/stories/types
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "storyTypes": [
      {
        "id": "adventure_forest_children_2_0",
        "name": "Adventure in Forest",
        "description": "Exciting forest adventures for young children",
        "recommendedAgeMin": 2,
        "recommendedAgeMax": 5,
        "characteristics": ["adventure", "nature", "animals"],
        "colorScheme": "#4CAF50"
      }
    ],
    "total": 2590
  }
}
```

#### Get Daily Challenges
```http
GET /api/v1/stories/challenges/daily
Authorization: Bearer <token>
```

#### Get User Stories
```http
GET /api/v1/stories/user?page=1&limit=10
Authorization: Bearer <token>
```

#### Create Story
```http
POST /api/v1/stories/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "storyTypeId": "adventure_forest_children_2_0",
  "userPrompt": "A happy little explorer finds a magical forest",
  "characterNames": ["Explorer Sam"],
  "isShared": false,
  "preferences": {
    "generateIllustrations": false,
    "language": "en"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Story creation started! Your magical tale is being crafted.",
  "data": {
    "storyId": "generated-story-id",
    "status": "generating",
    "estimatedTime": "1-2 minutes",
    "storyType": "Adventure in Forest",
    "costOptimized": true,
    "maxWords": 50
  }
}
```

#### Get Story by ID
```http
GET /api/v1/stories/{storyId}
Authorization: Bearer <token>
```

#### Get Story Status
```http
GET /api/v1/stories/{storyId}/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "storyId": "story-id",
    "status": "completed", // generating, processing, completed, failed
    "progress": 100,
    "estimatedTime": "Complete",
    "title": "Story Title",
    "error": null,
    "metadata": {
      "wordCount": 45,
      "maxWordLimit": 50,
      "costOptimized": true
    }
  }
}
```

#### Continue Story
```http
POST /api/v1/stories/{storyId}/continue
Authorization: Bearer <token>
Content-Type: application/json

{
  "additionalPrompt": "The explorer meets a friendly talking rabbit",
  "newCharacters": ["Bunny Friend"]
}
```

#### Toggle Story Share
```http
PUT /api/v1/stories/{storyId}/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "isShared": true
}
```

#### Delete Story
```http
DELETE /api/v1/stories/{storyId}
Authorization: Bearer <token>
```

## Data Models

### User Profile
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  profile: {
    childName: string;
    age: number; // 3-17
    preferredLanguage: 'en' | 'es' | 'fr' | 'de' | 'it';
    isChildAccount: boolean;
  };
  preferences: {
    narrationSpeed: number; // 0.5-2.0
    maxStoryLength: number; // 100-1000
  };
  progress: {
    totalStoriesCreated: number;
    totalStoriesCompleted: number;
    totalDrawingsMade: number;
    totalListeningTime: number;
    streakDays: number;
    experiencePoints: number;
    creativityLevel: number; // 1-50
    achievements: string[];
    badges: string[];
  };
  savedStoryIds: string[];
  favoriteStoryIds: string[];
}
```

### Story
```typescript
interface Story {
  id: string;
  userId: string;
  title: string;
  content: string;
  storyTypeId: string;
  characterNames: string[];
  status: 'draft' | 'generating' | 'processing' | 'completed' | 'failed';
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata: {
    language: string;
    wordCount: number;
    maxWordLimit: number;
    readingLevel: number;
    isAgeAppropriate: boolean;
    costOptimized: boolean;
  };
  media: {
    narratorVoiceUrl?: string;
    backgroundMusicUrl?: string;
    illustrationUrls: string[];
  };
}
```

## Security Considerations

### Child Safety
- All content is filtered for age-appropriateness
- Parental controls available for usage limits
- No personal information stored in stories
- Content moderation for shared stories

### Data Protection
- GDPR compliant data handling
- Secure password hashing
- JWT token expiration
- Session management
- Rate limiting protection

### API Security
- HTTPS required in production
- CORS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Flutter Integration

For Flutter developers, we provide comprehensive integration guides:

### Quick Setup
```dart
// Add to pubspec.yaml
dependencies:
  dio: ^5.3.2
  flutter_secure_storage: ^9.0.0
  provider: ^6.1.1

// Basic API client setup
final dio = Dio(BaseOptions(
  baseUrl: 'http://localhost:3001',
  headers: {'Content-Type': 'application/json'},
));

// Add auth interceptor
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) async {
    final token = await secureStorage.read(key: 'auth_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  },
));
```

### Example Usage
```dart
// Login
final response = await dio.post('/api/auth/login', data: {
  'email': 'user@example.com',
  'password': 'password123',
});

// Create Story
final storyResponse = await dio.post('/api/v1/stories/create', data: {
  'storyTypeId': 'adventure_forest_children_2_0',
  'userPrompt': 'A magical adventure',
  'characterNames': ['Hero'],
});

// Poll for story status
Timer.periodic(Duration(seconds: 2), (timer) async {
  final status = await dio.get('/api/v1/stories/${storyId}/status');
  if (status.data['data']['status'] == 'completed') {
    timer.cancel();
    // Story is ready!
  }
});
```

### Complete Integration Guide
See `docs/FLUTTER_INTEGRATION.md` for comprehensive Flutter integration including:
- Authentication service with token refresh
- State management with Provider/Riverpod
- Real-time story status updates
- File upload for drawings
- Offline support and caching
- Error handling and retry logic

## Testing

### API Testing Tools
- **Postman Collections**: Import from `docs/api-collections/`
  - `PictoTale-Auth.postman_collection.json`
  - `PictoTale-Stories.postman_collection.json`
  - `PictoTale-Users.postman_collection.json`
- **Environment**: `PictoTale.postman_environment.json`

### Flutter Testing
```dart
// Unit test example
testWidgets('Login form should submit valid credentials', (tester) async {
  await tester.pumpWidget(MyApp());
  await tester.enterText(find.byKey(Key('email')), 'test@example.com');
  await tester.enterText(find.byKey(Key('password')), 'password123');
  await tester.tap(find.byKey(Key('login_button')));
  await tester.pump();

  expect(find.text('Welcome!'), findsOneWidget);
});
```

## Support

- **Flutter Integration**: See `docs/FLUTTER_INTEGRATION.md`
- **API Documentation**: This document and Postman collections
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our Discord for developer discussions
