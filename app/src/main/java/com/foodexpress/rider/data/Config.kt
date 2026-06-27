package com.foodexpress.rider.data

// Point this at the backend's LAN IP - the same one the customer app's
// src/config.js uses. Can't be "localhost" on a physical device, since
// that means the device itself, not your computer.
object Config {
    const val API_BASE = "http://192.168.0.5:4000"
}
