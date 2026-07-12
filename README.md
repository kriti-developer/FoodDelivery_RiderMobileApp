# FoodExpress Rider

Three implementations of the rider app live in this repo:

- **[`expo-app/`](expo-app/) — React Native (Expo, JavaScript).** Matches
  the customer app's stack exactly, runs via Expo Go on your phone with no
  native build tooling, and is what we switched to after the native
  Android build kept hitting environment issues (no Android SDK/Studio
  installed initially, then a recurring Gradle/OneDrive file-lock
  conflict). See [`expo-app/README.md`](expo-app/README.md) for setup.
- **Root-level Expo app (`App.tsx`, `src/`) — React Native (Expo,
  TypeScript).** A separate Expo rewrite, built independently from the one
  above. See "Root-level Expo App" below for setup.
- **Native Android (Kotlin), also at the repo root.** Kept for reference.
  See "Native Android" below for its original documentation.

If you're picking up this repo fresh, check with whoever's been working on
it last to see which of the two Expo apps is the current one to build on —
right now both exist side by side.

---

# Root-level Expo App (TypeScript)

This workspace also contains an Expo-managed React Native version of the
rider app, ready to run in Expo Go. It keeps the same backend contract as
the original Android app: REST for fetching and updating orders, plus
Socket.IO for realtime updates.

## What changed

- The Expo entrypoint is at the workspace root (`App.tsx`).
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

- The old native Android source is still in the repo. This app also lives at the repo root, alongside it.
- If you want the QR to work on a physical phone, the phone and computer must be on the same Wi-Fi network.

---

# Native Android (Kotlin)

A native Android (Kotlin, Jetpack Compose) app for delivery riders, the
companion to the [FoodExpress customer app](https://github.com/kriti-developer/FoodDelivery_CustomerMobileApp).
Talks to the same backend ([`Tejas-gh/realtime-food-ordering`](https://github.com/Tejas-gh/realtime-food-ordering))
over REST + Socket.IO.

## Tech Stack

- Kotlin, Jetpack Compose, Material 3
- MVVM: Repository (Retrofit/OkHttp + `socket.io-client`) → ViewModel (`StateFlow`) → Compose screens
- Jetpack DataStore for on-device session (no auth backend exists, same as the customer app)
- Jetpack Navigation Compose

## Rider Identity (Local Only)

There is no rider-auth endpoint on the backend, so logging in just saves a
name (and optional phone) on-device — same approach the customer app takes
for its own auth. No account is created server-side.

## Known Backend Gaps This App Works Around

- `Order.rider` is never actually populated by the backend, and there's no
  "my orders" endpoint — this app tracks its own accepted-order id and a
  delivered-order history **locally** (DataStore) instead.
- `POST /api/orders/:id/accept` is currently broken: it sets
  `order.status = "accepted"`, which isn't a valid value in the `Order`
  schema's `status` enum, so it always fails with a 500. Confirmed by
  validating the schema directly. **This app accepts a delivery via `PATCH
  /api/orders/:id/status` with `status: "confirmed"` instead**, which is a
  real, working transition.
- No rider location tracking endpoint exists, so this app has no live
  location feature (the "Navigate" button just opens Google Maps via an
  intent — no backend involved).

## Running the App

This machine has no Android development tools installed yet, so start from
scratch:

### 1. Install Android Studio (one-time)

Download and install Android Studio from
[developer.android.com/studio](https://developer.android.com/studio). You do
**not** need to install Java separately — Android Studio bundles its own. On
first launch, its setup wizard installs the Android SDK and a default
emulator image for you.

### 2. Open this project

1. Launch Android Studio → **Open** → select this folder
   (`PS_RiderApp`).
2. Wait for **Gradle sync** to finish (watch the status bar at the bottom).
   The first sync downloads all dependencies and can take several minutes —
   keep an internet connection on. If it fails, copy the exact error and
   send it to me; dependency versions are the most likely thing to need a
   small fix since this was written without a compiler available to test it.

### 3. Get a device to run on

Pick one:

- **Emulator (easiest, no phone needed):** in Android Studio, go to **Tools
  → Device Manager → Create Device**, pick any phone (e.g. Pixel 8), pick a
  system image (any recent one, e.g. API 34+, downloading it if prompted),
  then **Finish**. Select it from the device dropdown in the toolbar.
- **Physical Android phone:** enable Developer Options (**Settings → About
  phone** → tap "Build number" 7 times), then enable **USB debugging**
  (**Settings → Developer options**), then connect the phone via USB and
  accept the "Allow USB debugging" prompt on the phone screen.

### 4. Start the backend

In the backend repo (`Tejas-gh/realtime-food-ordering`):

```
cd backend
npm install
npm run seed
npm start
```

Leave this running in its own terminal — it listens on port 4000 by default.

### 5. Point the app at the backend

Edit `app/src/main/java/com/foodexpress/rider/data/Config.kt`:

```kotlin
object Config {
    const val API_BASE = "http://<host>:<port>"
}
```

- **Using the emulator:** use `http://10.0.2.2:4000` — `10.0.2.2` is the
  emulator's special alias for your computer's own `localhost`, so no IP
  lookup needed.
- **Using a physical phone:** use your computer's **LAN IP** instead, e.g.
  `http://192.168.0.5:4000`. Find it on Windows with `ipconfig` → "IPv4
  Address" under your active Wi-Fi adapter. The phone and computer must be
  on the same Wi-Fi network. This should match whatever the customer app's
  `src/config.js` is already pointed at, since both apps talk to the same
  backend instance.

### 6. Run

With your device selected in the toolbar dropdown, click the green ▶ **Run**
button (or press Shift+F10). The first build can take a few minutes.

### Troubleshooting

- **"Available deliveries" stays empty, or shows an error:** double-check
  `Config.kt`'s host/port, and confirm the backend's terminal shows it's
  running and reachable.
- **Physical phone can't connect:** check that Windows Firewall isn't
  blocking inbound connections on port 4000, and that the phone is on the
  same Wi-Fi network as the computer.
- **Gradle sync fails:** almost always a dependency-version mismatch — send
  me the exact error text and I'll fix `gradle/libs.versions.toml`.

## Project Structure

```
app/src/main/java/com/foodexpress/rider/
  data/
    Config.kt                  API_BASE
    model/Order.kt              Order/Restaurant/Customer/MenuItem + status helpers
    remote/ApiService.kt        Retrofit endpoints
    remote/RetrofitClient.kt
    remote/SocketManager.kt      order:new / order:updated listener
    local/RiderPreferences.kt    DataStore: rider name/phone, active order id, history ids
    repository/OrderRepository.kt
    ServiceLocator.kt            Manual DI (no Hilt - app is small)
  ui/
    login/                      Local-only name entry
    main/                       MainScreen.kt (bottom nav) + OrdersViewModel.kt (shared state)
    deliveries/                 Available list + Active delivery detail
    history/                   Locally tracked delivered orders
    profile/                    Rider info + log out
    theme/                      Matches the customer app's color palette
```

## Golden Path

1. Enter a rider name on first launch.
2. Place an order from the customer app — it appears under Available
   Deliveries in real time (Socket.IO `order:new`).
3. Tap "Accept delivery" — it becomes your Active Delivery and disappears
   from other riders' lists.
4. Advance the status (Preparing → On the way → Delivered). "Navigate"
   opens Google Maps to the restaurant or customer address depending on
   stage.
5. Once delivered, it moves into History.
