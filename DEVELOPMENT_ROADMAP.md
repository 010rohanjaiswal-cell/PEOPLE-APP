# People App - Development Roadmap & Plan
## React Native Android App Development Guide

**Version:** 1.0  
**Last Updated:** December 2025  
**Purpose:** Complete roadmap and checklist to build the People mobile app without losing track

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Development Phases](#development-phases)
3. [Phase 1: Foundation & Setup](#phase-1-foundation--setup)
4. [Phase 2: Authentication Flow](#phase-2-authentication-flow)
5. [Phase 3: Client Features](#phase-3-client-features)
6. [Phase 4: Freelancer Features](#phase-4-freelancer-features)
5. [Phase 5: Advanced Features & Polish](#phase-5-advanced-features--polish)
6. [Important Reminders](#important-reminders)
7. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
8. [Testing Checklist](#testing-checklist)
9. [Deployment Checklist](#deployment-checklist)

---

## Project Overview

### What We're Building
- **Mobile App (React Native Android)**
  - Authentication flow (Login, OTP, Profile Setup)
  - Client Dashboard (Post Job, My Jobs, History, Profile)
  - Freelancer Dashboard (Verification, Available Jobs, My Jobs, Wallet, Orders, Profile)

### What We're NOT Building
- **Admin Dashboard** (Already exists as web-only)
  - Admin will use web panel to:
    - Approve/reject freelancer verifications
    - Approve/reject withdrawal requests
    - Search users

### Key Workflow Note
- **Freelancer Verification Flow:**
  1. Freelancer submits verification documents via mobile app
  2. Admin reviews and approves/rejects via web admin panel
  3. Freelancer sees status update in mobile app
  4. Once approved, freelancer can access dashboard

---

## Development Phases

### Timeline Overview
- **Phase 1:** Foundation & Setup (Week 1)
- **Phase 2:** Authentication Flow (Week 2)
- **Phase 3:** Client Features (Week 3)
- **Phase 4:** Freelancer Features (Week 4)
- **Phase 5:** Advanced Features & Polish (Week 5)

---

## Phase 1: Foundation & Setup

### Goal
Set up project structure, design system, API layer, and state management before building any screens.

### Tasks Checklist

#### 1.1 Project Initialization
- [ ] Initialize React Native project (Expo or bare React Native)
- [ ] Install core dependencies:
  - [ ] React Navigation (`@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`)
  - [ ] State Management (Context API or Redux)
  - [ ] API Client (`axios` or `fetch`)
  - [ ] Form handling (`react-hook-form` or similar)
  - [ ] Image picker (`react-native-image-picker`)
  - [ ] Secure storage (`@react-native-async-storage/async-storage` or `expo-secure-store`)
- [ ] Configure environment variables structure
- [ ] Set up `.env` file template
- [ ] Add `.env` to `.gitignore`

#### 1.2 Folder Structure
- [ ] Create complete folder structure:
  ```
  src/
  ├── api/
  ├── components/
  │   ├── common/
  │   ├── modals/
  │   └── layout/
  ├── context/
  ├── navigation/
  ├── screens/
  │   ├── auth/
  │   ├── client/
  │   └── freelancer/
  ├── theme/
  ├── utils/
  └── constants/
  ```

#### 1.3 Design System Components
- [ ] Create `theme/colors.js` with all color constants from documentation
- [ ] Create `theme/typography.js` with font sizes and weights
- [ ] Create `theme/spacing.js` with spacing constants
- [ ] Build reusable components:
  - [ ] **Button Component**
    - [ ] Variants: default, destructive, outline, secondary, ghost, link
    - [ ] Sizes: default, sm, lg, icon
    - [ ] Loading state
    - [ ] Disabled state
  - [ ] **Card Component**
    - [ ] Card container
    - [ ] CardHeader
    - [ ] CardTitle
    - [ ] CardDescription
    - [ ] CardContent
  - [ ] **Input Component**
    - [ ] Text input
    - [ ] Number input
    - [ ] Textarea
    - [ ] Error state
    - [ ] Disabled state
    - [ ] Icon support (left/right)
  - [ ] **Label Component**
  - [ ] **Badge Component** (for status indicators)
  - [ ] **Loading Spinner Component**
  - [ ] **Empty State Component**

#### 1.4 API Service Layer
- [ ] Create `api/client.js`:
  - [ ] Base URL configuration (from environment variables)
  - [ ] Request interceptor (add auth token)
  - [ ] Response interceptor (handle errors)
  - [ ] Error handling
- [ ] Create API service files:
  - [ ] `api/auth.js` - Authentication endpoints
  - [ ] `api/clientJobs.js` - Client job endpoints
  - [ ] `api/freelancerJobs.js` - Freelancer job endpoints
  - [ ] `api/wallet.js` - Wallet endpoints
  - [ ] `api/verification.js` - Verification endpoints
  - [ ] `api/payment.js` - Payment endpoints
- [ ] Test API connection with backend
- [ ] Document all API endpoints used

#### 1.5 State Management Setup
- [ ] Create `context/AuthContext.js`:
  - [ ] User authentication state
  - [ ] Login function
  - [ ] Logout function
  - [ ] Token management
  - [ ] User role tracking
- [ ] Create `context/UserContext.js`:
  - [ ] User profile data
  - [ ] Update profile function
- [ ] Create `context/JobContext.js` (optional, can use local state):
  - [ ] Job lists
  - [ ] Job actions
- [ ] Wrap app with context providers

#### 1.6 Navigation Setup
- [ ] Create `navigation/AppNavigator.js`
- [ ] Set up navigation structure:
  - [ ] Auth Stack (Login, OTP, Profile Setup)
  - [ ] Client Stack (Dashboard with tabs)
  - [ ] Freelancer Stack (Verification, Dashboard with tabs)
- [ ] Implement protected routes (require authentication)
- [ ] Implement role-based routing (client vs freelancer)
- [ ] Set up deep linking for payment callbacks

#### 1.7 Utility Functions
- [ ] Create `utils/validation.js`:
  - [ ] Phone number validation
  - [ ] OTP validation
  - [ ] Email validation
  - [ ] Pincode validation
- [ ] Create `utils/formatters.js`:
  - [ ] Currency formatter (₹)
  - [ ] Date formatter
  - [ ] Phone number formatter
- [ ] Create `utils/constants.js`:
  - [ ] Job categories
  - [ ] Job statuses
  - [ ] Gender options

### Deliverables
- ✅ Project initialized and running
- ✅ All reusable components built and tested
- ✅ API service layer functional
- ✅ State management working
- ✅ Navigation structure in place
- ✅ Design system implemented

### Testing Checklist
- [ ] App launches without errors
- [ ] Navigation works (even if screens are empty)
- [ ] API client can make requests
- [ ] Components render correctly
- [ ] Theme colors are consistent

---

## Phase 2: Authentication Flow

### Goal
Complete authentication flow: Login → OTP Verification → Profile Setup → Role-based Dashboard Navigation

### Tasks Checklist

#### 2.1 Login Screen (`screens/auth/Login.js`)
- [ ] Create screen layout:
  - [ ] Header with blue circle icon and phone icon
  - [ ] Title: "Welcome Back"
  - [ ] Description: "Enter your mobile number to get started"
- [ ] Phone Number Input:
  - [ ] Input field with phone icon
  - [ ] Auto-format: `+91 XXXXX XXXXX`
  - [ ] Prefix: Always starts with `+91 `
  - [ ] Max length: 17 characters
  - [ ] Validation: Must be 12 digits total
  - [ ] Helper text: "Enter your 10-digit mobile number"
- [ ] Role Selection:
  - [ ] Two buttons in grid layout
  - [ ] Client button: "I'm a Client" + "I want to hire"
  - [ ] Freelancer button: "I'm a Freelancer" + "I want to work"
  - [ ] Selected state styling (blue border, blue background)
  - [ ] Unselected state styling (gray border)
- [ ] Submit Button:
  - [ ] Text: "Send OTP"
  - [ ] Icon: ArrowRight (when enabled)
  - [ ] Disabled when phone invalid or role not selected
  - [ ] Loading state: "Sending OTP..."
- [ ] Error Display:
  - [ ] Red background box
  - [ ] Error message display
- [ ] Firebase Integration:
  - [ ] Initialize Firebase
  - [ ] Initialize reCAPTCHA
  - [ ] Send OTP via Firebase Phone Auth
  - [ ] Get verification ID
- [ ] Navigation:
  - [ ] On success: Navigate to OTP screen with phone, verification ID, and role

#### 2.2 OTP Verification Screen (`screens/auth/OTP.js`)
- [ ] Create screen layout:
  - [ ] Header with blue circle icon and shield icon
  - [ ] Title: "Verify OTP"
  - [ ] Description: "Enter the 6-digit code sent to {phoneNumber}"
- [ ] OTP Input:
  - [ ] 6-digit input field
  - [ ] Center aligned
  - [ ] Large text, wide letter spacing
  - [ ] Auto-focus
  - [ ] Validation: Must be exactly 6 digits
- [ ] Submit Button:
  - [ ] Text: "Verify OTP"
  - [ ] Disabled when OTP is not 6 digits
  - [ ] Loading state
- [ ] Resend OTP:
  - [ ] "Didn't receive the code?" text
  - [ ] Resend button
  - [ ] 60-second cooldown timer
  - [ ] Shows "Resend in {X}s" during cooldown
- [ ] Back Button:
  - [ ] Ghost variant
  - [ ] ArrowLeft icon
  - [ ] Text: "Back to Login"
- [ ] Firebase Integration:
  - [ ] Verify OTP with Firebase
  - [ ] Get Firebase ID token
- [ ] Backend Authentication:
  - [ ] Call `/api/auth/authenticate` with Firebase token
  - [ ] Store JWT token securely
  - [ ] Get user data from backend
- [ ] Navigation Logic:
  - [ ] If user has profile: Navigate to dashboard based on role
  - [ ] If no profile: Navigate to Profile Setup
  - [ ] If role not set: Show role selection

#### 2.3 Profile Setup Screen (`screens/auth/ProfileSetup.js`)
- [ ] Create screen layout:
  - [ ] Header with blue circle icon and user icon
  - [ ] Title: "Complete Your Profile"
  - [ ] Description: "Set up your {Role} profile"
- [ ] Profile Photo Upload:
  - [ ] Preview: Circular, 96px, dashed border
  - [ ] Default: Camera icon (gray)
  - [ ] Camera Button: "Camera" (blue background)
  - [ ] Gallery Button: "Gallery" (gray background)
  - [ ] Image picker integration
  - [ ] Upload to Cloudinary
  - [ ] Show upload progress
- [ ] Full Name Input:
  - [ ] Label: "Full Name"
  - [ ] Placeholder: "Enter your full name"
  - [ ] Required validation
- [ ] Submit Button:
  - [ ] Text: "Complete Setup"
  - [ ] Icon: ArrowRight (when enabled)
  - [ ] Disabled when fullName or profilePhoto missing
  - [ ] Loading state
- [ ] Backend Integration:
  - [ ] Upload profile photo to Cloudinary
  - [ ] Submit profile data to backend
  - [ ] Update user profile
- [ ] Navigation:
  - [ ] Client → `/client/dashboard`
  - [ ] Freelancer → `/freelancer/verification`
  - [ ] Admin → (not applicable, web only)

#### 2.4 Protected Routes
- [ ] Check authentication status on app launch
- [ ] Redirect to Login if not authenticated
- [ ] Redirect to appropriate dashboard if authenticated
- [ ] Handle token expiration
- [ ] Refresh token logic (if implemented)

### Deliverables
- ✅ Complete authentication flow working
- ✅ Users can login with phone number
- ✅ OTP verification functional
- ✅ Profile setup working
- ✅ Navigation to correct dashboard based on role

### Testing Checklist
- [ ] Can enter phone number and select role
- [ ] OTP is sent successfully
- [ ] Can verify OTP
- [ ] Can upload profile photo
- [ ] Can complete profile setup
- [ ] Navigation works correctly after auth
- [ ] Token is stored securely
- [ ] Logout works and redirects to login
- [ ] Protected routes block unauthorized access

---

## Phase 3: Client Features

### Goal
Build complete Client Dashboard with all tabs and functionality

### Tasks Checklist

#### 3.1 Client Dashboard Layout (`screens/client/ClientDashboard.js`)
- [ ] Create top navigation bar:
  - [ ] Left: Logo/App Name "People"
  - [ ] Center: User info (profile photo, name, phone)
  - [ ] Right: Logout button (red on hover)
- [ ] Create tab navigation:
  - [ ] Tab 1: Post Job (Plus icon)
  - [ ] Tab 2: My Jobs (Briefcase icon)
  - [ ] Tab 3: History (History icon)
  - [ ] Tab 4: Profile (User icon)
- [ ] Active tab styling (blue underline or highlight)
- [ ] Inactive tab styling (gray text)

#### 3.2 Post Job Tab (`screens/client/PostJob.js`)
- [ ] Create form layout
- [ ] Form fields:
  - [ ] **Job Title:**
    - [ ] Label: "Job Title"
    - [ ] Text input
    - [ ] Placeholder: "Enter job title"
    - [ ] Required validation
  - [ ] **Category:**
    - [ ] Label: "Category"
    - [ ] Dropdown/Select
    - [ ] Options: Delivery, Cooking, Cleaning, Plumbing, Electrical, Mechanic, Driver, Care taker, Tailor, Barber, Laundry, Other
    - [ ] Required validation
  - [ ] **Address:**
    - [ ] Label: "Address"
    - [ ] Text input
    - [ ] Placeholder: "Enter address"
    - [ ] Required validation
  - [ ] **Pincode:**
    - [ ] Label: "Pincode"
    - [ ] Numeric input
    - [ ] Placeholder: "e.g., 400001"
    - [ ] Max length: 6
    - [ ] Pattern validation: 6 digits
    - [ ] Required validation
  - [ ] **Budget:**
    - [ ] Label: "Budget (₹)"
    - [ ] Number input
    - [ ] Placeholder: "1000"
    - [ ] Min: 10
    - [ ] Required validation
  - [ ] **Gender:**
    - [ ] Label: "Gender"
    - [ ] Dropdown
    - [ ] Options: Male, Female, Any
    - [ ] Required validation
  - [ ] **Description:**
    - [ ] Label: "Job Description (Optional)"
    - [ ] Textarea
    - [ ] Placeholder: "Describe the job requirements..."
    - [ ] Rows: 3
- [ ] Helper Buttons (for testing):
  - [ ] "Auto Fill Sample Data" button
  - [ ] "Create 3 Test Jobs" button
- [ ] Submit Button:
  - [ ] Text: "Post Job"
  - [ ] Blue background
  - [ ] Full width
  - [ ] Loading state
- [ ] Form Validation:
  - [ ] All required fields validated
  - [ ] Budget minimum ₹10
  - [ ] Pincode 6 digits
- [ ] Backend Integration:
  - [ ] Call `POST /api/client/jobs`
  - [ ] Handle success/error
- [ ] On Success:
  - [ ] Clear form
  - [ ] Switch to "My Jobs" tab
  - [ ] Refresh job list

#### 3.3 My Jobs Tab (`screens/client/MyJobs.js`)
- [ ] Create screen layout
- [ ] Header:
  - [ ] Title: "Active Jobs"
  - [ ] Refresh button (outline, right-aligned)
- [ ] Empty State:
  - [ ] Briefcase icon (large, gray)
  - [ ] Text: "No active jobs found"
  - [ ] Button: "Post Your First Job" (navigates to Post Job tab)
- [ ] Job Cards:
  - [ ] Card layout (white background, border, rounded)
  - [ ] Header:
    - [ ] Left: Job title (bold, large)
    - [ ] Right: Status badge (colored)
  - [ ] Description:
    - [ ] Address and pincode
    - [ ] Job description (if available)
  - [ ] Details Row:
    - [ ] Budget: ₹{amount}
    - [ ] Gender: {gender} or "Any"
    - [ ] Offers Count: {count} offers
- [ ] Status-Based Actions:
  - [ ] **Status: "open"**
    - [ ] "View Offers" button (outline)
    - [ ] Opens Offers Modal
    - [ ] Edit button (blue, only if no offers accepted)
    - [ ] Delete button (red, only if no offers accepted)
  - [ ] **Status: "assigned"**
    - [ ] "View Freelancer" button (green outline)
    - [ ] Opens freelancer profile modal
  - [ ] **Status: "work_done"**
    - [ ] "Pay" button (blue background)
    - [ ] Opens Bill Modal
    - [ ] "View Freelancer" button
  - [ ] **Status: "completed"**
    - [ ] "✓ Payment Completed" text (green)
    - [ ] "View Freelancer" button
- [ ] Edit Job:
  - [ ] Pre-fill form with job data
  - [ ] Call `PUT /api/client/jobs/:id`
  - [ ] Refresh job list
- [ ] Delete Job:
  - [ ] Confirmation: "Are you sure you want to delete this job?"
  - [ ] Call `DELETE /api/client/jobs/:id`
  - [ ] Refresh job list
- [ ] Backend Integration:
  - [ ] Call `GET /api/client/jobs/active`
  - [ ] Handle loading state
  - [ ] Handle error state
  - [ ] Refresh functionality

#### 3.4 Offers Modal (`components/modals/OffersModal.js`)
- [ ] Create modal layout:
  - [ ] Dark overlay background
  - [ ] White card, centered, max-width
  - [ ] Header:
    - [ ] Title: "Job Offers"
    - [ ] Close button (X icon, top right)
- [ ] Offer List:
  - [ ] Each offer card shows:
    - [ ] Freelancer profile photo (circular)
    - [ ] Freelancer name
    - [ ] Offer amount (₹)
    - [ ] Offer message (if any)
    - [ ] Actions:
      - [ ] "Accept Offer" button (green)
      - [ ] "Reject Offer" button (red outline)
  - [ ] Empty state: "No offers yet"
- [ ] Accept Offer:
  - [ ] Call `POST /api/client/jobs/:id/accept-offer`
  - [ ] Refresh job list
  - [ ] Close modal
- [ ] Reject Offer:
  - [ ] Call `POST /api/client/jobs/:id/reject-offer`
  - [ ] Refresh job list
  - [ ] Close modal

#### 3.5 Bill Modal (`components/modals/BillModal.js`)
- [ ] Create modal layout:
  - [ ] Dark overlay background
  - [ ] White card, centered
  - [ ] Header:
    - [ ] Title: "Payment"
    - [ ] Close button (X icon)
- [ ] Content:
  - [ ] Freelancer Details:
    - [ ] Profile photo (circular, 64px)
    - [ ] Name
    - [ ] ID (if available)
  - [ ] Payment Message:
    - [ ] Blue background box
    - [ ] Text: "You are paying {freelancerName} for "{jobTitle}""
  - [ ] Amount Display:
    - [ ] Green gradient background
    - [ ] Large amount: ₹{amount} (large, bold, green)
    - [ ] Label: "Amount to Pay"
    - [ ] Sub-label: "to freelancer"
  - [ ] Note:
    - [ ] Gray background box
    - [ ] Text: "Please pay ₹{amount} to the freelancer through your preferred method..."
- [ ] Footer Buttons:
  - [ ] "Cancel" button (outline)
  - [ ] "Paid" button (green background)
- [ ] Paid Button Logic:
  - [ ] Call `POST /api/client/jobs/:id/pay`
  - [ ] Marks job as completed
  - [ ] Adds commission to freelancer's ledger
  - [ ] Refresh job list
  - [ ] Close modal

#### 3.6 History Tab (`screens/client/History.js`)
- [ ] Create screen layout
- [ ] Header:
  - [ ] Title: "Job History"
- [ ] Empty State:
  - [ ] History icon (large, gray)
  - [ ] Text: "No completed jobs yet"
- [ ] Job Cards:
  - [ ] Same structure as My Jobs cards
  - [ ] Status Badge: Green "Completed" badge
  - [ ] Completion Date:
    - [ ] Clock icon
    - [ ] Text: "Completed on {date}"
    - [ ] Format: "DD MMM YYYY" (e.g., "11 Dec 2025")
    - [ ] Fallback: "Recently" or "N/A" if invalid date
- [ ] Backend Integration:
  - [ ] Call `GET /api/client/jobs/history`
  - [ ] Handle loading/error states

#### 3.7 Profile Tab (`screens/client/Profile.js`)
- [ ] Create screen layout
- [ ] Display:
  - [ ] Profile photo (large, circular)
  - [ ] Full name
  - [ ] Phone number
  - [ ] Email (if available)
  - [ ] Role: "Client"
- [ ] Backend Integration:
  - [ ] Fetch user profile data
  - [ ] Display user information

#### 3.8 Logout Functionality
- [ ] Logout button in navigation bar
- [ ] Logout Restriction:
  - [ ] Check for active jobs (status: "open", "assigned", "in_progress")
  - [ ] If active jobs exist:
    - [ ] Show error: "You cannot logout while you have active jobs. Please complete or cancel your jobs first."
    - [ ] Display for 5 seconds
    - [ ] Red error message at top
  - [ ] If no active jobs:
    - [ ] Call `POST /api/auth/logout`
    - [ ] Clear authentication
    - [ ] Clear secure storage
    - [ ] Redirect to `/login`

### Deliverables
- ✅ Complete Client Dashboard functional
- ✅ Can post jobs
- ✅ Can view and manage active jobs
- ✅ Can view offers and accept/reject
- ✅ Can pay freelancers
- ✅ Can view job history
- ✅ Logout with restrictions working

### Testing Checklist
- [ ] Can navigate between all tabs
- [ ] Can post a job successfully
- [ ] Job appears in My Jobs tab
- [ ] Can view offers for open jobs
- [ ] Can accept/reject offers
- [ ] Can edit job (if no offers)
- [ ] Can delete job (if no offers)
- [ ] Can view freelancer profile
- [ ] Can pay freelancer (work_done status)
- [ ] Payment marks job as completed
- [ ] Completed jobs appear in History
- [ ] Cannot logout with active jobs
- [ ] Can logout when no active jobs
- [ ] All API calls work correctly
- [ ] Error handling works
- [ ] Loading states display correctly

---

## Phase 4: Freelancer Features

### Goal
Build complete Freelancer Dashboard with verification, jobs, wallet, and all functionality

### Tasks Checklist

#### 4.1 Verification Screen (`screens/freelancer/Verification.js`)
- [ ] Create screen layout
- [ ] Status Screens:
  - [ ] **Pending Status:**
    - [ ] Clock icon (yellow)
    - [ ] Title: "Verification Pending"
    - [ ] Message: "Your verification is under review. Please wait for admin approval."
  - [ ] **Approved Status:**
    - [ ] CheckCircle icon (green)
    - [ ] Title: "Verification Approved"
    - [ ] Message: "Your verification has been approved!"
    - [ ] Button: "Go to Dashboard"
  - [ ] **Rejected Status:**
    - [ ] XCircle icon (red)
    - [ ] Title: "Verification Rejected"
    - [ ] Error message display
    - [ ] Show form again for resubmission
- [ ] Verification Form:
  - [ ] **Personal Information:**
    - [ ] Profile Photo upload (with preview)
    - [ ] Full Name input
    - [ ] Date of Birth picker
    - [ ] Gender dropdown (Male/Female)
    - [ ] Address textarea
  - [ ] **Document Upload:**
    - [ ] Aadhaar Front image upload (with preview)
    - [ ] Aadhaar Back image upload (with preview)
    - [ ] PAN Card image upload (with preview)
  - [ ] Submit Button:
    - [ ] Text: "Submit Verification"
    - [ ] Loading: "Submitting..."
    - [ ] Disabled when required fields missing
- [ ] Backend Integration:
  - [ ] Upload all images to Cloudinary
  - [ ] Call `POST /api/freelancer/verification`
  - [ ] Handle success/error
- [ ] Status Check:
  - [ ] Call `GET /api/freelancer/verification/status` on mount
  - [ ] Show appropriate status screen
- [ ] Navigation:
  - [ ] If approved: Navigate to dashboard
  - [ ] If pending/rejected: Show status screen

#### 4.2 Freelancer Dashboard Layout (`screens/freelancer/FreelancerDashboard.js`)
- [ ] Create top navigation bar (same as Client Dashboard)
- [ ] Create tab navigation:
  - [ ] Tab 1: Available Jobs (Briefcase icon)
  - [ ] Tab 2: My Jobs (CheckCircle icon)
  - [ ] Tab 3: Wallet (Wallet icon)
  - [ ] Tab 4: Orders (CheckCircle icon)
  - [ ] Tab 5: Profile (User icon)
- [ ] Active/inactive tab styling

#### 4.3 Available Jobs Tab (`screens/freelancer/AvailableJobs.js`)
- [ ] Create screen layout
- [ ] Header:
  - [ ] Title: "Available Jobs"
  - [ ] Refresh button (outline, right-aligned)
- [ ] Filters Section:
  - [ ] **Category Filter:**
    - [ ] Label: "Category"
    - [ ] Dropdown
    - [ ] Options: "All" + all categories from jobs
    - [ ] Default: "All"
  - [ ] **Sort Filter:**
    - [ ] Label: "Sort"
    - [ ] Dropdown
    - [ ] Options:
      - "High price → Low" (price_desc)
      - "Low price → High" (price_asc)
      - "New → Old" (newest)
      - "Old → New" (oldest)
    - [ ] Default: "newest"
- [ ] Empty State:
  - [ ] Briefcase icon (large, gray)
  - [ ] Text: "No available jobs found"
- [ ] Job Cards:
  - [ ] Header:
    - [ ] Left: Job title
    - [ ] Right: Category badge
  - [ ] Description: Job description
  - [ ] Details:
    - [ ] Budget: ₹{amount}
    - [ ] Gender: {gender} (if specified)
    - [ ] Posted date: "Posted: {date}"
    - [ ] Address: MapPin icon + address + pincode
  - [ ] Action Buttons:
    - [ ] **Pickup Job Button:**
      - [ ] Green background
      - [ ] Text: "Pickup Job" or "Pay Commission First" (if dues pending)
      - [ ] Icon: CheckCircle
      - [ ] Disabled if `canWork` is false
    - [ ] **Make Offer Button:**
      - [ ] Outline variant
      - [ ] Text: "Make Offer" or cooldown timer (e.g., "5m")
      - [ ] Disabled if cooldown active or `canWork` is false
    - [ ] **View Button:**
      - [ ] Ghost variant
      - [ ] Eye icon
- [ ] Pickup Job Logic:
  - [ ] Confirmation: "Are you sure you want to pickup this job?"
  - [ ] Call `POST /api/freelancer/jobs/:id/pickup`
  - [ ] Refresh job list
- [ ] Make Offer Logic:
  - [ ] Open Make Offer Modal
  - [ ] Amount input
  - [ ] Message textarea
  - [ ] Submit offer
  - [ ] 5-minute cooldown after successful offer
  - [ ] Show cooldown timer on button
- [ ] Work Restriction:
  - [ ] Check `canWork` flag from API
  - [ ] If false: Show "Pay Commission First" message
  - [ ] Disable pickup/offer buttons
- [ ] Backend Integration:
  - [ ] Call `GET /api/freelancer/jobs/available`
  - [ ] Apply filters and sorting
  - [ ] Handle loading/error states

#### 4.4 Make Offer Modal (`components/modals/MakeOfferModal.js`)
- [ ] Create modal layout
- [ ] Form:
  - [ ] Amount input (number)
  - [ ] Message textarea (optional)
  - [ ] Submit button
- [ ] Backend Integration:
  - [ ] Call `POST /api/freelancer/jobs/:id/offer`
  - [ ] Handle success/error
  - [ ] Close modal
  - [ ] Refresh job list
  - [ ] Start cooldown timer

#### 4.5 My Jobs Tab (`screens/freelancer/MyJobs.js`)
- [ ] Create screen layout
- [ ] Header:
  - [ ] Title: "My Assigned Jobs"
  - [ ] Refresh button
- [ ] Empty State:
  - [ ] CheckCircle icon (large, gray)
  - [ ] Text: "No assigned jobs found"
- [ ] Job Cards:
  - [ ] Header:
    - [ ] Left: Job title
    - [ ] Right: Status badge (colored)
  - [ ] Description: Job description
  - [ ] Details:
    - [ ] Budget: ₹{amount}
    - [ ] Gender: {gender}
    - [ ] Assigned date: "Assigned: {date}"
    - [ ] Address: MapPin icon + address + pincode
- [ ] Status-Based Actions:
  - [ ] **Status: "assigned"**
    - [ ] "Work Done" button (green background)
    - [ ] Icon: CheckCircle
    - [ ] Confirmation: "Are you sure you want to mark this job as work done?"
    - [ ] "View Client" button (outline)
  - [ ] **Status: "work_done"**
    - [ ] Clock icon (animated spin, orange)
    - [ ] Text: "Waiting for Payment" (orange)
    - [ ] "View Client" button
  - [ ] **Status: "completed"**
    - [ ] Commission Status Check:
      - [ ] If commission pending: "Pay Commission to Complete" (orange, animated clock)
      - [ ] If commission paid: "Completed" button (blue)
    - [ ] "Completed" button:
      - [ ] Blue background
      - [ ] Icon: CheckCircle
      - [ ] Action: Marks job as fully completed
- [ ] Work Done Logic:
  - [ ] Call `POST /api/freelancer/jobs/:id/complete`
  - [ ] Refresh job list
- [ ] Fully Complete Logic:
  - [ ] Call `POST /api/freelancer/jobs/:id/fully-complete`
  - [ ] Refresh job list
- [ ] Backend Integration:
  - [ ] Call `GET /api/freelancer/jobs/assigned`
  - [ ] Handle loading/error states

#### 4.6 Wallet Tab (`screens/freelancer/Wallet.js`)
- [ ] Create screen layout
- [ ] Total Dues Card:
  - [ ] Header:
    - [ ] Title: "Total Dues" (with Receipt icon)
    - [ ] Refresh button (top right)
  - [ ] **When Dues > 0:**
    - [ ] Red border and gradient background
    - [ ] Title color: red
    - [ ] Amount: Large red text (₹{amount})
    - [ ] Label: "Commission dues to be paid"
    - [ ] "Pay Dues" button:
      - [ ] Red background
      - [ ] White text
      - [ ] CreditCard icon
      - [ ] Full width
    - [ ] "Clear Dues (Manual)" button:
      - [ ] Only shows if orderId in storage
      - [ ] Outline variant
      - [ ] Green border and text
      - [ ] RefreshCw icon
  - [ ] **When Dues = 0:**
    - [ ] Green border and gradient background
    - [ ] Title color: green
    - [ ] Amount: Large green text "₹0.00"
    - [ ] Message: "No dues is pending"
- [ ] Transaction History Section:
  - [ ] Toggle button:
    - [ ] Full width
    - [ ] History icon + "Transaction History" + count
    - [ ] Chevron icon (up/down)
  - [ ] When Expanded:
    - [ ] List of transactions
    - [ ] Each transaction shows:
      - [ ] Job title
      - [ ] Date and time
      - [ ] Order ID (monospace, gray background)
      - [ ] Amount received (green, large)
      - [ ] Status badge: "✓ Paid" (green) or "Pending" (red)
    - [ ] Card colors:
      - [ ] Paid: Green background
      - [ ] Pending: Red background
- [ ] Commission Ledger Card:
  - [ ] Header:
    - [ ] Title: "Commission Ledger" (with Receipt icon)
  - [ ] Empty State:
    - [ ] Receipt icon (large, gray)
    - [ ] Text: "No commission records yet"
    - [ ] Subtext: "Commission will appear here after jobs are completed"
  - [ ] Transaction List:
    - [ ] Each transaction is a card
    - [ ] **Collapsed View:**
      - [ ] Job title (bold)
      - [ ] Date and time (small, gray)
      - [ ] Amount received (green, large)
      - [ ] Dues amount (red, small) - if unpaid
      - [ ] "✓ Paid" badge (green) - if paid
      - [ ] Chevron icon (down)
    - [ ] **Expanded View (on click):**
      - [ ] Client name
      - [ ] Job ID
      - [ ] Breakdown:
        - [ ] Job Amount
        - [ ] Platform Commission (10%) - red, negative
        - [ ] Amount Received - green, large, bold
      - [ ] Chevron icon (up)
    - [ ] Card colors:
      - [ ] Paid: Green border and background
      - [ ] Unpaid: Red border and background
- [ ] Pay Dues Flow:
  - [ ] Click "Pay Dues" button
  - [ ] Confirmation: "Pay ₹{amount} as commission dues?"
  - [ ] Call `POST /api/freelancer/pay-dues`
  - [ ] Get PhonePe payment URL
  - [ ] Open PhonePe payment page (in-app browser or external)
  - [ ] Handle payment callback
- [ ] Payment Callback Handling:
  - [ ] Deep link: `/freelancer/dashboard?tab=wallet&payment=success&orderId={orderId}`
  - [ ] Detect URL parameters
  - [ ] Auto-process dues (300ms-1s delay)
  - [ ] Call `POST /payment/process-dues-order/:orderId`
  - [ ] Clear URL parameters
  - [ ] Refresh wallet data
- [ ] Manual Processing:
  - [ ] If auto-processing fails, show "Clear Dues (Manual)" button
  - [ ] Clicking manually processes the dues
- [ ] Backend Integration:
  - [ ] Call `GET /api/freelancer/wallet`
  - [ ] Handle loading/error states
  - [ ] Calculate total dues
  - [ ] Display transaction history
  - [ ] Display commission ledger

#### 4.7 Orders Tab (`screens/freelancer/Orders.js`)
- [ ] Create screen layout
- [ ] Display list of orders (similar to My Jobs)
- [ ] Order details and status
- [ ] Backend Integration:
  - [ ] Fetch orders data
  - [ ] Display order information

#### 4.8 Profile Tab (`screens/freelancer/Profile.js`)
- [ ] Create screen layout
- [ ] Display:
  - [ ] Profile photo
  - [ ] Full name
  - [ ] Phone number
  - [ ] Email (if available)
  - [ ] Role: "Freelancer"
  - [ ] Verification status
- [ ] Backend Integration:
  - [ ] Fetch user profile data
  - [ ] Display verification status

#### 4.9 Logout Functionality
- [ ] Logout button in navigation bar
- [ ] Logout Restriction:
  - [ ] Check for active jobs (status: "assigned", "in_progress", "completed" but not fully completed)
  - [ ] If active jobs exist:
    - [ ] Show error: "You cannot logout while you have active jobs. Please complete your jobs first."
    - [ ] Display for 5 seconds
    - [ ] Red error message at top
  - [ ] If no active jobs:
    - [ ] Call `POST /api/auth/logout`
    - [ ] Clear authentication
    - [ ] Redirect to `/login`

### Deliverables
- ✅ Complete Freelancer Dashboard functional
- ✅ Verification flow working
- ✅ Can browse and filter available jobs
- ✅ Can pickup jobs or make offers
- ✅ Can manage assigned jobs
- ✅ Can mark work done
- ✅ Wallet with dues payment working
- ✅ Commission ledger displaying correctly
- ✅ Payment integration functional

### Testing Checklist
- [ ] Can submit verification documents
- [ ] Verification status displays correctly
- [ ] Can navigate between all tabs
- [ ] Can view available jobs
- [ ] Filters and sorting work
- [ ] Can pickup job
- [ ] Can make offer (with cooldown)
- [ ] Work restriction works (can't work with unpaid dues)
- [ ] Can view assigned jobs
- [ ] Can mark work done
- [ ] Can view wallet and dues
- [ ] Can pay dues via PhonePe
- [ ] Payment callback works
- [ ] Commission ledger displays correctly
- [ ] Can mark job fully completed
- [ ] Cannot logout with active jobs
- [ ] Can logout when no active jobs
- [ ] All API calls work correctly
- [ ] Error handling works
- [ ] Loading states display correctly

---

## Phase 5: Advanced Features & Polish

### Goal
Add payment integration, image handling, offline support, and performance optimizations

### Tasks Checklist

#### 5.1 Payment Integration (PhonePe)
- [ ] Install PhonePe SDK for React Native
- [ ] Configure PhonePe credentials
- [ ] Implement payment flow:
  - [ ] Create payment request
  - [ ] Open PhonePe payment page
  - [ ] Handle payment callback
  - [ ] Process payment result
- [ ] Deep linking setup:
  - [ ] Configure deep link URL scheme
  - [ ] Handle payment redirects
  - [ ] Parse URL parameters
- [ ] Error handling:
  - [ ] Payment failure scenarios
  - [ ] Network errors
  - [ ] Timeout handling
- [ ] Testing:
  - [ ] Test payment flow end-to-end
  - [ ] Test callback handling
  - [ ] Test error scenarios

#### 5.2 Image Handling (Cloudinary)
- [ ] Install Cloudinary SDK
- [ ] Configure Cloudinary credentials
- [ ] Image upload function:
  - [ ] Upload profile photos
  - [ ] Upload verification documents
  - [ ] Show upload progress
  - [ ] Handle upload errors
- [ ] Image optimization:
  - [ ] Compress images before upload
  - [ ] Resize images appropriately
  - [ ] Use appropriate image formats
- [ ] Image caching:
  - [ ] Cache uploaded images
  - [ ] Display cached images
- [ ] Testing:
  - [ ] Test image upload
  - [ ] Test image display
  - [ ] Test error handling

#### 5.3 Modals & Complex Interactions
- [ ] Review all modals:
  - [ ] Offers Modal
  - [ ] Bill Modal
  - [ ] Make Offer Modal
  - [ ] Profile Modals
- [ ] Ensure proper animations
- [ ] Ensure proper backdrop handling
- [ ] Test on different screen sizes
- [ ] Test accessibility

#### 5.4 Offline Support
- [ ] Implement offline detection
- [ ] Cache job lists
- [ ] Queue actions when offline
- [ ] Sync when connection restored
- [ ] Show offline indicator
- [ ] Handle offline errors gracefully

#### 5.5 Performance Optimization
- [ ] Implement lazy loading for job lists
- [ ] Add pagination for long lists
- [ ] Optimize image loading
- [ ] Use FlatList for long lists
- [ ] Implement memoization where needed
- [ ] Reduce unnecessary re-renders
- [ ] Optimize bundle size

#### 5.6 Error Handling & User Feedback
- [ ] Review all error messages
- [ ] Ensure user-friendly error messages
- [ ] Add loading indicators everywhere
- [ ] Add success feedback (toasts/notifications)
- [ ] Handle network errors gracefully
- [ ] Handle API errors appropriately

#### 5.7 Security
- [ ] Ensure JWT tokens stored securely
- [ ] Validate all inputs
- [ ] Sanitize user inputs
- [ ] Implement certificate pinning (if needed)
- [ ] Review authentication flow security
- [ ] Test token expiration handling

#### 5.8 Testing & Bug Fixes
- [ ] Test all user flows:
  - [ ] Client flow end-to-end
  - [ ] Freelancer flow end-to-end
  - [ ] Payment flow end-to-end
- [ ] Test on different Android versions
- [ ] Test on different screen sizes
- [ ] Fix all bugs found
- [ ] Performance testing
- [ ] Security testing

#### 5.9 Documentation
- [ ] Document API integration
- [ ] Document component usage
- [ ] Document state management
- [ ] Document navigation structure
- [ ] Create user guide (if needed)

### Deliverables
- ✅ Payment integration working
- ✅ Image upload working
- ✅ Offline support implemented
- ✅ Performance optimized
- ✅ All bugs fixed
- ✅ App ready for production

### Testing Checklist
- [ ] Payment flow works end-to-end
- [ ] Image upload works
- [ ] Offline mode works
- [ ] Performance is acceptable
- [ ] No critical bugs
- [ ] App works on different Android versions
- [ ] App works on different screen sizes
- [ ] All error scenarios handled
- [ ] Security measures in place

---

## Important Reminders

### Admin Panel Workflow
- **Remember:** Admin panel is web-only and already exists
- **Freelancer Verification:**
  1. Freelancer submits verification via mobile app
  2. Admin reviews and approves/rejects via web admin panel
  3. Freelancer sees status update in mobile app
  4. Once approved, freelancer can access dashboard
- **Withdrawals:**
  1. Freelancer requests withdrawal via mobile app (if implemented)
  2. Admin approves/rejects via web admin panel
  3. Freelancer sees status update in mobile app

### Design System
- **Always use** the documented color codes
- **Always use** the documented spacing and typography
- **Don't create** custom colors or spacing
- **Reference** `APP_COMPLETE_DOCUMENTATION.md` for exact styling

### API Integration
- **Always use** the API service layer (don't call APIs directly in components)
- **Always handle** loading, error, and empty states
- **Always validate** API responses
- **Test** all API endpoints before building screens

### State Management
- **Use Context API** for global state (auth, user)
- **Use local state** for component-specific state
- **Don't over-engineer** - start simple

### Navigation
- **Protect routes** - require authentication
- **Role-based routing** - client vs freelancer
- **Handle deep links** for payment callbacks

### Testing
- **Test each screen** before moving to the next
- **Test on real devices** early
- **Test payment flows** thoroughly
- **Test error scenarios**

### Common Issues
- **Phone number format:** Always `+91 XXXXX XXXXX` (17 chars total)
- **OTP:** Always 6 digits
- **Pincode:** Always 6 digits
- **Budget:** Minimum ₹10
- **Commission:** Always 10% of job amount

---

## Common Pitfalls to Avoid

### ❌ Don't Do This
1. **Build screens without foundation** - Set up components, API layer, state management first
2. **Hardcode values** - Use environment variables, theme constants, API service layer
3. **Build all screens at once** - Build → Test → Fix → Next screen
4. **Ignore error handling** - Every API call needs loading, error, and empty states
5. **Skip design system** - Use documented colors, spacing, typography consistently
6. **Over-engineer** - Start simple, add complexity only when needed
7. **Skip navigation planning** - Plan routes and navigation flow first
8. **Build dashboards before auth** - Complete auth flow first
9. **Ignore edge cases** - Handle empty states, loading states, error states
10. **Skip testing** - Test each screen before moving on

### ✅ Do This Instead
1. **Set up foundation first** - Components, API layer, state management
2. **Use constants and services** - Environment variables, theme, API service layer
3. **Build incrementally** - One screen at a time, test thoroughly
4. **Handle all states** - Loading, error, empty, success states
5. **Follow design system** - Use documented design system consistently
6. **Start simple** - Add complexity only when needed
7. **Plan navigation** - Set up navigation structure early
8. **Complete auth first** - Build and test auth flow completely
9. **Handle edge cases** - Empty states, loading, errors, offline
10. **Test continuously** - Test each feature before moving on

---

## Testing Checklist

### Authentication Flow
- [ ] Can enter phone number
- [ ] Can select role
- [ ] OTP is sent
- [ ] Can verify OTP
- [ ] Can upload profile photo
- [ ] Can complete profile setup
- [ ] Navigation works after auth
- [ ] Token is stored securely
- [ ] Logout works

### Client Features
- [ ] Can post job
- [ ] Job appears in My Jobs
- [ ] Can view offers
- [ ] Can accept/reject offers
- [ ] Can edit job (if allowed)
- [ ] Can delete job (if allowed)
- [ ] Can pay freelancer
- [ ] Payment marks job as completed
- [ ] Completed jobs appear in History
- [ ] Cannot logout with active jobs

### Freelancer Features
- [ ] Can submit verification
- [ ] Verification status displays
- [ ] Can view available jobs
- [ ] Filters and sorting work
- [ ] Can pickup job
- [ ] Can make offer
- [ ] Cooldown timer works
- [ ] Work restriction works
- [ ] Can mark work done
- [ ] Can view wallet
- [ ] Can pay dues
- [ ] Payment callback works
- [ ] Commission ledger displays
- [ ] Can mark job fully completed
- [ ] Cannot logout with active jobs

### Payment Integration
- [ ] Payment flow works
- [ ] Payment callback works
- [ ] Error handling works
- [ ] Manual processing works

### General
- [ ] App works on different Android versions
- [ ] App works on different screen sizes
- [ ] Performance is acceptable
- [ ] No memory leaks
- [ ] No crashes
- [ ] Error messages are user-friendly
- [ ] Loading states display correctly
- [ ] Empty states display correctly

---

## Deployment Checklist

### Pre-Deployment
- [ ] All features implemented
- [ ] All bugs fixed
- [ ] All tests passed
- [ ] Performance optimized
- [ ] Security reviewed
- [ ] Documentation complete

### Environment Setup
- [ ] Production environment variables configured
- [ ] API base URL set to production
- [ ] Firebase configured for production
- [ ] Cloudinary configured for production
- [ ] PhonePe configured for production
- [ ] CORS configured correctly

### Build Configuration
- [ ] Android app signing configured
- [ ] App version updated
- [ ] App name and icon set
- [ ] Permissions configured
- [ ] Deep linking configured

### Testing
- [ ] Test on production API
- [ ] Test payment flow on production
- [ ] Test on multiple devices
- [ ] Test on different Android versions
- [ ] Performance testing
- [ ] Security testing

### Deployment
- [ ] Build production APK/AAB
- [ ] Test production build
- [ ] Upload to Play Store (or distribution platform)
- [ ] Monitor for crashes/errors
- [ ] Monitor user feedback

---

## Quick Reference

### API Base URLs
- **Production:** `https://freelancing-platform-backend-backup.onrender.com`
- **Development:** `http://localhost:3001`

### Key Colors
- **Primary Blue:** `#2563EB`
- **Success Green:** `#16A34A`
- **Error Red:** `#DC2626`
- **Warning Orange:** `#EA580C`
- **Pending Yellow:** `#CA8A04`

### Key Endpoints
- **Auth:** `/api/auth/authenticate`, `/api/auth/logout`
- **Client Jobs:** `/api/client/jobs/*`
- **Freelancer Jobs:** `/api/freelancer/jobs/*`
- **Wallet:** `/api/freelancer/wallet`
- **Verification:** `/api/freelancer/verification`

### Important Notes
- Commission is always 10% of job amount
- Freelancer cannot work with unpaid dues
- Client cannot logout with active jobs
- Freelancer cannot logout with active jobs
- Admin panel is web-only (already exists)

---

## Getting Back on Track

If you find yourself lost or off-track:

1. **Check this roadmap** - Review the current phase checklist
2. **Check documentation** - Reference `APP_COMPLETE_DOCUMENTATION.md`
3. **Review completed tasks** - See what's been done
4. **Identify blockers** - What's preventing progress?
5. **Prioritize** - Focus on current phase tasks
6. **Test** - Ensure what's built works before moving on
7. **Ask for help** - If stuck, review the documentation or ask questions

---

## Progress Tracking

### Phase 1: Foundation & Setup
- [ ] Project Initialization
- [ ] Folder Structure
- [ ] Design System Components
- [ ] API Service Layer
- [ ] State Management Setup
- [ ] Navigation Setup
- [ ] Utility Functions

### Phase 2: Authentication Flow
- [ ] Login Screen
- [ ] OTP Verification Screen
- [ ] Profile Setup Screen
- [ ] Protected Routes

### Phase 3: Client Features
- [ ] Client Dashboard Layout
- [ ] Post Job Tab
- [ ] My Jobs Tab
- [ ] Offers Modal
- [ ] Bill Modal
- [ ] History Tab
- [ ] Profile Tab
- [ ] Logout Functionality

### Phase 4: Freelancer Features
- [ ] Verification Screen
- [ ] Freelancer Dashboard Layout
- [ ] Available Jobs Tab
- [ ] Make Offer Modal
- [ ] My Jobs Tab
- [ ] Wallet Tab
- [ ] Orders Tab
- [ ] Profile Tab
- [ ] Logout Functionality

### Phase 5: Advanced Features & Polish
- [ ] Payment Integration
- [ ] Image Handling
- [ ] Modals & Interactions
- [ ] Offline Support
- [ ] Performance Optimization
- [ ] Error Handling
- [ ] Security
- [ ] Testing & Bug Fixes
- [ ] Documentation

---

**Last Updated:** December 2025  
**Status:** Ready to Start Development

Good luck with the development! 🚀

