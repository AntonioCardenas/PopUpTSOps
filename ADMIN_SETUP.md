# Admin Setup Guide

This guide explains how to set up admin users for the VivaApp admin dashboard.

## How Admin Authentication Works

1. **Google Sign-In**: Users sign in with their Google account
2. **Admin Check**: The system checks if the user's email is in the `admins` collection in Firestore
3. **Access Control**: Only users in the `admins` collection can access the admin dashboard

## Setting Up Admin Users

### Option 1: Using the Admin Management UI (Recommended)

1. **First, manually add a super admin to Firestore**:

   - Go to your Firebase Console
   - Navigate to Firestore Database
   - Create a new document in the `admins` collection
   - Use the user's UID as the document ID
   - Add the following fields:
     ```json
     {
       "uid": "user-uid-here",
       "email": "admin@example.com",
       "role": "super_admin",
       "permissions": ["manage_attendees", "view_reports", "manage_admins"],
       "createdAt": "2024-01-01T00:00:00.000Z"
     }
     ```

2. **Sign in with the super admin account**:

   - Go to `/admin` in your app
   - Sign in with Google using the admin email
   - You should now have access to the admin dashboard

3. **Add more admins through the UI**:
   - In the admin dashboard, click "Manage Admins" (only visible to super admins)
   - Add new admin users with their email addresses
   - Assign roles and permissions

### Option 2: Using the Script

1. **Install dependencies** (if not already installed):

   ```bash
   npm install firebase
   ```

2. **Edit the script**:

   - Open `scripts/add-admin.js`
   - Replace the example emails and UIDs with actual values
   - You can get the UID from Firebase Auth console or from the user object after they sign in

3. **Run the script**:
   ```bash
   node scripts/add-admin.js
   ```

### Option 3: Manual Firestore Entry

1. **Get the user's UID**:

   - Have the user sign in with Google
   - Check the browser console or Firebase Auth console for their UID
   - Or temporarily log the UID in your app

2. **Add to Firestore**:
   - Go to Firebase Console → Firestore Database
   - Create a new document in the `admins` collection
   - Use the UID as the document ID
   - Add the admin data structure

## Admin Data Structure

```json
{
  "uid": "user-uid-from-firebase-auth",
  "email": "admin@example.com",
  "role": "admin" | "super_admin",
  "permissions": ["manage_attendees", "view_reports", "manage_admins"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Available Roles

- **admin**: Regular admin with basic permissions
- **super_admin**: Can manage other admin users

## Available Permissions

- `manage_attendees`: Add, edit, and view attendees
- `view_reports`: View analytics and reports
- `manage_admins`: Add and manage other admin users
- `manage_redemptions`: Manage QR code redemptions

## Troubleshooting

### "Unauthorized" Error

- Check that the user's email is in the `admins` collection
- Verify the UID matches the Firebase Auth UID
- Ensure the document structure is correct

### Admin Status Not Updating

- The admin status is checked on every auth state change
- Try signing out and signing back in
- Check the browser console for any errors

### Super Admin Access

- Only super admins can access the "Manage Admins" page
- Regular admins cannot add other admin users
- Make sure the first admin has `role: "super_admin"`

## Security Notes

- Keep your Firebase config secure
- Regularly review admin access
- Consider implementing additional security measures for production
- The admin collection should have appropriate Firestore security rules
