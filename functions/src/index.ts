import { firestore, initializeApp, credential } from "firebase-admin";
import * as functions from "firebase-functions";


export const sendEmergencyEmailRequest = functions.region("europe-west1").database.ref("users/{userId}/emergencies/{emergencyId}").onCreate(async (dataSnapshot, ctx) => {
  const app = initializeApp({
    credential: credential.cert("../emergency-monitor-hz21-firebase-adminsdk-4q9bw-e7f1d7320f.json"),
    databaseURL: "https://emergency-monitor-hz21-default-rtdb.europe-west1.firebasedatabase.app",
  });

  const emergencyContacts = await dataSnapshot.ref.parent?.parent?.child("emergencyContacts").get();

  if (!emergencyContacts?.exists) {
    return functions.logger.error("No emergency contacts exists for this user");
  }

  const emergencyContactsVal = emergencyContacts.val();
  const emergencyDataVal = dataSnapshot.val();

  functions.logger.log("Emergency: ", emergencyDataVal);
  functions.logger.log("Emergency Contacts: ", emergencyContactsVal);

  firestore(app).collection("emergencies").add({
    to: ["ebnsamuel@gmail.com"],
    message: {
      subject: "A new Emergency was detected",
      text: JSON.stringify(emergencyDataVal),
    },
  });
});

export const helloWorld = functions.region("europe-west1").https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {
    structuredData: true,
  });
  response.send("Hello from Firebase!");
});
