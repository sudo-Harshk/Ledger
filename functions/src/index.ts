import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

interface LookupUsernameRequest {
  username: string;
}

export const lookupUsername = functions.https.onCall(async (request) => {
  const data = request.data as LookupUsernameRequest;
  const username = data.username;

  if (!username || typeof username !== "string" || username.trim().length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Username is required and must be a non-empty string"
    );
  }

  if (username.length > 100) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Username is too long"
    );
  }

  try {
    const usersRef = admin.firestore().collection("users");
    const snapshot = await usersRef
      .where("username", "==", username.trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "Invalid username or password"
      );
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (!userData.email) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Invalid account configuration"
      );
    }

    return {
      email: userData.email,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    functions.logger.error("Error looking up username:", error);

    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while looking up username"
    );
  }
});

