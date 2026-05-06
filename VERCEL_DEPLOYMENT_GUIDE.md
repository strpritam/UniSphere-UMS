# Vercel Deployment Guide

## Frontend (progress-portal) - Vercel

### Step 1: Set Environment Variables in Vercel Dashboard

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add the following variable:

```
VITE_API_BASE_URL = https://your-backend-url.com
```

Replace `https://your-backend-url.com` with your actual backend URL (e.g., if backend is deployed to Vercel, Railway, or your custom domain)

### Step 2: Deploy Frontend
- Push to GitHub (Vercel auto-deploys)
- Or run: `vercel deploy --prod`

---

## Backend (progress-portal-backend) - Deployment Options

### Option A: Deploy Backend to Vercel

1. Add `vercel.json` in backend root:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "PORT": "@port",
    "JWT_SECRET": "@jwt_secret",
    "FRONTEND_ORIGIN": "@frontend_origin"
  }
}
```

2. In Vercel dashboard, set environment variables:
   - `JWT_SECRET` - Your secure JWT secret
   - `FRONTEND_ORIGIN` - Your frontend URL (e.g., `https://uni-sphere-ums.vercel.app`)
   - `MONGODB_URI` - Your MongoDB connection string
   - `SMTP_*` - Email configuration (optional)

3. Deploy: `vercel deploy --prod`

4. Get your backend URL and update frontend `VITE_API_BASE_URL`

### Option B: Deploy Backend to Other Services
- Railway: Set env vars in dashboard, backend gets a URL
- Render: Same process, provides a domain
- Custom VPS: Set env vars, use your domain

---

## Fix Applied (Code Changes)

✅ **Frontend**: Added validation to prevent undefined API URLs
✅ **Backend**: CORS now accepts all `*.vercel.app` domains

No logic or existing connections changed!

## Testing Locally

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend (uses real backend)
cd progress-portal
npm run dev
```

Visit: `http://localhost:5173`

## Troubleshooting

If you get **403 CORS error**:
1. Check `VITE_API_BASE_URL` is set in Vercel env vars
2. Check backend `FRONTEND_ORIGIN` includes your Vercel frontend URL
3. Verify backend is running and accessible

If you get **"API base URL not configured"**:
1. `VITE_API_BASE_URL` env var is missing in Vercel
2. Set it in Vercel project settings
