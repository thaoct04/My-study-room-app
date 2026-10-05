# Notifications setup

The app stores and displays in-app notifications in the Firestore
`notifications` collection. The scheduled function creates one reminder 15
minutes before a booking starts and one reminder 10 minutes before it ends.
The function runs once per minute in `Asia/Ho_Chi_Minh`; delivery may therefore
be delayed by up to approximately one minute.

## Deploy the scheduled function

1. Install the Firebase CLI and authenticate:

   ```sh
   npm install -g firebase-tools
   firebase login
   firebase use <your-firebase-project-id>
   ```

2. Install the function dependencies from the project root:

   ```sh
   npm install --prefix functions
   ```

3. Enable the Cloud Scheduler / scheduled-functions billing requirements for
   the Firebase project, then deploy:

   ```sh
   firebase deploy --only functions
   ```

The function reads today's documents in `bookings`, so booking documents need
`userId`, `roomName`, `date`, `slot`, and `status: "active"`. New bookings also
store `startTime` and `endTime` as ISO timestamps; legacy documents are parsed
from their date and time slot using Vietnam time. Notification document IDs
are based on booking ID and reminder type, preventing duplicate reminders
across scheduler runs.

## Firestore rules

Merge a rule like this into the project's existing
`match /databases/{database}/documents` rules. Do not replace the rest of the
app's rules with this notification-only match. Cloud Functions use the Admin
SDK and bypass client security rules.

```text
match /notifications/{notificationId} {
  allow read: if request.auth != null
    && resource.data.userId == request.auth.uid;
  allow create: if false;
  allow update: if request.auth != null
    && resource.data.userId == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead'])
    && request.resource.data.isRead == true;
  allow delete: if request.auth != null
    && resource.data.userId == request.auth.uid;
}
```

This delivers reminders inside the app and persists them in Firestore. Push
notifications to the device lock screen require an additional Expo/FCM device
token registration and a push-delivery call from the Cloud Function.
