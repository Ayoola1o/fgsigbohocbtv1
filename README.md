# Faith Immaculate Academy CBT System

A modern, offline-first computer-based testing (CBT) system built with React and Firebase.

## ✨ Features

- 🎯 **Offline First** - Works without internet connection using Firebase offline persistence
- 📝 **Question Bank** - Manage questions with multiple subjects and difficulty levels
- 📋 **Exam Management** - Create and configure exams with custom settings
- 👥 **Student Management** - Track students and their results
- 📊 **Real-time Results** - Instant grading and detailed analytics
- 🖨️ **Printable Reports** - Generate result slips for students
- 🌐 **Multi-tab Support** - Works across multiple browser tabs
- 🔄 **Auto-sync** - Changes sync automatically when online

## 🚀 Quick Start

### Prerequisites

- Node.js 20 or higher
- Firebase account (free tier works great!)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Firebase**
   
   See [QUICKSTART.md](QUICKSTART.md) for detailed Firebase setup instructions.
   
   Quick version:
   - Create Firebase project at https://console.firebase.google.com/
   - Enable Firestore Database
   - Copy `.env.example` to `.env` and add your Firebase config
   - Run `npm run init-firebase` to create admin user

3. **Run the application**
   ```bash
   npm run dev
   ```

4. **Login**
   - Visit http://localhost:5173
   - Username: `Admin`
   - Password: `admin123`

## 📖 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup guide
- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** - Detailed Firebase configuration
- **[FIREBASE_MIGRATION.md](FIREBASE_MIGRATION.md)** - Technical migration details

## 🏗️ Architecture

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Shadcn/ui** - Component library
- **React Query** - Data fetching and caching
- **Wouter** - Routing

### Backend
- **Firebase Firestore** - Database with offline support
- **Firebase SDK** - Client-side data access
- **IndexedDB** - Local caching for offline mode

## 📝 CSV Import for Questions

You can bulk-import questions via CSV:

1. Go to Question Bank page
2. Click "Upload CSV"
3. Select your CSV file
4. Choose class level and subject
5. Review and upload

**CSV Format:**
- Columns: `questionText,questionType,difficulty,options,correctAnswer,points`
- `questionType`: `multiple-choice`, `true-false`, or `short-answer`
- `difficulty`: `easy`, `medium`, `hard`
- `options`: JSON array `["A","B","C"]` or pipe-separated `A|B|C`
- Download template from the app for examples

## 🎯 Usage

### For Administrators

1. **Manage Questions** - Add questions manually or import via CSV
2. **Create Exams** - Select questions and configure exam settings
3. **Manage Students** - Add students individually or bulk import
4. **View Results** - See all exam results and generate reports

### For Students

1. **Login** - Use your name and student ID
2. **Select Exam** - Choose from available active exams
3. **Take Exam** - Answer questions with timer
4. **View Results** - See your score and detailed breakdown

## 🔒 Security

The default setup uses test mode for easy development. For production:

1. Update Firestore security rules (see QUICKSTART.md)
2. Change the default admin password
3. Enable Firebase Authentication
4. Use environment-specific Firebase projects

## 🌐 Deployment

### Deploy to Firebase Hosting

```bash
npm run build
firebase login
firebase init hosting
firebase deploy
```

### Deploy to Vercel/Netlify

1. Build: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables

## 🛠️ Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Preview production build
npm run check        # TypeScript type checking
npm run init-firebase # Initialize Firebase with admin user
```

## 📄 License

MIT License

## 🙏 Acknowledgments

Built for Faith Immaculate Academy using Firebase offline-first architecture.

---

**Made At Azahadinc Technology Department for Educational Institutions**
