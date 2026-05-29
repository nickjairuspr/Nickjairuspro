# MangaBuddy Tracker

A full-stack manga scraper and browser — scrapes MangaBuddy and presents all titles in a searchable, filterable UI. Scraping runs automatically every 6 hours and can be triggered manually from the dashboard.

## Stack

- **Backend**: Node.js + Express 5, Puppeteer scraper, node-cron for scheduling
- **Frontend**: React + Vite, TanStack Query, Tailwind CSS
- **Language**: TypeScript throughout

---

## Local Development

```bash
# Install dependencies
pnpm install

# Run API server (port 5000 by default)
pnpm --filter @workspace/api-server run dev

# Run frontend (separate terminal)
pnpm --filter @workspace/manga-tracker run dev
```

### Environment variables

No required env vars for local dev. The scraper uses the system Chrome/Chromium.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/manga` | List all manga (supports `?page=&limit=`) |
| `GET` | `/api/manga/status` | Get scrape status, last run timestamp, and total count |
| `GET` | `/api/manga/search?q=` | Search manga by title |
| `GET` | `/api/manga/:id` | Get a single manga by ID |
| `POST` | `/api/scrape` | Manually trigger a scrape |
| `GET` | `/api/healthz` | Health check |

---

## VPS Deployment (Ubuntu/Debian)

### 1. Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Install Chromium for Puppeteer
sudo apt install -y chromium-browser
```

### 2. Clone and set up

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
pnpm install
```

### 3. Build the project

```bash
# Build the API server
pnpm --filter @workspace/api-server run build

# Build the frontend
pnpm --filter @workspace/manga-tracker run build
```

### 4. Configure Puppeteer (if using system Chrome)

Set this environment variable so Puppeteer uses the system Chrome instead of its bundled browser:

```bash
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

Or add to `/etc/environment`:

```
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### 5. Start with PM2

```bash
# Start the API server
pm2 start "node artifacts/api-server/dist/index.mjs" \
  --name manga-api \
  --env production

# If serving the frontend as static files via a separate static server (optional):
# pm2 serve artifacts/manga-tracker/dist/public 3001 --name manga-frontend
```

### 6. Enable startup on reboot

```bash
pm2 startup
# Run the command PM2 outputs, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

pm2 save
```

### 7. Set required environment variables via PM2

```bash
pm2 set manga-api PORT 5000
pm2 restart manga-api
```

Or create an ecosystem file `ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: "manga-api",
      script: "artifacts/api-server/dist/index.mjs",
      env: {
        NODE_ENV: "production",
        PORT: "5000",
        PUPPETEER_EXECUTABLE_PATH: "/usr/bin/chromium-browser",
      },
    },
  ],
};
```

Then:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

### 8. Set up Nginx reverse proxy (recommended)

```bash
sudo apt install -y nginx
```

Create `/etc/nginx/sites-available/manga`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve frontend static files
    root /path/to/YOUR_REPO/artifacts/manga-tracker/dist/public;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/manga /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Logs and Monitoring

```bash
# View live logs
pm2 logs manga-api

# View last 200 lines
pm2 logs manga-api --lines 200

# Check status
pm2 status

# Restart the app
pm2 restart manga-api

# Reload without downtime
pm2 reload manga-api
```

---

## Auto-scraping

The scraper runs automatically every **6 hours** via node-cron (schedule: `0 */6 * * *`). It also runs once on startup if no data exists. You can trigger a manual scrape at any time via:

```bash
curl -X POST http://localhost:5000/api/scrape
```

Or use the "Scrape Now" button in the UI.

---

## Data Storage

Scraped manga data is saved to `manga_data.json` at the root of the `api-server` artifact directory. This file is loaded on startup and updated after each scrape. No database required.

---

## Updating

```bash
cd YOUR_REPO
git pull
pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/manga-tracker run build
pm2 restart manga-api
```
