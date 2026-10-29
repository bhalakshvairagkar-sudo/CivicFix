# Deploying CivicFix User Interface on Render.com

This guide provides step-by-step instructions for deploying the **CivicFix React 19 Frontend** as a **Static Site** on [Render.com](https://render.com).

Render offers **free hosting** for static sites with global CDN, automated SSL/TLS certificates, continuous deployment from GitHub, and zero server maintenance.

---

## 🚀 Deployment Options

You can deploy the UI on Render using either:
- **Method 1: 1-Click Blueprint (Recommended)** — Render reads the repository's [`render.yaml`](../render.yaml) automatically.
- **Method 2: Manual Dashboard Setup** — Configure the static site through Render's web interface.

---

## Method 1: 1-Click Render Blueprint (Fastest)

CivicFix includes a pre-configured [`render.yaml`](../render.yaml) blueprint file in the repository root.

1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. In the top-right corner, click **New +** $\to$ **Blueprint**.
4. Connect your GitHub account and select your repository:
   `bhalakshvairagkar-sudo/CivicFix`
5. Render will automatically detect [`render.yaml`](../render.yaml) and pre-fill all settings:
   - **Service Name**: `civicfix-ui`
   - **Service Type**: `Static Site`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **SPA Rewrite Rule**: `/*` $\to$ `/index.html` (prevents 404s on page reload)
6. (Optional) Provide your environment variables if prompted:
   - `VITE_API_BASE_URL`: Your backend API URL (e.g. `https://your-backend.onrender.com/api`).
7. Click **Apply**. Render will build and deploy your application. In ~1–2 minutes, your site will be live at:
   `https://civicfix-ui.onrender.com` (or your custom Render URL).

---

## Method 2: Manual Setup via Render Dashboard

If you prefer configuring the static site manually:

### Step 1: Create a New Static Site
1. Go to [https://dashboard.render.com](https://dashboard.render.com).
2. Click **New +** $\to$ **Static Site**.
3. Under **Connect a repository**, find and select `CivicFix` (or paste `https://github.com/bhalakshvairagkar-sudo/CivicFix`).

### Step 2: Configure Build Settings
Fill in the deployment settings exactly as shown below:

| Field | Value | Notes |
| :--- | :--- | :--- |
| **Name** | `civicfix-ui` | Or any unique subdomain name |
| **Branch** | `main` | Production branch |
| **Root Directory** | `frontend` | **Crucial**: Points Render to the React app folder |
| **Build Command** | `npm install && npm run build` | Installs dependencies and runs Vite production build |
| **Publish Directory**| `dist` | The folder Vite outputs production static assets to |

### Step 3: Configure Single Page Application (SPA) Routing
Because CivicFix uses React client-side routing, page refreshes on subpaths (e.g. `/cases`, `/map`, `/dbms`) must rewrite to `/index.html`:

1. Scroll down or go to the **Redirects/Rewrites** tab in your Static Site settings.
2. Click **Add Rule** and enter:
   - **Type**: `Rewrite`
   - **Source Path**: `/*`
   - **Destination Path**: `/index.html`
3. *(Note: CivicFix also includes `frontend/public/_redirects` which Render automatically detects).*

### Step 4: Environment Variables (API Connection)
1. Go to the **Environment** tab.
2. Add the following environment variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: The public URL of your deployed backend API (e.g., `https://your-civicfix-api.onrender.com/api` or `https://your-civicfix-api.onrender.com`).
   *(If not provided, the frontend will default to relative `/api` calls).*
3. (Optional) Google Maps API Key:
   - **Key**: `VITE_GOOGLE_MAPS_API_KEY`
   - **Value**: Your Google Maps JavaScript API key (if using satellite layers).

### Step 5: Deploy
Click **Create Static Site**.
Render will clone the repository, install npm dependencies, build the Vite bundles, and publish the static site.

---

## 🔗 Connecting to the Backend API

### 1. Cross-Origin Resource Sharing (CORS)
The CivicFix FastAPI backend has been configured in [`backend/main.py`](../backend/main.py) to automatically authorize any Render deployment:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Any frontend hosted on `*.onrender.com` will communicate with the backend without CORS errors.

### 2. Live API Health Probe
Once deployed, you can verify backend connectivity directly from your browser by checking:
```
https://<your-backend-url>/api/health
```
Which returns:
```json
{
  "status": "healthy",
  "database": "connected",
  "engine": "MySQL 9.7",
  "timestamp": "2026-10-30T01:10:00Z"
}
```

---

## 🛠️ Verification & Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Page reload gives 404 Not Found** | Missing SPA rewrite rule on Render | Verify that `frontend/public/_redirects` exists and/or add Rewrite rule `/*` $\to$ `/index.html` in Render Dashboard. |
| **API calls fail or return network error** | Frontend is targeting `/api` locally instead of live backend | In Render dashboard, set environment variable `VITE_API_BASE_URL` to your live backend URL, then click **Manual Deploy** $\to$ **Clear build cache & deploy**. |
| **Build fails with "Cannot find module"** | `Root Directory` was not set to `frontend` | In Render settings, ensure **Root Directory** is explicitly set to `frontend`. |
| **CORS blocked by browser** | Backend does not allow the Render origin | The backend already allows `https://.*\.onrender\.com`. If using a custom domain (e.g. `https://mycity.gov`), add your domain to `CORS_ORIGINS` in `backend/config.py`. |

---

## 🎯 Summary Checklist

- [x] Pre-configured [`render.yaml`](../render.yaml) added to root directory.
- [x] Client-side SPA routing rewrite rule added in `frontend/public/_redirects`.
- [x] Dynamic API base URL configured in [`frontend/src/api/client.js`](../frontend/src/api/client.js) (`import.meta.env.VITE_API_BASE_URL`).
- [x] Production build verified locally (`npm run build` completed in ~1.7s).
- [x] CORS middleware updated to authorize all `https://*.onrender.com` domains.
