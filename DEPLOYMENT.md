# Deployment Guide - NYA Streaming Site

## Overview
- **Frontend** → GitHub Pages (static files)
- **Backend** → Render/Railway (Node.js server)

---

## Option 1: Deploy Backend to Render (Recommended)

### Setup
1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign up
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Fill in:
   - **Name:** `nya-api` (or your choice)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free tier

6. Click **"Create Web Service"**
7. Wait ~2-3 minutes for deployment
8. Copy your URL (e.g., `https://nya-api.onrender.com`)

### Update Frontend
Edit `main.html` and change API calls from `http://localhost:3000` to your Render URL:

```javascript
const API_BASE = 'https://nya-api.onrender.com';

// Then use:
fetch(`${API_BASE}/api/search?q=naruto`)
```

---

## Option 2: Deploy Backend to Railway

### Setup
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select your repository
4. Railway auto-detects Node.js
5. Set environment variables if needed
6. Click **"Deploy"**
7. Copy your public URL from the Railway dashboard

### Update Frontend
Same as Render - replace `localhost:3000` with your Railway URL.

---

## Option 3: Deploy Frontend to GitHub Pages

1. Create a GitHub repository (e.g., `username/nya-streaming`)
2. Push your HTML, CSS, JS files
3. Go to **Settings** → **Pages**
4. Select **"Deploy from a branch"**
5. Choose `main` branch, save
6. Your site is live at `https://username.github.io/nya-streaming`

---

## Option 4: Deploy Everything to DigitalOcean (Full Stack)

### Create Droplet
1. Go to [digitalocean.com](https://digitalocean.com)
2. Create new **Droplet** ($5/month)
3. Choose **Ubuntu 22.04**
4. Add SSH key
5. Create droplet

### SSH & Setup
```bash
ssh root@YOUR_DROPLET_IP

# Install Node & npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git

# Clone your repo
git clone https://github.com/USERNAME/nyaa.git
cd nyaa

# Install dependencies
npm install

# Run server
node server.js
```

### Keep Server Running (PM2)
```bash
sudo npm install -g pm2
pm2 start server.js --name "nya-api"
pm2 startup
pm2 save
```

---

## Quick Test Locally First

Before deploying, test locally:

```bash
cd /home/divine/Desktop/nyaa

# Install dependencies
npm install

# Start server
npm start
```

Visit `http://localhost:3000/api/search?q=naruto` to test API

---

## Environment Variables (if needed)

Create `.env` file:
```
PORT=3000
NODE_ENV=production
```

Update `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

---

## Your Setup Checklist

- [ ] `package.json` created
- [ ] `server.js` created
- [ ] Code pushed to GitHub
- [ ] Backend deployed (Render/Railway)
- [ ] Frontend API URLs updated
- [ ] Frontend deployed (GitHub Pages)
- [ ] Test search functionality
- [ ] Test episode selection

---

## Troubleshooting

**API not working?**
- Check CORS is enabled in `server.js` ✓
- Verify API URL in frontend matches deployed URL
- Check browser console for errors

**Server crashes?**
- Check logs on Render/Railway dashboard
- Verify dependencies in `package.json`
- Test locally first: `node server.js`

**CORS errors?**
- Already handled in server.js with `cors()` middleware

---

## Cost

| Service | Cost |
|---------|------|
| Render (Free) | $0 (sleeps after 15 min inactivity) |
| Railway (Free) | $5 credit/month |
| GitHub Pages | $0 |
| DigitalOcean Droplet | $5-7/month |

**Recommendation:** Use Render free tier for testing, upgrade if needed.

---

## Support URLs

- Render Docs: https://render.com/docs
- Railway Docs: https://docs.railway.app
- GitHub Pages: https://pages.github.com
- DigitalOcean: https://docs.digitalocean.com
