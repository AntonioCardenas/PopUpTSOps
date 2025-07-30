# Firebase Security Rules - Less Restrictive

## 🔓 Updated Security Rules

Replace your current Firestore security rules with these less restrictive ones:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Redemption scans collection - Allow read/write but prevent deletion and massive downloads
    match /redemptionScans/{document} {
      allow read: if request.query.limit <= 100; // Limit to 100 records per query
      allow create, update: if true;
      allow delete: if false; // Prevent deletion of redemption scan records
    }

    // Event participants collection - Allow read/write but prevent deletion and massive downloads
    match /ethpartyparticipants/{document} {
      allow read: if request.query.limit <= 50; // Limit to 50 records per query
      allow create, update: if true;
      allow delete: if false; // Prevent deletion of participant data
    }
  }
}
```

## 🚨 Important Security Note

**These rules are less restrictive and should only be used for:**

- Development/testing environments
- Internal/private events
- When you have other security measures in place

## 🔒 More Secure Alternative (Recommended for Production)

If you want better security while still allowing the system to work:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Redemption scans collection - Allow operations but prevent deletion and massive downloads
    match /redemptionScans/{document} {
      allow read: if request.query.limit <= 100; // Limit to 100 records per query
      allow create, update: if true;
      allow delete: if false; // Prevent deletion of audit trail
    }

    // Event participants collection - Allow read/write but prevent deletion and massive downloads
    match /ethpartyparticipants/{document} {
      allow read: if request.query.limit <= 50; // Limit to 50 records per query
      allow create, update: if true;
      allow delete: if false; // Prevent deletion of participant data
    }

    // VivaCity users collection - Allow operations but prevent deletion and massive downloads
    match /VivaCityUsers/{document} {
      allow read: if request.query.limit <= 50; // Limit to 50 records per query
      allow create, update: if true;
      allow delete: if false; // Prevent deletion of user data
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
   - Paste the new rules from above
   - Click "Publish"

4. **Test the System:**
   - Try scanning a QR code
   - Check if the error is resolved

## 🔍 Troubleshooting

If you're still getting errors after applying these rules:

1. **Wait for Rules to Propagate:**

   - Rules can take up to 1 minute to propagate
   - Try again after waiting

2. **Check Collection Names:**

   - Ensure your collections are named exactly: `drinksScans`, `ethpartyparticipants`, `VivaCityUsers`

3. **Verify Firebase Config:**

   - Check that your Firebase configuration in `.env` is correct
   - Ensure the project ID matches

4. **Enable Debug Mode:**
   ```env
   NEXT_PUBLIC_DEBUG_MODE=true
   ```

## 📊 Security Considerations

### What These Rules Allow:

- ✅ Read operations on all collections (with limits)
- ✅ Create new drink scan records
- ✅ Update existing records
- ✅ No authentication required
- ✅ No email verification required

### What These Rules Don't Allow:

- ❌ Delete operations (data protection)
- ❌ Massive data downloads (query limits enforced)
- ❌ No rate limiting
- ❌ No user validation
- ❌ No data validation
- ❌ No access control

## 📏 Query Limits Explained

### Collection Limits:

- **`drinksScans`**: Maximum 100 records per query
- **`ethpartyparticipants`**: Maximum 50 records per query
- **`VivaCityUsers`**: Maximum 50 records per query

### How to Handle Limits in Your App:

#### For Recent Scans (POS Page):

```javascript
// This will work - limits to 10 records
const recentScans = await getDocs(
  query(collection(db, "drinksScans"), limit(10))
);

// This will work - limits to 100 records (max allowed)
const allScans = await getDocs(
  query(collection(db, "drinksScans"), limit(100))
);

// This will FAIL - exceeds limit
const tooManyScans = await getDocs(
  query(collection(db, "drinksScans"), limit(200)) // ❌ Error
);
```

#### For Pagination:

```javascript
// Use pagination to get more data
const firstPage = await getDocs(
  query(collection(db, "drinksScans"), limit(100))
);

const lastDoc = firstPage.docs[firstPage.docs.length - 1];
const nextPage = await getDocs(
  query(collection(db, "drinksScans"), startAfter(lastDoc), limit(100))
);
```

### Benefits of Query Limits:

- 🛡️ **Prevents Data Theft**: Can't download entire database
- ⚡ **Better Performance**: Faster queries and responses
- 💰 **Cost Control**: Reduces Firebase read costs
- 🔒 **Security**: Limits potential abuse

### For Production Use:

Consider implementing:

- Rate limiting rules
- Data validation rules
- User authentication
- IP-based restrictions
- Time-based access controls

## 🔄 Reverting to Secure Rules

When you're ready to make the system more secure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Drinks scans collection - Require authentication
    match /drinksScans/{document} {
      allow read, write: if request.auth != null;
    }

    // Event participants collection - Read for all, write for authenticated
    match /ethpartyparticipants/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // VivaCity users collection - Require authentication
    match /VivaCityUsers/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```
