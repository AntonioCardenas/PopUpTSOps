# Environment Setup Guide

## 🔧 Required Configuration

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

### 2. Firebase Configuration

Get these values from your [Firebase Console](https://console.firebase.google.com/):

```env
# Firebase Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 3. Lu.ma API Configuration

Get your Lu.ma API key from your [Lu.ma Dashboard](https://lu.ma/dashboard):

```env
# Lu.ma API Configuration (Required)
NEXT_PUBLIC_LUMAAPIKEY=your_luma_api_key_here
```

**How to get Lu.ma API key:**

1. Go to [Lu.ma Dashboard](https://lu.ma/dashboard)
2. Navigate to your event settings
3. Find the API section
4. Generate or copy your API key
5. Add it to your `.env` file

**API Endpoint:**
The system uses the Lu.ma API endpoint: `https://public-api.luma.com/v1/event/get-guest`

**How to get Firebase config:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project Settings
4. Scroll to "Your apps" section
5. Click the web icon (</>)
6. Register your app and copy the config values

### 4. Event Configuration

```env
# Event Configuration (Optional - for security)
NEXT_PUBLIC_EVENT_ID=evt-pEL2QyThOoezJWn
```

**Important:** The `NEXT_PUBLIC_EVENT_ID` is optional. If set, it validates Lu.ma URLs against this specific event ID for security. If left empty, the system accepts any Lu.ma event URL.

### 5. Redemption Limits Configuration

```env
# Redemption Limits (Optional - defaults shown)
NEXT_PUBLIC_MAX_DRINKS_PER_GUEST=3  # Maximum drinks per guest
NEXT_PUBLIC_MAX_MEALS_PER_GUEST=1   # Maximum meals per guest
```

**Important:** These limits control how many drinks and meals each guest can redeem. The system counts from 1 (where 0 means nothing left).

## 🔒 Security Configuration

### Event ID Security

The system can validate Lu.ma URLs in two ways:

#### Option 1: Configured Event ID (Recommended for Security)

Set a specific event ID in your environment:

```env
NEXT_PUBLIC_EVENT_ID=evt-pEL2QyThOoezJWn
```

**Example Lu.ma URL:**

```
https://lu.ma/check-in/evt-pEL2QyThOoezJWn?pk=g-m8Y112wpmIWvmpW
```

**Security Benefits:**

- ✅ Only accepts URLs for your specific event
- ✅ Prevents cross-event drink redemptions
- ✅ Validates event ID before processing
- ✅ Stores event ID in database for audit trail

#### Option 2: Dynamic Event ID (Flexible)

Leave `NEXT_PUBLIC_EVENT_ID` empty to accept any Lu.ma event:

```env
# NEXT_PUBLIC_EVENT_ID=  # Leave empty for dynamic behavior
```

**Behavior:**

- ✅ Accepts any Lu.ma check-in URL
- ✅ Uses event ID from the scanned URL
- ✅ Flexible for multi-event scenarios
- ⚠️ Less secure - accepts all events

### Changing Event ID

To change the event ID for a new event:

1. **Update .env file:**

   ```env
   NEXT_PUBLIC_EVENT_ID=evt-your-new-event-id
   ```

2. **Update Firebase Security Rules:**

   ```javascript
   // Add event-specific validation if needed
   match /drinksScans/{document} {
     allow read, write: if request.auth != null &&
       resource.data.qrData.eventId == 'evt-your-new-event-id';
   }
   ```

3. **Update Luma Data** (if using local luma.json):
   ```json
   {
     "entries": [
       {
         "api_id": "evt-your-new-event-id",
         "guest": {
           "email": "guest@example.com",
           "name": "Guest Name",
           "approval_status": "approved"
         }
       }
     ]
   }
   ```

## 🗄️ Firebase Database Setup

### Required Collections

The system uses these Firestore collections:

#### 1. `drinksScans` Collection

Stores all drink redemption records:

```typescript
interface ScanRecord {
  id: string;
  email: string;
  attendeeName: string;
  scannedAt: string;
  lumaVerified: boolean;
  drinksRedeemed: boolean;
  scanCount: number;
  remainingDrinks: number;
  qrData: {
    email: string;
    attendeeId: string;
    drinksAllowed: number;
    generatedAt: string;
    lumaUrl?: string;
    eventId?: string;
    publicKey?: string;
  };
}
```

#### 2. `ethpartyparticipants` Collection

Stores event participant data:

```typescript
interface Participant {
  id: string;
  email: string;
  fullName: string;
  role: string;
  drinksAllowed: number;
  validFrom: string;
  validTo: string;
}
```

#### 3. `ethpartyparticipants` Collection

Stores user data for special features:

```typescript
interface VivaCityUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}
```

### Firebase Security Rules

Configure your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Drinks scans collection
    match /drinksScans/{document} {
      allow read, write: if request.auth != null &&
        (request.auth.token.email_verified == true ||
         request.auth.token.role == 'admin');
    }

    // Event participants collection
    match /ethpartyparticipants/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        request.auth.token.role == 'admin';
    }

    // VivaCity users collection
    match /ethpartyparticipants/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🔗 Lu.ma Integration Details

### How Lu.ma URLs Are Processed

1. **URL Detection:**

   ```javascript
   if (scannedText.includes("https://lu.ma/check-in/")) {
     // Process as Lu.ma URL
   }
   ```

2. **URL Decoding:**

   ```javascript
   const decodedUrl = decodeURIComponent(scannedText);
   // Handles: %3F → ?, %2F → /, etc.
   ```

3. **Event ID Extraction:**

   ```javascript
   const urlMatch = decodedUrl.match(
     /https:\/\/lu\.ma\/check-in\/([^?]+)\?pk=([^&]+)/
   );
   const [, eventId, publicKey] = urlMatch;
   ```

4. **Event ID Validation:**

   ```javascript
   if (eventId === process.env.NEXT_PUBLIC_EVENT_ID) {
     // Process the check-in
   } else {
     // Reject unauthorized event
   }
   ```

5. **Database Storage:**
   ```javascript
   const scanRecord = {
     email: `luma-${eventId}@checkin.com`,
     attendeeName: `Lu.ma Guest (${eventId})`,
     lumaVerified: true,
     qrData: {
       lumaUrl: scannedText,
       eventId: eventId,
       publicKey: publicKey,
     },
   };
   ```

### Security Features

- **Event ID Validation**: Only accepts URLs for configured event
- **URL Encoding Support**: Handles encoded characters automatically
- **Public Key Storage**: Stores public keys for audit purposes
- **Rate Limiting**: 3 drinks per event ID (configurable)
- **Audit Trail**: Complete history of all redemptions

## 🛠️ Optional Configuration

### Debug Mode

Enable detailed logging for troubleshooting:

```env
NEXT_PUBLIC_DEBUG_MODE=true
```

This will show:

- URL processing steps
- Firebase operations
- Error details
- Data validation results

**Note:** This variable is not yet implemented in the current codebase but is planned for future development.

### Custom Collection Names

Override default collection names:

```env
NEXT_PUBLIC_DRINKS_SCANS_COLLECTION=drinksScans
NEXT_PUBLIC_PARTICIPANTS_COLLECTION=ethpartyparticipants
NEXT_PUBLIC_USERS_COLLECTION=ethpartyparticipants
```

**Note:** These variables are not yet implemented in the current codebase but are planned for future development.

## 🚨 Troubleshooting

### Common Environment Issues

1. **"Invalid Lu.ma URL" Error**

   - Check `NEXT_PUBLIC_EVENT_ID` matches your Lu.ma event
   - Verify URL format is correct
   - Ensure URL encoding is handled

2. **Firebase Connection Issues**

   - Verify all Firebase config values are correct
   - Check Firebase project is active
   - Ensure Firestore is enabled

3. **Collection Access Denied**

   - Check Firebase security rules
   - Verify collections exist in Firestore
   - Ensure authentication is configured

4. **Environment Variables Not Loading**
   - Restart development server after changing .env
   - Check variable names start with `NEXT_PUBLIC_`
   - Verify .env file is in project root
   - Note: Only `NEXT_PUBLIC_EVENT_ID` is currently implemented

### Validation Checklist

Before going live, verify:

- [ ] All Firebase config values are set
- [ ] Event ID matches your Lu.ma event
- [ ] Firebase security rules are configured
- [ ] Required collections exist in Firestore
- [ ] Environment variables are loaded correctly
- [ ] Lu.ma URLs are being processed
- [ ] Drink redemptions are being saved
- [ ] Audit trail is working

## 📞 Support

For environment setup issues:

1. Check this documentation
2. Review Firebase console settings
3. Verify environment variable format
4. Check console logs for debugging (debug mode not yet implemented)
5. Create an issue in the repository
