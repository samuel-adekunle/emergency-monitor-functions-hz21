import { firestore, initializeApp, credential, storage, apps } from "firebase-admin";
import * as functions from "firebase-functions";
import * as serviceAccount from "./serviceAccount.json";

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

interface EmergencyContact {
  emailAddress: string
  firstName: string
  lastName: string
}

interface AudioEmergency {
  type: "audio"
  resourceBucketLocation: string
  timestamp: string
  audioTranscript: string
}

interface VideoEmergency {
  type: "video"
  resourceBucketLocation: string
  timestamp: string
}

type Emergency = AudioEmergency | VideoEmergency


export const sendEmergencyEmailRequest = functions.region("europe-west1").database.ref("users/{userId}/emergencies/{emergencyId}").onCreate(async (dataSnapshot) => {
  const app = apps.length === 0 ? initializeApp({
    credential: credential.cert(params),
    databaseURL: "https://emergency-monitor-hz21-default-rtdb.europe-west1.firebasedatabase.app",
  }) : apps[0]!;

  const emergencyContacts = await dataSnapshot.ref.parent?.parent?.child("emergencyContacts").get();

  if (!emergencyContacts?.exists) {
    return functions.logger.error("No emergency contacts exists for this user");
  }

  const emergencyContactsVal: [EmergencyContact] = emergencyContacts.val();
  const emergencyDataVal: Emergency = dataSnapshot.val();

  functions.logger.log("Emergency: ", emergencyDataVal);
  functions.logger.log("Emergency Contacts: ", emergencyContactsVal);

  const emergencyContactsEmails = emergencyContactsVal.map(({ emailAddress }) => emailAddress);

  const storageBucket = storage(app).bucket("gs://emergency-monitor-hz21.appspot.com");
  const resource = storageBucket.file(emergencyDataVal.resourceBucketLocation);

  await resource.makePublic();
  const url = resource.publicUrl();

  functions.logger.log("Resource Public URL", url);

  firestore(app).collection("emergencies").add({
    to: emergencyContactsEmails,
    message: {
      subject: "An Emergency has been detected!",
      text: `Emergency Details:
Time Occurred: ${emergencyDataVal.timestamp}
Detection Method: ${emergencyDataVal.type}
Transcript: ${emergencyDataVal.type === "audio" ? emergencyDataVal.audioTranscript : "Unavailable for this detection method"}
Link to media (expires in 7 days): ${url}
`,
    },
  }).then(() => functions.logger.log("Written to Firestore")).catch((error) => functions.logger.error(error));
});
