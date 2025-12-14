# People App Backend

Backend API server for People App mobile application.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `FIREBASE_API_KEY` - Firebase API key for phone authentication
- `PORT` - Server port (default: 3001)

### 3. Start Server

Development (with auto-reload):
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Authentication

#### Send OTP
```
POST /api/auth/send-otp
Body: {
  "phoneNumber": "+919876543210",
  "role": "client" // or "freelancer"
}
```

#### Verify OTP
```
POST /api/auth/verify-otp
Body: {
  "phoneNumber": "+919876543210",
  "otp": "123456"
}
Response: {
  "success": true,
  "token": "jwt_token",
  "user": { ... }
}
```

#### Logout
```
POST /api/auth/logout
Headers: Authorization: Bearer {token}
```

## Project Structure

```
backend/
├── config/
│   └── database.js      # MongoDB connection
├── middleware/
│   └── auth.js          # Authentication middleware
├── models/
│   └── User.js          # User model
├── routes/
│   └── auth.js          # Authentication routes
├── utils/
│   └── jwt.js           # JWT utilities
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── README.md
└── server.js            # Server entry point
```

## Testing

### Test Send OTP
```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "role": "client"}'
```

### Test Verify OTP
```bash
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'
```

## Notes

- OTP requests are stored in-memory (use Redis for production)
- JWT tokens expire in 7 days (configurable via `JWT_EXPIRES_IN`)
- CORS is configured to allow requests from specified origins

