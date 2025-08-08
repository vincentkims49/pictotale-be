# JWT Token Mismatch Error Handling

## 🎯 Overview

This document explains how the PictoTale Backend API handles JWT token mismatch errors and provides comprehensive error handling for authentication issues.

## 🔧 Error Types and Handling

### 1. **Token Expiration Errors**

**Error**: `TokenExpiredError`
**Status Code**: `401`
**Message**: "Your session has expired. Please login again."

```json
{
  "success": false,
  "error": {
    "message": "Your session has expired. Please login again.",
    "code": "TOKEN_EXPIRED"
  }
}
```

**Flutter Handling**:
```dart
if (error.code == 'TOKEN_EXPIRED') {
  // Clear stored tokens
  await secureStorage.delete(key: 'auth_token');
  await secureStorage.delete(key: 'refresh_token');
  
  // Redirect to login
  Navigator.pushReplacementNamed(context, '/login');
}
```

### 2. **Invalid Token Format**

**Error**: `JsonWebTokenError`
**Status Code**: `401`
**Message**: "Invalid authentication token. Please login again."

```json
{
  "success": false,
  "error": {
    "message": "Invalid authentication token. Please login again.",
    "code": "INVALID_TOKEN"
  }
}
```

**Common Causes**:
- Malformed token structure
- Invalid signature
- Token corrupted during storage/transmission

### 3. **Token Not Yet Valid**

**Error**: `NotBeforeError`
**Status Code**: `401`
**Message**: "Authentication token not yet valid."

```json
{
  "success": false,
  "error": {
    "message": "Authentication token not yet valid.",
    "code": "TOKEN_NOT_ACTIVE"
  }
}
```

### 4. **Missing Token Data**

**Error**: Custom validation
**Status Code**: `401`
**Message**: "Invalid token: missing user ID" or "Invalid token: missing email"

```json
{
  "success": false,
  "error": {
    "message": "Invalid token: missing user ID",
    "code": "INVALID_TOKEN_DATA"
  }
}
```

### 5. **Session Mismatch**

**Error**: Custom validation
**Status Code**: `401`
**Message**: "Session expired or invalid. Please login again."

```json
{
  "success": false,
  "error": {
    "message": "Session expired or invalid. Please login again.",
    "code": "SESSION_MISMATCH"
  }
}
```

### 6. **User Account Issues**

**Firebase Errors**:
- `auth/user-not-found`: User account deleted
- `auth/user-disabled`: User account disabled
- `auth/custom-token-mismatch`: Token format mismatch

## 🛠️ Implementation Details

### JWT Utility Functions

The `JWTUtils` class provides comprehensive token validation:

```javascript
// Validate token with error handling
const decoded = JWTUtils.validateToken(token, secret);

// Check token format
const isValid = JWTUtils.isValidTokenFormat(token);

// Check if expired
const isExpired = JWTUtils.isTokenExpired(token);

// Extract token from request
const token = JWTUtils.extractToken(req);
```

### Authentication Middleware Flow

1. **Extract Token**: From Authorization header, cookies, or custom header
2. **Format Validation**: Check if token has valid JWT structure
3. **Expiration Check**: Verify token hasn't expired
4. **Signature Verification**: Validate token signature
5. **Payload Validation**: Check required fields (uid, email)
6. **Firebase Verification**: Verify user exists and is active
7. **Session Consistency**: Check session matches token data

### Error Response Format

All JWT errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": "Additional technical details (development only)"
  }
}
```

## 📱 Flutter Integration

### HTTP Interceptor for Token Errors

```dart
class AuthInterceptor extends Interceptor {
  @override
  void onError(DioError err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final errorData = err.response?.data;
      
      if (errorData['error']['code'] == 'TOKEN_EXPIRED') {
        // Try to refresh token
        final refreshed = await _refreshToken();
        if (refreshed) {
          // Retry original request
          return handler.resolve(await _retry(err.requestOptions));
        }
      }
      
      // Clear tokens and redirect to login
      await _clearTokensAndRedirect();
    }
    
    handler.next(err);
  }
}
```

### Token Refresh Implementation

```dart
Future<bool> _refreshToken() async {
  try {
    final refreshToken = await secureStorage.read(key: 'refresh_token');
    if (refreshToken == null) return false;

    final response = await dio.post('/api/auth/refresh-token', data: {
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
    print('Token refresh failed: $e');
  }
  
  return false;
}
```

### Error Handling in UI

```dart
void _handleApiError(DioError error) {
  String message = 'An error occurred';
  
  if (error.response?.data != null) {
    final errorData = error.response!.data;
    message = errorData['error']['message'] ?? message;
    
    // Handle specific error codes
    switch (errorData['error']['code']) {
      case 'TOKEN_EXPIRED':
        _showLoginDialog('Your session has expired');
        break;
      case 'INVALID_TOKEN':
        _clearTokensAndRedirect();
        break;
      case 'SESSION_MISMATCH':
        _forceRelogin();
        break;
    }
  }
  
  _showErrorSnackbar(message);
}
```

## 🧪 Testing JWT Errors

### Debug Endpoints (Development Only)

```bash
# Generate test tokens
POST /api/debug/generate-test-tokens

# Test token validation
POST /api/debug/test-jwt
{
  "token": "your-test-token"
}

# Test protected route
GET /api/debug/test-protected
Authorization: Bearer your-token

# Test mismatch scenarios
POST /api/debug/test-token-mismatch
```

### Manual Testing

```bash
# Test expired token
curl -X GET "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer expired.token.here"

# Test malformed token
curl -X GET "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer invalid-format"

# Test missing token
curl -X GET "http://localhost:3001/api/user/profile"

# Test invalid signature
curl -X GET "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer token.with.wrong.signature"
```

## 🔒 Security Considerations

### Token Security
- Tokens are validated on every request
- Expired tokens are immediately rejected
- Invalid tokens trigger security logging
- Session consistency is enforced

### Error Information
- Production errors hide sensitive details
- Development mode provides detailed debugging
- All errors are logged for monitoring
- Rate limiting prevents brute force attacks

### Best Practices
- Always use HTTPS in production
- Store tokens securely on client
- Implement proper token refresh logic
- Handle all error scenarios gracefully
- Log security events for monitoring

## 📊 Monitoring and Logging

### Error Metrics
- Token validation failures
- Expired token attempts
- Invalid signature attempts
- Session mismatch occurrences

### Logging Format
```json
{
  "level": "error",
  "message": "JWT validation failed",
  "errorName": "TokenExpiredError",
  "errorCode": "TOKEN_EXPIRED",
  "userId": "user-id-if-available",
  "ip": "client-ip",
  "userAgent": "client-user-agent",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## 🚀 Production Deployment

### Environment Variables
```bash
JWT_SECRET=your-super-secure-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

### Security Headers
```javascript
// Add security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    },
  },
}));
```

This comprehensive JWT error handling ensures a secure and user-friendly authentication experience in your PictoTale application!
