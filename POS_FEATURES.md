# POS Lu.ma Redemption System Features

## Overview

The POS (Point of Sale) scanning system allows staff to scan Lu.ma check-in URLs and redeem drinks and meals. The system integrates directly with Lu.ma's API and Firebase for comprehensive tracking of redemptions with real-time guest verification.

## Key Features

### 1. Lu.ma URL Scanning

- **Camera Integration**: Uses device camera to scan Lu.ma check-in URLs
- **Real-time Processing**: Instantly processes scanned data
- **Sound Feedback**: Plays beep sound on successful scans
- **URL Validation**: Validates Lu.ma URL format and extracts event/guest data

### 2. Lu.ma API Integration

- **Real-time Verification**: Direct integration with Lu.ma API for live guest data
- **Guest Authentication**: Verifies guest against actual Lu.ma event data
- **Event Validation**: Ensures guest is registered and approved for the event
- **Check-in Status**: Shows whether guest has checked in to the event
- **Ticket Information**: Displays ticket type and approval status from Lu.ma

### 3. Firebase Data Storage

- **Redemption Records**: Saves all drink and meal redemption attempts to Firebase
- **Proxy Key Tracking**: Uses Lu.ma proxy keys as unique document IDs to prevent duplicates
- **Email Tracking**: Tracks redemption count per guest email
- **Timestamp Recording**: Records exact redemption time
- **Audit Trail**: Maintains complete history of all redemptions

### 4. Redemption Limits

- **Configurable Limits**: Set drink and meal limits via environment variables
- **Drink Limits**: Each guest can redeem up to 3 drinks (configurable)
- **Meal Limits**: Each guest can redeem up to 1 meal (configurable)
- **Automatic Blocking**: Prevents redemptions beyond the limit
- **Clear Feedback**: Shows remaining counts (e.g., "2 drinks remaining")

### 5. Real-time Statistics

- **Today's Redemptions**: Shows total redemptions for current day
- **Lu.ma Verified**: Count of redemptions with verified Lu.ma data
- **Drinks Redeemed**: Count of drink redemptions
- **Meals Redeemed**: Count of meal redemptions
- **Recent Activity**: Displays last 10 redemptions with details

### 6. User Interface

- **Clean Design**: Modern, responsive interface
- **Redemption Type Selector**: Choose between drinks and meals
- **Status Indicators**: Visual feedback for redemption results
- **Detailed Information**: Shows guest details and Lu.ma event data
- **Redemption History**: Recent redemptions with timestamps and remaining counts
- **Progress Indicators**: Visual dots showing redemption usage

## Technical Implementation

### Data Flow

1. **Scan Lu.ma URL** → Extract event ID and proxy key
2. **Call Lu.ma API** → Get real-time guest data via `/api/luma` endpoint
3. **Log Response** → Console logs show detailed API response data
4. **Validate Guest** → Ensure guest is registered and approved for event
5. **Check Redemption History** → Count previous redemptions for proxy key
6. **Save to Firebase** → Record redemption in redemptionScans collection
7. **Update UI** → Show results and remaining entitlements

### Firebase Collections

- **redemptionScans**: Stores all redemption records with metadata
  - email: Guest email address from Lu.ma
  - attendeeName: Name from Lu.ma data
  - publicKey: Lu.ma proxy key (used as unique identifier)
  - scannedAt: ISO timestamp
  - lumaVerified: Boolean flag (always true for Lu.ma guests)
  - remainingDrinks: Number of drinks left
  - remainingMeals: Number of meals left
  - lastRedemptionType: Type of last redemption ('drink' or 'meal')
  - lastRedemptionAt: Timestamp of last redemption

### Lu.ma API Integration

- **Server-side API**: Uses `/api/luma` endpoint for secure API key handling
- **Real-time Data**: Direct integration with Lu.ma API for live guest verification
- **API Endpoint**: Uses `https://public-api.luma.com/v1/event/get-guest`
- **Proxy Key Tracking**: Uses Lu.ma proxy keys as unique identifiers
- **Event Validation**: Ensures guest is approved and registered for the specific event
- **Status Checking**: Verifies approval status and check-in status from Lu.ma
- **Response Logging**: Console logs show detailed API response data

## Usage Instructions

### For Staff

1. Navigate to `/pos` page
2. Select redemption type (Drinks or Meals)
3. Click "Start Scanning" button
4. Allow camera access when prompted
5. Point camera at attendee's Lu.ma check-in URL
6. Review redemption results and guest information
7. Check remaining entitlements count
8. Click "Scan Another" to continue

### For Attendees

1. Use Lu.ma check-in URL from your event
2. Show the URL to staff for redemption
3. Staff will scan the URL and process your redemption

## Error Handling

- **Invalid Lu.ma URLs**: Shows error message for malformed URLs
- **Guest Not Found**: Clear message when guest not found in Lu.ma event
- **API Errors**: Graceful handling of Lu.ma API connection problems
- **Network Issues**: Graceful handling of Firebase connection problems
- **Event Mismatch**: Clear message when URL is for a different event
- **Camera Access**: Clear instructions for camera permissions
- **Drink Limits**: Informative messages when limit is reached

## Security Features

- **Email Validation**: Ensures valid email format
- **Drink Tracking**: Prevents abuse through drink counting
- **Data Verification**: Cross-references with Luma event data
- **Audit Trail**: Complete logging of all drink redemptions

## Drink Tracking Logic

- **Initial Allocation**: 3 drinks per registered guest
- **Redemption Tracking**: Each scan reduces remaining count
- **Limit Enforcement**: No redemptions after 3 drinks used
- **Clear Display**: Shows remaining drinks prominently
- **History Tracking**: Complete record of all redemptions
