// Script to create admin users
// Run this with: node scripts/create-admin.js <email> <role>
// Example: node scripts/create-admin.js antonioalx66@gmail.com admin

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

async function createAdmin(email, role = "admin") {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("❌ Invalid email format:", email);
      return;
    }

    // Validate role
    const validRoles = ["admin", "super_admin"];
    if (!validRoles.includes(role)) {
      console.error('❌ Invalid role. Must be "admin" or "super_admin"');
      return;
    }

    // Generate UID from email (for demo purposes)
    // In production, you'd get the actual UID from Firebase Auth
    const uid = email.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now();

    // Define permissions based on role
    const permissions =
      role === "super_admin"
        ? [
            "manage_attendees",
            "view_reports",
            "manage_admins",
            "manage_redemptions",
          ]
        : ["manage_attendees", "view_reports"];

    const adminData = {
      uid: uid,
      email: email,
      role: role,
      permissions: permissions,
      createdAt: new Date().toISOString(),
    };

    // Create admin document
    await setDoc(doc(db, "admins", uid), adminData);

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", email);
    console.log("👤 Role:", role);
    console.log("🔑 Permissions:", permissions.join(", "));
    console.log("🆔 UID:", uid);
    console.log("\n💡 Next steps:");
    console.log("1. Sign in with Google using this email");
    console.log("2. You should now have access to the admin dashboard");
    console.log("3. If you need the actual UID, check Firebase Auth console");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("🚀 Admin User Creator");
    console.log("Usage: node scripts/create-admin.js <email> [role]");
    console.log(
      "Example: node scripts/create-admin.js antonioalx66@gmail.com admin"
    );
    console.log(
      "Example: node scripts/create-admin.js admin@example.com super_admin"
    );
    console.log("\nAvailable roles: admin, super_admin");
    return;
  }

  const email = args[0];
  const role = args[1] || "admin";

  console.log("🚀 Creating admin user...\n");
  await createAdmin(email, role);
}

main().catch(console.error);
