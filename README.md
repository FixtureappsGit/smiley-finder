# 😊 SmileyID — Child Safety Identification Platform

A complete parent portal + QR/NFC tag management + public emergency profile system.
Parents register their children, request physical or digital QR/NFC tags, and anyone who
finds a child can scan the tag to immediately see emergency contacts — no app, no login needed.

---

## Architecture

```
Parent Portal (React)  ──HTTPS──▶  Django REST API  ──▶  PostgreSQL
                                          │
                                 ┌────────┴────────┐
                              QR Service      Emergency Profile
                                          │
                                    QR / NFC Tag
                                    (scanned publicly)
```

---

## Tech Stack

| Layer       | Technology                                 |
|-------------|--------------------------------------------|
| Frontend    | React 18 + Vite + Tailwind CSS             |
| Backend     | Django 6 + Django REST Framework           |
| Auth        | JWT (djangorestframework-simplejwt)        |
| Database    | PostgreSQL (SQLite for local dev)          |
| QR codes    | qrcode[pil] — generated server-side        |
| Containers  | Docker + docker-compose                    |

---

## Quick Start (Local — no Docker)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and edit environment
cp .env.example .env              # SQLite is the default — no changes needed for dev

python manage.py migrate
python manage.py createsuperuser  # follow the prompts
python manage.py runserver        # → http://localhost:8000
```

### Frontend

```bash
cd frontend
cp .env.example .env              # already points to http://localhost:8000/api

# Node 18+ required — install via fnm / nvm / brew / apt
npm install
npm run dev                       # → http://localhost:5173
```

---

## Quick Start (Docker)

```bash
# From the project root (where docker-compose.yml lives)
cp backend/.env.example backend/.env     # edit SECRET_KEY for production

docker compose up --build
```

| Service   | URL                         |
|-----------|-----------------------------|
| Frontend  | http://localhost:5173       |
| Backend   | http://localhost:8000       |
| Django Admin | http://localhost:8000/django-admin/ |

The first `docker compose up` automatically runs `migrate`. To create a superuser inside Docker:

```bash
docker compose exec backend python manage.py createsuperuser
```

---

## User Journey

```
Parent
  ├── Register (email + mobile + password)
  ├── Verify email OTP
  ├── Add Child → emergency profile
  ├── Request NFC + QR tag
  └── Download QR → print → school bag / shoe / ID card

Someone finds child
  └── Scan QR ──▶ /e/<child_id>?tag=<tag_id>
                   ├── Child's first name
                   ├── Communication type
                   ├── Emergency contacts (tap to call)
                   ├── Special instructions / allergies
                   └── "I found this child" button (notifies parent)
```

---

## API Reference

All endpoints are prefixed `/api/`.

### Auth  `POST /api/auth/`

| Method | Path                | Auth | Description             |
|--------|---------------------|------|-------------------------|
| POST   | `register/`         | —    | Create parent account   |
| POST   | `login/`            | —    | Get JWT tokens          |
| POST   | `token/refresh/`    | —    | Refresh access token    |
| POST   | `logout/`           | JWT  | Blacklist refresh token |
| POST   | `verify-otp/`       | —    | Verify email/mobile OTP |
| POST   | `resend-otp/`       | —    | Resend OTP code         |
| GET    | `me/`               | JWT  | My profile              |
| PATCH  | `me/`               | JWT  | Update profile          |
| POST   | `change-password/`  | JWT  | Change password         |

### Children  `/api/children/`

| Method      | Path                           | Description                   |
|-------------|--------------------------------|-------------------------------|
| GET         | `/`                            | List my children               |
| POST        | `/`                            | Add child                     |
| GET/PATCH   | `/<id>/`                       | Get / update child            |
| DELETE      | `/<id>/`                       | Soft-delete child             |
| PATCH       | `/<id>/privacy/`               | Update public visibility flags |
| GET/POST    | `/<id>/contacts/`              | List / add emergency contacts |
| GET/PATCH   | `/<id>/contacts/<contact_id>/` | Get / update contact          |

### Tags  `/api/tags/`

| Method | Path                | Description                     |
|--------|---------------------|---------------------------------|
| POST   | `request/`          | Request new tag + generate QR   |
| GET    | `/`                 | List all my tags                |
| GET    | `/<id>/`            | Tag detail                      |
| POST   | `/<id>/report/`     | Report lost / deactivate        |
| GET    | `/<id>/events/`     | Tag lifecycle audit trail       |
| GET    | `/<id>/scans/`      | Scan history                    |

### Emergency  `/api/emergency/`  *(no auth)*

| Method | Path               | Description                            |
|--------|--------------------|----------------------------------------|
| GET    | `/<child_id>/`     | Public emergency profile               |
| POST   | `record-scan/`     | Attach opt-in location to latest scan  |

### Admin  `/api/admin/stats/`  *(staff only)*

Returns: parents, children, active_tags, qr_scans_today, tags_requested, lost_deactivated, pending_orders.

---

## Tag Lifecycle

```
Requested → Generated → Activated → Active → Lost / Deactivated → Replaced
```

- Parent requests a tag → QR is generated immediately (status: `generated`).
- Admin activates physical tags via Django Admin (status: `active`).
- Parent can report a tag lost at any time — QR stops working instantly.
- Parent can then request a replacement.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable               | Default                          | Description                        |
|------------------------|----------------------------------|------------------------------------|
| `SECRET_KEY`           | insecure dev key                 | Django secret key                  |
| `DEBUG`                | `True`                           | Debug mode                         |
| `ALLOWED_HOSTS`        | `*`                              | Comma-separated allowed hosts      |
| `DATABASE_URL`         | SQLite                           | PostgreSQL connection string       |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173`          | Allowed frontend origins           |
| `SITE_BASE_URL`        | `http://localhost:5173`          | Base URL embedded in QR codes      |
| `OTP_EXPIRY_MINUTES`   | `10`                             | OTP validity window                |

### Frontend (`frontend/.env`)

| Variable        | Default                        | Description          |
|-----------------|--------------------------------|----------------------|
| `VITE_API_URL`  | `http://localhost:8000/api`    | Backend API base URL |

---

## Default Credentials (dev)

| Role         | Email                  | Password    |
|--------------|------------------------|-------------|
| Superuser    | admin@smileyid.in      | admin1234   |

Change these immediately in any non-local environment.

---

## Privacy Model

Parents control what appears on the public emergency page:

| Field                  | Default public |
|------------------------|----------------|
| Child first name       | ✅ Yes         |
| Photo                  | ✅ Yes         |
| Communication type     | ✅ Yes         |
| Special instructions   | ✅ Yes         |
| Preferred language     | ✅ Yes         |
| Allergies              | ❌ No          |
| Medical info           | ❌ No          |

No government IDs, full addresses, or school names are stored anywhere in the system.

---

## Project Structure

```
app/
├── docker-compose.yml
├── .gitignore
├── README.md
│
├── backend/
│   ├── smileyfinder/       # Django project (settings, urls, wsgi)
│   ├── accounts/           # Custom User, OTP verification, JWT auth
│   ├── children/           # Child profiles, EmergencyContact
│   ├── tags/               # Tag, TagEvent, ScanLog, Order
│   ├── emergency/          # Public emergency profile API (no auth)
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── auth/       # Login, Register, VerifyOtp
    │   │   ├── portal/     # Dashboard, ChildDetail, Tags, RequestTag…
    │   │   ├── public/     # EmergencyPage (no login)
    │   │   └── admin/      # AdminDashboard
    │   ├── context/        # AuthContext (JWT session)
    │   ├── lib/            # api.js (axios + auto-refresh)
    │   ├── layouts/        # PortalLayout (nav + outlet)
    │   └── components/     # ui: FormField, Alert, Modal, Spinner
    ├── Dockerfile
    ├── nginx.conf
    └── .env.example
```
