# PhonePe Authorization Troubleshooting

## Issue: Unauthorized Error (401)

If you're getting an "unauthorized" error when requesting an OAuth token, check the following:

### 1. Environment Mismatch

**Problem:** Your credentials might be for **Production** but you're testing with **Sandbox** (or vice versa).

**Solution:**
- **Sandbox credentials** → Use: `https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token`
- **Production credentials** → Use: `https://api.phonepe.com/apis/identity-manager/v1/oauth/token`

**Check in PhonePe Dashboard:**
- Login to PhonePe Merchant Dashboard
- Check if your credentials are for "Test/Sandbox" or "Production"
- Use the matching environment URL

### 2. API Access Not Enabled

**Problem:** Your merchant account might not have API access enabled.

**Solution:**
1. Login to PhonePe Merchant Dashboard
2. Go to **Settings** → **API Access** or **Developer Settings**
3. Ensure API access is **enabled/activated**
4. If not enabled, contact PhonePe support to activate API access

### 3. Credentials Verification

**Verify in PhonePe Dashboard:**
1. Login to PhonePe Merchant Dashboard
2. Navigate to **API Credentials** or **Developer** section
3. Verify:
   - **Client ID** matches: `SU2509171240249286269937`
   - **Client Secret** matches: `d74141aa-8762-4d1b-bfa1-dfe2a094d310`
   - **Merchant ID** matches: `M23OKIGC1N363`

### 4. Account Status

**Check if your account is:**
- ✅ **Active** and approved
- ✅ **Not suspended** or restricted
- ✅ **Has payment gateway access** enabled

### 5. Test with Production (if Sandbox fails)

If sandbox credentials don't work, try with production:

```javascript
// Production URL
const url = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
```

**Note:** Make sure your credentials are for production environment.

### 6. Contact PhonePe Support

If all above checks pass, contact PhonePe support:
- **Email:** support@phonepe.com (or check PhonePe dashboard for support contact)
- **Provide:**
  - Merchant ID: `M23OKIGC1N363`
  - Client ID: `SU2509171240249286269937`
  - Error: "Unauthorized (401) when requesting OAuth token"
  - Request details (URL, headers, body)

## Correct Request Format

Your test code looks correct. Here's the verified format:

```javascript
const axios = require('axios');

const requestHeaders = {
  "Content-Type": "application/x-www-form-urlencoded"
};

const requestBody = new URLSearchParams({
  "client_id": "SU2509171240249286269937",
  "client_version": "1",
  "client_secret": "d74141aa-8762-4d1b-bfa1-dfe2a094d310",
  "grant_type": "client_credentials"
}).toString();

// For Sandbox
const sandboxUrl = 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';

// For Production
const productionUrl = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';

axios.post(sandboxUrl, requestBody, { headers: requestHeaders })
  .then(response => console.log('Success:', response.data))
  .catch(error => console.error('Error:', error.response?.data || error.message));
```

## Next Steps

1. **Verify credentials in PhonePe Dashboard** - Check if they're for sandbox or production
2. **Check API access status** - Ensure API access is enabled
3. **Try production URL** - If sandbox doesn't work, try production (if credentials are for production)
4. **Contact PhonePe Support** - If issue persists, contact their support team

## Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check credentials match environment (sandbox vs production) |
| API Access Denied | Enable API access in PhonePe Dashboard |
| Invalid Credentials | Verify Client ID and Secret in PhonePe Dashboard |
| Account Not Active | Contact PhonePe to activate merchant account |

