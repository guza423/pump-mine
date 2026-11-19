# Privacy Policy

Effective date and version: {{SURUM}}

This policy explains how your personal data is processed when you use {{UYGULAMA}} (the Android app, the web version at [{{WEB}}]({{WEB}}) and these pages; together the "Service"). For users in Turkey it is based on the Turkish Personal Data Protection Law No. 6698 ("KVKK"); for users in the European Economic Area (EEA) and the United Kingdom, on the EU General Data Protection Regulation (2016/679, "GDPR") and the UK GDPR. Users in Turkey are also given the [KVKK Privacy Notice](#doc:aydinlatma); the two are consistent with each other. If this English version and the Turkish version differ, the Turkish version prevails for users in Turkey; for all other users this English version prevails.

## 1. In short

- We do not sell or rent your data, use it for advertising, or use it to train AI models.
- The app contains no advertising, analytics, crash-reporting or user-tracking software.
- Without an account, your records stay only on your own device and never reach us.
- With an account, your records are stored on Google Firebase servers in Frankfurt, Germany, and only you can access them.
- Data that may relate to your health (sleep, effort, fatigue, notes) is stored in the cloud only with your separate [explicit consent](#doc:riza), which you can withdraw at any time.
- You can view, correct, export (JSON) and delete your data from inside the app at any time, and delete your account there yourself.

## 2. Data controller

- Name: {{SIRKET}} ({{SIRKET_ACIKLAMA}})
- Address: {{ADRES}}
- Privacy and data protection contact: {{EPOSTA}}
- Data controller representative in Turkey (KVKK): {{TR_TEMSILCI}}
- EU representative (GDPR Art. 27): {{AB_TEMSILCI}}
- Data protection officer (DPO): not appointed at present. If one becomes legally required, it will be appointed and announced here.

In this policy, "we" and the "Company" mean {{SIRKET}}; "you" and the "user" mean the person using the Service.

## 3. Two ways to use the Service

### 3.1 Guest use (no account)

- Your plans, workouts, sets, notes, sleep entries, goals and settings are stored only on your device, in the app's own storage (IndexedDB).
- This data is not sent to us and we have no access to it. Fatigue and progress calculations run on your device.
- If you uninstall the app, clear its data or lose your device, these records may be lost. To keep a copy, use "Export" to create a JSON file; that file is under your control.
- If Android's auto-backup is turned on, the operating system may back up the app's data on your device to your Google account. That backup is between you and Google; we cannot access it. You can turn it off in your device settings.

### 3.2 Account (cloud) use

- You can create an account with Google or with an email address and password.
- Your records are stored on Google Firebase infrastructure in {{BOLGE}} and synced between your devices. While you are offline, a copy is kept on your device and sent once you are back online.
- When you move to an account, the guest records on your device are moved into your account. After the move, a safety copy of these records stays on your device for 30 days and is then deleted automatically.

## 4. Personal data we process

| Category | What | Source | When |
|---|---|---|---|
| Account and authentication | Email address, user ID (UID), sign-in method, account creation date. With email sign-in, your password is kept by Firebase only as a one-way hash; we cannot see it. With Google sign-in, the name, email address and profile photo link shared by Google are written to the Firebase account record; we do not use your name or photo in the app. | You and Google | Account |
| Training records | Plans, workout days, exercises you choose or create, sets (weight, reps, level, contacts, range of motion), set times, rest times, workout start and end times, tags | You | Both |
| Data that may relate to health | Your sleep hours; your effort and fatigue entries (such as RPE and RIR); information such as pain, injury or energy that you may write in your notes; the fatigue, recovery and load estimates calculated from these entries | You and the app's calculations | Both; in the cloud only with your explicit consent |
| Goals and settings | Your strength and training goals, sound, haptic and animation preferences, rest time preferences | You | Both |
| Consent records | Versions and dates of the texts you accepted, explicit consent status and the dates it was given and withdrawn, app version | Automatic | Account (for guests, only on the device) |
| Technical and security data | IP address, device and browser information (user agent), sign-in times | Automatic, by Firebase Authentication | Account |
| Correspondence | Your email address and what you write to us | You | If you write to us |

Data we do not process: we do not ask for your full name separately. We do not collect national ID numbers, phone numbers, location, contacts, photos, camera, microphone, advertising ID, payment data, or data from other health apps (e.g. Health Connect).

Notes are free text. We recommend that you do not write unnecessary sensitive information about yourself or others in them.

## 5. Purposes and legal bases

| Purpose | Data | KVKK | GDPR |
|---|---|---|---|
| Creating your account, signing you in, protecting your account | Account, technical and security data | Art. 5(2)(c): formation and performance of a contract; Art. 5(2)(f): legitimate interest in security | Art. 6(1)(b); Art. 6(1)(f) |
| Storing, displaying and syncing your training records between devices | Training records, goals and settings | Art. 5(2)(c) | Art. 6(1)(b) |
| Storing and syncing health-related data in the cloud and using it in fatigue and recovery calculations | Data that may relate to health | Art. 6(3)(a): explicit consent | Art. 9(2)(a): explicit consent |
| Keeping acceptance and consent records, meeting legal obligations, answering your requests | Consent records, correspondence | Art. 5(2)(ç): legal obligation; Art. 5(2)(e) | Art. 6(1)(c); Art. 6(1)(f) |
| Establishing, exercising or defending rights in a dispute | Data as necessary | Art. 5(2)(e); for special category data, Art. 6(3)(e) | Art. 6(1)(f); Art. 9(2)(f) |
| Answering support requests | Correspondence | Art. 5(2)(c); Art. 5(2)(f) | Art. 6(1)(b); Art. 6(1)(f) |

Where we rely on legitimate interests, our interest is keeping the Service and your account secure and preventing abuse. You may object to this balance (see Section 10).

You do not have to give explicit consent to use the Service. Without it, you can keep using the Service as a guest with all its features, with your data staying only on your device. Cloud sync does require explicit consent, because by the nature of the Service training records cannot be separated from health-related entries.

Automated assessment: fatigue, recovery, estimated maximum and load figures are generated automatically from your entries. They are for information only; no automated decision with legal or similarly significant effects is made about you (GDPR Art. 22). Your right to object to these results under KVKK Art. 11(1)(g) is reserved.

## 6. Who receives your data

We do not sell your data. We share it only with the recipients below, for the stated purpose and only as far as necessary.

- Our service provider Google (Firebase Authentication and Cloud Firestore): acts as a processor on our behalf and on our instructions. Firestore data is kept in {{BOLGE}}. As Google explains, Firebase Authentication data may be processed in Google facilities, including in the United States. The relationship is governed by the Firebase Data Processing and Security Terms.
- GitHub, Inc. (USA): hosts the web version and these pages. When you visit the web version, GitHub processes your IP address for security under its own privacy statement.
- Independent controllers: your Google account if you sign in with Google; Google Play if you download the app from it; your device's operating system (notifications, auto-backup). These services are subject to their own privacy policies.
- Authorised public authorities and courts: only where required by law and to the extent requested.
- Legal and professional advisers: to the extent necessary to protect our rights in a dispute, and under a duty of confidentiality.
- The acquiring party in a merger, transfer or sale of the Company: provided it remains bound by the safeguards in this policy. In that case we will inform you in advance.

Each user can access only their own data; this rule is enforced on the server. Other users cannot see your data.

## 7. International transfers

{{SIRKET}} is established in the United States. When you use an account, you send your data through the app directly to a data controller established abroad and to its infrastructure. Firestore data is kept in Germany. Authentication data, and data needed for technical support and to operate the Service, may also be processed in the United States.

- KVKK: For processing that amounts to a transfer abroad, we comply with KVKK Art. 9 and the Regulation on the Procedures and Principles for the Transfer of Personal Data Abroad. For transfers to countries without an adequacy decision, we rely on appropriate safeguards such as the standard contract announced by the Board; standard contracts are notified to the Personal Data Protection Authority within five business days of signing.
- GDPR: Under GDPR Art. 3(2) we are directly subject to the Regulation. For transfers outside the EEA, we rely on the adequacy decision for the EU–US Data Privacy Framework and/or the European Commission's Standard Contractual Clauses. You may request a copy of the safeguards applied by writing to us.

## 8. Retention periods

| Data | Period |
|---|---|
| Account and training records (cloud) | While your account exists. Deleted from our active systems immediately when you delete your account. |
| Health-related data (cloud) | While your explicit consent lasts. Deleted from the cloud immediately when you withdraw it. |
| Guest records | Only on your device, until you delete them. |
| Guest safety copy after moving to an account | 30 days, only on your device; then deleted automatically. Immediately if you delete your account. |
| Technical and security logs (IP etc.) | By Firebase, for a short period set by Google (a few weeks). |
| Acceptance and consent records | Until the related account is deleted. |
| Requests and support correspondence | Up to 2 years after the request is concluded. |

Deleted data is permanently removed from the service provider's backup and log systems within their own cycles and is not used for any other purpose in the meantime. Data that no longer has a reason to be kept is deleted, destroyed or anonymised in line with the applicable legislation; where periodic destruction applies, the period does not exceed 6 months.

## 9. Security

- All traffic between the app and the server is encrypted (TLS). Data is also encrypted at rest on Google infrastructure.
- Server rules allow each user to access only their own data.
- We do not keep and cannot see your password.
- We collect only the data the Service needs. Access to data within the Company is limited to what is necessary to operate the Service, keep it secure, or handle your request.
- If a data breach occurs, we will notify the KVKK Board as soon as possible and within 72 hours at the latest under KVKK Art. 12, and the people affected as soon as possible. Notifications under the GDPR are made in line with Arts. 33 and 34.
- What you can do: lock your device's screen and choose a strong password that you do not use elsewhere. Exported JSON files are not encrypted; keep them somewhere safe.

## 10. Your rights

### 10.1 Your rights under KVKK Article 11

By applying to the data controller, you have the right to:

- a) learn whether your personal data is processed,
- b) request information if it has been processed,
- c) learn the purpose of processing and whether it is used for that purpose,
- ç) know the third parties in Turkey or abroad to whom it is transferred,
- d) request its correction if it is incomplete or inaccurate,
- e) request its deletion or destruction under the conditions in KVKK Art. 7,
- f) request that the actions under (d) and (e) be notified to the third parties to whom the data was transferred,
- g) object to a result against you arising from analysis of the processed data exclusively by automated systems,
- ğ) claim compensation if you suffer damage because of unlawful processing.

### 10.2 Your rights under the GDPR (EEA and UK)

You have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20), objection (Art. 21), not to be subject to automated decision-making (Art. 22), and to withdraw your consent at any time (Art. 7(3)). Withdrawing consent does not affect the lawfulness of processing before the withdrawal. You may also lodge a complaint with the supervisory authority in the EEA country where you live or work or where the infringement took place.

### 10.3 What you can do right away in the app

- View and correct: all your records are visible and editable in the app.
- Portability: Account › Export my data (JSON).
- Deletion: delete individual records, or delete your account and all your cloud data with Account › Delete account. As a guest, use Account › Delete data on this phone.
- Withdrawing consent: Account › Withdraw my consent. Your cloud data is deleted and your records stay on this device in guest mode.
- Details: [Account and data deletion](#doc:silme).

### 10.4 How to apply and response times

- By email: to {{EPOSTA}}, from the email address registered in the app.
- In writing: by a signed letter to {{ADRES}}.
- Also by registered electronic mail (KEP), secure electronic signature or mobile signature.

In your request, clearly state your name and surname; your Turkish ID number if you are a Turkish citizen, or your nationality and passport or ID number if you are not; your address for notifications; your email address; and your request (Communiqué on the Procedures and Principles of Application to the Data Controller). We may ask for additional information to verify your identity.

- KVKK: We conclude your request free of charge within 30 days at the latest. If the action requires an additional cost, a fee may be charged according to the tariff set by the Board.
- GDPR: We respond within 1 month at the latest. For complex or numerous requests, this period may be extended by 2 months, with notice.
- If your request is rejected, you find our answer insufficient, or we do not answer in time, you may complain to the Personal Data Protection Board within 30 days of learning our answer, and in any case within 60 days of your request (KVKK Art. 14).

## 11. Age limit

The Service is not intended for anyone under {{YAS}}, and we do not knowingly process the data of anyone under {{YAS}}. If we become aware of such an account, we delete the account and its data. If you are a parent or guardian, you can write to {{EPOSTA}}.

## 12. Device permissions and notifications

- Notifications: to let you know when your rest time is over. Notifications are created on your device; we do not send notifications from a server.
- Exact alarms: so that the rest timer ends exactly on time.
- Vibration: for set and timer feedback. You can turn it off in the settings.
- Internet: for sign-in and sync when you use an account.

We do not request location, camera, microphone, contacts or file access. Import and export use only the file you choose.

## 13. Cookies and local storage

The app and the web version do not use tracking or advertising cookies. Only storage that is strictly necessary for the Service to work is used on your device: your records (IndexedDB), your sign-in session (Firebase Authentication) and the version of the texts you accepted (local storage). Because this storage is strictly necessary for the Service to work, it does not require separate consent.

## 14. Changes

We may update this policy. Each version is published with its date above. For material changes we will inform you in the app and, where required, ask for your acceptance or consent again. You can request earlier versions by writing to us.

## 15. Contact

{{SIRKET}}
{{ADRES}}
{{EPOSTA}}

Related documents: [KVKK Privacy Notice](#doc:aydinlatma) · [Explicit Consent Notice](#doc:riza) · [Terms of Use](#doc:kosullar) · [Account and data deletion](#doc:silme)
