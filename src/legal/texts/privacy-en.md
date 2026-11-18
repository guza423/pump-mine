# Privacy Policy (English)

Effective date and version: {{SURUM}}

This policy explains how personal data is processed when you use {{UYGULAMA}} (the Android app, the web version at [{{WEB}}]({{WEB}}) and these pages; together the "Service"). It is based on the EU General Data Protection Regulation (2016/679, "GDPR"), the UK GDPR and the Turkish Personal Data Protection Law No. 6698 ("KVKK"). If this English version and the Turkish version differ, the Turkish version prevails for users in Turkey and this version prevails for users in the EEA and the UK.

## 1. In short

- We do not sell or rent your data, use it for advertising, or use it to train AI models.
- The app contains no advertising, analytics, crash-reporting or tracking software.
- Without an account, your records stay only on your device and never reach us.
- With an account, your records are stored on Google Firebase servers in Frankfurt, Germany, and only you can access them.
- Data that may relate to your health (sleep, effort, fatigue, notes) is stored in the cloud only with your separate [explicit consent](#doc:riza), which you can withdraw at any time.
- You can view, correct, export (JSON) and delete your data, and delete your account, from inside the app at any time.

## 2. Controller

- {{SIRKET}} ({{SIRKET_ACIKLAMA}})
- Address: {{ADRES}}
- Privacy contact: {{EPOSTA}}
- EU representative (GDPR Art. 27): {{AB_TEMSILCI}}
- Data controller representative in Turkey (KVKK): {{TR_TEMSILCI}}
- Data protection officer: not appointed at present. If one becomes legally required, it will be appointed and announced here.

## 3. Two ways to use the Service

Guest (no account): Your plans, workouts, sets, notes, sleep entries, goals and settings are stored only on your device (IndexedDB). They are not sent to us and we cannot access them. Calculations run on your device. If you uninstall the app, clear its data or lose your device, these records may be lost; use "Export" to keep a JSON copy. If Android auto-backup is enabled, the operating system may back up app data to your Google account; that backup is between you and Google and we cannot access it.

Account (cloud): You can sign up with Google or with email and password. Your records are stored in Google Firebase in {{BOLGE}} and synced between your devices; a copy is kept on your device for offline use. When you sign in, guest records on the device are moved to your account and a safety copy is kept on the device for 30 days, then deleted automatically.

## 4. Data we process

| Category | What | Source | When |
|---|---|---|---|
| Account and authentication | Email address, user ID (UID), sign-in method, account creation date. Passwords are kept by Firebase only as a one-way hash; we cannot see them. With Google sign-in, the name, email and profile photo link shared by Google are written to the Firebase account record; we do not use your name or photo in the app. | You, Google | Account |
| Training records | Plans, workout days, exercises, sets (weight, reps, level, contacts, range of motion), set and workout times, rest times, tags | You | Both |
| Data that may relate to health | Sleep hours; effort and fatigue entries (RPE, RIR); information you may write in notes such as pain or injury; fatigue, recovery and load estimates calculated from them | You, calculated by the app | Both; in the cloud only with explicit consent |
| Goals and settings | Strength and training goals, sound, haptic and animation preferences, rest preferences | You | Both |
| Consent records | Versions and dates of accepted texts, explicit consent status and dates, app version | Automatic | Account (device only for guests) |
| Technical and security data | IP address, device and browser information (user agent), sign-in times | Automatic, by Firebase Authentication | Account |
| Correspondence | Your email address and what you write to us | You | If you contact us |

We do not collect your full name separately, national ID numbers, phone number, location, contacts, photos, camera, microphone, advertising ID, payment data, or data from other health apps.

## 5. Purposes and legal bases

| Purpose | Data | GDPR | KVKK |
|---|---|---|---|
| Creating and securing your account, signing you in | Account, technical and security data | Art. 6(1)(b); Art. 6(1)(f) security | Art. 5(2)(c); 5(2)(f) |
| Storing, displaying and syncing your training records | Training records, goals, settings | Art. 6(1)(b) | Art. 5(2)(c) |
| Storing and syncing health-related data in the cloud and using it in fatigue and recovery calculations | Health-related data | Art. 9(2)(a) explicit consent | Art. 6(3)(a) explicit consent |
| Keeping consent records, meeting legal obligations, answering your requests | Consent records, correspondence | Art. 6(1)(c); Art. 6(1)(f) | Art. 5(2)(ç); 5(2)(e) |
| Establishing, exercising or defending legal claims | As necessary | Art. 6(1)(f); Art. 9(2)(f) | Art. 5(2)(e); 6(3)(e) |
| Answering support requests | Correspondence | Art. 6(1)(b); Art. 6(1)(f) | Art. 5(2)(c); 5(2)(f) |

Where we rely on legitimate interests, our interest is keeping the Service and your account secure and preventing abuse. You may object (see Section 10).

You do not have to give explicit consent. Without it, no cloud account is created and you can keep using the Service as a guest with all features, with your data staying on your device. Fatigue, recovery and load estimates are generated automatically for information only; no decision with legal or similarly significant effects is made about you (GDPR Art. 22).

## 6. Who receives your data

- Our service provider Google (Firebase Authentication and Cloud Firestore), as processor acting on our instructions under the Firebase Data Processing and Security Terms. Firestore data is stored in {{BOLGE}}; Firebase Authentication data may be processed in Google facilities including the United States.
- GitHub, Inc. (USA) hosts the web version and these pages and processes visitor IP addresses for security under its own privacy statement.
- Independent controllers: Google for Google sign-in and Google Play, and your device’s operating system (notifications, auto-backup), under their own policies.
- Public authorities and courts, only where legally required.
- Legal advisers, as needed to protect our rights and under confidentiality.
- A successor in a merger, acquisition or sale, bound by this policy; we will inform you in advance.

Every user can access only their own data; this is enforced on the server.

## 7. International transfers

{{SIRKET}} is established in the United States and is directly subject to the GDPR under Art. 3(2). When you use an account, you provide your data directly to us through the app. Firestore data is stored in Germany; authentication data and data needed to operate the Service may also be processed in the United States. Transfers outside the EEA rely on the EU–US Data Privacy Framework adequacy decision for certified recipients and/or the European Commission’s Standard Contractual Clauses. For users in Turkey, transfers are carried out under KVKK Art. 9 and the related regulation, relying on appropriate safeguards such as the standard contract notified to the Turkish Data Protection Authority. You may request a copy of the safeguards.

## 8. Retention

| Data | Period |
|---|---|
| Account and training records (cloud) | While your account exists; deleted from our active systems immediately when you delete your account |
| Health-related data (cloud) | While your explicit consent lasts; deleted from the cloud immediately when you withdraw it |
| Guest records | Only on your device, until you delete them |
| Guest safety copy after sign-in | 30 days, on your device only |
| Technical and security logs (IP etc.) | A short period set by Google (a few weeks) |
| Consent records | Until the account is deleted |
| Requests and support correspondence | Up to 2 years after the request is closed |

Deleted data is permanently removed from the provider’s backup and log systems within their cycles and is not used for any purpose in the meantime.

## 9. Security

Traffic is encrypted in transit (TLS) and data is encrypted at rest on Google infrastructure. Server rules allow each user to access only their own data. We never see your password. Access within the company is limited to what is necessary to operate the Service, keep it secure, or handle your request. Personal data breaches are notified to the competent authority and to affected users as required by GDPR Arts. 33 and 34 and KVKK Art. 12. Please lock your device and use a strong, unique password; exported JSON files are not encrypted.

## 10. Your rights

Under the GDPR you have the right of access (Art. 15), rectification (16), erasure (17), restriction (18), data portability (20), objection (21), not to be subject to solely automated decisions (22), and to withdraw consent at any time (7(3)) without affecting the lawfulness of earlier processing. You may lodge a complaint with the supervisory authority where you live, work, or where the infringement occurred. Users in Turkey also have the rights in KVKK Art. 11 (see the Turkish version).

In the app you can: view and edit all records; export your data (Account › Export my data); delete records; delete your account (Account › Delete account); withdraw consent (Account › Withdraw my explicit consent, which deletes your cloud data and keeps your records on this device as a guest); and as a guest, delete all data on the device. See also [Account and data deletion](#doc:silme).

To exercise your rights, email {{EPOSTA}} from the email address registered in the app, or write to {{ADRES}}. We may ask for information to verify your identity. We respond within one month (extendable by two months for complex or numerous requests, with notice); under KVKK within 30 days, free of charge.

## 11. Age limit

The Service is not intended for anyone under {{YAS}}. If we learn that such a person has an account, we delete it and its data.

## 12. Device permissions

Notifications (rest timer, created locally on your device; we send no push notifications), exact alarms (rest timer accuracy), vibration (feedback; can be turned off) and internet (sign-in and sync). We do not request location, camera, microphone, contacts or file access; import and export use only the file you choose.

## 13. Cookies and local storage

The app and the web version do not use tracking or advertising cookies. Only storage that is strictly necessary for the Service is used on your device: your records (IndexedDB), your sign-in session (Firebase Authentication) and the version of the texts you accepted (local storage).

## 14. Changes

We may update this policy. Each version is published with its date above. For material changes we will inform you in the app and, where required, ask for your acceptance or consent again.

## 15. Contact

{{SIRKET}}
{{ADRES}}
{{EPOSTA}}
