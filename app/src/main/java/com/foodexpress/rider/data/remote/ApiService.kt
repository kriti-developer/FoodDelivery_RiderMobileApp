package com.foodexpress.rider.data.remote

import com.foodexpress.rider.data.model.Order
import com.foodexpress.rider.data.model.UpdateStatusRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path

interface ApiService {
    @GET("api/orders/available")
    suspend fun getAvailableOrders(): List<Order>

    @GET("api/orders")
    suspend fun getAllOrders(): List<Order>

    @PATCH("api/orders/{id}/status")
    suspend fun updateOrderStatus(@Path("id") orderId: String, @Body body: UpdateStatusRequest): Order
}
