# Quick Start Guide - Firebase Offline Setup

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: `fia-cbt-system` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Firestore
1. In Firebase Console, click "Firestore Database" in left menu
2. Click "Create database"
3. Choose "Start in test mode" (we'll secure it later)
4. Select a location (choose closest to your users)
5. Click "Enable"

### Step 3: Get Firebase Config
1. Click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps"
4. Click the web icon `</>`
5. Register app with nickname: `FIA CBT Web`
6. Copy the `firebaseConfig` object

### Step 4: Configure Your App
1. In your project folder, create `.env` file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and paste your Firebase values:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
   ```

### Step 5: Initialize Admin User
```bash
npm run init-firebase
```

This creates the default admin account:
- Username: `Admin`
- Password: `admin123`

### Step 6: Run the App
```bash
npm run dev
```

Visit http://localhost:5173 and login with the admin credentials!

## 📱 Testing Offline Mode

1. Open the app in your browser
2. Open DevTools (F12)
3. Go to Network tab
4. Select "Offline" from the throttling dropdown
5. Try using the app - it should still work!
6. Add some data while offline
7. Go back online - data will sync automatically

## 🔒 Security Rules (Important!)

The default rules allow anyone to read/write. For production:

1. Go to Firebase Console → Firestore Database → Rules
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - only authenticated admins
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // Students - read for all, write for admins
    match /students/{studentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Questions - read for all, write for admins
    match /questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Exams - read for all, write for admins
    match /exams/{examId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Exam sessions - users can read/write their own
    match /exam_sessions/{sessionId} {
      allow read: if true;
      allow create: if true;
      allow update: if resource.data.studentId == request.resource.data.studentId;
    }
    
    // Results - read for all, write for system
    match /results/{resultId} {
      allow read: if true;
      allow create: if true;
    }
  }
}
```

3. Click "Publish"

## 🎯 Common Tasks

### Add a Student
1. Login as admin
2. Go to Students page
3. Fill in name, student ID, class level, sex
4. Click "Add Student"

### Create an Exam
1. Go to Exams page
2. Click "Create Exam"
3. Fill in details and select questions
4. Click "Create Exam"

### Import Questions via CSV
1. Go to Question Bank
2. Click "Upload CSV"
3. Select your CSV file
4. Choose class level and subject
5. Review and click "Upload All"

### View Results
1. Go to Results page
2. See all exam results
3. Click on a result to see details
4. Use "General Printout" for bulk printing

## 🐛 Troubleshooting

### "Firebase not initialized"
- Check `.env` file exists
- Verify all VITE_FIREBASE_* variables are set
- Restart dev server: `npm run dev`

### "Permission denied"
- Check Firestore rules in Firebase Console
- Ensure rules allow read/write access

### "Module not found: firebase"
- Run: `npm install firebase`
- Restart dev server

### Data not syncing
- Check internet connection
- Open browser DevTools → Console for errors
- Check Firebase Console → Firestore for data

### Offline mode not working
- Clear browser cache
- Check IndexedDB is enabled in browser
- Try in incognito mode

## 📊 Monitoring

### View Data in Firebase Console
1. Go to Firestore Database
2. Click on any collection (users, students, etc.)
3. See all documents and their data

### Check Usage
1. Go to Usage and billing
2. See reads, writes, and storage used
3. Firebase free tier includes:
   - 50K reads/day
   - 20K writes/day
   - 1GB storage

## 🎓 Next Steps

1. **Change admin password** - Create a new admin user with secure password
2. **Add students** - Import your student list via CSV
3. **Add questions** - Import questions or add manually
4. **Create exams** - Set up your first exam
5. **Test offline** - Verify offline functionality works
6. **Secure rules** - Update Firestore security rules for production

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)

---

**Need Help?** Check `FIREBASE_SETUP.md` for detailed instructions or `FIREBASE_MIGRATION.md` for technical details.
