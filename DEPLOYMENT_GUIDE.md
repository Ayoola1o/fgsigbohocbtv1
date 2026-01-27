# Deployment Guide - Faith Immaculate Academy CBT System

This guide will walk you through deploying your CBT system to **Render.com** with a **Supabase PostgreSQL** database.

## Prerequisites

- A GitHub account (to host your code)
- A Supabase account (for the database)
- A Render account (for hosting the application)

---

## Step 1: Set Up Supabase Database

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/sign up
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `fia-cbt-database` (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click **"Create new project"**
5. Wait for the project to be provisioned (takes ~2 minutes)

### 1.2 Get Your Database Connection String

1. In your Supabase project dashboard, click **"Project Settings"** (gear icon in the sidebar)
2. Go to **"Database"** section
3. Scroll down to **"Connection string"**
4. Select **"URI"** mode (not Transaction Pooler)
5. Copy the connection string - it looks like:
   ```
   postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the database password you created in step 1.1
7. **Save this connection string** - you'll need it for Render

---

## Step 2: Push Your Code to GitHub

### 2.1 Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon (top right) → **"New repository"**
3. Name it: `fia-cbt-system`
4. Choose **Public** or **Private**
5. **Do NOT** initialize with README (your project already has files)
6. Click **"Create repository"**

### 2.2 Push Your Code

Open your terminal in the project directory and run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - FIA CBT System"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR-USERNAME/fia-cbt-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

---

## Step 3: Deploy to Render

### 3.1 Create a Web Service

1. Go to [render.com](https://render.com) and sign in/sign up
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if you haven't already
4. Find and select your `fia-cbt-system` repository
5. Click **"Connect"**

### 3.2 Configure the Web Service

Fill in the following settings:

- **Name**: `fia-cbt-system` (or any name you prefer)
- **Region**: Choose the same region as your Supabase database (or closest to your users)
- **Branch**: `main`
- **Root Directory**: Leave blank
- **Runtime**: `Node`
- **Build Command**: 
  ```
  npm install && npm run build
  ```
- **Start Command**: 
  ```
  npm run start
  ```
- **Instance Type**: Choose **"Free"** (for testing) or a paid plan for production

### 3.3 Add Environment Variables

Scroll down to the **"Environment Variables"** section and add the following:

1. Click **"Add Environment Variable"**
2. Add these variables one by one:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Paste your Supabase connection string from Step 1.2 |
| `SESSION_SECRET` | Click "Generate" to create a random secret |
| `NODE_ENV` | `production` |

### 3.4 Deploy

1. Click **"Create Web Service"** at the bottom
2. Render will start building and deploying your application
3. Wait for the deployment to complete (usually 3-5 minutes)
4. You'll see logs in real-time

---

## Step 4: Initialize the Database

After your app is deployed, you need to create the database tables.

### 4.1 Run Database Migration

1. In your Render dashboard, go to your web service
2. Click on **"Shell"** in the left sidebar (you may need a paid plan for this)
   
   **Alternative (if Shell is not available on free tier):**
   - Run this command locally with your Supabase DATABASE_URL:
   ```bash
   DATABASE_URL="your-supabase-url" npm run db:push
   ```

3. Run the following command:
   ```bash
   npm run db:push
   ```

4. This will create all necessary tables in your Supabase database

---

## Step 5: Test Your Application

1. In your Render dashboard, you'll see a URL like: `https://fia-cbt-system.onrender.com`
2. Click on it to open your application
3. Test the admin login:
   - **Username**: `Admin`
   - **Password**: `admin`
4. **Important**: Change the admin password after first login!

---

## Step 6: Configure Supabase (Optional but Recommended)

### 6.1 Enable Row Level Security (RLS)

For better security, you can enable RLS on your tables:

1. Go to your Supabase project
2. Click **"Table Editor"** in the sidebar
3. For each table, click the table name → **"RLS"** tab
4. Enable RLS and create policies as needed

### 6.2 View Your Data

You can view and manage your data directly in Supabase:
1. Go to **"Table Editor"** in Supabase
2. You'll see all your tables (questions, exams, students, etc.)
3. You can view, edit, and query data directly

---

## Troubleshooting

### Build Fails
- Check the build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility (we're using Node 20+)

### Database Connection Issues
- Verify your `DATABASE_URL` is correct in Render environment variables
- Make sure you replaced `[YOUR-PASSWORD]` with your actual password
- Check that your Supabase project is active

### Application Won't Start
- Check the logs in Render dashboard
- Verify the `start` command is correct: `npm run start`
- Ensure the build completed successfully

### 404 Errors
- Make sure the build created the `dist` folder
- Check that `vite build` ran successfully in the build logs

---

## Updating Your Application

Whenever you make changes to your code:

1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

2. Render will **automatically** detect the changes and redeploy your application!

---

## Free Tier Limitations

### Render Free Tier:
- Services spin down after 15 minutes of inactivity
- First request after inactivity may take 30-60 seconds (cold start)
- 750 hours/month of runtime
- Shared CPU and 512MB RAM

### Supabase Free Tier:
- 500MB database storage
- 2GB bandwidth per month
- Unlimited API requests
- Database pauses after 1 week of inactivity (can be reactivated)

---

## Production Recommendations

For a production deployment, consider:

1. **Upgrade Render Plan**: For better performance and no cold starts
2. **Database Backups**: Enable automatic backups in Supabase (paid feature)
3. **Custom Domain**: Add your own domain in Render settings
4. **Monitoring**: Set up monitoring and alerts in Render
5. **Environment Separation**: Create separate Supabase projects for staging/production

---

## Support

If you encounter issues:
- Check Render documentation: https://render.com/docs
- Check Supabase documentation: https://supabase.com/docs
- Review application logs in Render dashboard
- Check database logs in Supabase dashboard

---

**Congratulations!** Your CBT system is now live and accessible to students! 🎉
