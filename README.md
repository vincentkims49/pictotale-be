# PictoTale Backend API

A comprehensive Node.js backend for PictoTale - an AI-powered children's storytelling platform. Built with Firebase, MongoDB, and advanced AI integration for creating personalized, age-appropriate stories.

## 🌟 Features

### 🔐 Authentication & Security
- Firebase Authentication with JWT tokens
- Role-based access control (child, parent, moderator, admin)
- Session management with MongoDB
- Two-factor authentication (2FA)
- Rate limiting and security headers
- Input validation and sanitization
- CORS protection and XSS prevention

### 📚 Story Management
- AI-powered story generation with cost optimization
- 2590+ story types for ages 2-15
- Content safety filtering for child-appropriate content
- Story continuation and sharing features
- User story collections (saved/favorites)
- Daily challenges and featured stories
- Real-time story generation status tracking

### 👤 User Management
- Comprehensive user profiles with child-specific data
- Progress tracking and gamification (XP, levels, badges)
- Achievement system with streak tracking
- Parental controls and usage limits
- Avatar upload and profile customization
- Dashboard analytics and insights

### 🎨 Content Features
- Multi-language support (EN, ES, FR, DE, IT)
- Age-appropriate content validation (3-17 years)
- Drawing and voice input support
- Audio narration generation
- Story illustrations and media management
- Customizable story preferences

## 🛡️ Security Features

- **Child Safety First**: Age-appropriate content filtering and validation
- **Content Safety**: AI-powered content moderation for inappropriate material
- **Role-Based Access**: Granular permissions for child, parent, moderator, admin roles
- **Parental Controls**: PIN protection, usage limits, content filtering
- **Data Protection**: Secure handling of child data with privacy compliance
- **Authentication**: Firebase Auth with JWT tokens and session management
- **Rate Limiting**: Protection against abuse and spam
- **Input Validation**: Comprehensive validation for all user inputs
- **Security Headers**: XSS, CSRF, and injection attack prevention
- **Audit Trail**: Complete logging of user activities and admin actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Authentication and Firestore
- MongoDB database
- OpenAI API key (for AI story generation)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd pictotale-backend
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Firebase Setup:**
   - Download Firebase service account JSON
   - Place in project root as `firebase-service-account.json`
   - Enable Authentication and Firestore in Firebase Console

4. **Database Setup:**
   - Ensure MongoDB is running
   - Firestore indexes will be created automatically

5. **Start the server:**
   ```bash
   npm run dev  # Development with hot reload
   npm start    # Production
   ```

6. **Verify installation:**
   ```bash
   curl http://localhost:3001/api/auth/health
   # Should return: {"status": "OK", "timestamp": "..."}
   ```

## � Flutter Integration

PictoTale is designed with Flutter in mind, providing seamless mobile app development:

### 🎯 Flutter-First Design
- **RESTful API**: Perfect for Flutter's HTTP clients (`dio`, `http`)
- **JWT Authentication**: Secure token-based auth with refresh support
- **Real-time Updates**: Story status polling for live progress tracking
- **File Upload**: Support for drawings and voice input from mobile devices
- **Offline Support**: API designed for local caching and offline functionality

### 🚀 Quick Flutter Setup
```dart
// Add to pubspec.yaml
dependencies:
  dio: ^5.3.2
  flutter_secure_storage: ^9.0.0
  provider: ^6.1.1
  file_picker: ^6.1.1

// Basic API setup
final dio = Dio(BaseOptions(baseUrl: 'https://api.pictotale.com'));
```

### 📖 Flutter Resources
- **Complete Integration Guide**: `docs/FLUTTER_INTEGRATION.md`
- **Authentication Service**: Ready-to-use Dart classes
- **State Management**: Provider/Riverpod examples
- **UI Components**: Story creation and reading widgets
- **Testing**: Unit and widget test examples

## �📡 API Endpoints

### 🔐 Authentication Routes (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | User registration | ❌ |
| POST | `/login` | User login | ❌ |
| POST | `/refresh-token` | Refresh JWT token | ❌ |
| POST | `/forgot-password` | Request password reset | ❌ |
| POST | `/reset-password/:token` | Reset password with token | ❌ |
| GET | `/verify-email/:token` | Verify email address | ❌ |
| POST | `/resend-verification` | Resend verification email | ❌ |
| POST | `/logout` | Logout current session | ✅ |
| POST | `/logout-all` | Logout all sessions | ✅ |
| PUT | `/update-password` | Update password | ✅ |
| PUT | `/update-email` | Update email address | ✅ |
| GET | `/me` | Get current user info | ✅ |
| DELETE | `/delete-account` | Delete user account | ✅ |
| POST | `/2fa/enable` | Enable 2FA | ✅ |
| POST | `/2fa/verify` | Verify 2FA code | ✅ |
| POST | `/2fa/disable` | Disable 2FA | ✅ |

### 👤 User Management Routes (`/api/user`)
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/profile` | Get user profile | ✅ | User |
| PUT | `/profile` | Update user profile | ✅ | User |
| GET | `/dashboard` | Get user dashboard | ✅ | User |
| PUT | `/progress` | Update user progress | ✅ | User |
| POST | `/profile/avatar` | Upload avatar | ✅ | User |
| PUT | `/stories/saved` | Manage saved stories | ✅ | User |
| PUT | `/stories/favorites` | Manage favorite stories | ✅ | User |
| PUT | `/parental-controls` | Update parental controls | ✅ | Parent/Admin |
| GET | `/all` | Get all users | ✅ | Admin/Moderator |
| GET | `/:userId` | Get specific user | ✅ | Admin/Moderator |
| PUT | `/:userId/role` | Update user role | ✅ | Admin |
| DELETE | `/:userId` | Delete user account | ✅ | Admin |

### 📚 Story Management Routes (`/api/v1/stories`)
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/types` | Get all story types | ✅ | User |
| GET | `/challenges/daily` | Get daily challenges | ✅ | User |
| GET | `/featured` | Get featured stories | ✅ | User |
| GET | `/user` | Get user's stories | ✅ | User |
| GET | `/my-stories` | Get user's stories (alias) | ✅ | User |
| POST | `/create` | Create new story | ✅ | User |
| GET | `/:storyId` | Get story by ID | ✅ | User |
| GET | `/:storyId/status` | Get story status | ✅ | User |
| PUT | `/:storyId/share` | Toggle story sharing | ✅ | User |
| POST | `/:storyId/continue` | Continue existing story | ✅ | User |
| DELETE | `/:storyId` | Delete story | ✅ | User |
| GET | `/debug` | Database debug info | ✅ | User |

## 🧪 Testing

### Manual Testing
All endpoints have been thoroughly tested and verified working:

```bash
# Test authentication
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Test story creation
curl -X POST http://localhost:3001/api/v1/stories/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storyTypeId":"adventure_forest_children_2_0","userPrompt":"A magical adventure"}'
```

### Automated Testing
```bash
npm test              # Run all tests
npm run test:auth     # Test authentication endpoints
npm run test:stories  # Test story endpoints
npm run test:users    # Test user management endpoints
```

## 📊 API Collections

Import these collections into Postman or Insomnia:
- `docs/api-collections/PictoTale-Auth.postman_collection.json`
- `docs/api-collections/PictoTale-Stories.postman_collection.json`
- `docs/api-collections/PictoTale-Users.postman_collection.json`

## 🔧 Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/pictotale
FIREBASE_PROJECT_ID=your-firebase-project-id

# AI Services
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# Security
JWT_SECRET=your-super-secure-jwt-secret
SESSION_SECRET=your-session-secret

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Databases     │
│   (Flutter)   │◄──►│   (Node.js)     │◄──►│   Firebase      │
│                 │    │                 │    │   MongoDB       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   AI Services   │
                       │   (OpenAI)      │
                       └─────────────────┘
```

## 🚀 Production Deployment

### Prerequisites
- Node.js 18+ production server
- MongoDB Atlas or self-hosted MongoDB
- Firebase project with production configuration
- SSL certificate for HTTPS
- CDN for static assets (optional)

### Deployment Steps

1. **Environment Setup:**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export PORT=3001
   # ... other environment variables
   ```

2. **Database Setup:**
   ```bash
   # Ensure MongoDB is running and accessible
   # Firestore indexes should be deployed
   ```

3. **Security Configuration:**
   ```bash
   # Configure CORS for your domain
   # Set up rate limiting
   # Enable security headers
   ```

4. **Process Management:**
   ```bash
   # Using PM2 for process management
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

5. **Monitoring:**
   ```bash
   # Set up logging and monitoring
   # Configure health checks
   # Set up alerting
   ```

### Production Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables securely configured
- [ ] Database connections secured and optimized
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled and tuned
- [ ] Logging configured for production
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] CI/CD pipeline configured
- [ ] Load balancing configured (if needed)
- [ ] CDN configured for static assets
- [ ] Security headers enabled
- [ ] Error tracking implemented
- [ ] Performance monitoring enabled

## 📈 Performance & Scaling

### Current Optimizations
- **Cost-Optimized AI**: 50-word story limit reduces OpenAI costs by 80%
- **Efficient Queries**: Firestore composite indexes for fast data retrieval
- **Session Management**: MongoDB sessions for scalable authentication
- **Content Caching**: Story types and challenges cached for performance
- **Lazy Loading**: Stories loaded on-demand with pagination

### Scaling Considerations
- **Horizontal Scaling**: Stateless design allows multiple server instances
- **Database Sharding**: MongoDB supports horizontal scaling
- **CDN Integration**: Static assets can be served from CDN
- **Caching Layer**: Redis can be added for additional caching
- **Load Balancing**: Multiple server instances behind load balancer

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed API documentation
- **Issues**: Report bugs and request features via GitHub Issues


---

**Built with ❤️ for children's creativity and imagination** 🎨📚✨