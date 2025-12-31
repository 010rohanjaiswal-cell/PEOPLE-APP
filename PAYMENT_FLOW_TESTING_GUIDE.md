# PhonePe Payment Flow - Complete Testing Guide

## ✅ Pre-Testing Checklist

### Backend Environment Variables
Ensure these are set in your Render backend environment:
- `PHONEPE_CLIENT_ID` - Your PhonePe Client ID
- `PHONEPE_CLIENT_SECRET` - Your PhonePe Client Secret  
- `PHONEPE_MERCHANT_ID` - Your PhonePe Merchant ID (e.g., M23OKIGC1N363)
- `PHONEPE_CLIENT_VERSION` - Client version (default: 1)
- `PHONEPE_ENV` - Set to `production` (not sandbox)
- `PHONEPE_WEBHOOK_USERNAME` - Webhook username
- `PHONEPE_WEBHOOK_PASSWORD` - Webhook password

### App Configuration
- ✅ App package name is whitelisted by PhonePe
- ✅ Deep link scheme configured: `people-app://payment/callback`
- ✅ PhonePe SDK initialized in app (happens on app start)

## 📋 Complete Payment Flow Test

### Step 1: Prepare Test Scenario
1. **Login as Freelancer** with unpaid dues
2. **Navigate to Wallet tab**
3. **Verify you have unpaid dues** (should show "Pay Dues" button)

### Step 2: Initiate Payment
1. **Click "Pay Dues" button**
2. **Confirm payment** in the alert dialog
3. **Check console logs** for:
   ```
   📦 PhonePe SDK order created: { merchantOrderId, orderId, hasOrderToken: true }
   🚀 Starting PhonePe React Native SDK transaction...
   ```

### Step 3: PhonePe Payment Screen
1. **PhonePe SDK should open** (native in-app payment screen)
2. **Select payment method** (UPI, Cards, Net Banking, etc.)
3. **Complete payment** using test credentials or real payment method
4. **Verify payment completion** on PhonePe screen

### Step 4: Payment Callback
1. **After payment**, PhonePe should redirect back to app
2. **Check console logs** for:
   ```
   🔗 Deep link received: people-app://payment/callback?orderId=...
   ✅ Payment callback received, checking status...
   ```

### Step 5: Payment Status Verification
1. **App should check payment status** automatically
2. **Check console logs** for:
   ```
   📊 Checking payment status for order: ...
   ✅ Payment successful!
   ```

### Step 6: Wallet Update
1. **Wallet should refresh** automatically
2. **Verify**:
   - Total dues should be reduced/zero
   - Transaction should show as "paid"
   - "Pay Dues" button should disappear or be disabled

## 🔍 What to Check at Each Step

### Backend Logs (Render Dashboard)
1. **Order Creation**:
   ```
   🔧 Initializing PhonePe Node.js SDK
   ✅ PhonePe Node.js SDK initialized successfully
   📦 Creating PhonePe SDK order...
   ✅ PhonePe SDK order created successfully
   ```

2. **Webhook (if received)**:
   ```
   📬 PhonePe webhook received: checkout.order.completed
   ✅ PhonePe order completed - Dues payment processed
   ```

### Frontend Logs (React Native)
1. **Order Creation**:
   ```
   📤 API Request: POST /api/payment/create-dues-order
   ✅ API Response: POST /api/payment/create-dues-order 200
   📦 PhonePe SDK order created: { merchantOrderId, orderId, ... }
   ```

2. **SDK Transaction**:
   ```
   🚀 Starting PhonePe React Native SDK transaction...
   ✅ PhonePe SDK transaction response: { status: 'SUCCESS' }
   ```

3. **Deep Link Callback**:
   ```
   🔗 Deep link received: people-app://payment/callback?orderId=...
   ✅ Payment callback received, checking status...
   ```

4. **Status Check**:
   ```
   📊 Checking payment status...
   ✅ Payment successful! Order status: COMPLETED
   ```

## ⚠️ Common Issues & Solutions

### Issue 1: SDK Not Opening
**Symptoms**: Payment button clicked but PhonePe screen doesn't open

**Check**:
- PhonePe SDK initialized? (check app startup logs)
- Order created successfully? (check backend logs)
- Merchant ID correct? (check `mobile-app/src/config/phonepe.js`)

**Solution**:
- Verify `PHONEPE_MERCHANT_ID` matches in both backend and frontend
- Check if SDK initialization succeeded on app start

### Issue 2: Deep Link Not Working
**Symptoms**: Payment completes but app doesn't receive callback

**Check**:
- Deep link listener set up? (check Wallet.js logs)
- URL scheme correct? (`people-app://payment/callback`)
- App package name whitelisted?

**Solution**:
- Verify deep link configuration in `app.json`
- Check if PhonePe redirect URL includes your app scheme
- Test deep link manually: `people-app://payment/callback?orderId=TEST123`

### Issue 3: Payment Status Not Updating
**Symptoms**: Payment completed but wallet doesn't update

**Check**:
- Status check API called? (check logs)
- Webhook received? (check backend logs)
- Wallet refresh triggered?

**Solution**:
- Manually call `/api/payment/check-status/:merchantOrderId`
- Check if webhook is configured in PhonePe dashboard
- Pull to refresh wallet manually

### Issue 4: "User not found" Error
**Symptoms**: Payment fails with authentication error

**Check**:
- User logged in? (check auth token)
- Token valid? (check expiry)
- Backend can find user? (check user ID in logs)

**Solution**:
- Re-login to get fresh token
- Check backend user lookup logic

## 🧪 Test Scenarios

### Test 1: Successful Payment
1. ✅ Initiate payment
2. ✅ Complete payment successfully
3. ✅ Verify callback received
4. ✅ Verify wallet updated
5. ✅ Verify dues marked as paid

### Test 2: Payment Cancellation
1. ✅ Initiate payment
2. ✅ Cancel payment in PhonePe
3. ✅ Verify app returns to wallet
4. ✅ Verify dues still unpaid
5. ✅ Verify "Pay Dues" button still visible

### Test 3: Payment Failure
1. ✅ Initiate payment
2. ✅ Use invalid payment method (or let it fail)
3. ✅ Verify error message shown
4. ✅ Verify wallet not updated
5. ✅ Verify can retry payment

### Test 4: Multiple Payments
1. ✅ Complete first payment
2. ✅ Generate new dues (complete a job)
3. ✅ Pay dues again
4. ✅ Verify both payments recorded
5. ✅ Verify wallet shows correct total

## 📊 Expected Results

### Successful Payment Flow
```
User Action → Order Created → SDK Opens → Payment Complete → 
Callback Received → Status Verified → Wallet Updated → Success Message
```

### Payment Flow Duration
- Order creation: ~1-2 seconds
- SDK opening: ~1 second
- Payment completion: User dependent (30 seconds - 5 minutes)
- Status verification: ~2-3 seconds
- Wallet update: ~1 second

**Total**: ~5-10 seconds (excluding user payment time)

## 🔐 Security Checks

1. ✅ **Authentication**: Only authenticated freelancers can create orders
2. ✅ **Authorization**: Users can only pay their own dues
3. ✅ **Webhook Verification**: Webhook uses SHA256(username:password) auth
4. ✅ **Order Validation**: Backend validates order before processing
5. ✅ **Idempotency**: Same order ID won't process twice

## 📝 Testing Checklist

- [ ] Backend environment variables configured
- [ ] App package name whitelisted
- [ ] PhonePe SDK initialized on app start
- [ ] Can create payment order
- [ ] PhonePe SDK opens successfully
- [ ] Can complete payment
- [ ] Deep link callback received
- [ ] Payment status verified
- [ ] Wallet updates correctly
- [ ] Dues marked as paid
- [ ] Webhook received (if configured)
- [ ] Can retry if payment fails
- [ ] Error handling works

## 🚀 Next Steps After Testing

1. **Monitor Production Logs**: Check for any errors in production
2. **Test Webhook**: Verify webhook is being called by PhonePe
3. **Test Refunds**: If needed, test refund flow
4. **User Feedback**: Collect feedback from real users
5. **Performance**: Monitor payment success rate

## 📞 Support

If you encounter issues:
1. Check console logs (both frontend and backend)
2. Check PhonePe dashboard for order status
3. Verify environment variables
4. Test with different payment methods
5. Contact PhonePe support if issue persists

---

**Last Updated**: After app whitelisting
**Status**: Ready for Production Testing ✅

