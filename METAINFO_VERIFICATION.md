# metaInfo Parameter Verification

## PhonePe Requirements

### metaInfo Object Constraints

| Parameter | Data Type | Mandatory | Constraints |
|-----------|-----------|-----------|-------------|
| metaInfo.udf1-10 | String | No | Maximum length = 256 characters |
| metaInfo.udf11-15 | String | No | Maximum length = 50 characters |

## Our Implementation

### ✅ Current Status

**Backend (`backend/routes/payment.js`):**
- ✅ Now includes `metaInfo` object with all udf1-15 fields
- ✅ All fields initialized as empty strings (valid)
- ✅ Ready to accept values with proper length constraints

**Test Script (`test-sdk-order-direct.js`):**
- ✅ Includes `metaInfo` object with all udf1-15 fields
- ✅ All fields set to empty strings

### Implementation Details

```javascript
metaInfo: {
  udf1: '',  // Max 256 characters
  udf2: '',  // Max 256 characters
  udf3: '',  // Max 256 characters
  udf4: '',  // Max 256 characters
  udf5: '',  // Max 256 characters
  udf6: '',  // Max 256 characters
  udf7: '',  // Max 256 characters
  udf8: '',  // Max 256 characters
  udf9: '',  // Max 256 characters
  udf10: '', // Max 256 characters
  udf11: '', // Max 50 characters
  udf12: '', // Max 50 characters
  udf13: '', // Max 50 characters
  udf14: '', // Max 50 characters
  udf15: '', // Max 50 characters
}
```

## Length Constraints

### udf1-10 (Max 256 characters)
- ✅ Currently: Empty strings (0 characters) - Within limit
- ✅ Can accept up to 256 characters if needed
- ✅ No special character restrictions

### udf11-15 (Max 50 characters)
- ✅ Currently: Empty strings (0 characters) - Within limit
- ✅ Can accept up to 50 characters if needed
- ✅ Allowed characters: Alphanumeric + `_-+@.`

## Verification Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| metaInfo object included | ✅ | Added to backend request body |
| udf1-10 fields present | ✅ | All 10 fields included |
| udf11-15 fields present | ✅ | All 5 fields included |
| udf1-10 length constraint | ✅ | Empty strings (0 < 256) |
| udf11-15 length constraint | ✅ | Empty strings (0 < 50) |
| Optional field | ✅ | metaInfo is optional, but included |

## Future Usage

If you need to populate metaInfo fields in the future:

### Example for udf1-10 (max 256 chars):
```javascript
metaInfo: {
  udf1: 'Freelancer ID: ' + freelancerId, // Ensure <= 256 chars
  udf2: 'Payment Type: Dues', // Ensure <= 256 chars
  // ... etc
}
```

### Example for udf11-15 (max 50 chars):
```javascript
metaInfo: {
  udf11: 'DUES', // Ensure <= 50 chars
  udf12: 'COMMISSION', // Ensure <= 50 chars
  // ... etc
}
```

### Validation Helper (if needed):
```javascript
// Helper function to validate metaInfo
const validateMetaInfo = (metaInfo) => {
  if (!metaInfo) return true; // Optional field
  
  // Validate udf1-10 (max 256 chars)
  for (let i = 1; i <= 10; i++) {
    const field = metaInfo[`udf${i}`];
    if (field && field.length > 256) {
      throw new Error(`udf${i} exceeds maximum length of 256 characters`);
    }
  }
  
  // Validate udf11-15 (max 50 chars)
  for (let i = 11; i <= 15; i++) {
    const field = metaInfo[`udf${i}`];
    if (field && field.length > 50) {
      throw new Error(`udf${i} exceeds maximum length of 50 characters`);
    }
  }
  
  return true;
};
```

## Conclusion

✅ **metaInfo is correctly implemented:**
- All 15 fields (udf1-15) are included
- All fields are empty strings (valid, within constraints)
- Length constraints are documented and ready to be enforced if values are added
- Optional field, so empty values are acceptable

The implementation matches PhonePe's requirements exactly.

