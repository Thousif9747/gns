# GNS Platform — Deployment Guide

## Architecture Overview

```
                         ┌─────────────┐
                         │   Firebase   │
                         │  (FCM Push)  │
                         └──────┬──────┘
                                │
  User ──► Nginx (:80/:443) ───┼──► Frontend (Vite SPA / Nginx)
           │                    │
           ├── /media/ ──────►  Local filesystem
           ├── /static/ ─────►  Django staticfiles
           ├── /api/ ───────►  Backend (Django REST / Gunicorn)
            └── /django-admin/ ─────►  Backend (Django Admin)
                                   │
                              PostgreSQL + Redis
```

**Services:**

| Service | Technology | Role |
|---|---|---|
| `nginx` | nginx:alpine | Reverse proxy, SSL termination, serve media/static |
| `frontend` | React 19 + Vite 6 | SPA served by Nginx (production build) |
| `backend` | Django 5.1 + DRF | REST API, served by Gunicorn |
| `postgres` | PostgreSQL 16 | Primary database |
| `redis` | Redis 7 | Cache, session store |

---

## Prerequisites

- **Docker** and **Docker Compose v2** installed on your server
- **A domain name** pointed to your server's IP
- **SMTP credentials** (Brevo / SendinBlue recommended) for transactional emails
- **Firebase project** with Cloud Messaging enabled (for push notifications)
- **SSL certificate** (Let's Encrypt recommended)
- **Node.js 18+** for Android packaging
- **Java JDK 17+** (do not use JDK 25; Gradle 8.11 is incompatible)
- **Android command-line tools or Android Studio**
- **Google Play Developer account** ($25)

---

## 1. Pre-Deployment Checklist

Before deploying, ensure these items are addressed:

| Item | Action | File |
|---|---|---|
| Django Secret Key | Generate a secure random key | `.env` → `DJANGO_SECRET_KEY` |
| Debug Mode | Set to `False` | `.env` → `DJANGO_DEBUG=False` |
| Allowed Hosts | Set to your domain | `.env` → `DJANGO_ALLOWED_HOSTS` |
| DB Password | Use a strong password | `.env` → `DB_PASSWORD` |
| CORS Origins | Set to your frontend URL | `.env` → `CORS_ALLOWED_ORIGINS` |
| API Base URL | Set to your production API URL | `.env` → `VITE_API_BASE_URL` |

Generate a secret key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## 2. VPS Deployment (Docker Compose)

### 2.1 Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose (plugin)
sudo apt install docker-compose-plugin -y

# Add your user to docker group
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
```

### 2.2 Clone & Configure

```bash
# Clone the repository
git clone <your-repo-url> /opt/gns
cd /opt/gns

# Create production .env file
cat > .env << 'EOF'
DJANGO_SECRET_KEY=<generated-secret-key>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

DB_NAME=gns_db
DB_USER=gns_user
DB_PASSWORD=<strong-random-password>
DB_HOST=postgres
DB_PORT=5432

REDIS_URL=redis://redis:6379/0

VITE_API_BASE_URL=https://yourdomain.com/api

# SMTP (Brevo / SendinBlue)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_HOST_USER=<your-email>
EMAIL_HOST_PASSWORD=<your-smtp-key>
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=GNS <noreply@yourdomain.com>

# Android (optional, for Digital Asset Links)
ANDROID_PACKAGE_NAME=com.gns.app
ANDROID_SHA256_FINGERPRINT=<your-keystore-sha256>

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com
EOF
```

### 2.3 SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot -y

# Obtain certificate (standalone mode — stop nginx first)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Create nginx SSL directory
mkdir -p nginx/ssl

# Copy certificates (or symlink)
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chown -R $USER: docker nginx/ssl/

# Set up auto-renewal
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet && docker compose -f /opt/gns/docker-compose.yml -f /opt/gns/docker-compose.prod.yml restart nginx
```

### 2.4 Update Nginx for HTTPS

Add the following to `nginx/default.conf.template` (before `server { listen 80; ... }`):

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... same location blocks as the HTTP server
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

### 2.5 Deploy

```bash
cd /opt/gns

# Pull latest images (if using a registry) and start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
docker compose logs -f backend
docker compose logs -f nginx

# Run migrations (if not handled by entrypoint)
docker compose exec backend python manage.py migrate --noinput

# Create admin user
docker compose exec backend python manage.py createsuperuser

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput --clear
```

### 2.6 Verify

```
https://yourdomain.com/api/health/         → {"status": "ok"}
https://yourdomain.com/django-admin/       → Django Admin login
https://yourdomain.com/                    → Frontend SPA
https://yourdomain.com/api/docs/           → Swagger API docs
```

### 2.7 Android App (Play Store)

The application can also be packaged as an Android app and published to the Google Play Store.

#### Prerequisites

- Node.js 18+
- Java JDK 17+ (not JDK 25)
- Android command-line tools or Android Studio
- Google Play Developer account ($25)

#### Quick Setup

1. Generate the Android project:

```powershell
npx @bubblewrap/cli init --manifest="https://yourdomain.com/manifest.webmanifest"
```

You will be prompted for:
- **Domain** — press Enter (default from manifest)
- **URL path** — press Enter (`/`)
- **App name** — press Enter
- **Short app name** — press Enter
- **Icon location** — press Enter
- **Theme color** — press Enter
- **Background color** — press Enter
- **Display mode** — select `standalone`
- **Orientation** — select `default`
- **Play Billing** — `n`
- **JDK install?** — `n`
- **JDK path** — enter the path to your JDK 17+ installation

2. Build a test APK (unsigned):

```powershell
npx @bubblewrap/cli build --unsigned
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

3. Build a signed AAB (for Play Store):

```powershell
npx @bubblewrap/cli build
```

Output: `app-release-signed.apk` and `app-release-bundle.aab`

4. Install on a phone for testing:

```powershell
adb install app/build/outputs/apk/debug/app-debug.apk
```

#### Digital Asset Links

After generating the keystore, get your SHA-256 fingerprint:

```powershell
keytool -list -v -keystore android.keystore -storepass YOUR_PASSWORD | findstr "SHA256:"
```

Set it in your backend environment:

```env
ANDROID_PACKAGE_NAME=com.gns.app
ANDROID_SHA256_FINGERPRINT=AA:BB:CC:...your fingerprint...
```

Then deploy the backend so the `/.well-known/assetlinks.json` endpoint is live at your domain.

#### Publishing Steps

1. Go to https://play.google.com/console
2. Create a new app
3. Fill in the store listing (description, screenshots, etc.)
4. Upload the `.aab` file from `app/build/outputs/bundle/release/`
5. Complete the app content questionnaire
6. Submit for review

---

## 3. Cloud Platform Deployment (Alternative)

### 3.1 Railway

Railway supports deploying Dockerfiles natively.

1. Create a Railway project
2. Provision a **PostgreSQL** plugin and a **Redis** plugin
3. Deploy each service from the repo root:

| Service | Root Directory | Start Command | Health Check Path |
|---|---|---|---|
| `backend` | `./backend` | `gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3` | `/api/health/` |
| `frontend` | `./frontend` | Use Nginx static server (see below) | `/` |

**Frontend on Railway:** Build the frontend in a separate step, then serve with Nginx:
```dockerfile
# ./frontend/Dockerfile.railway
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Or serve via Railway's static hosting by pointing to the `dist/` output.

**Environment Variables** (set in Railway dashboard):
- Backend: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL` (from Railway PG plugin), `REDIS_URL`, `CORS_ALLOWED_ORIGINS`, `EMAIL_*`
- Frontend: `VITE_API_BASE_URL=https://your-backend.railway.app/api`

### 3.2 Render

Render offers Blueprint deployments from `render.yaml` or manual service setup:

- **Web Service (Backend):** Dockerfile at `./backend`, port `8000`
- **Static Site (Frontend):** Build command `npm run build`, publish directory `dist/`
- **PostgreSQL:** Render's managed Postgres
- **Redis:** Render's managed Redis

---

## 4. Post-Deployment

### 4.1 Initial Setup

```bash
# Create admin user
docker compose exec backend python manage.py createsuperuser

# Set up payment configuration via Django Admin
# Go to: https://yourdomain.com/django-admin/payments/payment/
# Create a Payment with no order (order=None) to set QR code, UPI ID, bank details
```

### 4.2 Database Backups

**Automated daily backup with pg_dump:**

```bash
# Create backup script
cat > /opt/gns/scripts/backup-db.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR=/opt/gns/backups
mkdir -p $BACKUP_DIR
docker compose exec -T postgres pg_dump -U gns_user gns_db | gzip > $BACKUP_DIR/gns-$(date +%Y%m%d-%H%M%S).sql.gz
# Keep only the last 7 days
find $BACKUP_DIR -name "gns-*.sql.gz" -mtime +7 -delete
SCRIPT

chmod +x /opt/gns/scripts/backup-db.sh

# Add to crontab (runs daily at 2 AM)
0 2 * * * /opt/gns/scripts/backup-db.sh
```

### 4.3 Monitoring

Add a proper health check endpoint or use Docker's native health checks. For basic monitoring:

```bash
# Check all containers are running
docker compose ps

# View logs
docker compose logs --tail=100 -f backend
docker compose logs --tail=100 -f nginx

# Resource usage
docker stats
```

For production-grade monitoring, consider:
- **Prometheus + Grafana** for metrics
- **Sentinel** or **Better Stack** for uptime monitoring
- **Papertrail** or **Loki** for log aggregation

---

## 5. Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | Yes | — | Django secret key (generate securely) |
| `DJANGO_DEBUG` | No | `False` | Must be `False` in production |
| `DJANGO_ALLOWED_HOSTS` | Yes | — | Comma-separated allowed hosts |
| `DB_NAME` | Yes | `gns_db` | PostgreSQL database name |
| `DB_USER` | Yes | `gns_user` | PostgreSQL user |
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `DB_HOST` | Yes | `postgres` | PostgreSQL hostname |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `REDIS_URL` | Yes | `redis://redis:6379/0` | Redis connection string |
| `CORS_ALLOWED_ORIGINS` | Yes | — | Comma-separated allowed CORS origins |
| `VITE_API_BASE_URL` | Yes | — | Frontend API base URL |
| `EMAIL_HOST` | No* | — | SMTP host (required for email) |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_HOST_USER` | No* | — | SMTP username |
| `EMAIL_HOST_PASSWORD` | No* | — | SMTP password |
| `EMAIL_USE_TLS` | No | `True` | SMTP TLS flag |
| `DEFAULT_FROM_EMAIL` | No | `GNS <noreply@gns.com>` | Sender email address |

\* Required for OTP email functionality.

---

## 6. Updating

```bash
cd /opt/gns

# Pull latest code
git pull origin main

# Rebuild and restart changed services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Run new migrations
docker compose exec backend python manage.py migrate --noinput

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput --clear

# Prune old images
docker image prune -f
```

---

## 7. Troubleshooting

| Problem | Likely Cause | Solution |
|---|---|---|
| `502 Bad Gateway` | Backend not ready | Wait for migrations, check `docker compose logs backend` |
| `403 Forbidden` | `ALLOWED_HOSTS` mismatch | Ensure your domain is in `DJANGO_ALLOWED_HOSTS` |
| CORS errors in browser | `CORS_ALLOWED_ORIGINS` mismatch | Ensure the frontend origin matches exactly |
| OTP emails not sending | SMTP not configured | Set `EMAIL_*` env vars or check SMTP credentials |
| Static files 404 | `collectstatic` not run | Run `docker compose exec backend python manage.py collectstatic` |
| Media uploads fail | Permission denied | Check `media/` directory ownership |
| Database connection refused | Postgres not healthy | Check `docker compose logs postgres` |
| SSL certificate expired | Renewal failed | Run `certbot renew` and restart nginx |

---

## 8. Security Reminders

- **Never commit** `.env` or `credentials/` to version control (they are already gitignored)
- **Regenerate** `DJANGO_SECRET_KEY` if it's ever exposed
- **Keep** PostgreSQL and Redis ports closed to the internet (internal Docker network only)
- **Use** strong unique passwords for `DB_PASSWORD`
- **Enable** HTTPS with a valid certificate
- **Update** dependencies regularly (`docker compose build --no-cache backend`)
- **Monitor** logs for suspicious activity (failed logins, etc.)
