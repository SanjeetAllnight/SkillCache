# SkillCache

**Peer-to-peer skill-sharing and collaborative learning platform**

SkillCache is a platform designed to connect individuals for peer-to-peer skill exchange. Users can discover mentors, request dedicated learning sessions, collaborate through live video, and share learning resources with the community. 

---

## 1. OVERVIEW

SkillCache solves the problem of inaccessible, isolated learning by creating a direct peer-to-peer ecosystem. 

**Typical Workflow:**
1. **Sign Up:** A user creates an account and completes their profile.
2. **Add Skills:** The user adds skills they can teach (mentor) and skills they want to learn.
3. **Discover Mentors:** The user browses or searches for mentors teaching their desired skills.
4. **Request a Session:** The user requests a learning session.
5. **Session Lifecycle:** The mentor accepts the session, and at the scheduled time, both users join.
6. **Live Collaboration:** Users communicate via live, peer-to-peer WebRTC video.
7. **Feedback:** After the session, the learner can leave a review.
8. **Repository:** Users can upload session notes, code snippets, or reference PDFs into a shared community repository.

---

## 2. KEY FEATURES

- **User Authentication:** Secure sign-in managed via Firebase Authentication.
- **User Profiles:** Customizable profiles listing teaching skills and learning goals.
- **Mentor Discovery:** Browse and search for available mentors by skill category.
- **Session Lifecycle:** Complete workflow for requesting, accepting, and managing live sessions.
- **Live Video Sessions:** High-quality, real-time video collaboration directly in the browser.
- **Multi-participant WebRTC:** Full-mesh peer-to-peer topology supporting group video calls.
- **Repository Resources:** A shared library to upload and discover PDFs, Markdown notes, code snippets, and links.
- **Likes & Bookmarks:** Users can like and save repository resources.
- **Reviews & Ratings:** Learners can review mentors after completed sessions.
- **Real-time Firestore Updates:** Instant UI updates and WebRTC signaling powered by Cloud Firestore.

---

## 3. TECH STACK

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | App Router, Server/Client components, and routing |
| **React 19** | UI components and application state |
| **TypeScript 6** | Static typing and enhanced developer experience |
| **Tailwind CSS 3** | Utility-first responsive styling |
| **Firebase Auth** | Identity and authentication (BaaS) |
| **Cloud Firestore** | Real-time NoSQL database and WebRTC signaling |
| **Native WebRTC** | Peer-to-peer live audio/video media exchange |

*Note: SkillCache utilizes Firebase as a Backend-as-a-Service (BaaS) instead of a traditional Node.js/Express backend, keeping the architecture highly scalable and serverless.*

---

## 4. SYSTEM ARCHITECTURE

```text
    User A (Browser)                                    User B (Browser)
          |                                                   |
          |------------- WebRTC Peer-to-Peer Media -----------|
          |             (Direct Audio/Video Stream)           |
          |                                                   |
    Next.js UI                                          Next.js UI
          |                                                   |
          |--------- Signaling (SDP/ICE Candidates) ----------|
          |                                                   |
          v                                                   v
+-----------------------------------------------------------------------+
|                            Firebase Services                          |
|                                                                       |
|  [ Cloud Firestore ] <-- Stores App Data & WebRTC Signaling State     |
|                                                                       |
|  [ Firebase Auth ]   <-- Manages Identity & Session Tokens            |
+-----------------------------------------------------------------------+
```

**Architecture Details:**
- **Cloud Firestore** stores all persistent application data (profiles, resources, sessions).
- **Firebase Authentication** securely manages user identity.
- **Firestore Signaling:** WebRTC requires peers to exchange connection details (SDP offers/answers and ICE candidates). We use Firestore as the signaling server to safely route these small messages.
- **Peer-to-Peer Media:** Actual audio and video data travel directly between users' browsers via WebRTC, bypassing Firestore entirely for low latency and high performance.

---

## 5. PROJECT STRUCTURE

```text
SkillCache/
├── app/               # Next.js App Router pages and layouts (auth, dashboard, repository, etc.)
├── components/        # Reusable React components (UI elements, repository cards, etc.)
├── hooks/             # Custom React hooks (e.g., useGroupWebRTC for live sessions)
├── lib/               # Core application logic, Firebase initialization, and signaling services
├── public/            # Static assets and local demo files (e.g., /demo-assets/)
├── firestore.rules    # Firebase security rules governing database access
├── middleware.ts      # Next.js edge middleware for route protection
├── next.config.ts     # Next.js framework configuration
└── package.json       # Project dependencies and npm scripts
```

---

## 6. GETTING STARTED

**Prerequisites:**
- Node.js
- npm
- Git

Clone the repository and install dependencies:

```bash
git clone <your-repository-url>
cd SkillCache
npm install
```

---

## 7. ENVIRONMENT VARIABLES

The application requires a Firebase project configuration to run. 

1. Create a new file named `.env` in the root of the project.
2. Add the following variables, replacing the placeholder values with your actual Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```
---

## 8. FIREBASE SETUP

To run SkillCache, you need an active Firebase project:

1. **Create a Project:** Go to the Firebase Console and create a new project.
2. **Register App:** Register a Web application to get your configuration keys.
3. **Authentication:** Enable the Authentication service. Be sure to enable Google Authentication (and/or Email/Password) depending on your intended login methods.
4. **Cloud Firestore:** Create a Firestore Database in production or test mode.
5. **Security Rules:** Copy the contents of `firestore.rules` from this repository into the Rules tab of your Firestore console to secure your data.

*Note: Firebase Storage is not strictly required for the demo environment.*

---

## 9. RUNNING THE APPLICATION

Once your environment variables are configured and dependencies are installed, start the local development server:

```bash
npm run dev
```

Open your browser and navigate to:
**http://localhost:3000**

---

## 10. REPOSITORY FILE-UPLOAD DEMO NOTE

SkillCache includes a **Repository** feature where users can upload learning resources like PDFs. 

For demonstration purposes, binary file uploading to Firebase Storage is intentionally bypassed to avoid requiring a billing-enabled Firebase plan. 

- **Metadata** (title, description, tags, original filename) is fully persisted in Cloud Firestore.
- **File Upload** is simulated locally. When a PDF is uploaded, the app assigns the resource a valid, clickable internal URL pointing to a pre-existing demo PDF located in `public/demo-assets/`.
- If you clone this repository, you must place your own placeholder PDF files inside `public/demo-assets/` for the simulated PDF previews to render successfully, as large binaries may be excluded via `.gitignore`.
- For production, this simulation can easily be swapped out with standard Firebase Storage uploads.

---

## 11. WEBRTC VIDEO CALLING

The live video session feature is built directly on native browser WebRTC APIs:

- **Media Acquisition:** `getUserMedia` is used to capture the user's camera and microphone.
- **Topology:** The application employs a Full-Mesh WebRTC topology where each participant maintains a direct `RTCPeerConnection` with every other participant.
- **Signaling:** Participants exchange SDP offers, answers, and ICE candidates asynchronously via Cloud Firestore (`lib/callSignaling.ts`).
- **ICE/STUN:** Google's public STUN servers are used to traverse standard NATs.
- **Limitation:** A TURN server is not currently configured, meaning restrictive enterprise firewalls may block peer-to-peer video connections. 

---

## 12. BUILD FOR PRODUCTION

To verify the production build locally, run:

```bash
npm run build
npm start
```

---

## 13. DEPLOYMENT

SkillCache is a Next.js application and can be seamlessly deployed to platforms like Vercel.

1. Connect your GitHub repository to your hosting provider.
2. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables to your provider's deployment settings.
3. Deploy the application.
4. Add your new production domain to **Authorized Domains** in your Firebase Authentication settings to allow production logins.

*Reminder: Files ignored by `.gitignore` (like local demo PDFs in `public/demo-assets/`) will not be pushed to your repository or your deployment environment. You will need to explicitly include them or transition to cloud storage.*

---

## 14. LIMITATIONS AND FUTURE IMPROVEMENTS

- **Cloud Storage:** Replace the simulated local PDF storage with actual Firebase Storage uploads.
- **WebRTC Reliability:** Deploy a TURN server (e.g., Coturn, Twilio Network Traversal) to guarantee connection success across strict firewalls.
- **Call Scalability:** A full-mesh WebRTC topology works well for small groups (2–5 users) but does not scale to large classrooms. For larger sessions, an SFU (Selective Forwarding Unit) architecture would be required.
- **Dynamic Content:** Replace any remaining placeholder or seeded demo content with fully dynamic data.

---

## 15. TEAM

- Sanjeet
- Samiksha
- Santosh
- Prasham
- Sakshi
