# Firebase Offline Setup Guide

This project now uses Firebase with offline persistence instead of a backend server.

## Setup Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable Firestore Database in the project

### 2. Get Firebase Configuration

1. In Firebase Console, go to Project Settings
2. Scroll down to "Your apps" section
3. Click on the Web app icon (</>) to create a web app
4. Copy the `firebaseConfig` object

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in your Firebase configuration values from step 2

```bash
cp .env.example .env
```

Then edit `.env` with your actual Firebase values.

### 4. Set Up Firestore Security Rules

In Firebase Console, go to Firestore Database > Rules and use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes for now (development only!)
    // TODO: Add proper security rules for production
    match /{document=**} {
      allow read, write: true;
    }
  }
}
```

**Important**: These rules allow anyone to read/write. For production, implement proper authentication and authorization rules.

### 5. Initialize Default Admin User

Run the initialization script to create a default admin user:

```bash
npm run init-firebase
```

This will create an admin user with:
- Username: `Admin`
- Password: `admin123`

**Change this password immediately in production!**

### 6. Enable Offline Persistence

Offline persistence is already enabled in `client/src/lib/firebase.ts`. This means:
- Data is cached locally
- App works offline
- Changes sync when connection is restored
- Multiple tabs are supported

## Collections Structure

The app uses these Firestore collections:

- `users` - Admin users
- `students` - Student records
- `questions` - Question bank
- `exams` - Exam definitions
- `exam_sessions` - Active exam sessions
- `results` - Exam results

## Running the App

```bash
npm run dev
```

The app will now use Firebase instead of the Express backend. All data is stored in Firestore with offline support.

## Benefits of Firebase Offline

1. **No Backend Server Needed** - Firebase handles all data storage
2. **Offline Support** - App works without internet connection
3. **Real-time Sync** - Changes sync automatically when online
4. **Scalable** - Firebase handles scaling automatically
5. **Multi-tab Support** - Works across multiple browser tabs

## Migration from Backend

If you have existing data in the PostgreSQL database, you'll need to export it and import it into Firebase. This can be done by:

1. Exporting data from PostgreSQL
2. Creating a migration script to import into Firebase
3. Running the migration script

## Troubleshooting

### "Firebase not initialized" error
- Check that `.env` file exists and has correct values
- Verify Firebase project is created and Firestore is enabled

### "Permission denied" error
- Check Firestore security rules
- Ensure rules allow read/write access

### Data not persisting offline
- Check browser storage settings
- Ensure IndexedDB is enabled
- Clear browser cache and reload

### "NOT_FOUND" or "Connection failed" error
- This usually means the Firestore database has not been created in the Firebase Console.
- Go to **Build > Firestore Database** in the Firebase Console.
- Click **Create database**.
- Select a location (e.g., `nam5` for us-central).
- Start in **Test mode** (or Production mode and update rules).
- Verify your `VITE_FIREBASE_PROJECT_ID` in `.env` matches the project ID in the console.

### "permission-denied" error
- This means your Firestore Security Rules are blocking access.
- Go to **Build > Firestore Database > Rules** in the Firebase Console.
- Change the rules to allow read/write access (for development):
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
  ```
- Click **Publish**.
