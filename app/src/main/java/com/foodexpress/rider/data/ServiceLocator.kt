package com.foodexpress.rider.data

import android.content.Context
import com.foodexpress.rider.data.local.RiderPreferences
import com.foodexpress.rider.data.remote.RetrofitClient
import com.foodexpress.rider.data.repository.OrderRepository

// Small hand-rolled DI container - the app is too small to justify Hilt.
object ServiceLocator {
    private var prefs: RiderPreferences? = null
    private var repository: OrderRepository? = null

    fun riderPreferences(context: Context): RiderPreferences =
        prefs ?: RiderPreferences(context.applicationContext).also { prefs = it }

    fun orderRepository(context: Context): OrderRepository =
        repository ?: OrderRepository(RetrofitClient.api, riderPreferences(context)).also { repository = it }
}
