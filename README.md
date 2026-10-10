# Spot the Spread

Expo React Native app for photo-assisted reporting of possible invasive plant sightings in Orange County, Florida. Gemini suggestions are tentative. The bundled catalog includes all 179 FISC Category I and II plants from the April 2026 list. A plant missing from that list can still be submitted as a possible unlisted invasive for review.

## Start the app

1. Install Node.js 20.19+ and Expo Go on your test phone.
2. Install app dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the laptop's LAN IP and port, for example `http://192.168.1.10:8787`.
4. Follow [backend setup](backend/README.md), then start Metro with `npx expo start --lan`.
5. Scan the QR code in Expo Go. Keep the phone and laptop on the same Wi-Fi.

## Main flow

1. Photograph or upload a plant.
2. Ask Gemini for a tentative identification (optional); confirm it, pick another catalog plant, or enter an unlisted name.
3. See whether the name matches the FISC list. An unmatched name is not called non-invasive.
4. Confirm the pin and public-location preference, then submit.
5. The community map displays the report as **unverified** until a moderator reviews it in PocketBase.

The app requires a photo for a report. If Gemini is unset or unavailable, manual catalog selection or name entry still works. Report submission and map sync require the local backend.

## Architecture

PocketBase stores the catalog, reports, photos, and review status. A small Node API sits in front of it, keeps the Gemini key off the phone, and returns only public-safe map coordinates. Precise coordinates remain available to moderators; public coordinates are generalized unless the reporter opts into exact display.

See [backend/README.md](backend/README.md) for service setup and [data/README.md](data/README.md) for catalog provenance and refresh.
