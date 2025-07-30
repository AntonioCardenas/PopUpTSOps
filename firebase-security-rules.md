# Firebase Security Rules - Development Ready

## 🔓 Updated Security Rules for Development

Replace your current Firestore security rules with these development-ready ones:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Redemption scans collection - Allow all operations except delete
    match /redemptionScans/{document} {
      allow read, create, update: if true; // Allow read, create, update
      allow delete: if false; // Prevent deletion of audit trail
    }

    // Event participants collection - Allow all operations except delete
    match /ethpartyparticipants/{document} {
      allow read, create, update: if true; // Allow read, create, update
      allow delete: if false; // Prevent deletion of participant data
    }
  }
}
```

## 🚨 Important Security Note

**These rules are development-friendly and should only be used for:**

- Development/testing environments
- Internal/private events
- When you have other security measures in place

## 🔒 Production Rules (Allow All Operations Except Delete)

For production environments where you want to allow all operations except deletion:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Redemption scans collection - Allow all operations except delete
    match /redemptionScans/{document} {
      allow read, create, update: if true; // Allow read, create, update
      allow delete: if false; // Prevent deletion of audit trail
    }

    // Event participants collection - Allow all operations except delete
    match /ethpartyparticipants/{document} {
      allow read, create, update: if true; // Allow read, create, update
      allow delete: if false; // Prevent deletion of participant data
    }
  }
}
```

## 🛠️ How to Apply These Rules

1. **Go to Firebase Console:**

   - Navigate to [Firebase Console](https://console.firebase.google.com/)
   - Select your project

2. **Open Firestore Database:**

   - Click on "Firestore Database" in the left sidebar
   - Click on the "Rules" tab

3. **Replace the Rules:**

   - Delete the current rules
   - Paste the new rules from above (use the development version first)
   - Click "Publish"

4. **Wait for Rules to Propagate:**

   - Rules can take up to 1 minute to propagate
   - Try scanning again after waiting

5. **Test the System:**
   - Try scanning a QR code
   - Check if the error is resolved

## 🔍 Troubleshooting Steps

If you're still getting permission errors after applying these rules:

### 1. Verify Rules Are Applied

- Go to Firebase Console → Firestore Database → Rules
- Confirm the rules show `allow read, write: if true;` for `redemptionScans`

### 2. Check Collection Names

- Ensure your collections are named exactly: `redemptionScans`, `ethpartyparticipants`, `VivaCityUsers`
- Collection names are case-sensitive

### 3. Verify Firebase Config

- Check that your Firebase configuration in `.env` is correct
- Ensure the project ID matches your Firebase project

### 4. Clear Browser Cache

- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Try in an incognito/private window

### 5. Enable Debug Mode

```env
NEXT_PUBLIC_DEBUG_MODE=true
```

### 6. Check Firebase Project Settings

- Ensure Firestore Database is enabled
- Verify you're in the correct Firebase project

## 📊 What These Rules Allow

### Development Rules (First Set):

- ✅ Read operations on all collections (no limits)
- ✅ Create new redemption scan records
- ✅ Update existing records
- ✅ Delete operations (use with caution)
- ✅ No authentication required
- ✅ No email verification required

### Production Rules (Second Set):

- ✅ Read operations on all collections (no limits)
- ✅ Create new redemption scan records
- ✅ Update existing records
- ❌ Delete operations (data protection)
- ✅ No authentication required
- ✅ No query limits enforced

## 🚀 Quick Fix Commands

If you want to quickly test if this fixes the issue:

1. **Apply the development rules** (first set above)
2. **Wait 1 minute** for propagation
3. **Try scanning a QR code**
4. **Check console logs** for Firebase operations

## 📝 Collection Usage in Your App

Your app uses these collections:

- **`redemptionScans`**: Stores guest redemption records (main collection causing the error)
- **`ethpartyparticipants`**: Stores event participant data
- **`VivaCityUsers`**: Stores user data (if used)

The error you're seeing is specifically related to the `redemptionScans` collection, which these rules will fix.

## 🔄 Next Steps

1. **Apply the development rules** first to get your app working
2. **Test thoroughly** to ensure all functionality works
3. **Consider switching to production rules** when ready for deployment
4. **Monitor Firebase usage** to ensure you stay within limits
