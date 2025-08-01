# Flutter Integration Guide

## 🎯 Overview

This guide helps Flutter developers integrate with the PictoTale Backend API to create a seamless children's storytelling experience.

## 📱 Flutter App Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Flutter App                             │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Widgets)                                        │
│  ├── Authentication Screens                                │
│  ├── Story Creation Screens                                │
│  ├── Story Reading Screens                                 │
│  ├── Profile & Dashboard                                   │
│  └── Admin Panel (if applicable)                           │
├─────────────────────────────────────────────────────────────┤
│  State Management (Provider/Riverpod/Bloc)                 │
│  ├── AuthProvider                                          │
│  ├── StoryProvider                                         │
│  ├── UserProvider                                          │
│  └── ProgressProvider                                      │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                            │
│  ├── ApiService (HTTP Client)                              │
│  ├── AuthService                                           │
│  ├── StorageService (Local Storage)                        │
│  └── NotificationService                                   │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                │
│  ├── Models (User, Story, etc.)                            │
│  ├── Repositories                                          │
│  └── Local Database (SQLite/Hive)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    PictoTale Backend API
```

## 🔧 Required Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  # HTTP Client
  dio: ^5.3.2
  
  # State Management (choose one)
  provider: ^6.1.1
  # OR riverpod: ^2.4.9
  # OR flutter_bloc: ^8.1.3
  
  # Secure Storage
  flutter_secure_storage: ^9.0.0
  
  # Local Database
  sqflite: ^2.3.0
  # OR hive: ^2.2.3
  
  # File Operations
  file_picker: ^6.1.1
  permission_handler: ^11.1.0
  
  # Image Handling
  cached_network_image: ^3.3.0
  image_picker: ^1.0.4
  
  # Audio
  audioplayers: ^5.2.1
  
  # UI Enhancements
  lottie: ^2.7.0
  shimmer: ^3.0.0
  
  # Firebase (optional for push notifications)
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9

dev_dependencies:
  # Testing
  mockito: ^5.4.2
  http_mock_adapter: ^0.6.1
```

## 🔐 Authentication Service

Create an authentication service to handle API communication:

```dart
// lib/services/auth_service.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  static const String baseUrl = 'http://localhost:3001'; // Change for production
  static const _storage = FlutterSecureStorage();
  
  final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));

  AuthService() {
    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Add auth token to requests
        final token = await getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // Handle token refresh on 401
        if (error.response?.statusCode == 401) {
          final refreshed = await _refreshToken();
          if (refreshed) {
            // Retry the request
            final opts = error.requestOptions;
            final token = await getToken();
            opts.headers['Authorization'] = 'Bearer $token';
            final response = await _dio.fetch(opts);
            handler.resolve(response);
            return;
          }
        }
        handler.next(error);
      },
    ));
  }

  // Authentication Methods
  Future<AuthResult> register({
    required String email,
    required String password,
    required String displayName,
    required Map<String, dynamic> profile,
  }) async {
    try {
      final response = await _dio.post('/api/auth/register', data: {
        'email': email,
        'password': password,
        'displayName': displayName,
        'profile': profile,
      });
      
      if (response.data['success']) {
        await _storeTokens(
          response.data['data']['token'],
          response.data['data']['refreshToken'],
        );
        return AuthResult.success(response.data['data']['user']);
      }
      return AuthResult.error(response.data['error']['message']);
    } catch (e) {
      return AuthResult.error('Registration failed: $e');
    }
  }

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });
      
      if (response.data['success']) {
        await _storeTokens(
          response.data['data']['token'],
          response.data['data']['refreshToken'],
        );
        return AuthResult.success(response.data['data']['user']);
      }
      return AuthResult.error(response.data['error']['message']);
    } catch (e) {
      return AuthResult.error('Login failed: $e');
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/api/auth/logout');
    } finally {
      await _clearTokens();
    }
  }

  // Token Management
  Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;

      final response = await _dio.post('/api/auth/refresh-token', data: {
        'refreshToken': refreshToken,
      });

      if (response.data['success']) {
        await _storeTokens(
          response.data['data']['token'],
          response.data['data']['refreshToken'],
        );
        return true;
      }
    } catch (e) {
      await _clearTokens();
    }
    return false;
  }

  Future<void> _storeTokens(String token, String refreshToken) async {
    await _storage.write(key: 'auth_token', value: token);
    await _storage.write(key: 'refresh_token', value: refreshToken);
  }

  Future<void> _clearTokens() async {
    await _storage.delete(key: 'auth_token');
    await _storage.delete(key: 'refresh_token');
  }
}

class AuthResult {
  final bool success;
  final String? error;
  final Map<String, dynamic>? user;

  AuthResult.success(this.user) : success = true, error = null;
  AuthResult.error(this.error) : success = false, user = null;
}
```

## 📚 Story Service

Create a service for story management:

```dart
// lib/services/story_service.dart
import 'package:dio/dio.dart';

class StoryService {
  final Dio _dio;

  StoryService(this._dio);

  // Get all story types
  Future<List<StoryType>> getStoryTypes() async {
    final response = await _dio.get('/api/v1/stories/types');
    if (response.data['success']) {
      return (response.data['data']['storyTypes'] as List)
          .map((json) => StoryType.fromJson(json))
          .toList();
    }
    throw Exception('Failed to load story types');
  }

  // Create a new story
  Future<StoryCreationResult> createStory({
    required String storyTypeId,
    String? userPrompt,
    List<String>? characterNames,
    String? drawingImageBase64,
    bool isShared = false,
    Map<String, dynamic>? preferences,
  }) async {
    final response = await _dio.post('/api/v1/stories/create', data: {
      'storyTypeId': storyTypeId,
      if (userPrompt != null) 'userPrompt': userPrompt,
      if (characterNames != null) 'characterNames': characterNames,
      if (drawingImageBase64 != null) 'drawingImageBase64': drawingImageBase64,
      'isShared': isShared,
      if (preferences != null) 'preferences': preferences,
    });

    if (response.data['success']) {
      return StoryCreationResult.fromJson(response.data['data']);
    }
    throw Exception(response.data['error']['message']);
  }

  // Get story status
  Future<StoryStatus> getStoryStatus(String storyId) async {
    final response = await _dio.get('/api/v1/stories/$storyId/status');
    if (response.data['success']) {
      return StoryStatus.fromJson(response.data['data']);
    }
    throw Exception('Failed to get story status');
  }

  // Get user stories
  Future<List<Story>> getUserStories({int page = 1, int limit = 10}) async {
    final response = await _dio.get('/api/v1/stories/user', queryParameters: {
      'page': page,
      'limit': limit,
    });
    
    if (response.data['success']) {
      return (response.data['data']['stories'] as List)
          .map((json) => Story.fromJson(json))
          .toList();
    }
    throw Exception('Failed to load user stories');
  }

  // Get story by ID
  Future<Story> getStory(String storyId) async {
    final response = await _dio.get('/api/v1/stories/$storyId');
    if (response.data['success']) {
      return Story.fromJson(response.data['data']['story']);
    }
    throw Exception('Failed to load story');
  }
}
```

## 👤 User Service

Create a service for user management:

```dart
// lib/services/user_service.dart
import 'package:dio/dio.dart';

class UserService {
  final Dio _dio;

  UserService(this._dio);

  // Get user profile
  Future<UserProfile> getProfile() async {
    final response = await _dio.get('/api/user/profile');
    if (response.data['success']) {
      return UserProfile.fromJson(response.data['data']['profile']);
    }
    throw Exception('Failed to load profile');
  }

  // Update user profile
  Future<void> updateProfile(UserProfile profile) async {
    final response = await _dio.put('/api/user/profile', data: profile.toJson());
    if (!response.data['success']) {
      throw Exception(response.data['error']['message']);
    }
  }

  // Get user dashboard
  Future<UserDashboard> getDashboard() async {
    final response = await _dio.get('/api/user/dashboard');
    if (response.data['success']) {
      return UserDashboard.fromJson(response.data['data']);
    }
    throw Exception('Failed to load dashboard');
  }

  // Update user progress
  Future<void> updateProgress(UserProgress progress) async {
    final response = await _dio.put('/api/user/progress', data: progress.toJson());
    if (!response.data['success']) {
      throw Exception(response.data['error']['message']);
    }
  }

  // Manage saved stories
  Future<void> manageSavedStory(String storyId, String action) async {
    final response = await _dio.put('/api/user/stories/saved', data: {
      'storyId': storyId,
      'action': action, // 'add' or 'remove'
    });
    if (!response.data['success']) {
      throw Exception(response.data['error']['message']);
    }
  }

  // Manage favorite stories
  Future<void> manageFavoriteStory(String storyId, String action) async {
    final response = await _dio.put('/api/user/stories/favorites', data: {
      'storyId': storyId,
      'action': action, // 'add' or 'remove'
    });
    if (!response.data['success']) {
      throw Exception(response.data['error']['message']);
    }
  }
}
```

## 🎨 State Management with Provider

Example using Provider for state management:

```dart
// lib/providers/auth_provider.dart
import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  
  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _error = null;
    
    final result = await _authService.login(email: email, password: password);
    
    if (result.success) {
      _user = User.fromJson(result.user!);
      _setLoading(false);
      return true;
    } else {
      _error = result.error;
      _setLoading(false);
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
}
```

## 📱 UI Examples

### Login Screen
```dart
// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login to PictoTale')),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          return Padding(
            padding: EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _emailController,
                    decoration: InputDecoration(labelText: 'Email'),
                    validator: (value) {
                      if (value?.isEmpty ?? true) return 'Email is required';
                      return null;
                    },
                  ),
                  TextFormField(
                    controller: _passwordController,
                    decoration: InputDecoration(labelText: 'Password'),
                    obscureText: true,
                    validator: (value) {
                      if (value?.isEmpty ?? true) return 'Password is required';
                      return null;
                    },
                  ),
                  SizedBox(height: 20),
                  if (authProvider.error != null)
                    Text(
                      authProvider.error!,
                      style: TextStyle(color: Colors.red),
                    ),
                  SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: authProvider.isLoading ? null : _login,
                    child: authProvider.isLoading
                        ? CircularProgressIndicator()
                        : Text('Login'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _login() async {
    if (_formKey.currentState?.validate() ?? false) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final success = await authProvider.login(
        _emailController.text,
        _passwordController.text,
      );
      
      if (success) {
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
    }
  }
}
```

## 🔄 Real-time Story Status Updates

```dart
// lib/widgets/story_creation_progress.dart
import 'package:flutter/material.dart';
import 'dart:async';

class StoryCreationProgress extends StatefulWidget {
  final String storyId;
  final VoidCallback onComplete;

  StoryCreationProgress({required this.storyId, required this.onComplete});

  @override
  _StoryCreationProgressState createState() => _StoryCreationProgressState();
}

class _StoryCreationProgressState extends State<StoryCreationProgress> {
  Timer? _timer;
  StoryStatus? _status;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  void _startPolling() {
    _timer = Timer.periodic(Duration(seconds: 2), (timer) async {
      try {
        final storyService = Provider.of<StoryService>(context, listen: false);
        final status = await storyService.getStoryStatus(widget.storyId);
        
        setState(() {
          _status = status;
        });

        if (status.status == 'completed') {
          timer.cancel();
          widget.onComplete();
        } else if (status.status == 'failed') {
          timer.cancel();
          _showError(status.error ?? 'Story creation failed');
        }
      } catch (e) {
        timer.cancel();
        _showError('Failed to check story status');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text('Creating your magical story...'),
            SizedBox(height: 16),
            LinearProgressIndicator(
              value: _status?.progress != null ? _status!.progress / 100 : null,
            ),
            SizedBox(height: 8),
            Text(_status?.estimatedTime ?? 'Estimating time...'),
          ],
        ),
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
```

## 🔧 Best Practices

### Error Handling
- Always wrap API calls in try-catch blocks
- Show user-friendly error messages
- Implement retry mechanisms for network failures
- Handle rate limiting gracefully

### Performance
- Use pagination for large lists
- Implement lazy loading for images
- Cache frequently accessed data locally
- Use efficient state management

### Security
- Store tokens securely using `flutter_secure_storage`
- Validate all user inputs
- Implement proper logout functionality
- Handle token expiration gracefully

### User Experience
- Show loading indicators during API calls
- Implement offline support where possible
- Use optimistic updates for better responsiveness
- Provide clear feedback for all user actions

## 📱 Platform-Specific Considerations

### iOS
- Configure App Transport Security for HTTP requests
- Handle background app refresh for story status updates
- Implement proper keychain access for secure storage

### Android
- Configure network security config for HTTP requests
- Handle background processing limitations
- Implement proper encrypted shared preferences

## 🧪 Testing

### Unit Tests
```dart
// test/services/auth_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:dio/dio.dart';

void main() {
  group('AuthService', () {
    late AuthService authService;
    late MockDio mockDio;

    setUp(() {
      mockDio = MockDio();
      authService = AuthService();
      // Inject mock dio
    });

    test('login should return success result on valid credentials', () async {
      // Arrange
      when(mockDio.post('/api/auth/login', data: anyNamed('data')))
          .thenAnswer((_) async => Response(
                data: {'success': true, 'data': {'token': 'test-token'}},
                statusCode: 200,
                requestOptions: RequestOptions(path: ''),
              ));

      // Act
      final result = await authService.login(
        email: 'test@example.com',
        password: 'password',
      );

      // Assert
      expect(result.success, true);
    });
  });
}
```

This comprehensive Flutter integration guide provides everything needed to build a robust mobile app that works seamlessly with the PictoTale Backend API!
