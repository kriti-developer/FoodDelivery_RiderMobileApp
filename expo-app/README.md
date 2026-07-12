# FoodExpress Rider — Rider App (Expo / React Native)

A React Native (Expo) rider app, matching the stack of the
[FoodExpress customer app](https://github.com/kriti-developer/FoodDelivery_CustomerMobileApp)
exactly. Talks to the same backend
([`Tejas-gh/realtime-food-ordering`](https://github.com/Tejas-gh/realtime-food-ordering))
over REST + Socket.IO.

This is the React Native rewrite of the native Android (Kotlin) version that
lives at the repo root — kept for reference, but this is the one to use
day-to-day since it runs via Expo Go with no native build tooling needed.

## Tech Stack

Mirrors the customer app:

- **Expo SDK 54** (React Native 0.81, React 19)
- **JavaScript** (no TypeScript)
- **React Navigation v6** — stack + bottom tab navigation
- **React Context** — global app state (rider profile, orders)
- **AsyncStorage** — rider profile, active-order id, delivered-order history
- **Socket.IO client** — live updates for available deliveries

## Rider Identity (Real Backend Accounts)

Riders are real accounts, backed by a `Rider` collection on the backend.
Sign up hits `POST /api/auth/rider-signup` (name, phone, password — password
is hashed server-side with scrypt, never stored or returned in plaintext),
login hits `POST /api/auth/rider-login`. Both return a bearer token, stored
on-device (AsyncStorage) and sent as `Authorization: Bearer <token>` on
every order-mutating request.

## Known Backend Gaps This App Works Around

- There's still no "my orders" endpoint — this app tracks its own
  accepted-order id and delivered-order history **locally** (AsyncStorage),
  then hydrates the full order objects from `GET /api/orders` by id.
- No rider location tracking endpoint exists, so there's no live location
  feature — "Navigate" just opens Google Maps via a URL, no backend
  involved.

`POST /api/orders/:id/accept` now works correctly: it requires a rider
bearer token, sets the order's `status` to `"confirmed"` (previously it set
an invalid enum value and always 500'd), and records `order.rider` as the
accepting rider — so acceptance is now genuinely tracked server-side, not
just locally. `PATCH /api/orders/:id/status` also requires a rider token and
rejects (403) any rider trying to advance an order they didn't accept.

## Connecting to the Backend

Edit `src/config.js`:

```js
export const API_BASE = "http://<your-backend-host>:<port>";
```

Use your computer's **LAN IP** (the same one you use for the Expo URL,
`exp://<IP>:8081`) — not `localhost`, since on a physical phone that means
the phone itself. Should match whatever the customer app's `src/config.js`
is pointed at.

## Running the App

```
npm install
npx expo start
```

Then, same as the customer app:

- **Phone (easiest):** install **Expo Go** (App Store / Play Store), make
  sure the phone is on the same Wi-Fi as your computer, and scan the QR
  code Metro prints.
- **Android emulator:** press `a` in the terminal.
- **Can't connect from your phone?** stop the server and run
  `npx expo start --tunnel` instead.

## Project Structure

```
App.js
src/
  config.js                  API_BASE
  theme/colors.js             Same palette as the customer app
  components/PrimaryButton.js
  context/RiderContext.js     Profile, available/active/history orders, socket
  navigation/index.js         Login vs main tab navigator
  screens/
    LoginScreen.js             Phone/password login (real backend account)
    SignupScreen.js             Name/phone/password sign up (real backend account)
    DeliveriesScreen.js        Available list, or active delivery detail
    HistoryScreen.js           Locally tracked delivered orders
    ProfileScreen.js           Rider info + log out
  utils/orderStatus.js         Status labels + next-status transitions
```

## Golden Path

1. Sign up (or log in) with a name, phone number, and password on first launch.
2. Place an order from the customer app — it appears under Available
   Deliveries in real time (Socket.IO `order:new`).
3. Tap "Accept delivery" — it becomes your Active Delivery and disappears
   from other riders' lists.
4. Advance the status (Preparing → On the way → Delivered). "Navigate"
   opens Google Maps to the restaurant or customer address depending on
   stage.
5. Once delivered, it moves into History.
