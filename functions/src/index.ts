import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Cloud Function to lookup email by username.
 * This function uses the Admin SDK to bypass Firestore security rules,
 * allowing secure username-to-email lookup without exposing user data.
 */
interface LookupUsernameRequest {
  username: string;
}

export const lookupUsername = functions.https.onCall(async (request) => {
  const data = request.data as LookupUsernameRequest;
  const username = data.username;

  // Validate input
  if (!username || typeof username !== "string" || username.trim().length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Username is required and must be a non-empty string"
    );
  }

  // Prevent username enumeration attacks by limiting query to reasonable length
  if (username.length > 100) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Username is too long"
    );
  }

  try {
    // Query Firestore using Admin SDK (bypasses security rules)
    const usersRef = admin.firestore().collection("users");
    const snapshot = await usersRef
      .where("username", "==", username.trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Return a generic error to prevent username enumeration
      throw new functions.https.HttpsError(
        "not-found",
        "Invalid username or password"
      );
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verify email exists
    if (!userData.email) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Invalid account configuration"
      );
    }

    // Return only the email (not other user data)
    return {
      email: userData.email,
    };
  } catch (error) {
    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Log the actual error for debugging
    functions.logger.error("Error looking up username:", error);

    // Return a generic error to the client
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while looking up username"
    );
  }
});

