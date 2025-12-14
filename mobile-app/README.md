# People App - Mobile Application

React Native Android app for the People freelancing platform.

## Project Status

### ✅ Phase 1: Foundation & Setup - COMPLETED

- [x] Project initialized with Expo
- [x] Core dependencies installed
- [x] Folder structure created
- [x] Design system implemented (colors, typography, spacing)
- [x] Reusable components built (Button, Card, Input, Label, Badge, LoadingSpinner, EmptyState)
- [x] API service layer created
- [x] State management set up (AuthContext, UserContext)
- [x] Navigation structure in place
- [x] Utility functions created (validation, formatters)
- [x] Constants defined

### 🚧 Phase 2: Authentication Flow - NEXT

- [ ] Login Screen
- [ ] OTP Verification Screen
- [ ] Profile Setup Screen
- [ ] Protected Routes

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)

### Installation

1. Navigate to the project directory:
```bash
cd mobile-app
```

2. Install dependencies (already done):
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
- API Base URL
- Firebase credentials
- Cloudinary credentials (if needed)
- PhonePe credentials (if needed)

4. Start the development server:
```bash
npm start
```

5. Run on Android:
```bash
npm run android
```

## Project Structure

```
mobile-app/
├── src/
│   ├── api/              # API service layer
│   │   ├── client.js     # Base API client
│   │   ├── auth.js       # Authentication endpoints
│   │   ├── clientJobs.js # Client job endpoints
│   │   ├── freelancerJobs.js # Freelancer job endpoints
│   │   ├── wallet.js     # Wallet endpoints
│   │   ├── verification.js # Verification endpoints
│   │   └── payment.js    # Payment endpoints
│   ├── components/       # Reusable components
│   │   ├── common/       # Button, Card, Input, Label, Badge, etc.
│   │   ├── modals/       # Modal components (to be created)
│   │   └── layout/       # Layout components (to be created)
│   ├── context/          # State management
│   │   ├── AuthContext.js
│   │   └── UserContext.js
│   ├── navigation/       # Navigation setup
│   │   └── AppNavigator.js
│   ├── screens/          # Screen components
│   │   ├── auth/         # Login, OTP, ProfileSetup (to be created)
│   │   ├── client/       # Client screens (to be created)
│   │   └── freelancer/    # Freelancer screens (to be created)
│   ├── theme/            # Design system
│   │   ├── colors.js
│   │   ├── typography.js
│   │   ├── spacing.js
│   │   └── index.js
│   ├── utils/            # Utility functions
│   │   ├── validation.js
│   │   └── formatters.js
│   └── constants/        # Constants
│       └── index.js
├── App.js                # Main app entry point
└── package.json
```

## Design System

The app uses a consistent design system based on the documentation:

- **Primary Color:** `#2563EB` (blue-600)
- **Success Color:** `#16A34A` (green-600)
- **Error Color:** `#DC2626` (red-600)
- **Warning Color:** `#EA580C` (orange-600)
- **Pending Color:** `#CA8A04` (yellow-600)

See `src/theme/` for complete design system.

## API Integration

All API calls go through the service layer in `src/api/`. The base client handles:
- Authentication token injection
- Error handling
- Request/response interceptors

## State Management

- **AuthContext:** Manages authentication state, login, logout
- **UserContext:** Manages user profile data

## Navigation

Navigation is set up with React Navigation:
- Auth Stack (for unauthenticated users)
- Client Stack (for client role)
- Freelancer Stack (for freelancer role)

## Development Roadmap

See `DEVELOPMENT_ROADMAP.md` in the parent directory for the complete development plan.

## Environment Variables

Required environment variables (see `.env.example`):

- `EXPO_PUBLIC_API_BASE_URL` - Backend API base URL
- `EXPO_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `EXPO_PUBLIC_FIREBASE_APP_ID` - Firebase app ID

## Next Steps

1. Complete Phase 2: Authentication Flow
2. Build Login Screen
3. Build OTP Verification Screen
4. Build Profile Setup Screen
5. Test authentication flow end-to-end

## Notes

- Admin panel is web-only and already exists
- Freelancer verification is submitted via mobile, approved via web admin panel
- All design system values match the documentation exactly

