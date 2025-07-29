// Script to add admin users to Firestore
// Run this with: node scripts/add-admin.js

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
require("dotenv").config();

// Your Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addAdminUser(
  email,
  uid,
  role = "admin",
  permissions = ["manage_attendees"]
) {
  try {
    const adminData = {
      uid: uid,
      email: email,
      role: role,
      permissions: permissions,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "admins", uid), adminData);
    console.log(`✅ Admin user added successfully: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`   Permissions: ${permissions.join(", ")}`);
  } catch (error) {
    console.error(`❌ Error adding admin user ${email}:`, error);
  }
}

// Example usage - replace with actual email and UID
// You can get the UID from Firebase Auth console or from the user object after they sign in
async function main() {
  console.log("🚀 Adding admin users...\n");

  // Add your admin users here
  // Replace 'your-email@example.com' with the actual email
  // Replace 'user-uid-here' with the actual UID from Firebase Auth
  await addAdminUser(
    "your-email@example.com", // Replace with actual email
    "user-uid-here", // Replace with actual UID
    "admin",
    ["manage_attendees", "view_reports"]
  );

  // Add a super admin
  await addAdminUser(
    "super-admin@example.com", // Replace with actual email
    "super-admin-uid-here", // Replace with actual UID
    "super_admin",
    ["manage_attendees", "view_reports", "manage_admins"]
  );

  console.log("\n✨ Done!");
}

main().catch(console.error);
