# PhonePe SDK Order Format Issue - Summary

## Current Status

**PhonePe Confirmed:** Everything is enabled for merchant account M23OKIGC1N363  
**Our Issue:** Still getting 500 Internal Server Error  
**Conclusion:** There's an error in our request format or code

## Key Test Findings

### 1. PG_CHECKOUT vs SDK
- **PG_CHECKOUT:** Returns **400 Bad Request** (validation error)
  - This means: Request format is being processed
  - Error: Empty udf11-15 fields cause validation error
- **SDK:** Returns **500 Internal Server Error** (server error)
  - This means: Server cannot process SDK order
  - Suggests: SDK flow needs different/additional fields or configuration

### 2. Empty metaInfo Fields
- **Finding:** Empty `udf11-15` fields cause validation error (400)
- **Error Message:** "udf11-15 should only contain alphanumeric characters, underscores, hyphens, spaces, @, ., and +"
- **Solution:** Don't include metaInfo if all fields are empty, or only include udf1-10

### 3. All SDK Variations Tested
- Minimal request (no metaInfo) → 500 Error
- With redirectUrl, callbackUrl → 500 Error
- With paymentInstrument → 500 Error
- With metaInfo (udf1-10 only) → 500 Error
- **All SDK requests give 500, regardless of fields**

## Possible Issues

### 1. Missing Required Fields for SDK
SDK orders might require fields that we're not including:
- Maybe `merchantUserId` is required (not optional)?
- Maybe `redirectMode` is required (not optional)?
- Maybe there are other SDK-specific fields we're missing?

### 2. Field Format Issues
- Maybe field order matters?
- Maybe some fields need different values for SDK?
- Maybe `paymentFlow.type = "SDK"` needs additional properties?

### 3. SDK-Specific Configuration
- Maybe SDK orders need special configuration in dashboard?
- Maybe there's a different endpoint for SDK orders?
- Maybe SDK requires additional verification?

## What We've Tried

1. ✅ Added `expireAfter` (as per PhonePe sample)
2. ✅ Changed `paymentFlow` from String to Object format
3. ✅ Tested minimal request (only PhonePe sample fields)
4. ✅ Tested with/without metaInfo
5. ✅ Tested with/without SDK-specific fields (redirectUrl, callbackUrl, paymentInstrument)
6. ✅ Tested different field combinations

**Result:** All SDK variations still give 500 error

## Next Steps

1. **Ask PhonePe for exact SDK order request format:**
   - What are the exact required fields for SDK orders?
   - Is the sample they provided for SDK or generic?
   - What's the difference between SDK and PG_CHECKOUT request format?

2. **Check if we're missing something:**
   - Verify merchantUserId is required
   - Check if redirectMode is required
   - Verify if there are other SDK-specific fields

3. **Update code:**
   - Remove empty metaInfo fields (to avoid validation errors)
   - Keep testing different field combinations

## Updated Code

- ✅ Removed empty metaInfo fields from backend (to avoid validation errors)
- ✅ Keeping all SDK-specific fields (redirectUrl, callbackUrl, paymentInstrument)
- ✅ Using `paymentFlow: { type: "SDK" }` format

## Request to PhonePe

We need PhonePe to provide:
1. **Exact SDK order request format** (not generic sample)
2. **List of required vs optional fields** for SDK orders
3. **Any SDK-specific configuration** needed in dashboard
4. **Why SDK gives 500 while PG_CHECKOUT gives 400** (validation error)

