# People Web App - Complete Documentation
## Comprehensive Guide for Android App Development

**Version:** 1.0  
**Last Updated:** December 11, 2025  
**Purpose:** Complete reference documentation for rebuilding the web app as an Android app using React Native

---

## Table of Contents
1. [App Overview](#app-overview)
2. [Design System & Colors](#design-system--colors)
3. [Authentication Flow](#authentication-flow)
4. [Client Dashboard](#client-dashboard)
5. [Freelancer Dashboard](#freelancer-dashboard)
6. [Admin Dashboard](#admin-dashboard)
7. [Components Library](#components-library)
8. [API Integration](#api-integration)
9. [User Flows](#user-flows)
10. [Business Logic](#business-logic)
11. [Required Credentials & Environment Variables](#required-credentials--environment-variables)
12. [Important Notes for Android Development](#important-notes-for-android-development)

---

## App Overview

### Purpose
A freelancing platform connecting clients who need services with freelancers who provide them. The app handles job posting, matching, payment processing, and commission management.

### User Roles
1. **Client** - Posts jobs, accepts offers, pays freelancers
2. **Freelancer** - Views available jobs, makes offers/picks up jobs, completes work, receives payment
3. **Admin** - Manages verifications, withdrawals, user search

### Tech Stack (Web)
- **Frontend:** React.js with React Router
- **Styling:** Tailwind CSS
- **Authentication:** Firebase Phone Auth
- **Backend:** Node.js/Express.js
- **Database:** MongoDB
- **Payment Gateway:** PhonePe (V2 OAuth)
- **Payouts:** Bulkpe API
- **Image Storage:** Cloudinary

---

## Design System & Colors

### Color Palette

#### Primary Colors
- **Primary Blue:** `#2563EB` (blue-600)
  - Used for: Main buttons, primary actions, links, icons
  - Hover: `#1D4ED8` (blue-700)
  - Light: `#DBEAFE` (blue-50)

#### Status Colors
- **Success/Green:** 
  - `#16A34A` (green-600) - Success text, completed status
  - `#DCFCE7` (green-50) - Success backgrounds
  - `#15803D` (green-700) - Dark green text
- **Error/Red:**
  - `#DC2626` (red-600) - Error text, destructive actions
  - `#FEE2E2` (red-50) - Error backgrounds
  - `#B91C1C` (red-700) - Dark red text
- **Warning/Orange:**
  - `#EA580C` (orange-600) - Warning text
  - `#FFF7ED` (orange-50) - Warning backgrounds
- **Pending/Yellow:**
  - `#CA8A04` (yellow-600) - Pending status
  - `#FEF9C3` (yellow-50) - Pending backgrounds

#### Neutral Colors
- **Background:** `#FFFFFF` (white)
- **Card Background:** `#FFFFFF` (white)
- **Text Primary:** `#111827` (gray-900)
- **Text Secondary:** `#6B7280` (gray-600)
- **Text Muted:** `#9CA3AF` (gray-400)
- **Border:** `#E5E7EB` (gray-200)
- **Input Border:** `#D1D5DB` (gray-300)

### Typography
- **Font Family:** System default (sans-serif)
- **Headings:**
  - H1: `text-3xl font-bold` (30px, bold)
  - H2: `text-2xl font-bold` (24px, bold)
  - H3: `text-lg font-semibold` (18px, semibold)
- **Body:**
  - Regular: `text-sm` (14px)
  - Small: `text-xs` (12px)
- **Button Text:** `font-semibold` or `font-medium`

### Spacing
- **Card Padding:** `p-6` (24px)
- **Section Spacing:** `space-y-6` (24px vertical)
- **Button Padding:** `px-6 py-3` (24px horizontal, 12px vertical)
- **Input Padding:** `px-3 py-2` (12px horizontal, 8px vertical)

### Border Radius
- **Default:** `rounded-lg` (8px)
- **Buttons:** `rounded-md` (6px)
- **Cards:** `rounded-lg` (8px)
- **Inputs:** `rounded-md` (6px)
- **Profile Photos:** `rounded-full` (50% - circular)

### Shadows
- **Cards:** `shadow-sm` (subtle shadow)
- **Modals:** `shadow-xl` (prominent shadow)
- **Buttons (hover):** No shadow, color change only

### Icons
- **Library:** Lucide React
- **Size:** 
  - Small: `w-4 h-4` (16px)
  - Medium: `w-5 h-5` (20px)
  - Large: `w-8 h-8` (32px)
- **Color:** Inherits from parent text color

---

## Authentication Flow

### Login Page (`/login`)

#### Layout
- **Background:** White (`bg-white`)
- **Container:** Centered, max-width `max-w-md`
- **Card:** White card with border `border-gray-200`, shadow `shadow-lg`

#### Components

**Header Section:**
- **Icon:** Blue circle (`bg-blue-600`, `w-16 h-16`, `rounded-full`)
  - Phone icon (`Phone` from lucide-react, `w-8 h-8`, white)
- **Title:** "Welcome Back" (`text-3xl font-bold text-gray-900`)
- **Description:** "Enter your mobile number to get started" (`text-gray-600 text-lg`)

**Phone Number Input:**
- **Label:** "Mobile Number"
- **Input Field:**
  - Type: `tel`
  - Placeholder: `+91 9876543210`
  - Format: Auto-formats as `+91 XXXXX XXXXX`
  - Prefix: Always starts with `+91 `
  - Max Length: 17 characters
  - Left Icon: Phone icon (`w-4 h-4`, gray)
  - Border: `border-input`
  - Padding: `pl-12` (to accommodate icon)
- **Helper Text:** "Enter your 10-digit mobile number" (`text-xs text-gray-500`)

**Role Selection:**
- **Label:** "Choose Your Role"
- **Layout:** 2-column grid (`grid-cols-2 gap-3`)
- **Buttons:**
  - **Client Button:**
    - Text: "I'm a Client" (bold) + "I want to hire" (small, muted)
    - Selected: `border-blue-500 bg-blue-50 text-blue-700`
    - Unselected: `border-gray-200 hover:border-gray-300 text-gray-600`
    - Padding: `p-3`
    - Border: `border-2`
  - **Freelancer Button:** Same styling as Client

**Submit Button:**
- **Text:** "Send OTP"
- **Icon:** ArrowRight icon (only when enabled)
- **Enabled State:**
  - Background: `bg-blue-600 hover:bg-blue-700`
  - Text: White
  - Shadow: `shadow-lg`
- **Disabled State:**
  - Background: `bg-gray-300`
  - Text: `text-gray-500`
  - Cursor: `cursor-not-allowed`
- **Loading State:** Shows spinner + "Sending OTP..."

**Error Display:**
- **Container:** `bg-red-50 border border-red-200 rounded-md p-3`
- **Text:** `text-sm text-red-600`

**Helper Buttons (Bottom):**
- **Clear reCAPTCHA & Retry:** Outline button, small size
- **Clear Storage & Reload:** Outline button, small size

**reCAPTCHA Container:**
- Hidden div with id `recaptcha-container`

#### Logic
1. Phone number validation: Must be 12 digits total (+91 + 10 digits)
2. Role must be selected
3. On submit: Initialize reCAPTCHA, send OTP via Firebase
4. On success: Navigate to `/otp` with phone number, verification ID, and selected role
5. Error handling: Shows user-friendly error messages

---

### OTP Verification Page (`/otp`)

#### Layout
- Same as Login page (centered card)

#### Components

**Header:**
- **Icon:** Blue circle with Shield icon
- **Title:** "Verify OTP"
- **Description:** "Enter the 6-digit code sent to {phoneNumber}"

**OTP Input:**
- **Type:** `text`
- **Placeholder:** `123456`
- **Max Length:** 6
- **Styling:** 
  - Center aligned (`text-center`)
  - Large text (`text-2xl`)
  - Wide letter spacing (`tracking-widest`)
- **Validation:** Must be exactly 6 digits

**Submit Button:**
- Same styling as Login submit button
- **Text:** "Verify OTP"
- **Disabled:** When OTP is not 6 digits

**Resend OTP:**
- **Text:** "Didn't receive the code?"
- **Button:** Link variant
- **Cooldown:** 60 seconds (shows "Resend in {X}s")
- **Text:** "Resend OTP" or "Resend in {countdown}s"

**Back Button:**
- Ghost variant
- Icon: ArrowLeft
- Text: "Back to Login"

#### Logic
1. Verify OTP with Firebase
2. If role was selected on login, proceed directly
3. If no role, show role selection screen
4. On success: Authenticate with backend, navigate based on role and profile setup status

---

### Profile Setup Page (`/profile-setup`)

#### Layout
- Same centered card layout

#### Components

**Header:**
- **Icon:** Blue circle with User icon
- **Title:** "Complete Your Profile"
- **Description:** "Set up your {Role} profile"

**Profile Photo Upload:**
- **Preview:**
  - Size: `w-24 h-24` (96px)
  - Shape: Circular (`rounded-full`)
  - Border: `border-2 border-dashed border-gray-300`
  - Background: `bg-gray-100`
  - Default Icon: Camera icon (gray)
- **Buttons:**
  - **Camera Button:**
    - Background: `bg-blue-600 hover:bg-blue-700`
    - Text: White
    - Icon: Camera
    - Text: "Camera" (or "Camera (Mobile Only)" on desktop)
  - **Gallery Button:**
    - Background: `bg-gray-600 hover:bg-gray-700`
    - Text: White
    - Icon: Upload
    - Text: "Gallery"
- **Helper Text:** "Take a photo or choose from gallery"

**Full Name Input:**
- **Label:** "Full Name"
- **Placeholder:** "Enter your full name"
- **Required:** Yes

**Submit Button:**
- **Text:** "Complete Setup"
- **Icon:** ArrowRight (when enabled)
- **Disabled:** When fullName or profilePhoto is missing

#### Logic
1. Upload profile photo to Cloudinary
2. Submit profile data to backend
3. Navigate based on role:
   - Client → `/client/dashboard`
   - Freelancer → `/freelancer/verification`
   - Admin → `/admin/dashboard`

---

## Client Dashboard

### Route
`/client/dashboard`

### Layout Structure

**Top Navigation Bar:**
- **Background:** White
- **Height:** Auto (fits content)
- **Padding:** `p-4`
- **Border Bottom:** `border-b border-gray-200`

**Left Side:**
- **Logo/App Name:** "People" (text, bold, large)
- **User Info:**
  - Profile photo: Circular, `w-10 h-10`
  - Name: User's full name
  - Phone: User's phone number

**Right Side:**
- **Logout Button:**
  - Variant: Outline
  - Icon: LogOut
  - Text: "Logout"
  - Color: Red on hover (`text-red-600 hover:text-red-700 hover:bg-red-50`)

**Tab Navigation:**
- **Layout:** Horizontal tabs below navigation bar
- **Tabs:**
  1. **Post Job** - Icon: Plus
  2. **My Jobs** - Icon: Briefcase
  3. **History** - Icon: History
  4. **Profile** - Icon: User
- **Active Tab:** Blue underline or background highlight
- **Inactive Tab:** Gray text

**Content Area:**
- **Padding:** `p-6`
- **Background:** White or light gray
- **Max Width:** Container max-width (responsive)

---

### Tab 1: Post Job

#### Form Fields

**Job Title:**
- **Label:** "Job Title"
- **Input:** Text input
- **Placeholder:** "Enter job title"
- **Required:** Yes

**Category:**
- **Label:** "Category"
- **Type:** Dropdown/Select
- **Options:**
  - Delivery
  - Cooking
  - Cleaning
  - Plumbing
  - Electrical
  - Mechanic
  - Driver
  - Care taker
  - Tailor
  - Barber
  - Laundry
  - Other
- **Required:** Yes

**Address:**
- **Label:** "Address"
- **Input:** Text input
- **Placeholder:** "Enter address"
- **Required:** Yes

**Pincode:**
- **Label:** "Pincode"
- **Input:** Text input, numeric
- **Placeholder:** "e.g., 400001"
- **Pattern:** 6 digits
- **Max Length:** 6
- **Required:** Yes

**Budget:**
- **Label:** "Budget (₹)"
- **Input:** Number input
- **Placeholder:** "1000"
- **Min:** 10
- **Required:** Yes

**Gender:**
- **Label:** "Gender"
- **Type:** Dropdown
- **Options:**
  - Male
  - Female
  - Any
- **Required:** Yes

**Description:**
- **Label:** "Job Description (Optional)"
- **Input:** Textarea
- **Placeholder:** "Describe the job requirements, tasks, or any additional details..."
- **Rows:** 3
- **Required:** No

**Helper Buttons:**
- **Auto Fill Sample Data:** Outline button, fills form with sample data
- **Create 3 Test Jobs:** Outline button, creates 3 test jobs automatically

**Submit Button:**
- **Text:** "Post Job"
- **Background:** `bg-blue-600 hover:bg-blue-700`
- **Text Color:** White
- **Full Width:** Yes
- **Loading State:** Shows spinner

#### Logic
1. Validate all required fields
2. Validate budget (minimum ₹10)
3. Validate pincode (6 digits)
4. Submit to backend API
5. On success: Clear form, switch to "My Jobs" tab, refresh job list

---

### Tab 2: My Jobs

#### Header
- **Title:** "Active Jobs" (`text-2xl font-bold`)
- **Refresh Button:** Outline button, right-aligned

#### Job Cards

**Empty State:**
- **Icon:** Briefcase icon (gray, large)
- **Text:** "No active jobs found"
- **Button:** "Post Your First Job" (navigates to Post Job tab)

**Job Card Layout:**
- **Card:** White background, border, rounded corners
- **Header:**
  - **Left:** Job title (`text-lg font-semibold`)
  - **Right:** Status badge (colored based on status)
- **Description:**
  - Address and pincode
  - Job description (if available)
- **Details Row:**
  - **Budget:** ₹{amount}
  - **Gender:** {gender} or "Any"
  - **Offers Count:** {count} offers
- **Action Buttons (Right):**

**Status-Based Actions:**

**Status: "open"**
- **View Offers Button:**
  - Variant: Outline
  - Text: "View Offers"
  - Opens modal showing all offers

**Status: "assigned"**
- **View Freelancer Button:**
  - Variant: Outline
  - Text: "View Freelancer"
  - Color: Green (`text-green-700 hover:text-green-800 hover:bg-green-50`)
  - Opens profile modal

**Status: "work_done"**
- **Pay Button:**
  - Background: `bg-blue-600 hover:bg-blue-700`
  - Text: "Pay"
  - Opens Bill Modal
- **View Freelancer Button:** Same as above

**Status: "completed"**
- **Text:** "✓ Payment Completed" (green text)
- **View Freelancer Button:** Same as above

**Edit/Delete Buttons:**
- **Edit Button:**
  - Only visible if job is "open" and no offers accepted
  - Icon: Edit
  - Color: Blue (`text-blue-600 hover:text-blue-700 hover:bg-blue-50`)
- **Delete Button:**
  - Only visible if job is "open" and no offers accepted
  - Icon: Trash2
  - Color: Red (`text-red-600 hover:text-red-700 hover:bg-red-50`)
  - Confirmation: "Are you sure you want to delete this job?"

#### Offers Modal

**Layout:**
- **Background:** Dark overlay (`bg-black bg-opacity-50`)
- **Modal:** White card, centered, max-width `max-w-md`
- **Header:**
  - Title: "Job Offers"
  - Close Button: X icon (top right)

**Offer List:**
- Each offer shows:
  - Freelancer name
  - Freelancer profile photo
  - Offer amount
  - Offer message (if any)
  - Actions:
    - **Accept Button:** Green, "Accept Offer"
    - **Reject Button:** Red outline, "Reject Offer"
- **Empty State:** "No offers yet"

#### Bill Modal

**Layout:**
- Same modal structure as Offers Modal

**Content:**
- **Freelancer Details:**
  - Profile photo (circular, `w-16 h-16`)
  - Name
  - ID (if available)
- **Payment Message:**
  - Blue background box (`bg-blue-50 border border-blue-200`)
  - Text: "You are paying {freelancerName} for "{jobTitle}""
- **Amount Display:**
  - Green gradient background (`bg-gradient-to-br from-green-50 to-emerald-50`)
  - Large amount: `text-4xl font-bold text-green-700`
  - Label: "Amount to Pay" (small, gray)
  - Sub-label: "to freelancer"
- **Note:**
  - Gray background box
  - Text: "Please pay ₹{amount} to the freelancer through your preferred method..."
- **Footer Buttons:**
  - **Cancel:** Outline button
  - **Paid:** Green button (`bg-green-600 hover:bg-green-700`)

**Logic:**
- On "Paid" click: Marks job as completed, adds commission to freelancer's ledger

---

### Tab 3: History

#### Header
- **Title:** "Job History" (`text-2xl font-bold`)

#### Job Cards

**Empty State:**
- **Icon:** History icon (gray, large)
- **Text:** "No completed jobs yet"

**Job Card:**
- Same structure as My Jobs cards
- **Status Badge:** Green "Completed" badge
- **Completion Date:**
  - Icon: Clock
  - Text: "Completed on {date}"
  - Format: "DD MMM YYYY" (e.g., "11 Dec 2025")
  - If invalid date: Shows "Recently" or "N/A"

---

### Tab 4: Profile

#### Content
- **Profile Photo:** Large circular image
- **Full Name:** User's name
- **Phone Number:** User's phone
- **Email:** (if available)
- **Role:** "Client"

---

### Logout Logic

**Restriction:**
- Client cannot logout if they have active jobs
- Active jobs = status: "open", "assigned", or "in_progress"

**Error Message:**
- **Text:** "You cannot logout while you have active jobs. Please complete or cancel your jobs first."
- **Display Duration:** 5 seconds
- **Style:** Red error message at top of page

**On Success:**
- Clears authentication
- Redirects to `/login`

---

## Freelancer Dashboard

### Route
`/freelancer/dashboard`

### Verification Page (`/freelancer/verification`)

**Purpose:** Freelancers must complete verification before accessing dashboard

#### Status Screens

**Pending/Approved Status:**
- **Icon:** CheckCircle (green) or Clock (yellow)
- **Title:** "Verification {Status}"
- **Message:** Status-specific message
- **Button (if approved):** "Go to Dashboard"

**Rejected Status:**
- Shows form again with error message

#### Verification Form

**Personal Information Section:**
- **Profile Photo:** Upload with preview
- **Full Name:** Text input
- **Date of Birth:** Date picker
- **Gender:** Dropdown (Male/Female)
- **Address:** Textarea

**Document Upload Section:**
- **Aadhaar Front:** Image upload with preview
- **Aadhaar Back:** Image upload with preview
- **PAN Card:** Image upload with preview

**Submit Button:**
- **Text:** "Submit Verification"
- **Loading:** "Submitting..."

**Logic:**
- On submit: Uploads documents to Cloudinary
- Submits verification request to backend
- Status changes to "pending"
- Admin reviews and approves/rejects

---

### Dashboard Layout

**Same structure as Client Dashboard:**
- Top navigation bar
- Tab navigation
- Content area

**Tabs:**
1. **Available Jobs** - Icon: Briefcase
2. **My Jobs** - Icon: CheckCircle
3. **Wallet** - Icon: Wallet
4. **Orders** - Icon: CheckCircle
5. **Profile** - Icon: User

---

### Tab 1: Available Jobs

#### Header
- **Title:** "Available Jobs"
- **Refresh Button:** Outline button

#### Filters Section

**Category Filter:**
- **Label:** "Category"
- **Dropdown:** 
  - Options: "All" + all categories from jobs
  - Default: "All"

**Sort Filter:**
- **Label:** "Sort"
- **Dropdown:**
  - "High price → Low" (price_desc)
  - "Low price → High" (price_asc)
  - "New → Old" (newest)
  - "Old → New" (oldest)
- **Default:** "newest"

#### Job Cards

**Empty State:**
- **Icon:** Briefcase (gray, large)
- **Text:** "No available jobs found"

**Job Card:**
- **Header:**
  - **Left:** Job title
  - **Right:** Category badge
- **Description:** Job description
- **Details:**
  - Budget: ₹{amount}
  - Gender: {gender} (if specified)
  - Posted date: "Posted: {date}"
  - Address: MapPin icon + address + pincode
- **Action Buttons:**
  - **Pickup Job Button:**
    - Background: `bg-green-600 hover:bg-green-700`
    - Text: "Pickup Job" or "Pay Commission First" (if dues pending)
    - Icon: CheckCircle
    - Disabled: If `canWork` is false
  - **Make Offer Button:**
    - Variant: Outline
    - Text: "Make Offer" or cooldown timer (e.g., "5m")
    - Disabled: If cooldown active or `canWork` is false
  - **View Button:**
    - Variant: Ghost
    - Icon: Eye

#### Logic

**Pickup Job:**
1. Confirmation: "Are you sure you want to pickup this job?"
2. Calls API to assign job directly to freelancer
3. Refreshes job list

**Make Offer:**
1. Opens modal with:
   - Amount input
   - Message textarea
2. Cooldown: 5 minutes after successful offer
3. Shows cooldown timer on button

**Work Restriction:**
- Freelancer cannot pickup/make offers if they have unpaid commission dues
- Button shows "Pay Commission First" when restricted

---

### Tab 2: My Jobs

#### Header
- **Title:** "My Assigned Jobs"
- **Refresh Button:** Outline button

#### Job Cards

**Empty State:**
- **Icon:** CheckCircle (gray, large)
- **Text:** "No assigned jobs found"

**Job Card:**
- **Header:**
  - **Left:** Job title
  - **Right:** Status badge (colored)
- **Description:** Job description
- **Details:**
  - Budget: ₹{amount}
  - Gender: {gender}
  - Assigned date: "Assigned: {date}"
  - Address: MapPin icon + address + pincode

**Status-Based Actions:**

**Status: "assigned"**
- **Work Done Button:**
  - Background: `bg-green-600 hover:bg-green-700`
  - Text: "Work Done"
  - Icon: CheckCircle
  - Confirmation: "Are you sure you want to mark this job as work done?"
- **View Client Button:**
  - Variant: Outline
  - Text: "View Client"

**Status: "work_done"**
- **Status Display:**
  - Icon: Clock (animated spin)
  - Text: "Waiting for Payment" (orange)
- **View Client Button:** Same as above

**Status: "completed"**
- **Commission Status Check:**
  - If commission pending: Shows "Pay Commission to Complete" (orange, animated clock)
  - If commission paid: Shows "Completed" button (blue)
- **Completed Button:**
  - Background: `bg-blue-600 hover:bg-blue-700`
  - Text: "Completed"
  - Icon: CheckCircle
  - Action: Marks job as fully completed

---

### Tab 3: Wallet

#### Wallet Container Component

**Total Dues Card:**

**Header:**
- **Title:** "Total Dues" (with Receipt icon)
- **Refresh Button:** Outline button (top right)

**Content:**
- **When Dues > 0:**
  - **Card Style:** Red border (`border-red-200`), red gradient background (`bg-gradient-to-br from-red-50 to-orange-50`)
  - **Title Color:** `text-red-800`
  - **Amount:** Large red text (`text-3xl font-bold text-red-700`)
  - **Label:** "Commission dues to be paid" (`text-sm text-red-600`)
  - **Pay Dues Button:**
    - Background: `bg-red-600 hover:bg-red-700`
    - Text: White
    - Icon: CreditCard
    - Text: "Pay Dues"
    - Full width
  - **Clear Dues Button (Manual):**
    - Only shows if orderId in localStorage
    - Variant: Outline
    - Border: Green (`border-green-600`)
    - Text: Green (`text-green-700`)
    - Text: "Clear Dues (Manual)"
    - Icon: RefreshCw

- **When Dues = 0:**
  - **Card Style:** Green border (`border-green-200`), green gradient background (`bg-gradient-to-br from-green-50 to-emerald-50`)
  - **Title Color:** `text-green-800`
  - **Amount:** Large green text showing "₹0.00"
  - **Message:** "No dues is pending" (`text-sm text-green-600`)

**Transaction History Section:**
- **Toggle Button:**
  - Full width
  - Shows History icon + "Transaction History" + count
  - Chevron icon (up/down)
- **When Expanded:**
  - List of transactions
  - Each transaction shows:
    - Job title
    - Date and time
    - Order ID (monospace font, gray background)
    - Amount received (green, large)
    - Status badge: "✓ Paid" (green) or "Pending" (red)
  - **Card Style:**
    - Paid: Green background (`bg-green-50 border-green-200`)
    - Pending: Red background (`bg-red-50 border-red-200`)

**Commission Ledger Card:**

**Header:**
- **Title:** "Commission Ledger" (with Receipt icon)

**Content:**
- **Empty State:**
  - Receipt icon (large, gray)
  - Text: "No commission records yet"
  - Subtext: "Commission will appear here after jobs are completed"

- **Transaction List:**
  - Each transaction is a card
  - **Collapsed View:**
    - Job title (bold)
    - Date and time (small, gray)
    - Amount received (green, large)
    - Dues amount (red, small) - if unpaid
    - "✓ Paid" badge (green) - if paid
    - Chevron icon (down)
  - **Expanded View (on click):**
    - Client name
    - Job ID
    - Breakdown:
      - Job Amount
      - Platform Commission (10%) - red, negative
      - Amount Received - green, large, bold
    - Chevron icon (up)

**Card Colors:**
- Paid: Green border and background (`border-green-200 bg-green-50`)
- Unpaid: Red border and background (`border-red-200 bg-red-50`)

#### Pay Dues Flow

1. **Click "Pay Dues" Button:**
   - Confirmation: "Pay ₹{amount} as commission dues?"
   - Creates PhonePe payment request
   - Opens PhonePe payment page in new window/tab

2. **After Payment:**
   - PhonePe redirects to: `/freelancer/dashboard?tab=wallet&payment=success&orderId={orderId}`
   - Frontend detects URL parameters
   - Auto-processes dues (300ms-1s delay)
   - Clears URL parameters
   - Refreshes wallet data

3. **Manual Processing:**
   - If auto-processing fails, "Clear Dues (Manual)" button appears
   - Clicking it manually processes the dues

#### Logic

**Dues Calculation:**
- Sum of all transactions where `commission > 0` and `duesPaid !== true`

**Transaction Processing:**
- When dues payment is confirmed:
  - Marks all unpaid commission transactions as `duesPaid: true`
  - Updates `duesPaidAt` timestamp
  - Stores `duesPaymentOrderId`
  - Updates wallet balance

---

### Tab 4: Orders

**Content:**
- List of orders (similar to My Jobs)
- Order details and status

---

### Tab 5: Profile

**Content:**
- Profile information
- Verification status
- Edit profile options

---

### Logout Logic

**Restriction:**
- Freelancer cannot logout if they have active jobs
- Active jobs = status: "assigned", "in_progress", or "completed" (but not fully completed)

**Error Message:**
- **Text:** "You cannot logout while you have active jobs. Please complete your jobs first."
- **Display Duration:** 5 seconds

---

## Admin Dashboard

### Route
`/admin/dashboard`

### Layout

**Same structure as other dashboards:**
- Top navigation bar
- Tab navigation
- Content area

**Tabs:**
1. **Verifications** - Icon: Shield
2. **Withdrawals** - Icon: DollarSign
3. **Search** - Icon: Search
4. **Profile** - Icon: User

---

### Tab 1: Verifications

#### Filter
- **Dropdown:** 
  - "Pending" (default)
  - "Approved"
  - "Rejected"

#### Verification List

**Empty State:**
- **Text:** "No {filter} verifications found"

**Verification Card:**
- **Freelancer Info:**
  - Profile photo
  - Full name
  - Phone number
  - Email (if available)
- **Documents:**
  - Aadhaar Front (clickable to view full size)
  - Aadhaar Back (clickable to view full size)
  - PAN Card (clickable to view full size)
- **Status Badge:**
  - Pending: Yellow
  - Approved: Green
  - Rejected: Red
- **Actions:**
  - **Approve Button:**
    - Background: Green
    - Text: "Approve"
    - Icon: CheckCircle
  - **Reject Button:**
    - Variant: Outline, red
    - Text: "Reject"
    - Icon: XCircle
    - Prompts for rejection reason

#### Logic

**Approve:**
1. Calls API to approve verification
2. Removes from list
3. Freelancer can now access dashboard

**Reject:**
1. Prompts for rejection reason
2. Calls API to reject verification
3. Removes from list
4. Freelancer sees rejection status and can resubmit

---

### Tab 2: Withdrawals

#### Withdrawal List

**Empty State:**
- **Text:** "No pending withdrawals"

**Withdrawal Card:**
- **User Info:**
  - Profile photo
  - Name
  - Role (Freelancer)
  - Phone number
- **Withdrawal Details:**
  - Amount: ₹{amount}
  - UPI ID: {upiId}
  - Requested Date: {date}
- **Actions:**
  - **Approve Button:**
    - Background: Green
    - Text: "Approve"
    - Icon: CheckCircle
    - **Logic:** Initiates Bulkpe payout, updates status
  - **Reject Button:**
    - Variant: Outline, red
    - Text: "Reject"
    - Icon: XCircle
    - Prompts for rejection reason

#### Logic

**Approve:**
1. Calls Bulkpe API to initiate payout
2. Updates withdrawal status to "processing"
3. Records Bulkpe transaction IDs
4. Deducts amount from user's wallet
5. Removes from pending list

**Reject:**
1. Prompts for rejection reason
2. Updates withdrawal status to "rejected"
3. Removes from pending list

---

### Tab 3: Search

#### Search Bar
- **Input:** Text input with Search icon
- **Placeholder:** "Search by name, phone, email..."
- **Real-time filtering:** Filters as user types

#### Results

**Tabs:**
- **All Users**
- **Clients**
- **Freelancers**

**User Cards:**
- **Profile Photo:** Circular
- **Name:** Bold
- **Phone:** Gray text
- **Email:** Gray text (if available)
- **Role Badge:** Colored badge
- **View Button:**
  - Variant: Outline
  - Text: "View Profile"
  - Opens profile modal

**Profile Modal:**
- Shows full user details
- Edit options (if admin has permissions)

---

## Components Library

### Button Component

**Variants:**
1. **default:** `bg-primary text-primary-foreground hover:bg-primary/90`
2. **destructive:** `bg-destructive text-destructive-foreground hover:bg-destructive/90`
3. **outline:** `border border-input bg-background hover:bg-accent`
4. **secondary:** `bg-secondary text-secondary-foreground hover:bg-secondary/80`
5. **ghost:** `hover:bg-accent hover:text-accent-foreground`
6. **link:** `text-primary underline-offset-4 hover:underline`

**Sizes:**
- **default:** `h-10 px-4 py-2`
- **sm:** `h-9 rounded-md px-3`
- **lg:** `h-11 rounded-md px-8`
- **icon:** `h-10 w-10`

**Props:**
- `loading`: Shows spinner
- `disabled`: Disables button
- `variant`: Button style
- `size`: Button size

---

### Card Component

**Structure:**
- **Card:** Container with border, rounded, shadow
- **CardHeader:** Padding `p-6`, flex column, spacing
- **CardTitle:** `text-2xl font-semibold`
- **CardDescription:** `text-sm text-muted-foreground`
- **CardContent:** Padding `p-6 pt-0`

---

### Input Component

**Styling:**
- **Base:** `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm`
- **Focus:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Disabled:** `disabled:cursor-not-allowed disabled:opacity-50`

---

### Label Component

**Styling:**
- `text-sm font-medium leading-none`

---

## API Integration

### Base URL
- **Production:** `https://freelancing-platform-backend-backup.onrender.com`
- **Development:** `http://localhost:3001`

### Authentication
- **Method:** Bearer Token (JWT)
- **Header:** `Authorization: Bearer {token}`
- **Storage:** localStorage or secure storage

### Key Endpoints

#### Authentication
- `POST /api/auth/authenticate` - Authenticate user
- `POST /api/auth/logout` - Logout user

#### Client
- `GET /api/client/jobs/active` - Get active jobs
- `GET /api/client/jobs/history` - Get job history
- `POST /api/client/jobs` - Post new job
- `PUT /api/client/jobs/:id` - Update job
- `DELETE /api/client/jobs/:id` - Delete job
- `POST /api/client/jobs/:id/accept-offer` - Accept offer
- `POST /api/client/jobs/:id/reject-offer` - Reject offer
- `POST /api/client/jobs/:id/pay` - Mark job as paid

#### Freelancer
- `GET /api/freelancer/jobs/available` - Get available jobs
- `GET /api/freelancer/jobs/assigned` - Get assigned jobs
- `POST /api/freelancer/jobs/:id/pickup` - Pickup job
- `POST /api/freelancer/jobs/:id/offer` - Make offer
- `POST /api/freelancer/jobs/:id/complete` - Mark work done
- `POST /api/freelancer/jobs/:id/fully-complete` - Mark fully completed
- `GET /api/freelancer/wallet` - Get wallet data
- `POST /api/freelancer/pay-dues` - Initiate dues payment
- `POST /api/freelancer/verification` - Submit verification
- `GET /api/freelancer/verification/status` - Get verification status

#### Admin
- `GET /api/admin/verifications` - Get verifications
- `POST /api/admin/verifications/:id/approve` - Approve verification
- `POST /api/admin/verifications/:id/reject` - Reject verification
- `GET /api/admin/withdrawals` - Get withdrawals
- `POST /api/admin/withdrawals/:id/approve` - Approve withdrawal
- `POST /api/admin/withdrawals/:id/reject` - Reject withdrawal
- `GET /api/admin/search` - Search users

#### Payment
- `POST /payment/process-dues-order/:orderId` - Process dues payment
- `GET /payment/callback` - Payment callback handler

---

## User Flows

### Client Flow

1. **Login** → Enter phone → Select "Client" → Enter OTP → Profile Setup → Dashboard
2. **Post Job** → Fill form → Submit → Job appears in "My Jobs"
3. **Receive Offers** → View offers → Accept/Reject
4. **Job Assigned** → Wait for work completion
5. **Work Done** → Click "Pay" → View Bill Modal → Click "Paid" → Job completed
6. **View History** → See all completed jobs

### Freelancer Flow

1. **Login** → Enter phone → Select "Freelancer" → Enter OTP → Profile Setup → Verification
2. **Verification** → Upload documents → Submit → Wait for approval
3. **Approved** → Access dashboard
4. **Browse Jobs** → Filter/Sort → Pickup or Make Offer
5. **Job Assigned** → Complete work → Click "Work Done"
6. **Wait for Payment** → Client pays → Job status: "completed"
7. **Pay Commission** → View dues in Wallet → Click "Pay Dues" → Complete PhonePe payment → Dues cleared
8. **Mark Fully Completed** → Click "Completed" → Job removed from active list

### Admin Flow

1. **Login** → Admin credentials → Dashboard
2. **Review Verifications** → View documents → Approve/Reject
3. **Review Withdrawals** → View details → Approve (initiates payout) / Reject
4. **Search Users** → Enter query → View results → View profiles

---

## Business Logic

### Commission System

**Calculation:**
- Platform commission: 10% of job amount
- Freelancer receives: 90% of job amount

**Flow:**
1. Client posts job with budget (e.g., ₹1000)
2. Freelancer completes work
3. Client pays ₹1000 to freelancer
4. Commission (₹100) is added to freelancer's ledger as "unpaid"
5. Freelancer must pay commission dues via PhonePe
6. After payment, commission is marked as "paid"

### Job Status Flow

**Client Side:**
- `open` → `assigned` → `work_done` → `completed`

**Freelancer Side:**
- `assigned` → `work_done` → `completed` → (fully completed - removed)

### Payment Flow

**Client Payment:**
- Offline payment (cash, UPI, bank transfer)
- Client clicks "Paid" after making payment
- Job status changes to "completed"
- Commission added to freelancer's ledger

**Freelancer Dues Payment:**
- PhonePe payment gateway
- Order ID format: `DUES_{userId}_{timestamp}`
- Redirect URL: `/freelancer/dashboard?tab=wallet&payment=success&orderId={orderId}`
- Auto-processing on redirect
- Manual fallback button available

### Work Restrictions

**Freelancer:**
- Cannot pickup/make offers if unpaid commission dues exist
- Check: `canWork` flag from API
- Message: "Pay Commission First"

**Logout Restrictions:**
- Client: Cannot logout with active jobs (open/assigned/in_progress)
- Freelancer: Cannot logout with active jobs (assigned/in_progress/completed but not fully completed)

### Offer Cooldown

- After making an offer, 5-minute cooldown before next offer on same job
- Button shows countdown: "{X}m"

---

## Required Credentials & Environment Variables

### ⚠️ SECURITY NOTE
**DO NOT commit actual credentials to Git or include them in documentation.** Store all credentials securely using environment variables or secure storage.

### Backend Environment Variables (`.env` file)

**Server Configuration:**
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

**Database:**
- `MONGODB_URI` - MongoDB connection string
  - Format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`

**Authentication:**
- `JWT_SECRET` - Secret key for JWT token signing
- `JWT_EXPIRES_IN` - Token expiration (e.g., "7d")

**Cloudinary (Image Storage):**
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- Get from: https://cloudinary.com/console

**CORS:**
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins
  - Example: `http://localhost:3000,https://www.people.com.de`

**Firebase Admin SDK:**
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_PRIVATE_KEY` - Service account private key (with newlines as `\n`)
- Get from: Firebase Console → Project Settings → Service Accounts

**PhonePe Payment Gateway:**
- `PHONEPE_MERCHANT_ID` - Your PhonePe merchant ID
- `PHONEPE_CLIENT_ID` - PhonePe client ID
- `PHONEPE_CLIENT_SECRET` - PhonePe client secret
- `PHONEPE_CLIENT_VERSION` - Client version (usually "1")
- `PHONEPE_BASE_URL` - API base URL (production: `https://api.phonepe.com/apis/pg`)
- `PHONEPE_AUTH_BASE_URL` - Auth API URL (production: `https://api.phonepe.com/apis/identity-manager`)
- Get from: PhonePe Merchant Dashboard

**Bulkpe Payouts:**
- `BULKPE_API_KEY` - Bulkpe API key (Bearer token)
- `BULKPE_SECRET_KEY` - Bulkpe secret key (if required)
- Get from: Bulkpe Dashboard

**Payment Callbacks:**
- `PAYMENT_REDIRECT_URL` - Backend callback URL for payments
  - Example: `https://your-backend-domain.com/payment/callback`
- `FRONTEND_URL` - Frontend URL for payment redirects
  - Example: `https://www.people.com.de`

### Frontend Environment Variables (`.env` file)

**API Configuration:**
- `REACT_APP_API_BASE_URL` - Backend API base URL
  - Production: `https://freelancing-platform-backup.onrender.com`
  - Development: `http://localhost:3001`

**Firebase Configuration:**
- `REACT_APP_FIREBASE_API_KEY` - Firebase web API key
- `REACT_APP_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `REACT_APP_FIREBASE_PROJECT_ID` - Firebase project ID
- `REACT_APP_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `REACT_APP_FIREBASE_APP_ID` - Firebase app ID
- Get from: Firebase Console → Project Settings → General → Your apps

**Mock Auth (Development Only):**
- `REACT_APP_USE_MOCK_AUTH` - Set to "true" for development mock auth

### Render.com Environment Variables

When deploying to Render.com, add all backend environment variables in:
- Render Dashboard → Your Service → Environment → Environment Variables

**Required for Production:**
- All backend `.env` variables listed above
- Make sure `NODE_ENV=production`
- Update `ALLOWED_ORIGINS` with production frontend URL
- Update `FRONTEND_URL` with production frontend URL

### GitHub Repository

**Repository Setup:**
- Create a private GitHub repository
- Add `.env` to `.gitignore` (NEVER commit credentials)
- Store credentials securely:
  - Use GitHub Secrets for CI/CD
  - Use Render.com environment variables for deployment
  - Use secure vaults for team sharing

### Where to Get Credentials

1. **MongoDB:**
   - Sign up at https://www.mongodb.com/cloud/atlas
   - Create cluster → Get connection string

2. **Cloudinary:**
   - Sign up at https://cloudinary.com
   - Dashboard → Settings → Account Details

3. **Firebase:**
   - Sign up at https://firebase.google.com
   - Create project → Project Settings → General
   - For Admin SDK: Project Settings → Service Accounts

4. **PhonePe:**
   - Sign up at https://merchant.phonepe.com
   - Dashboard → API Credentials

5. **Bulkpe:**
   - Sign up at https://bulkpe.in
   - Dashboard → API Keys

### Security Best Practices

1. **Never commit `.env` files to Git**
2. **Use different credentials for development and production**
3. **Rotate credentials regularly**
4. **Use environment-specific values**
5. **Restrict API key permissions**
6. **Monitor API usage for suspicious activity**
7. **Use secure storage for sensitive data**
8. **Implement rate limiting on APIs**

---

## Important Notes for Android Development

### Navigation
- Use React Navigation for routing
- Implement protected routes based on authentication and role
- Handle deep linking for payment callbacks

### State Management
- Use Context API or Redux for:
  - Authentication state
  - User data
  - Job lists
  - Wallet data

### Image Handling
- Use React Native Image Picker for profile photos and documents
- Upload to Cloudinary using their React Native SDK
- Cache images for performance

### Payment Integration
- PhonePe SDK for Android
- Handle payment callbacks via deep linking
- Store order IDs securely

### Offline Support
- Cache job lists
- Queue actions when offline
- Sync when connection restored

### Performance
- Lazy load job lists
- Implement pagination
- Optimize image loading
- Use FlatList for long lists

### Security
- Store JWT tokens securely (use SecureStore or Keychain)
- Validate all inputs
- Implement certificate pinning for API calls

### Testing
- Test all user flows
- Test payment integration thoroughly
- Test offline scenarios
- Test on different Android versions

---

## File Structure Reference

```
src/
├── api/              # API service files
├── components/       # Reusable components
│   ├── common/      # Button, Card, Input, Label
│   └── modals/      # BillModal, etc.
├── context/         # AuthContext, RoleContext
├── pages/           # All page components
│   ├── auth/       # Login, OTP, ProfileSetup
│   ├── client/     # ClientDashboard
│   ├── freelancer/ # FreelancerDashboard, Verification
│   └── admin/      # AdminDashboard, AdminLogin
├── styles/          # Global styles
└── utils/           # Helper functions
```

---

## Conclusion

This documentation covers every aspect of the People Web App. Use this as a reference when building the Android version with React Native. Pay special attention to:

1. **Exact color codes and styling**
2. **Button placements and actions**
3. **Modal structures and content**
4. **API endpoints and request/response formats**
5. **Business logic and restrictions**
6. **User flows and navigation**

Good luck with the Android app development! 🚀

