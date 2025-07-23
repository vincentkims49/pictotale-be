
# 📘 PictoTale API Documentation

## 🌐 Base URLs

- `http://localhost:3000/api` → **Auth & User**
- `http://localhost:3000/api/v1` → **Stories**

---

## 📊 Common Status Codes

| Code | Description          |
|------|----------------------|
| 200  | OK                   |
| 201  | Created              |
| 400  | Bad Request          |
| 401  | Unauthorized         |
| 403  | Forbidden            |
| 404  | Not Found            |
| 429  | Too Many Requests    |
| 500  | Internal Server Error|

---

## 🚦 Rate Limits

| Endpoint Type   | Limit            |
|-----------------|------------------|
| Auth (Login/Reg)| 10 requests/min  |
| Account Mgmt    | 10 requests/min  |
| General         | 60 requests/min  |
| Admin           | 30 requests/min  |

```json
// Example 429 response
{
  "success": false,
  "error": {
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## 🔐 Auth Endpoints (`/api/auth`)

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{ "email": "user@example.com", "password": "123", "displayName": "User" }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{ "email": "user@example.com", "password": "123" }'
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh-token
```

### Forgot Password
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password -H "Content-Type: application/json" -d '{ "email": "user@example.com" }'
```

### Reset Password
```bash
curl -X POST http://localhost:3000/api/auth/reset-password/<token> -H "Content-Type: application/json" -d '{ "password": "NewPass123!" }'
```

### Verify Email
```bash
curl http://localhost:3000/api/auth/verify-email/<token>
```

### Resend Verification Email
```bash
curl -X POST http://localhost:3000/api/auth/resend-verification
```

### Logout (Current Device)
```bash
curl -X POST http://localhost:3000/api/auth/logout -H "Authorization: Bearer <token>"
```

### Logout All Devices
```bash
curl -X POST http://localhost:3000/api/auth/logout-all -H "Authorization: Bearer <token>"
```

### Get Current User
```bash
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <token>"
```

### Update Password
```bash
curl -X PUT http://localhost:3000/api/auth/update-password -H "Authorization: Bearer <token>" -d '{ "currentPassword": "old123", "newPassword": "new123" }'
```

### Update Email
```bash
curl -X PUT http://localhost:3000/api/auth/update-email -H "Authorization: Bearer <token>" -d '{ "newEmail": "updated@example.com" }'
```

### Delete Account
```bash
curl -X DELETE http://localhost:3000/api/auth/delete-account -H "Authorization: Bearer <token>"
```

### Two-Factor Auth (2FA)
```bash
curl -X POST http://localhost:3000/api/auth/2fa/enable
curl -X POST http://localhost:3000/api/auth/2fa/verify
curl -X POST http://localhost:3000/api/auth/2fa/disable
```

---

## 📚 Story Endpoints (`/api/v1/stories`)

### Get Story Types
```bash
curl http://localhost:3000/api/v1/stories/types
```

### Get Daily Challenges
```bash
curl http://localhost:3000/api/v1/stories/challenges/daily
```

### Get Featured Stories
```bash
curl http://localhost:3000/api/v1/stories/featured
```

### Get User Stories
```bash
curl http://localhost:3000/api/v1/stories/my-stories -H "Authorization: Bearer <token>"
```

### Create Story
```bash
curl -X POST http://localhost:3000/api/v1/stories/create -H "Authorization: Bearer <token>" -d '{ "storyTypeId": "adventure", "userPrompt": "A tale", "characterNames": ["Alex"] }'
```

### Get Story By ID
```bash
curl http://localhost:3000/api/v1/stories/<storyId> -H "Authorization: Bearer <token>"
```

### Get Story Status
```bash
curl http://localhost:3000/api/v1/stories/<storyId>/status -H "Authorization: Bearer <token>"
```

### Toggle Story Share
```bash
curl -X PUT http://localhost:3000/api/v1/stories/<storyId>/share -H "Authorization: Bearer <token>"
```

### Continue Story
```bash
curl -X POST http://localhost:3000/api/v1/stories/<storyId>/continue -H "Authorization: Bearer <token>"
```

### Delete Story
```bash
curl -X DELETE http://localhost:3000/api/v1/stories/<storyId> -H "Authorization: Bearer <token>"
```

### 🔐 Admin Story Routes

```bash
# Create Story Type
curl -X POST http://localhost:3000/api/v1/stories/types -H "Authorization: Bearer <admin_token>" -d '{ "typeId": "new-type" }'

# Update Story Type
curl -X PUT http://localhost:3000/api/v1/stories/types/<typeId> -H "Authorization: Bearer <admin_token>"

# Delete Story Type
curl -X DELETE http://localhost:3000/api/v1/stories/types/<typeId> -H "Authorization: Bearer <admin_token>"

# Create Daily Challenge
curl -X POST http://localhost:3000/api/v1/stories/challenges -H "Authorization: Bearer <admin_token>" -d '{ "title": "New Daily", "prompt": "Draw a tiger" }'
```

---

## 👤 User Endpoints (`/api/user`)

### Get Profile
```bash
curl http://localhost:3000/api/user/profile -H "Authorization: Bearer <token>"
```

### Update Profile
```bash
curl -X PUT http://localhost:3000/api/user/profile -H "Authorization: Bearer <token>" -d '{ "displayName": "New Name" }'
```

### Upload Avatar
```bash
curl -X POST http://localhost:3000/api/user/profile/avatar -H "Authorization: Bearer <token>" -F "avatar=@image.jpg"
```

### Get Dashboard
```bash
curl http://localhost:3000/api/user/dashboard -H "Authorization: Bearer <token>"
```

### Update Progress
```bash
curl -X PUT http://localhost:3000/api/user/progress -H "Authorization: Bearer <token>" -d '{ "completed": true }'
```

### Save Story
```bash
curl -X PUT http://localhost:3000/api/user/stories/saved -H "Authorization: Bearer <token>" -d '{ "storyId": "123", "save": true }'
```

### Favorite Story
```bash
curl -X PUT http://localhost:3000/api/user/stories/favorites -H "Authorization: Bearer <token>" -d '{ "storyId": "123", "favorite": true }'
```

### Parental Controls
```bash
curl -X PUT http://localhost:3000/api/user/parental-controls -H "Authorization: Bearer <admin_or_parent_token>" -d '{ "maxTime": 60 }'
```

---

### 👑 Admin & Moderator Routes

#### Get All Users
```bash
curl http://localhost:3000/api/user/all -H "Authorization: Bearer <admin_or_mod_token>"
```

#### Get User by ID
```bash
curl http://localhost:3000/api/user/<userId> -H "Authorization: Bearer <admin_or_mod_token>"
```

#### Update User Role
```bash
curl -X PUT http://localhost:3000/api/user/<userId>/role -H "Authorization: Bearer <admin_token>" -d '{ "role": "admin" }'
```

#### Delete User
```bash
curl -X DELETE http://localhost:3000/api/user/<userId> -H "Authorization: Bearer <admin_token>"
```
