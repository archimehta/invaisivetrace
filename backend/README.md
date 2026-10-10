# Local API and PocketBase

The API runs on the team laptop, authenticates to PocketBase as a local superuser, creates the needed collections, loads the bundled catalog, and serves the app's report API. Keep both devices on the same trusted Wi-Fi.

## 1. Start PocketBase

Download the current PocketBase executable from [pocketbase.io](https://pocketbase.io/), then run it so phones on the LAN can reach it:

```sh
./pocketbase serve --http=0.0.0.0:8090
```

Open `http://127.0.0.1:8090/_/`, create a local superuser, and keep the dashboard open for moderation. The API creates locked `species` and `reports` collections on first start. Do not expose PocketBase's port publicly.

## 2. Configure and start the API

```sh
cd backend
npm install
cp .env.example .env
```

Set `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD` in `backend/.env`. Add `GEMINI_API_KEY` to enable photo identification; leave it blank to use manual search/name entry. `GEMINI_MODEL` can override the default model. Then run:

```sh
npm start
```

The API listens on port 8787. Check `http://127.0.0.1:8787/api/health`. Find the laptop's LAN IP and put `http://<laptop-lan-ip>:8787` in the root `.env` as `EXPO_PUBLIC_API_URL` before starting Expo.

## API routes

- `GET /api/health` — readiness, catalog count, Gemini availability.
- `GET /api/species?search=...` — FISC species search.
- `GET /api/reports` — public-safe report projection (no raw precise coordinates when consent is off).
- `POST /api/identify` — multipart `photo`; asks Gemini for tentative JSON identification.
- `POST /api/reports` — multipart photo, confirmed plant name, location, optional note, exact-location consent.
- `GET /api/files/:id/:filename` — image proxy for saved report photos.

New reports are created with status `unverified`. Review/edit them in PocketBase at `http://127.0.0.1:8090/_/`. The local Node service must remain running for report submissions and map sync.

## Local demo security

This prototype is for a private hackathon LAN. The API accepts anonymous reports and has permissive CORS for Expo Go; it does not include abuse prevention or public deployment protections. Use a dedicated local PocketBase superuser, never commit `.env`, and keep the service off untrusted/public networks.
