import { firestore, initializeApp, credential } from "firebase-admin";
import * as functions from "firebase-functions";
import * as serviceAccount from "../serviceAccount.json";

const params = {
  type: serviceAccount.type,
  projectId: serviceAccount.project_id,
  privateKeyId: serviceAccount.private_key_id,
  privateKey: serviceAccount.private_key,
  clientEmail: serviceAccount.client_email,
  clientId: serviceAccount.client_id,
  authUri: serviceAccount.auth_uri,
  tokenUri: serviceAccount.token_uri,
  authProviderX509CertUrl: serviceAccount.auth_provider_x509_cert_url,
  clientC509CertUrl: serviceAccount.client_x509_cert_url,
};


export const sendEmergencyEmailRequest = functions.region("europe-west1").database.ref("users/{userId}/emergencies/{emergencyId}").onCreate(async (dataSnapshot, ctx) => {
  const app = initializeApp({
    credential: credential.cert(params),
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
