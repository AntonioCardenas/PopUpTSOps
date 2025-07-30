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

# Lu.ma API Configuration (Required)
# Get your API key from your Lu.ma dashboard
NEXT_PUBLIC_LUMAAPIKEY=your_luma_api_key_here

# Event Configuration (Optional - for security)
# Leave empty to accept any Lu.ma event URL
NEXT_PUBLIC_EVENT_ID=evt-CVo50APyX8DNYes

# Redemption Limits (Optional)
# Set the maximum number of drinks and meals each guest can redeem
# Default: 3 drinks, 1 meal
NEXT_PUBLIC_MAX_DRINKS_PER_GUEST=3
NEXT_PUBLIC_MAX_MEALS_PER_GUEST=1
```

## 📝 Implementation Status

### ✅ Currently Implemented:

- `NEXT_PUBLIC_FIREBASE_*` - All Firebase configuration variables
- `NEXT_PUBLIC_LUMAAPIKEY` - Lu.ma API key for guest data access
- `NEXT_PUBLIC_EVENT_ID` - Event ID for Lu.ma API queries (optional)
- `NEXT_PUBLIC_MAX_DRINKS_PER_GUEST` - Maximum drinks per guest (default: 3)
- `NEXT_PUBLIC_MAX_MEALS_PER_GUEST` - Maximum meals per guest (default: 1)

### 🔄 Planned for Future:

- `NEXT_PUBLIC_DEBUG_MODE` - Debug logging
- `NEXT_PUBLIC_REDEMPTION_SCANS_COLLECTION` - Custom collection names
- `NEXT_PUBLIC_PARTICIPANTS_COLLECTION` - Custom collection names
- `NEXT_PUBLIC_USERS_COLLECTION` - Custom collection names

## 🚀 Quick Setup

1. **Copy the example above**
2. **Replace with your Firebase values**
3. **Configure your Luma API credentials**
4. **Set your event ID and proxy key**
5. **Configure redemption limits** (optional)
6. **Save as `.env`**
7. **Restart your development server**

## 🔒 Security Note

- `NEXT_PUBLIC_LUMAAPIKEY` - Required for Lu.ma API authentication
- `NEXT_PUBLIC_EVENT_ID` - Optional for event-specific validation
- API key is handled server-side for security
- Event ID validation prevents cross-event redemptions

## 🍽️ Redemption System

The system now supports both drinks and meals with separate tracking:

- **Drinks**: Configurable limit per guest (default: 3)
- **Meals**: Configurable limit per guest (default: 1)
- **Counting**: Starts from 1, 0 means no remaining
- **Collection**: All redemptions stored in `redemptionScans` collection
- **UI**: Toggle between drink and meal scanning modes

## 🔌 Lu.ma API Integration

The system now fetches guest data directly from the Lu.ma API:

- **Real-time Data**: Gets current guest information from Lu.ma
- **Server-side API**: Secure API key handling via `/api/luma` endpoint
- **API Endpoint**: Uses `https://public-api.luma.com/v1/event/get-guest`
- **Event-specific**: Queries data for the specific event ID from URL
- **Proxy Key Tracking**: Uses Lu.ma proxy keys as unique identifiers
- **Live Verification**: Real-time guest validation against Lu.ma data
- **Response Logging**: Console logs show detailed API response data
