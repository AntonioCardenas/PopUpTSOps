import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "firebase/auth";

export interface AdminUser {
  uid: string;
  email: string;
  role: "admin" | "super_admin";
  permissions: string[];
  createdAt: string;
}

export async function checkAdminStatus(user: User): Promise<AdminUser | null> {
  try {
    // Search for admin by email instead of UID
    const adminsRef = collection(db, "admins");
    const q = query(adminsRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();

    return {
      uid: adminData.uid || user.uid,
      email: user.email || "",
      role: adminData.role || "admin",
      permissions: adminData.permissions || [],
      createdAt: adminData.createdAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return null;
  }
}

export function hasPermission(admin: AdminUser, permission: string): boolean {
  return admin.permissions.includes(permission) || admin.role === "super_admin";
}

export async function updateAllUsersDateRange() {
  try {
    const usersRef = collection(db, "VivaCityUsers");
    const snapshot = await getDocs(usersRef);

    const updatePromises = snapshot.docs.map((doc) => {
      return updateDoc(doc.ref, {
        validFrom: "2025-07-12",
        validTo: "2025-08-15",
        lastUpdated: new Date().toISOString(),
      });
    });

    await Promise.all(updatePromises);

    return {
      success: true,
      message: `Successfully updated ${snapshot.docs.length} users with new date range`,
      count: snapshot.docs.length,
    };
  } catch (error) {
    console.error("Error updating users date range:", error);
    return {
      success: false,
      message: `Error updating users: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      count: 0,
    };
  }
}
