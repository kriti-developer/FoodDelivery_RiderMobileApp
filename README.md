# FoodExpress Rider — Expo Go App

This workspace now contains an Expo-managed React Native version of the rider app, ready to run in Expo Go. It keeps the same backend contract as the original Android app: REST for fetching and updating orders, plus Socket.IO for realtime updates.

## What changed

- The Expo entrypoint is now at the workspace root (`App.tsx`).
- Session data is stored locally with AsyncStorage instead of Android DataStore.
- The app still uses the same backend endpoints:
  - `GET /api/orders/available`
  - `GET /api/orders`
  - `PATCH /api/orders/:id/status`
  - Socket.IO events: `order:new` and `order:updated`

## Run it in Expo Go

1. Install dependencies.
   - `npm install`
2. Start the dev server.
   - `npm start`
3. Open the QR code with Expo Go on your phone.

If the backend is not on the same machine, update the API base URL in `app.json` under `expo.extra.apiBaseUrl`.

## Backend URL

The Expo app defaults to `http://192.168.0.5:4000` because Expo Go needs a reachable LAN address. Change it to your computer's current LAN IP if needed.

## Notes

- The old native Android source is still in the repo, but Expo Go uses the new root-level JS app.
- If you want the QR to work on a physical phone, the phone and computer must be on the same Wi-Fi network.
