# Backend Integration Instructions

## Quick Setup Guide

I've created a ready-to-use backend routes file: **`backend-auth-routes.js`**

---

## Option 1: Add to Existing Auth Routes File

### Step 1: Open Your Backend Auth Routes File
Find your existing auth routes file (usually `routes/auth.js` or similar)

### Step 2: Copy the Routes
Open `backend-auth-routes.js` and copy these two routes:
- `POST /send-otp`
- `POST /verify-otp`

### Step 3: Adjust Imports
Update the imports at the top to match your backend:
```javascript
// Replace these with your actual imports:
const User = require('../models/User'); // Your User model
const jwt = require('jsonwebtoken'); // If you use JWT
// Remove or adjust based on your setup
```

### Step 4: Update Helper Functions
- **`generateJWT(user)`**: Replace with your existing JWT generation function
- **User Model**: Make sure `User.findOne()` and `User.create()` match your model

### Step 5: Add Environment Variable
Make sure your `.env` has:
```env
FIREBASE_API_KEY=your_firebase_api_key_here
```

---

## Option 2: Use as Standalone File

### Step 1: Copy the File
Copy `backend-auth-routes.js` to your backend's `routes/` directory

### Step 2: Update Imports
Uncomment and adjust the imports at the top:
```javascript
const User = require('../models/User');
const jwt = require('jsonwebtoken');
```

### Step 3: Implement `generateJWT`
Replace the placeholder `generateJWT` function with your actual implementation:
```javascript
function generateJWT(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      userId: user._id,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
```

### Step 4: Import in Your Main App
In your main server file (e.g., `app.js` or `server.js`):
```javascript
const authRoutes = require('./routes/auth'); // or './routes/backend-auth-routes'
app.use('/api/auth', authRoutes);
```

---

## Required Environment Variables

Add to your backend `.env`:
```env
FIREBASE_API_KEY=AIzaSyB2nDFIh15WylAq4WkgKtBwXNDII7Ej81c
JWT_SECRET=your_jwt_secret_here
```

---

## Testing

### Test Send OTP:
```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "role": "client"}'
```

### Test Verify OTP:
```bash
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'
```

---

## Important Notes

1. **Temporary Storage**: The code uses in-memory `Map` for OTP requests. For production, use Redis:
   ```javascript
   const redis = require('redis');
   const client = redis.createClient();
   // Replace Map operations with Redis operations
   ```

2. **User Model**: Make sure your User model has:
   - `phone` field
   - `role` field
   - `fullName` field (optional)
   - `profilePhoto` field (optional)

3. **JWT Generation**: Use your existing JWT generation logic to maintain consistency.

4. **Error Handling**: The code includes comprehensive error handling that matches what the mobile app expects.

---

## What to Customize

1. **User Model**: Adjust `User.findOne()` and `User.create()` to match your schema
2. **JWT Generation**: Replace `generateJWT()` with your existing function
3. **Storage**: Replace in-memory Map with Redis for production
4. **User Fields**: Adjust the user object returned in the response to match your schema

---

## After Integration

1. ✅ Test the endpoints with Postman/curl
2. ✅ Make sure environment variables are set
3. ✅ Test with the mobile app
4. ✅ Build the mobile app - it will work!

---

**The mobile app is ready - just integrate these routes!** 🚀

