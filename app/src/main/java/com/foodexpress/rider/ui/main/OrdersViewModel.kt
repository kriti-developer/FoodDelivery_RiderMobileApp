package com.foodexpress.rider.ui.main

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.foodexpress.rider.data.ServiceLocator
import com.foodexpress.rider.data.model.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class OrdersViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = ServiceLocator.orderRepository(application)

    val availableOrders: StateFlow<List<Order>> = repo.availableOrders
    val activeOrder: StateFlow<Order?> = repo.activeOrder
    val historyOrders: StateFlow<List<Order>> = repo.historyOrders

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        repo.startListening(viewModelScope)
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                repo.refreshAvailable()
                repo.refreshActiveAndHistory()
            } catch (e: Exception) {
                _error.value = e.message ?: "Could not reach the backend. Is it running?"
            }
            _loading.value = false
        }
    }

    fun accept(orderId: String) {
        viewModelScope.launch {
            try {
                repo.acceptOrder(orderId)
            } catch (e: Exception) {
                _error.value = e.message ?: "Could not accept this delivery"
            }
        }
    }

    fun advanceStatus(orderId: String, newStatus: String) {
        viewModelScope.launch {
            try {
                repo.advanceStatus(orderId, newStatus)
            } catch (e: Exception) {
                _error.value = e.message ?: "Could not update the delivery status"
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
