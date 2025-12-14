# People App - Mobile & Backend

Complete mobile application and backend API for the People freelancing platform.

## Repository Structure

```
PEOPLE APP/
├── backend/              # Backend API server
│   ├── routes/          # API routes
│   ├── models/          # Database models
│   ├── middleware/       # Express middleware
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration files
│   └── server.js        # Server entry point
├── mobile-app/          # React Native mobile app
│   ├── src/
│   │   ├── api/         # API client
│   │   ├── screens/    # App screens
│   │   ├── components/  # Reusable components
│   │   ├── navigation/  # Navigation setup
│   │   └── context/    # State management
│   └── app.json        # Expo configuration
└── Documentation files
```

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Start the server:
```bash
npm run dev  # Development
npm start    # Production
```

### Mobile App Setup

1. Navigate to mobile app directory:
```bash
cd mobile-app
```

2. Install dependencies:
```bash
npm install
```

3. Start Expo:
```bash
npm start
```

## Backend API

### Base URL
- **Production**: `https://freelancing-platform-backend-backup.onrender.com`
- **Development**: `http://localhost:3001`

### Authentication Endpoints

- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP and get JWT token
- `POST /api/auth/logout` - Logout user

## Technologies

### Backend
- Node.js + Express
- MongoDB (Mongoose)
- Firebase (Phone Authentication)
- JWT (Authentication)
- Cloudinary (Image Storage)

### Mobile App
- React Native (Expo)
- React Navigation
- Axios (API calls)
- Context API (State management)

## Documentation

- `APP_COMPLETE_DOCUMENTATION.md` - Complete app documentation
- `DEVELOPMENT_ROADMAP.md` - Development roadmap and checklist
- `backend/README.md` - Backend setup instructions
- `mobile-app/README.md` - Mobile app setup instructions

## GitHub Repository

Repository: [https://github.com/010rohanjaiswal-cell/PEOPLE-APP.git](https://github.com/010rohanjaiswal-cell/PEOPLE-APP.git)

## License

Private repository

