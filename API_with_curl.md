# API Documentation

## 📊 Common Status Codes

| Code | Description          |
|------|----------------------|
| 400  | Bad Request          |
| 401  | Unauthorized         |
| 403  | Forbidden            |
| 404  | Not Found            |
| 429  | Too Many Requests    |

---

## 🚦 Rate Limits

| Endpoint Type   | Limit         |
|-----------------|---------------|
| Authentication  | 10 requests/min |
| Regular         | 60 requests/min |
| Admin           | 30 requests/min |

**Note:**  
If rate limits are exceeded, a `429` status is returned with the following response:
```json
{
  "success": false,
  "error": {
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

# PictoTale API Documentation

## Base URL
`http://localhost:3000/api` for auth and `http://localhost:3000/api/v1` for stories

## Authentication
All endpoints (except auth routes) require authentication via:
- JWT token in Authorization header: `Bearer <token>`
- Or session cookie (for browser-based access)

---

## 🔐 Auth Endpoints

### Register User  
```bash
curl -X POST http://localhost:3000/api/auth/register \
-H "Content-Type: application/json" \
-d '{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "User Name"
}'
```

---

### Login  
```bash
curl -X POST http://localhost:3000/api/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}'
```

---

### Verify Email  
```bash
curl http://localhost:3000/api/auth/verify-email/<token>
```

---

### Forgot Password  
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
-H "Content-Type: application/json" \
-d '{ "email": "user@example.com" }'
```

---

### Reset Password  
```bash
curl -X POST http://localhost:3000/api/auth/reset-password/<token> \
-H "Content-Type: application/json" \
-d '{ "password": "NewSecurePass123!" }'
```

---

### Get Current User  
```bash
curl http://localhost:3000/api/auth/me \
-H "Authorization: Bearer <token>"
```

---

## 📚 Story Endpoints

### Get Story Types  
```bash
curl "http://localhost:3000/api/v1/stories/types?age=6&language=en"
```

---

### Create Story  
```bash
curl -X POST http://localhost:3000/api/v1/stories/create \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "storyTypeId": "adventure",
  "userPrompt": "A knight\'s tale",
  "characterNames": ["Sir Lancelot"],
  "drawingImageBase64": "(optional)"
}'
```

---

### Get User Stories  
```bash
curl "http://localhost:3000/api/v1/stories/my-stories?page=1&limit=10&status=completed" \
-H "Authorization: Bearer <token>"
```

---

## 👤 User Endpoints

### Get Profile  
```bash
curl http://localhost:3000/api/user/profile \
-H "Authorization: Bearer <token>"
```

---

### Update Profile  
```bash
curl -X PUT http://localhost:3000/api/user/profile \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "displayName": "New Name",
  "preferences": {
    "narrationSpeed": 1.2
  }
}'
```

---

### Upload Avatar  
```bash
curl -X POST http://localhost:3000/api/user/profile/avatar \
-H "Authorization: Bearer <token>" \
-F "avatar=@path_to_image.jpg"
```

---

## 🛠️ Admin Endpoints

### Get All Users  
```bash
curl "http://localhost:3000/api/user/all?role=user&status=active&page=1&limit=10" \
-H "Authorization: Bearer <admin_token>"
```

---

### Update User Role  
```bash
curl -X PUT http://localhost:3000/api/user/<userId>/role \
-H "Authorization: Bearer <admin_token>" \
-H "Content-Type: application/json" \
-d '{ "role": "admin" }'
```
