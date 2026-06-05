# Faith Immaculate Academy CBT System (V5.7.7)

A state-of-the-art, offline-first computer-based testing (CBT) platform and diagnostic analytics engine designed for modern educational institutions. Built using React, Express, and Firebase with offline synchronization and Gemini AI-driven assessment tools.

---

## 🚀 What's New in V5.7.7

### 🧠 Gemini AI-Powered Smart Importer
- **Messy Docx/Txt Ingestion**: Upload unstructured Microsoft Word (`.docx`) and text files directly.
- **Intelligent Parsing Engine**: Accesses the Google Gemini API with strict JSON schemas to automatically parse and extract question texts, options, correct answers, difficulty, and marks.
- **Frontend Review Screen**: Gives teachers a visual preview grid to edit, review, and confirm parsed questions before writing them to the database.

### 📚 Multi-Subject Exam Sidebar Navigation UI
- **Dual-Layout Session UI**: Single-subject exams retain the focused center view, while multi-subject exams dynamically transition to a split 12-column grid layout.
- **Sidebar Subject Manager**: A left-hand navigation panel that allows students to view active subjects, track their real-time completion progress (e.g., `12/20 Completed`), see checkmark indicators for finished sections, and click to switch sections instantly.
- **Subject-Filtered Navigator**: The grid navigator maps only questions belonging to the currently selected subject, minimizing clutter and cognitive load.

### 📊 Cohort Psychometrics & Academic Trajectory Charts
- **Comparative Cohort Mastery (Radar Chart)**: A recharts-powered visualization on the student profile page comparing individual subject scores directly against class averages.
- **Historical Academic Growth (Area Chart)**: Chronological scores tracking a student's growth trajectory over time.
- **Printable Diagnostic Study Guides**: Generates an A4 print-ready study guide detailing custom timelines, weak areas, and auto-generated study schedules.

### ⚙️ Interactive Question Bank Linker & Advanced Filters
- **Inline Question bank Explorer**: Search, filter, and link questions directly from the exam page. Includes "Select All" and "Clear All" bulk operations.
- **Multi-Variable Filters**: Instantly sort exams by School Term, Class Level, Department, Subject Keyword, and Exam Type.
- **Client-Side Pagination**: Clean 10-records-per-page boundary handling with a dashboard record counter.

---

## 🏗️ Architecture & Technology Stack

### Frontend (Client-side)
- **Vite & React 18**: Ultra-fast build toolchain and component framework.
- **TailwindCSS & Shadcn/ui**: Modern, accessible UI styling system.
- **Lucide React**: Clean vector icon suite.
- **Recharts**: Responsive data visualization dashboards.
- **React Query (TanStack)**: Declarative, stateful cache synchronization.
- **Firebase client SDK**: Direct database connectivity with offline persistence enabled via IndexedDB.

### Backend (Serverless & APIs)
- **Express API**: Handles backend integrations like document parsing and AI classification.
- **Mammoth.js**: Fast `.docx` to raw text extraction engine.
- **Google Gen AI Node SDK**: Integrates Gemini 1.5 Flash for high-speed, structured text parsing.
- **Vercel Serverless Functions**: Runs backend server actions globally.
- **Esbuild Backend Bundler**: Compiles TypeScript backend route handlers into a single ESM file (`api/[...route].js`) at build time to solve runtime module-resolution (`ERR_MODULE_NOT_FOUND`) issues.

---

## 🛠️ Development & Environment Setup

### Prerequisites
- Node.js 20 or higher
- A Firebase project (Firestore Database enabled)
- A Google Gemini API Key (for the Smart Importer)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
copy .env.example .env
```
Fill in the configuration variables:
```env
# Client Firebase Config
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend Gemini Config (For AI Importer)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Initialize Firebase Database
Populate your database with the default system administrator credentials:
```bash
npm run init-firebase
```
- **Default Username**: `Admin`
- **Default Password**: `admin123`

*Note: Be sure to change the admin credentials immediately upon logging in.*

### 4. Running Locally
Start the development server:
```bash
npm run dev
```
Visit http://localhost:5173 to access the client portal.

---

## 🌐 Production Deployment

This project is configured for seamless deployment on **Vercel**. 

### Deployment Steps (via GitHub integration)
1. Push your repository to GitHub.
2. In your Vercel Dashboard, import the repository.
3. Configure the following environment variables in Vercel settings:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `GEMINI_API_KEY`
4. Deploy. Vercel automatically runs `npm run build` which triggers:
   - Frontend compilation via `vite build`
   - Backend compilation via `node build-backend.js` (bundling route TS files with esbuild)

---

## 📁 Repository Structure

```
├── api-src/              # Server route controllers
│   └── [...route].ts     # Express router API entrypoint (Source)
├── api/                  # Production serverless folder
│   ├── [...route].ts     # Vercel entrypoint (Re-exports bundled JS)
│   └── [...route].js     # Auto-generated ESM bundle (Git-ignored)
├── client/               # React application code
│   └── src/
│       ├── components/   # Shared layout and charting blocks
│       ├── lib/          # Firebase config and API bindings
│       └── pages/        # Exam session, portals, and analytics dashboard
├── server/               # Shared API startup configurations
│   ├── app.ts            # Express server initialization
│   └── routes.ts         # Routes mapping question imports & analytics
├── build-backend.js      # Backend bundler configuration using esbuild
├── vercel.json           # Vercel rewrite configuration rules
└── package.json          # Project configuration scripts and version tracking
```

---
**Made by Azahadinc Technology Department for Faith Immaculate Academy**
