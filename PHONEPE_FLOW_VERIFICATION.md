# PhonePe SDK Payment Flow Verification

## ✅ Current Flow Analysis

### Step-by-Step Flow Comparison

| Step | Expected Flow | Current Implementation | Status |
|------|---------------|----------------------|--------|
| 1. User initiate payment | User clicks "Pay Dues" | `Wallet.js` → `handlePayDues()` | ✅ **CORRECT** |
| 2. Initiate transaction | Frontend calls backend | `paymentAPI.createDuesOrder()` | ✅ **CORRECT** |
| 3. Request auth token | Backend requests OAuth token | `getAuthToken()` (cached) | ✅ **CORRECT** |
| 4. Receives auth token | Backend receives token | Token cached in `cachedAuthToken` | ✅ **CORRECT** |
| 5. Create order | Backend creates SDK order | `POST /checkout/v2/sdk/order` | ✅ **CORRECT** |
| 6. Receives order token and order id | Backend returns to frontend | Returns `orderToken` and `orderId` | ✅ **CORRECT** |
| 7. Initiate payment | Frontend calls SDK | `startPhonePeTransaction(orderToken, orderId)` | ✅ **CORRECT** |
| 8. Process payment | PhonePe SDK shows checkout | `PhonePe.startTransaction()` | ✅ **CORRECT** |
| 9. Verify transaction via callback | Deep link callback | ⚠️ **ISSUE FOUND** | ⚠️ **NEEDS FIX** |
| 10. Show transaction status | Poll status or webhook | `checkPaymentStatus()` + webhook | ✅ **CORRECT** |

## ⚠️ Issues Found

### Issue 1: Deep Link Listener Setup Timing
**Problem**: The deep link listener is set up AFTER calling `startPhonePeTransaction()`, which might be too late if the payment completes quickly.

**Current Code**:
```javascript
await startPhonePeTransaction({...});

// Listener set up AFTER SDK call
const subscription = Linking.addEventListener('url', async (event) => {
  // Handle callback
});
```

**Fix**: Set up the listener BEFORE calling `startPhonePeTransaction()`.

### Issue 2: Deep Link URL Format
**Problem**: The callback URL check might not match PhonePe's actual callback format.

**Current Code**:
```javascript
if (url.pathname.includes('/payment/callback')) {
  // Handle callback
}
```

**Backend redirectUrl**: `people-app://payment/callback?orderId=${merchantOrderId}`

**Fix**: Verify the exact format PhonePe sends and match it correctly.

### Issue 3: Deep Link Listener Not Removed Properly
**Problem**: The listener is removed immediately after first callback, but if payment fails and user retries, the listener might not be set up again.

**Fix**: Use a more robust listener management approach.

## 🔧 Recommended Fixes

### Fix 1: Set Up Listener Before SDK Call
```javascript
// Set up deep link listener BEFORE calling SDK
const subscription = Linking.addEventListener('url', async (event) => {
  const url = new URL(event.url);
  // Check for payment callback
  if (url.hostname === 'payment' && url.pathname === '/callback') {
    subscription.remove();
    const orderId = url.searchParams.get('orderId');
    if (orderId === merchantOrderId) {
      await checkPaymentStatus(merchantOrderId);
    }
  }
});

// THEN call SDK
await startPhonePeTransaction({...});
```

### Fix 2: Improve URL Matching
```javascript
// More robust URL matching
const handleDeepLink = (url) => {
  try {
    const parsedUrl = new URL(url);
    // Match: people-app://payment/callback?orderId=...
    if (parsedUrl.protocol === 'people-app:' && 
        parsedUrl.hostname === 'payment' && 
        parsedUrl.pathname === '/callback') {
      return parsedUrl.searchParams.get('orderId');
    }
  } catch (e) {
    console.error('Error parsing deep link:', e);
  }
  return null;
};
```

### Fix 3: Use App State to Handle Callbacks
```javascript
// Listen for app state changes (app coming to foreground)
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active' && paying) {
      // App came to foreground, check payment status
      checkPaymentStatus(merchantOrderId);
    }
  });
  return () => subscription.remove();
}, [paying, merchantOrderId]);
```

## 📋 Complete Corrected Flow

1. ✅ User initiates payment → `handlePayDues()`
2. ✅ Frontend calls backend → `paymentAPI.createDuesOrder()`
3. ✅ Backend requests auth token → `getAuthToken()` (cached)
4. ✅ Backend receives token → Cached in memory
5. ✅ Backend creates SDK order → `POST /checkout/v2/sdk/order`
6. ✅ Backend returns `orderToken` and `orderId` → Frontend receives
7. ✅ **Set up deep link listener BEFORE SDK call** → `Linking.addEventListener()`
8. ✅ Frontend calls SDK → `startPhonePeTransaction(orderToken, orderId)`
9. ✅ PhonePe SDK shows checkout → User completes payment
10. ✅ PhonePe redirects to app → Deep link callback received
11. ✅ App verifies transaction → `checkPaymentStatus(merchantOrderId)`
12. ✅ Show transaction status → Update UI, show success/failure

## 🔍 Additional Verification Points

### Backend Webhook Handling
- ✅ Webhook endpoint: `POST /api/payment/webhook`
- ✅ Webhook authorization: SHA256(username:password)
- ✅ Webhook events handled: `checkout.order.completed`, `checkout.order.failed`
- ✅ Webhook processes dues payment: `handleOrderCompleted()`

### Status Polling
- ✅ Polls every 5 seconds
- ✅ Handles `ORDER_NOT_FOUND` gracefully
- ✅ Max 10 retries (50 seconds total)
- ✅ Falls back to webhook if polling fails

### Deep Link Configuration
- ✅ iOS URL schemes: Configured in `app.json`
- ✅ Android intent filters: Should be configured in `app.json` or native config
- ✅ Redirect URL format: `people-app://payment/callback?orderId=...`

## 🎯 Action Items

1. **Fix deep link listener timing** - Set up listener BEFORE SDK call
2. **Improve URL matching** - More robust deep link URL parsing
3. **Add app state listener** - Handle app coming to foreground
4. **Test deep link callback** - Verify PhonePe actually sends the callback
5. **Add logging** - Log all deep link events for debugging

