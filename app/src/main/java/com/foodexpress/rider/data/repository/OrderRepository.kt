package com.foodexpress.rider.data.repository

import com.foodexpress.rider.data.local.RiderPreferences
import com.foodexpress.rider.data.model.Order
import com.foodexpress.rider.data.model.OrderStatus
import com.foodexpress.rider.data.model.UpdateStatusRequest
import com.foodexpress.rider.data.remote.ApiService
import com.foodexpress.rider.data.remote.OrderSocketEvent
import com.foodexpress.rider.data.remote.SocketManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class OrderRepository(
    private val api: ApiService,
    private val prefs: RiderPreferences,
) {
    private val _availableOrders = MutableStateFlow<List<Order>>(emptyList())
    val availableOrders: StateFlow<List<Order>> = _availableOrders

    private val _activeOrder = MutableStateFlow<Order?>(null)
    val activeOrder: StateFlow<Order?> = _activeOrder

    private val _historyOrders = MutableStateFlow<List<Order>>(emptyList())
    val historyOrders: StateFlow<List<Order>> = _historyOrders

    private var socketStarted = false

    suspend fun refreshAvailable() {
        _availableOrders.value = api.getAvailableOrders()
    }

    suspend fun refreshActiveAndHistory() {
        val activeId = prefs.activeOrderId.first()
        val historyIds = prefs.historyOrderIds.first()
        if (activeId == null && historyIds.isEmpty()) {
            _activeOrder.value = null
            _historyOrders.value = emptyList()
            return
        }
        val all = api.getAllOrders()
        _activeOrder.value = activeId?.let { id -> all.find { it.id == id } }
        _historyOrders.value = all
            .filter { it.id in historyIds }
            .sortedByDescending { it.updatedAt }
    }

    // Backend's POST /accept always 500s (sets a status value outside the
    // schema's enum) - confirmed against the schema directly. Using the
    // status PATCH instead, which is a real, working transition.
    suspend fun acceptOrder(orderId: String) {
        val updated = api.updateOrderStatus(orderId, UpdateStatusRequest(OrderStatus.CONFIRMED))
        prefs.setActiveOrderId(updated.id)
        _activeOrder.value = updated
        _availableOrders.value = _availableOrders.value.filterNot { it.id == orderId }
    }

    suspend fun advanceStatus(orderId: String, newStatus: String) {
        val updated = api.updateOrderStatus(orderId, UpdateStatusRequest(newStatus))
        if (newStatus == OrderStatus.DELIVERED) {
            prefs.setActiveOrderId(null)
            prefs.addHistoryOrderId(orderId)
            _activeOrder.value = null
            _historyOrders.value = (listOf(updated) + _historyOrders.value)
        } else {
            _activeOrder.value = updated
        }
    }

    fun startListening(scope: CoroutineScope) {
        if (socketStarted) return
        socketStarted = true
        scope.launch {
            SocketManager.events().collect { event ->
                when (event) {
                    is OrderSocketEvent.New -> {
                        if (event.order.status == OrderStatus.PENDING) {
                            _availableOrders.value = _availableOrders.value + event.order
                        }
                    }
                    is OrderSocketEvent.Updated -> {
                        _availableOrders.value = _availableOrders.value.filterNot { it.id == event.order.id }
                        if (_activeOrder.value?.id == event.order.id) {
                            _activeOrder.value = event.order
                        }
                    }
                }
            }
        }
    }
}
