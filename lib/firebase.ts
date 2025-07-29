// lib/firebase.ts
// This file is imported by both server and client code.
// We therefore **only** create the Auth instance in the browser.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import type { Auth } from "firebase/auth"; // <- only a type on the server

// ---- YOUR FIREBASE CONFIG ----
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
/**
 * Ensure we never run initialiseApp twice (Next.js fast-refresh / multiple
 * page loads would otherwise throw).
 */
export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

// Firestore can safely be created on both server and client.
export const db = getFirestore(firebaseApp);

/**
 * Auth MUST be created in the browser only because it touches `window`.
 * Call `getAuthClient()` inside a `"use client"` component before using it.
 */
let _auth: Auth | null = null;

export async function getAuthClient(): Promise<Auth> {
  if (_auth) return _auth;
  if (typeof window === "undefined") {
    throw new Error("getAuthClient() must only be called in the browser");
  }

  const { getAuth } = await import("firebase/auth");
  _auth = getAuth(firebaseApp);
  return _auth;
}
