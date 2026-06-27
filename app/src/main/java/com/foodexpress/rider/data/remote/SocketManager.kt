package com.foodexpress.rider.data.remote

import com.foodexpress.rider.data.Config
import com.foodexpress.rider.data.model.Order
import com.google.gson.Gson
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

sealed class OrderSocketEvent {
    data class New(val order: Order) : OrderSocketEvent()
    data class Updated(val order: Order) : OrderSocketEvent()
}

object SocketManager {
    private val gson = Gson()
    private var socket: Socket? = null

    fun events(): Flow<OrderSocketEvent> = callbackFlow {
        val s = IO.socket(Config.API_BASE)
        socket = s

        s.on("order:new") { args ->
            parseOrder(args)?.let { trySend(OrderSocketEvent.New(it)) }
        }
        s.on("order:updated") { args ->
            parseOrder(args)?.let { trySend(OrderSocketEvent.Updated(it)) }
        }

        s.connect()

        awaitClose {
            s.off("order:new")
            s.off("order:updated")
            s.disconnect()
            socket = null
        }
    }

    private fun parseOrder(args: Array<out Any?>): Order? {
        val json = args.firstOrNull()?.toString() ?: return null
        return runCatching { gson.fromJson(json, Order::class.java) }.getOrNull()
    }
}
