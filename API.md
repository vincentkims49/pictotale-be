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
**POST** `/auth/register`

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "User Name"
}
```

**Success Response**
```json
{
  "success": true,
  "message": "User registered. Please verify email."
}
```

---

### Login  
**POST** `/auth/login`

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Success Response**
```json
{
  "success": true,
  "token": "eyJ...",
  "data": {
    "user": {
      "uid": "user123",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

---

### Verify Email  
**GET** `/auth/verify-email/:token`

**Success Response**
```json
{
  "success": true,
  "message": "Email verified"
}
```

---

### Forgot Password  
**POST** `/auth/forgot-password`

**Request**
```json
{
  "email": "user@example.com"
}
```

---

### Reset Password  
**POST** `/auth/reset-password/:token`

**Request**
```json
{
  "password": "NewSecurePass123!"
}
```

---

### Get Current User  
**GET** `/auth/me`

**Success Response**
```json
{
  "success": true,
  "data": {
    "user": {
      "uid": "user123",
      "email": "user@example.com",
      "role": "user",
      "emailVerified": true
    }
  }
}
```

---

## 📚 Story Endpoints

### Get Story Types  
**GET** `/stories/types`

**Query Params**
- `age` – Filter by recommended age  
- `language` – Language code (default: `'en'`)

**Success Response**
```json
{
  "success": true,
  "data": {
    "storyTypes": [
      {
        "id": "adventure",
        "name": "Adventure",
        "description": "Exciting quests",
        "recommendedAgeMin": 4,
        "recommendedAgeMax": 12
      }
    ]
  }
}
```

---

### Create Story  
**POST** `/stories/create`

**Request**
```json
{
  "storyTypeId": "adventure",
  "userPrompt": "A knight's tale",
  "characterNames": ["Sir Lancelot"],
  "drawingImageBase64": "(optional)"
}
```

**Success Response**
```json
{
  "success": true,
  "data": {
    "storyId": "story123",
    "status": "generating"
  }
}
```

---

### Get User Stories  
**GET** `/stories/my-stories`

**Query Params**
- `page` – Pagination (default: `1`)  
- `limit` – Items per page (default: `10`)  
- `status` – Filter by status

**Success Response**
```json
{
  "success": true,
  "data": {
    "stories": [
      {
        "id": "story123",
        "title": "The Brave Knight",
        "status": "completed"
      }
    ]
  }
}
```

---

## 👤 User Endpoints

### Get Profile  
**GET** `/user/profile`

**Success Response**
```json
{
  "success": true,
  "data": {
    "profile": {
      "displayName": "User Name",
      "photoURL": "https://...",
      "preferences": {
        "narrationSpeed": 1.0
      }
    }
  }
}
```

---

### Update Profile  
**PUT** `/user/profile`

**Request**
```json
{
  "displayName": "New Name",
  "preferences": {
    "narrationSpeed": 1.2
  }
}
```

---

### Upload Avatar  
**POST** `/user/profile/avatar`

**Form Data**
- `avatar` – Image file (max 5MB)

**Success Response**
```json
{
  "success": true,
  "data": {
    "photoURL": "https://storage.googleapis.com/..."
  }
}
```

---

## 🛠️ Admin Endpoints

### Get All Users  
**GET** `/user/all`

**Query Params**
- `role` – Filter by role  
- `status` – `active` or `inactive`  
- `page` – Pagination  
- `limit` – Items per page

**Success Response**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "uid": "user123",
        "email": "user@example.com",
        "role": "user"
      }
    ]
  }
}
```

---

### Update User Role  
**PUT** `/user/:userId/role`

**Request**
```json
{
  "role": "admin"
}
```
