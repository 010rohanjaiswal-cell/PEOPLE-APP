# Backend Endpoints Reference for Mobile App

## Endpoints the Mobile App Expects

### 1. Send OTP
```
POST /api/auth/send-otp
Content-Type: application/json

Request Body:
{
  "phoneNumber": "+919876543210",
  "role": "client"  // or "freelancer"
}

Success Response (200):
{
  "success": true,
  "message": "OTP sent successfully"
}

Error Response (400/500):
{
  "success": false,
  "error": "Error message here"
}
```

### 2. Verify OTP
```
POST /api/auth/verify-otp
Content-Type: application/json

Request Body:
{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}

Success Response (200):
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "id": "user_id",
    "phone": "+919876543210",
    "role": "client",
    "fullName": "John Doe" | null,
    "profilePhoto": "https://..." | null
  }
}

Error Response (400/500):
{
  "success": false,
  "error": "Error message here"
}
```

---

## Mobile App Implementation

The mobile app is already configured to call these endpoints:

- **Login Screen**: Calls `authAPI.sendOTP(phoneNumber, role)`
- **OTP Screen**: Calls `authAPI.verifyOTP(phoneNumber, otp)`

---

## What You Need to Do

1. **Add the 2 endpoints** to your backend (see `BACKEND_IMPLEMENTATION_GUIDE.md`)
2. **Test the endpoints** with Postman/curl
3. **Build the mobile app** - it will work!

---

**The mobile app is ready - just add the backend endpoints!** 🚀

