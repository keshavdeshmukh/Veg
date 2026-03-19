# 🌿 Vaibhav Vegetables App — Deployment Guide
## Easy Step-by-Step (No coding knowledge needed!)

---

## STEP 1 — Create Free MongoDB Database (5 minutes)

1. Go to 👉 https://cloud.mongodb.com
2. Click **"Try Free"** → Sign up with Google or email
3. Choose **"Free Shared"** cluster → Click **"Create"**
4. Set username & password (remember these!)
   - Example: username = `vaibhav` , password = `mypassword123`
5. Click **"Add My Current IP Address"** → then **"Finish and Close"**
6. Click **"Connect"** → **"Connect your application"**
7. Copy the connection string — looks like:
   ```
   mongodb+srv://vaibhav:mypassword123@cluster0.abc123.mongodb.net/
   ```
8. Add `vaibhav_vegetables` at the end:
   ```
   mongodb+srv://vaibhav:mypassword123@cluster0.abc123.mongodb.net/vaibhav_vegetables?retryWrites=true&w=majority
   ```
   ✅ **Save this — you'll need it in Step 3**

---

## STEP 2 — Upload Code to GitHub (3 minutes)

1. Go to 👉 https://github.com → Sign up (free)
2. Click **"New Repository"** → Name it `vaibhav-vegetables`
3. Click **"uploading an existing file"**
4. Upload ALL the files from the `backend` folder:
   - `server.js`
   - `package.json`
   - `.env.example`
   - `.gitignore`
   - `public/index.html`
5. Click **"Commit changes"** ✅

---

## STEP 3 — Deploy on Render (5 minutes)

1. Go to 👉 https://render.com → Sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your `vaibhav-vegetables` GitHub repo
4. Fill in these settings:
   | Setting | Value |
   |---------|-------|
   | Name | vaibhav-vegetables |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
5. Scroll down to **"Environment Variables"** → Click **"Add Variable"**:
   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | *(paste your MongoDB string from Step 1)* |
6. Click **"Create Web Service"** 🚀
7. Wait 2-3 minutes — Render will build and deploy!
8. You'll get a URL like: `https://vaibhav-vegetables.onrender.com`

---

## STEP 4 — Load Sample Data (1 minute)

After deployment, open this URL in your browser:
```
https://vaibhav-vegetables.onrender.com/api/seed
```
You'll see: `✅ Sample products seeded!`

Now open your app:
```
https://vaibhav-vegetables.onrender.com
```

🎉 **Your app is live!**

---

## 📱 How to Add to Your Phone (Like a Real App)

**Android:**
1. Open your app URL in Chrome
2. Tap the 3 dots menu → **"Add to Home Screen"**
3. Tap **"Add"** — it appears like an app icon!

**iPhone:**
1. Open your app URL in Safari
2. Tap the Share button (box with arrow)
3. Tap **"Add to Home Screen"** → **"Add"**

---

## ❓ Common Issues

**App not loading?**
- Wait 30-60 seconds — Render free tier "sleeps" when not used

**MongoDB connection error?**
- Check your MONGODB_URI in Render → Environment Variables
- Make sure password has no special characters like `@` or `/`

**Need help?** Contact your developer with this guide.

---

## 💡 What Your App Can Do
- ✅ Add / manage vegetables with stock levels
- ✅ Place orders — stock auto-deducts
- ✅ Mark orders as Delivered or Cancelled
- ✅ Send WhatsApp bill to customers
- ✅ Send SMS to customers
- ✅ View sales reports (weekly/monthly/yearly)
- ✅ Low stock alerts
- ✅ Works on mobile like an app
