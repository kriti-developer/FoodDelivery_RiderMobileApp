package com.foodexpress.rider.ui.history

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.foodexpress.rider.data.model.Order
import com.foodexpress.rider.ui.common.formatOrderTime
import com.foodexpress.rider.ui.common.formatRupees
import com.foodexpress.rider.ui.main.OrdersViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(viewModel: OrdersViewModel) {
    val orders by viewModel.historyOrders.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text("Delivery history") }) }) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (orders.isEmpty()) {
                Text(
                    text = "Deliveries you complete will show up here.",
                    modifier = Modifier.align(Alignment.Center).padding(24.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                    items(orders, key = { it.id }) { order ->
                        HistoryCard(order = order)
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryCard(order: Order) {
    Card(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "${order.restaurant.emoji.orEmpty()} ${order.restaurant.name}", style = MaterialTheme.typography.titleMedium)
            Text(text = "Delivered to ${order.customer.name}", style = MaterialTheme.typography.bodyMedium)
            Text(
                text = "${formatRupees(order.totalPrice)} · ${formatOrderTime(order.updatedAt)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
