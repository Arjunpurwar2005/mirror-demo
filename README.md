# Botza Demo Preview Tool

Generates a unique shareable link that shows a client's real website — live,
scrollable, with all its animations working — overlaid with a live Botza
chatbot widget in the bottom-right corner. Used by sales to demo the widget
"as if it were already installed" on a prospect's site.

## How it works

1. Paste a target URL into the generator form (`/`).
2. The server checks whether that site can be iframed (looks at
   `X-Frame-Options` / `Content-Security-Policy: frame-ancestors` headers).
3. A short link (`/preview/:slug`) is generated and saved to MongoDB.
4. Opening that link either:
   - loads the real site live in a full-viewport `<iframe>` (if iframing is allowed), or
   - fetches the site's HTML server-side, injects a `<base href>` tag so
     relative assets still resolve, and serves it directly as a same-origin
     mirror (if the site blocks iframes).
5. In both cases, a fixed-position Botza widget script is injected into the
   page, bottom-right, above everything else.

No headless browser, no screenshots — the target site's real HTML/CSS/JS
runs as-is.

## Local setup

1. Install dependencies:
   ```
   npm install
   ```
2. Make sure MongoDB is available. Either run one locally:
   ```
   mongod --dbpath /path/to/your/data/dir
   ```
   or skip this and point `MONGODB_URI` at a free MongoDB Atlas cluster (see below).
3. Copy the env file and fill in values:
   ```
   cp .env.example .env
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open http://localhost:3000

## Setting up a free MongoDB Atlas cluster (for production, or to skip local MongoDB)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a new project, then create a free "M0" cluster.
3. Under **Database Access**, create a database user with a username and password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) so Render can connect.
5. Click **Connect** on your cluster → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/demo-preview-tool?retryWrites=true&w=majority
   ```
6. Use that as your `MONGODB_URI` (fill in the username/password, keep the database name `demo-preview-tool` or change it).

## Deploying to Render (free tier)

This repo includes a `render.yaml` (Render "Blueprint") and a `Dockerfile`, so Render can build and run it directly.

### Option A — Blueprint (uses render.yaml)

1. Push this repo to GitHub.
2. In the Render dashboard, click **New +** → **Blueprint**, and point it at your repo.
3. Render will detect `render.yaml` and create the web service automatically.
4. Fill in the environment variables it prompts for:
   - `MONGODB_URI` — your Atlas connection string (see above)
   - `BASE_URL` — your Render service URL, e.g. `https://demo-preview-tool.onrender.com`
   - `BOTZA_WIDGET_SCRIPT_URL` — the Botza widget's embeddable script URL
   - `DEMO_CHATBOT_ID` — the chatbot ID to use for demo previews
5. Deploy.

### Option B — Manual web service

1. In the Render dashboard: **New +** → **Web Service** → connect your repo.
2. Environment: **Docker** (Render will use the included `Dockerfile`).
3. Instance type: **Free**.
4. Add the same environment variables listed above.
5. Deploy.

### Note on Render's free tier

Free web services on Render **spin down after 15 minutes of inactivity** and
take ~30-50 seconds to "cold start" on the next request. For a sales demo,
open the preview link a minute before you actually need it, or upgrade to a
paid instance if cold starts are a problem.

## Project structure

```
server.js              Express app entry point
routes/generate.js      POST /api/generate — validate URL, check iframe support, create slug
routes/preview.js       GET /preview/:slug — serve iframe wrapper or HTML mirror + widget overlay
models/Preview.js       Mongoose schema for saved previews
utils/siteInspector.js  URL validation, iframe-block header check, HTML fetch/base-tag injection, widget snippet
utils/db.js             MongoDB connection helper
views/index.html        Generator form
views/notfound.html     "Preview not found" page
public/style.css        Shared styling
public/app.js           Generator form client-side JS
```
