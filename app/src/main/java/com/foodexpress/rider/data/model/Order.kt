package com.foodexpress.rider.data.model

import com.google.gson.annotations.SerializedName

data class Order(
    @SerializedName("_id") val id: String,
    val orderId: String? = null,
    val customer: Customer,
    val restaurant: Restaurant,
    val items: List<OrderItem> = emptyList(),
    val totalPrice: Double = 0.0,
    val status: String,
    val rider: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

data class Customer(
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
)

data class Restaurant(
    @SerializedName("_id") val id: String,
    val name: String,
    val cuisine: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val emoji: String? = null,
)

data class OrderItem(
    val menuItem: MenuItem? = null,
    val quantity: Int = 1,
    val price: Double = 0.0,
)

data class MenuItem(
    @SerializedName("_id") val id: String? = null,
    val name: String,
    val price: Double = 0.0,
    val emoji: String? = null,
)

data class UpdateStatusRequest(val status: String)

object OrderStatus {
    const val PENDING = "pending"
    const val CONFIRMED = "confirmed"
    const val PREPARING = "preparing"
    const val ON_THE_WAY = "on-the-way"
    const val DELIVERED = "delivered"
    const val CANCELLED = "cancelled"

    // The status this rider's "advance" button should move an order to next.
    fun next(current: String): String? = when (current) {
        CONFIRMED -> PREPARING
        PREPARING -> ON_THE_WAY
        ON_THE_WAY -> DELIVERED
        else -> null
    }

    fun label(status: String): String = when (status) {
        PENDING -> "Pending"
        CONFIRMED -> "Confirmed"
        PREPARING -> "Preparing"
        ON_THE_WAY -> "On the way"
        DELIVERED -> "Delivered"
        CANCELLED -> "Cancelled"
        else -> status
    }
}
