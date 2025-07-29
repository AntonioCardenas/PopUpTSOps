// Script to add meal entitlements to existing attendees
// Run this with: node scripts/add-meal-entitlements.js

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} = require("firebase/firestore");
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

// Sample meal entitlements for testing
const sampleMealEntitlements = [
  {
    id: `meal_${Date.now()}_1`,
    mealType: "lunch",
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    claimed: false,
  },
  {
    id: `meal_${Date.now()}_2`,
    mealType: "dinner",
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
    claimed: false,
  },
  {
    id: `meal_${Date.now()}_3`,
    mealType: "breakfast",
    validFrom: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    validTo: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
    claimed: false,
  },
];

async function addMealEntitlementsToAttendees() {
  try {
    console.log("🚀 Adding meal entitlements to attendees...\n");

    // Get all attendees
    const attendeesRef = collection(db, "users");
    const snapshot = await getDocs(attendeesRef);

    if (snapshot.empty) {
      console.log("❌ No attendees found in the database.");
      return;
    }

    let updatedCount = 0;

    snapshot.forEach(async (doc) => {
      const attendeeData = doc.data();

      // Skip if already has meal entitlements
      if (
        attendeeData.mealEntitlements &&
        attendeeData.mealEntitlements.length > 0
      ) {
        console.log(
          `⏭️  Skipping ${attendeeData.email} - already has meal entitlements`
        );
        return;
      }

      try {
        // Add meal entitlements
        await updateDoc(doc(db, "users", doc.id), {
          mealEntitlements: sampleMealEntitlements,
          lastUpdated: new Date().toISOString(),
        });

        console.log(`✅ Added meal entitlements to ${attendeeData.email}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${attendeeData.email}:`, error);
      }
    });

    console.log(
      `\n✨ Done! Updated ${updatedCount} attendees with meal entitlements.`
    );
  } catch (error) {
    console.error("💥 Error adding meal entitlements:", error);
  }
}

// Add meal entitlements to a specific attendee by email
async function addMealEntitlementsToSpecificAttendee(email) {
  try {
    console.log(`🚀 Adding meal entitlements to ${email}...\n`);

    // Find attendee by email
    const attendeesRef = collection(db, "users");
    const q = query(attendeesRef, where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`❌ No attendee found with email: ${email}`);
      return;
    }

    const attendeeDoc = snapshot.docs[0];
    const attendeeData = attendeeDoc.data();

    // Add meal entitlements
    await updateDoc(doc(db, "users", attendeeDoc.id), {
      mealEntitlements: sampleMealEntitlements,
      lastUpdated: new Date().toISOString(),
    });

    console.log(`✅ Added meal entitlements to ${attendeeData.email}`);
    console.log("📋 Meal entitlements added:");
    sampleMealEntitlements.forEach((meal) => {
      console.log(
        `   - ${meal.mealType} (${new Date(
          meal.validFrom
        ).toLocaleString()} to ${new Date(meal.validTo).toLocaleString()})`
      );
    });
  } catch (error) {
    console.error("💥 Error adding meal entitlements:", error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Add to specific attendee
    const email = args[0];
    await addMealEntitlementsToSpecificAttendee(email);
  } else {
    // Add to all attendees
    await addMealEntitlementsToAttendees();
  }
}

main().catch(console.error);
