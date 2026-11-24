# Taantira Backend (Express + Sequelize + MySQL + Socket.IO)

Private backend repository (`taantira-backend`) for the Taantira women's fashion eCommerce platform.

## 1. Free & Open-Source Stack

- **Runtime**: Node.js LTS (CommonJS JavaScript)
- **Framework**: Express.js, Helmet, CORS, express-rate-limit, cookie-parser, Multer 2.x
- **Database**: MySQL Community Edition + Sequelize ORM + `mysql2` + `sequelize-cli`
- **Validation**: Yup
- **Auth**: JWT + bcryptjs + rotated hashed refresh tokens
- **Real-Time**: Socket.IO (authenticated rooms for customers, delivery partners, and admin fleet map)

## 2. Local Development Setup

```bash
cd backend
npm install
cp .env.example .env
# Update DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env
```

Create the MySQL database (`taantira_db`) in MySQL Community Edition, then run migrations & seeders:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Backend runs at `http://localhost:5000`.
Health check: `GET http://localhost:5000/api/health` -> `{"success": true, "message": "Taantira API is running"}`.

## 3. Seeded Test Accounts

- **Super Admin**: `admin@taantira.com` / `TaantiraAdmin@2026`
- **Catalogue Manager**: `catalogue@taantira.com` / `TaantiraAdmin@2026`
- **Order Manager**: `orders@taantira.com` / `TaantiraAdmin@2026`
- **Finance Manager**: `finance@taantira.com` / `TaantiraAdmin@2026`
- **Customer**: `ananya@taantira.com` / `TaantiraUser@2026`
- **Approved Delivery Partner**: `rider@taantira.com` / `TaantiraRider@2026`
- **Pending Delivery Partner**: `pending.rider@taantira.com` / `TaantiraRider@2026`

## 4. Storage, Map Routing & Hosting Trade-Offs

### Binary Media Storage (`media_files` table)
- Initial catalog assets live locally in `frontend/public/assets/`.
- Because serverless platforms (such as Vercel) have ephemeral filesystems, admin-uploaded images are stored optionally in the MySQL `media_files` `LONGBLOB` table (`POST /api/media/upload`, served via `GET /api/media/:id`) with magic-byte validation and a 2 MB per-file cap.
- **Trade-off**: Storing blobs in MySQL avoids third-party S3/Cloudinary subscriptions and persists across restarts, at the cost of increased database backup size and memory usage under high traffic. For high-scale commercial production, self-hosted object storage (such as MinIO on your own VPS) is recommended.

### Maps & Routing
- Maps use Leaflet + MapLibre GL + OpenFreeMap public vector style endpoint (`https://tiles.openfreemap.org/styles/liberty`) with OpenStreetMap attribution. OpenFreeMap requires no API key and is best-effort without an SLA.
- Optional route geometry uses self-hosted OSRM (`OSRM_BASE_URL` in `.env`). Public demo OSRM servers are never used; when `OSRM_BASE_URL` is unset, only live marker coordinates and timestamps are shown without inventing distance or ETA.

### Hosting & Zero-Cost Compliance Notice
- `vercel.json` is included for Express + Vercel compatibility, **however Vercel's Hobby plan is strictly limited to non-commercial/personal use**.
- Do **not** host a commercial Taantira store on Vercel Hobby. For commercial production, select a paid commercial plan or self-host on a VPS/cloud instance alongside MySQL Community Edition, and factor in real database storage, bandwidth, and uptime requirements.
