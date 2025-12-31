# How to Investigate Previous Payment

## Step 1: Find the Order ID

The order ID format is: `DUES_{freelancerId}_{timestamp}`

You can find it by:
1. **Check your wallet transactions** - Look for any transaction with a `duesPaymentOrderId` field
2. **Check backend logs** - Look for logs containing "Creating PhonePe SDK order" or "merchantOrderId"
3. **Check PhonePe dashboard** - Login to PhonePe Business Dashboard and check recent orders

## Step 2: Diagnose the Payment

Once you have the order ID, you can diagnose it using the new diagnostic endpoint:

### Using API directly:
```bash
GET https://your-backend-url/api/payment/diagnose/{merchantOrderId}
Authorization: Bearer {your-auth-token}
```

### Using the app (after deploying):
The diagnostic endpoint will show:
- PhonePe payment status (COMPLETED, FAILED, PENDING)
- Database state (unpaid transactions count, total dues)
- Recommendations on what to do

## Step 3: Fix the Payment

If the diagnostic shows:
- **Payment was successful** but dues weren't marked as paid → Use manual process endpoint
- **Payment is still pending** → Wait for it to complete
- **Payment failed** → Dues should remain unpaid (this is correct)

### Manual Process Endpoint:
```bash
POST https://your-backend-url/api/payment/manual-process-dues/{merchantOrderId}
Authorization: Bearer {your-auth-token}
```

This will:
1. Verify payment was successful in PhonePe
2. Mark all unpaid dues as paid
3. Update wallet data

## Example: Finding Order ID from Logs

If you have access to backend logs, search for:
```
📤 Creating PhonePe SDK order using Node.js SDK:
merchantOrderId: DUES_693fde59f1b50d589bf27285_1735632000000
```

The `merchantOrderId` is what you need.

## Quick Fix Script

If you know the order ID, you can quickly fix it:

1. **Diagnose first**:
   ```bash
   curl -X GET "https://your-backend-url/api/payment/diagnose/DUES_YOUR_ID_TIMESTAMP" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **If payment was successful, process it**:
   ```bash
   curl -X POST "https://your-backend-url/api/payment/manual-process-dues/DUES_YOUR_ID_TIMESTAMP" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## What to Check

1. **PhonePe Status**: Should be `COMPLETED` if payment was successful
2. **Database State**: Check if `duesPaid: false` transactions exist
3. **Order ID Match**: Verify the order ID belongs to your user ID

## After Fixing

After manually processing, your wallet should:
- Show `totalDues: 0` (or reduced amount)
- Show transactions marked as `paid`
- Allow you to work again (if dues were blocking you)

---

**Note**: These diagnostic and manual process endpoints are for fixing missed payments. The automatic flow should work correctly after the recent fixes.

