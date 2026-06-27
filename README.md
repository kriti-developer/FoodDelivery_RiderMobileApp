# FoodExpress Rider — Rider App (Native Android)

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

## Connecting to the Backend

Edit `app/src/main/java/com/foodexpress/rider/data/Config.kt`:

```kotlin
object Config {
    const val API_BASE = "http://<your-backend-host>:<port>"
}
```

Use your computer's **LAN IP**, not `localhost` — on a physical device,
`localhost` means the device itself. This should match whatever the
customer app's `src/config.js` is already pointed at, since both apps talk
to the same backend instance.

## Running the App

1. Open this folder in Android Studio (Gradle sync will fetch dependencies
   automatically).
2. Make sure the backend is running: `cd backend && npm install && npm run
   seed && npm start` (in the backend repo).
3. Run the app on an emulator or a device on the same network as the
   backend.

## Project Structure

```
app/src/main/java/com/foodexpress/rider/
  data/
    Config.kt                 API_BASE
    model/Order.kt             Order/Restaurant/Customer/MenuItem + status helpers
    remote/ApiService.kt       Retrofit endpoints
    remote/RetrofitClient.kt
    remote/SocketManager.kt     order:new / order:updated listener
    local/RiderPreferences.kt   DataStore: rider name/phone, active order id, history ids
    repository/OrderRepository.kt
    ServiceLocator.kt           Manual DI (no Hilt - app is small)
  ui/
    login/                     Local-only name entry
    main/MainScreen.kt          Bottom nav: Deliveries / History / Profile
    deliveries/                Available list + Active delivery detail
    history/                   Locally tracked delivered orders
    profile/                   Rider info + log out
    theme/                     Matches the customer app's color palette
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
