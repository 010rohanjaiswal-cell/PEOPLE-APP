# PhonePe 500 Error Debug Guide

## Error Message
```
500 - Internal Server Error
"There is an error trying to process your transaction at the moment. Please try again in a while."
```

## Possible Causes (from PhonePe documentation)

1. **Missing paymentFlow details with required parameters**
   - Ensure paymentFlow.type is correct
   - Check if additional paymentFlow parameters are needed

2. **Incorrect request format**
   - Verify all required fields are present
   - Check field types and formats

3. **Payment Instrument Parameters**
   - For SDK orders, paymentInstrument might not be needed in order creation
   - SDK handles payment instruments internally

## Current Request Format

```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_...",
  "amount": 100,
  "expireAfter": 1200,
  "redirectUrl": "https://.../api/payment/return?orderId=...",
  "callbackUrl": "https://.../api/payment/webhook",
  "paymentFlow": {
    "type": "SDK"
  },
  "mobileNumber": "+911010101010"
}
```

## Debugging Steps

1. **Check Backend Logs**
   - Look for the complete request body being sent
   - Check PhonePe's exact error response
   - Verify auth token is valid

2. **Verify Request Format**
   - Compare with PhonePe SDK order documentation
   - Ensure all required fields are present
   - Check if paymentFlow needs additional parameters

3. **Test with Minimal Request**
   - Try removing optional fields (mobileNumber)
   - Verify redirectUrl and callbackUrl format
   - Check if expireAfter value is valid

4. **Check Environment**
   - Verify PRODUCTION vs SANDBOX environment
   - Ensure credentials match the environment
   - Check if merchant ID is enabled for SDK orders

## Next Steps

1. Check backend logs for detailed error response from PhonePe
2. Compare request format with PhonePe documentation
3. Try minimal request format if needed
4. Contact PhonePe support if issue persists

