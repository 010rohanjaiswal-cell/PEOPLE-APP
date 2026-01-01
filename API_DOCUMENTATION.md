# Mobile App API Documentation

This document contains all API endpoints, Socket.io events, and connection details used by the People App mobile application. This information is provided for the admin panel integration.

## Base Configuration

### API Base URL
- **Production**: `https://freelancing-platform-backend-backup.onrender.com`
- **Environment Variable**: `EXPO_PUBLIC_API_BASE_URL`

### Authentication
- **Method**: JWT Bearer Token
- **Header**: `Authorization: Bearer <token>`
- **Token Storage**: `authToken` in AsyncStorage
- **Token Expiry**: Handled automatically (401 responses trigger logout)

### Request/Response Format
- **Content-Type**: `application/json` (except file uploads)
- **Accept**: `application/json`
- **Timeout**: 30 seconds

---

## Authentication APIs

### 1. Send OTP
- **Endpoint**: `POST /api/auth/send-otp`
- **Description**: Send OTP to phone number for authentication
- **Request Body**:
  ```json
  {
    "phoneNumber": "+919876543210",
    "role": "client" | "freelancer"
  }
  ```
- **Response**: Success message

### 2. Verify OTP
- **Endpoint**: `POST /api/auth/verify-otp`
- **Description**: Verify OTP and get JWT token
- **Request Body**:
  ```json
  {
    "phoneNumber": "+919876543210",
    "otp": "123456"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "token": "jwt_token_here",
    "user": { /* user object */ }
  }
  ```

### 3. Authenticate (Legacy)
- **Endpoint**: `POST /api/auth/authenticate`
- **Description**: Authenticate with Firebase token (legacy support)
- **Request Body**:
  ```json
  {
    "firebaseToken": "firebase_id_token"
  }
  ```
- **Response**: User data and JWT token

### 4. Logout
- **Endpoint**: `POST /api/auth/logout`
- **Description**: Logout user
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Success message

---

## User APIs

### 1. Get Current User Profile
- **Endpoint**: `GET /api/user/profile`
- **Description**: Get authenticated user's profile
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User profile object

### 2. Get User Profile by ID
- **Endpoint**: `GET /api/user/profile/:userId`
- **Description**: Get another user's profile
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User profile object

---

## Verification APIs (Freelancer)

### 1. Submit Verification
- **Endpoint**: `POST /api/freelancer/verification`
- **Description**: Submit verification documents (profile photo, Aadhaar front/back, PAN card)
- **Headers**: 
  - `Authorization: Bearer <token>`
  - `Content-Type: multipart/form-data`
- **Request Body** (FormData):
  - `fullName`: string
  - `dob`: string (YYYY-MM-DD)
  - `gender`: string ("Male" | "Female")
  - `address`: string
  - `profilePhoto`: File (image, 9:16 aspect ratio)
  - `aadhaarFront`: File (image, 4:3 aspect ratio)
  - `aadhaarBack`: File (image, 4:3 aspect ratio)
  - `panCard`: File (image, 4:3 aspect ratio)
- **Response**: Verification submission confirmation

### 2. Get Verification Status
- **Endpoint**: `GET /api/freelancer/verification/status`
- **Description**: Get current verification status
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "status": "pending" | "approved" | "rejected",
    "verification": { /* verification object */ }
  }
  ```

---

## Client Jobs APIs

### 1. Get Active Jobs
- **Endpoint**: `GET /api/client/jobs/active`
- **Description**: Get all active jobs for the client
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of job objects

### 2. Get Job History
- **Endpoint**: `GET /api/client/jobs/history`
- **Description**: Get completed job history for the client
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of completed job objects

### 3. Post Job
- **Endpoint**: `POST /api/client/jobs`
- **Description**: Create a new job posting
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "string",
    "category": "string",
    "address": "string",
    "pincode": "string",
    "budget": "number",
    "gender": "string",
    "description": "string"
  }
  ```
- **Response**: Created job object

### 4. Update Job
- **Endpoint**: `PUT /api/client/jobs/:jobId`
- **Description**: Update an existing job
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: Same as Post Job
- **Response**: Updated job object

### 5. Delete Job
- **Endpoint**: `DELETE /api/client/jobs/:jobId`
- **Description**: Delete a job
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Success message

### 6. Accept Offer
- **Endpoint**: `POST /api/client/jobs/:jobId/accept-offer`
- **Description**: Accept a freelancer's offer
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "offerId": "offer_id_string"
  }
  ```
- **Response**: Updated job and offer status

### 7. Reject Offer
- **Endpoint**: `POST /api/client/jobs/:jobId/reject-offer`
- **Description**: Reject a freelancer's offer
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "offerId": "offer_id_string"
  }
  ```
- **Response**: Updated offer status

### 8. Pay Job
- **Endpoint**: `POST /api/client/jobs/:jobId/pay`
- **Description**: Mark job as paid
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Updated job status

### 9. Get Offers for Job
- **Endpoint**: `GET /api/client/jobs/:jobId/offers`
- **Description**: Get all offers for a specific job
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of offer objects

---

## Freelancer Jobs APIs

### 1. Get Available Jobs
- **Endpoint**: `GET /api/freelancer/jobs/available`
- **Description**: Get all available jobs that freelancer can apply for
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of available job objects

### 2. Get Assigned Jobs
- **Endpoint**: `GET /api/freelancer/jobs/assigned`
- **Description**: Get all jobs assigned to the freelancer
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of assigned job objects

### 3. Pickup Job
- **Endpoint**: `POST /api/freelancer/jobs/:jobId/pickup`
- **Description**: Pickup/accept a direct assignment job
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Updated job status

### 4. Make Offer
- **Endpoint**: `POST /api/freelancer/jobs/:jobId/offer`
- **Description**: Make an offer on a job
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "amount": "number",
    "message": "string" // optional
  }
  ```
- **Response**: Created offer object

### 5. Complete Work
- **Endpoint**: `POST /api/freelancer/jobs/:jobId/complete`
- **Description**: Mark work as done (waiting for client payment)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Updated job status

### 6. Fully Complete
- **Endpoint**: `POST /api/freelancer/jobs/:jobId/fully-complete`
- **Description**: Mark job as fully completed (after payment received)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Updated job status

### 7. Get Orders (Order History)
- **Endpoint**: `GET /api/freelancer/orders`
- **Description**: Get completed order history for freelancer
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of completed order objects

---

## Wallet APIs (Freelancer)

### 1. Get Wallet
- **Endpoint**: `GET /api/freelancer/wallet`
- **Description**: Get wallet data including dues, transactions, and payment history
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "wallet": {
      "totalDues": "number",
      "paymentTransactions": [ /* transaction objects */ ],
      "commissionLedger": [ /* ledger entries */ ]
    }
  }
  ```

### 2. Pay Dues
- **Endpoint**: `POST /api/freelancer/pay-dues`
- **Description**: Initiate dues payment (legacy endpoint, now uses payment API)
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "orderId": "string" // optional
  }
  ```
- **Response**: Updated wallet data

---

## Payment APIs

### 1. Create Dues Order
- **Endpoint**: `POST /api/payment/create-dues-order`
- **Description**: Create PhonePe payment order for dues payment
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "paymentSessionId": "string",
    "merchantOrderId": "string",
    "paymentUrl": "string" // for web payments
  }
  ```

### 2. Check Order Status
- **Endpoint**: `GET /api/payment/order-status/:merchantOrderId`
- **Description**: Check payment order status
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "isSuccess": boolean,
    "isFailed": boolean,
    "isPending": boolean,
    "errorCode": "string", // if failed
    "detailedErrorCode": "string" // if failed
  }
  ```

### 3. Process Dues Payment
- **Endpoint**: `POST /api/payment/process-dues/:merchantOrderId`
- **Description**: Process dues payment after successful payment
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Updated wallet data

### 4. Diagnose Payment
- **Endpoint**: `GET /api/payment/diagnose/:merchantOrderId`
- **Description**: Get diagnostic information for payment issues
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Diagnostic information object

### 5. Manual Process Dues
- **Endpoint**: `POST /api/payment/manual-process-dues/:merchantOrderId`
- **Description**: Manually process dues payment (for fixing missed payments)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Updated wallet data

---

## Notifications APIs

### 1. Get Notifications
- **Endpoint**: `GET /api/notifications`
- **Description**: Get all notifications for authenticated user
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page`: number (optional)
  - `limit`: number (optional)
  - `unreadOnly`: boolean (optional)
- **Response**: Array of notification objects

### 2. Get Unread Count
- **Endpoint**: `GET /api/notifications/unread-count`
- **Description**: Get count of unread notifications
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "unreadCount": "number"
  }
  ```

### 3. Mark as Read
- **Endpoint**: `PUT /api/notifications/:notificationId/read`
- **Description**: Mark a specific notification as read
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Updated notification object

### 4. Mark All as Read
- **Endpoint**: `PUT /api/notifications/read-all`
- **Description**: Mark all notifications as read
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Success message

### 5. Delete Notification
- **Endpoint**: `DELETE /api/notifications/:notificationId`
- **Description**: Delete a notification
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Success message

---

## Chat APIs

### 1. Get Messages
- **Endpoint**: `GET /api/chat/messages/:recipientId`
- **Description**: Get message history with a specific recipient
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of message objects

### 2. Send Message
- **Endpoint**: `POST /api/chat/send`
- **Description**: Send a message (REST fallback, primary method is Socket.io)
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "recipientId": "string",
    "message": "string"
  }
  ```
- **Response**: Created message object

### 3. Mark Messages as Read
- **Endpoint**: `POST /api/chat/mark-read`
- **Description**: Mark messages from a sender as read
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "senderId": "string"
  }
  ```
- **Response**: Success status

---

## Socket.io Real-Time Communication

### Connection Details
- **Base URL**: Same as API base URL
- **Transport**: WebSocket with polling fallback
- **Authentication**: JWT token in `auth` object
- **Connection Options**:
  ```javascript
  {
    auth: {
      token: "jwt_token_here"
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  }
  ```

### Socket Rooms
Users are automatically joined to:
- `user_${userId}` - For receiving messages
- `notifications_${userId}` - For receiving notifications

### Socket Events

#### Client → Server Events

1. **send_message**
   - **Description**: Send a real-time message
   - **Data**:
     ```json
     {
       "recipientId": "string",
       "message": "string"
     }
     ```
   - **Response Events**: `message_sent`, `error`

2. **mark_read**
   - **Description**: Mark messages as read
   - **Data**:
     ```json
     {
       "senderId": "string"
     }
     ```
   - **Response Events**: `mark_read_success`, `error`

3. **typing**
   - **Description**: Send typing indicator
   - **Data**:
     ```json
     {
       "recipientId": "string",
       "isTyping": boolean
     }
     ```

#### Server → Client Events

1. **connect**
   - **Description**: Socket connection established
   - **Data**: Connection confirmation

2. **disconnect**
   - **Description**: Socket disconnected

3. **message_sent**
   - **Description**: Confirmation that message was sent
   - **Data**: Message object with full details

4. **new_message**
   - **Description**: New message received from another user
   - **Data**: Message object with sender details

5. **messages_read**
   - **Description**: Recipient has read your messages
   - **Data**:
     ```json
     {
       "recipientId": "string",
       "count": "number"
     }
     ```

6. **mark_read_success**
   - **Description**: Confirmation that messages were marked as read
   - **Data**:
     ```json
     {
       "count": "number"
     }
     ```

7. **user_typing**
   - **Description**: User is typing indicator
   - **Data**:
     ```json
     {
       "userId": "string",
       "isTyping": boolean
     }
     ```

8. **error**
   - **Description**: Error occurred
   - **Data**:
     ```json
     {
       "message": "error_message_string"
     }
     ```

9. **notification** (via `notifications_${userId}` room)
   - **Description**: New notification received
   - **Data**: Notification object

---

## Error Handling

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized (token expired/invalid - triggers auto logout)
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "error_message",
  "message": "detailed_error_message"
}
```

### Auto Logout
On 401 response:
- Token is removed from AsyncStorage
- User data is cleared
- User is redirected to login screen

---

## File Uploads

### Supported File Types
- Images (JPEG, PNG)
- Profile Photo: 9:16 aspect ratio
- Documents: 4:3 aspect ratio

### Upload Format
- **Content-Type**: `multipart/form-data`
- Files are uploaded via FormData
- Files are processed and stored in Cloudinary

---

## Important Notes for Admin Panel

1. **Authentication**: All endpoints (except auth endpoints) require JWT Bearer token in Authorization header

2. **Real-time Updates**: The mobile app uses Socket.io for:
   - Real-time messaging
   - Real-time notifications
   - Message status updates

3. **Payment Integration**: PhonePe Native SDK is used for mobile payments. The admin panel should be aware of:
   - Payment order creation
   - Payment status polling
   - Payment webhook handling (if applicable)

4. **Notification System**: Notifications are sent via:
   - Socket.io (real-time)
   - REST API (fallback)
   - Backend service (`notificationService.js`)

5. **User Roles**: The system supports two roles:
   - `client`: Can post jobs, accept offers, make payments
   - `freelancer`: Can apply for jobs, make offers, complete work, receive payments

6. **Verification Status**: Freelancers must be verified before accessing dashboard:
   - `null`: Not submitted
   - `pending`: Under review
   - `approved`: Can access dashboard
   - `rejected`: Must resubmit

7. **Job Status Flow**:
   - Client posts job → Available for freelancers
   - Freelancer makes offer → Client accepts/rejects
   - Offer accepted → Job assigned to freelancer
   - Freelancer completes work → Waiting for payment
   - Client pays → Job fully completed

8. **Commission System**: Freelancers pay commission dues which are tracked in the wallet system

---

## Environment Variables

### Mobile App
- `EXPO_PUBLIC_API_BASE_URL`: Backend API base URL

### Backend (for reference)
- `JWT_SECRET`: Secret for JWT token signing
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)
- PhonePe credentials (for payment integration)

---

## API Rate Limiting

Currently, no explicit rate limiting is implemented in the mobile app. The admin panel should consider implementing rate limiting on the backend if needed.

---

## Support & Contact

For API-related questions or issues, please refer to the backend API documentation or contact the development team.

---

**Last Updated**: 2025-01-01
**Version**: 1.0

