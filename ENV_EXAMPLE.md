# Environment Variables Example

## 🔧 Required Configuration

Copy this example and configure it for your project:

```env
# Firebase Configuration (Required)
# Get these values from your Firebase project settings
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Event Configuration (Optional)
# Leave empty for dynamic event handling, or set for security
NEXT_PUBLIC_EVENT_ID=evt-pEL2QyThOoezJWn
```

## 📝 Implementation Status

### ✅ Currently Implemented:

- `NEXT_PUBLIC_FIREBASE_*` - All Firebase configuration variables
- `NEXT_PUBLIC_EVENT_ID` - Event ID validation for Lu.ma URLs

### 🔄 Planned for Future:

- `NEXT_PUBLIC_DEBUG_MODE` - Debug logging
- `NEXT_PUBLIC_DRINKS_SCANS_COLLECTION` - Custom collection names
- `NEXT_PUBLIC_PARTICIPANTS_COLLECTION` - Custom collection names
- `NEXT_PUBLIC_USERS_COLLECTION` - Custom collection names

## 🚀 Quick Setup

1. **Copy the example above**
2. **Replace with your Firebase values**
3. **Set your event ID** (optional)
4. **Save as `.env`**
5. **Restart your development server**

## 🔒 Security Note

- `NEXT_PUBLIC_EVENT_ID` is optional
- If set: Only accepts Lu.ma URLs for that specific event
- If empty: Accepts any Lu.ma event URL (more flexible, less secure)
