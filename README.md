# SafeReport – Anonymous Crime Reporting System

Spring Boot + React.js + MongoDB. Citizens report crimes **without an account**, upload evidence, and track
the case with a private code. Police officers and admins log in to review, reply and manage cases.

```
React (Vite / nginx)  ──/api──>  Spring Boot (JWT, role-based)  ──>  MongoDB
                                         └── evidence files (private volume, never served publicly)
```

## Run with Docker

```bash
docker compose up --build
```

| What | URL |
|---|---|
| App | http://localhost:3001 |
| Backend API | http://localhost:8082 |

(Ports 3001/8082 are chosen so it can run next to other projects. Change them in `docker-compose.yml`.)

## Run without Docker

Requires Java 17, Maven, Node 18+, MongoDB on localhost:27017.

```bash
cd backend  && mvn spring-boot:run          # port 8080
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Demo staff accounts (created on first start – change before real use)

| Role | Email | Password |
|---|---|---|
| Admin | admin@safereport.com | admin123 |
| Officer | officer@safereport.com | officer123 |

Citizens need no account.

## Try the full flow

1. Open the app → **Report a crime**, fill the form, attach a photo/PDF/MP4, submit.
2. **Save the tracking code** (shown once, e.g. `K7QM-4XRD-9HNP`).
3. Log in as the officer (**Staff login**) → open the report → view evidence → set status/priority → reply to the reporter.
4. As the citizen go to **Track a report**, enter the code, see the status and the officer's reply, and answer back.
5. Log in as admin → **Admin** for statistics, create/deactivate officers; assign reports from a report's page.

## Evidence: camera, photos, videos and PDFs

On the report form the citizen can:
* **Take photo**: opens an in-browser camera (front/back switch, review, retake).
  Photos are exported from a canvas, so they contain no EXIF/GPS data at all.
* **Record video**: records up to 60 s with microphone (WebM, or MP4 on Safari), with review and retake.
* **Upload files**: JPG, PNG (images), MP4, MOV, WebM (videos) and PDF documents.

Up to 8 files, 50 MB each, 150 MB per report. The server validates the file content as well as the extension.
JPG/PNG are re-encoded (metadata removed); videos and PDFs are stored unchanged and the form says so.
Officers see image thumbnails, a video player and a PDF viewer link, each with a Download link.

The camera needs **HTTPS or http://localhost** and the browser's camera permission. If it is unavailable, **Upload files**
still works (on a phone it also offers "Take photo" through the system camera app).

## Live location sharing and live maps

**Citizen:** after submitting (or later on the *Track* page) the reporter can tap **Start sharing my location**.
The browser sends a GPS fix every ~6 seconds while the page stays open. Sharing is opt-in, can be stopped at
any time, and **Stop and erase my location history** deletes the saved position and trail.

**Officer / Admin:**
* On a case page, a **Live location** map shows the reporter's position, accuracy circle and trail, refreshed every 5 s.
* **Live map** in the top bar shows every reporter who is sharing right now, colour-coded by priority
  (officers see unassigned cases plus their own; admins see all).
* If nobody has shared yet, **Ask the reporter to share it** sends a ready-made message through the anonymous chat.

### Testing live location on one computer

Browsers **pause geolocation for hidden tabs and fully covered windows**, so if the citizen page is in a background
tab (or behind the officer window) its position stops changing. To test properly:

1. Open the citizen page and the officer page in **two separate windows placed side by side** (both visible), or use your **phone** for the citizen page (needs HTTPS or a USB-forwarded `localhost`).
2. A desktop has no GPS, so the position stays put. To simulate movement: in the citizen window press **F12 → ⋮ → More tools → Sensors → Location**, choose a city (or enter coordinates) and change it every few seconds. The red dot and the trail on the officer map move with it.
3. The citizen panel shows the exact position being sent, when it was last sent and how many updates went out. If those numbers grow but the officer's map doesn't change, the problem is on the officer side. If the numbers don't grow, the browser isn't producing positions.

Notes:
* Browsers only allow geolocation on **HTTPS or http://localhost**. Over a plain-HTTP LAN address it will not work.
* Maps use OpenStreetMap tiles (needs internet, no API key). For heavy production use, switch to a commercial tile provider.
* A location can identify a person, so the form tells the reporter this before they opt in.
* Storage: latest position + last 300 points per report, updated atomically; the live flag turns to "Signal lost" after 60 s without updates.

## Privacy and security design

| Concern | How it is handled |
|---|---|
| Reporter identity | No accounts, no names/emails/phones collected. |
| Tracking code | 12 random characters (SecureRandom). Only its **SHA-256 hash** is stored; it cannot be recovered or looked up by admins. |
| Code in URLs/logs | Tracking uses `POST` with a JSON body, never a URL. |
| Photo metadata | JPG/PNG are re-encoded server-side, which strips EXIF (GPS, device, time). Original file names are never stored. Videos/PDFs are stored unchanged (the UI warns about this). Photos taken with the in-app camera carry no metadata. |
| File validation | Extension whitelist (JPG, PNG, PDF, MP4, MOV, WebM) plus content checks (valid image / `%PDF-` / video container header); 50 MB per file, 8 files. |
| Evidence access | Stored outside any public folder. Served only through an authenticated endpoint to staff who may access that report. |
| IP addresses | Never stored with reports. Tomcat and nginx access logs are disabled. A small in-memory rate limiter (spam/brute-force protection) holds IPs only until its time window expires. |
| Staff auth | BCrypt passwords, JWT (8 h), roles `OFFICER` / `ADMIN`. Accounts are re-checked in the DB on every request, so deactivating an officer takes effect immediately. |
| Access control | Officers see unassigned reports and their own; admins see all. Officer names and internal notes are never shown to reporters. |
| Rate limits | 10 submissions/hour/IP, 30 tracking lookups/10 min/IP, 10 logins/10 min/IP, 200 location updates/10 min/IP. |

### Before a real deployment

* Set `JWT_SECRET` (32+ chars) and change/remove the demo accounts.
* Serve over **HTTPS** (put a TLS-terminating proxy in front).
* Back up the MongoDB and `evidence` volumes, and consider encrypting them at rest.
* Anonymity from the network level (IP, device) also depends on the hosting environment and the reporter's connection. Tor or a trusted network gives stronger protection.

## REST API

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/public/reports` (multipart: category, title, description, location, incidentDate, files) | anyone |
| POST | `/api/public/track` `{code}` | anyone with the code |
| POST | `/api/public/track/message` `{code, text}` | anyone with the code |
| POST | `/api/auth/login` | staff |
| GET | `/api/officer/reports`, `/api/officer/reports/{id}` | officer, admin |
| PUT | `/api/officer/reports/{id}/claim`, `/status` | officer, admin |
| POST | `/api/officer/reports/{id}/messages`, `/notes` | officer, admin |
| GET | `/api/officer/evidence/{reportId}/{file}` | officer, admin |
| GET/POST | `/api/admin/officers`, PUT `/api/admin/officers/{id}/active` | admin |
| PUT | `/api/admin/reports/{id}/assign` | admin |
| GET | `/api/admin/stats` | admin |
| POST | `/api/public/track/location` `{code, lat, lng, accuracy}` | anyone with the code (opt-in) |
| POST | `/api/public/track/location/stop` `{code, erase}` | anyone with the code |
| GET | `/api/officer/reports/{id}/location` | officer, admin |
| GET | `/api/officer/live` | officer, admin |

Report status flow: `SUBMITTED → UNDER_REVIEW → INVESTIGATING → RESOLVED` (or `REJECTED`).

## Project structure

```
safereport/
├── backend/    Spring Boot: controllers, services, models, JWT + rate-limit filters
├── frontend/   React + Vite: public pages (report, track) and staff pages (dashboard, case, admin)
└── docker-compose.yml
```
#   s a f e r e p o r t  
 #   s a f e r e p o r t  
 