package com.foodexpress.rider.ui.deliveries

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.foodexpress.rider.data.model.Order
import com.foodexpress.rider.data.model.OrderStatus
import com.foodexpress.rider.ui.common.formatRupees
import com.foodexpress.rider.ui.main.OrdersViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveDeliveryScreen(order: Order, viewModel: OrdersViewModel) {
    val context = LocalContext.current
    val nextStatus = OrderStatus.next(order.status)
    val navigateTarget = if (order.status == OrderStatus.ON_THE_WAY) order.customer.address else order.restaurant.address

    Scaffold(topBar = { TopAppBar(title = { Text("Active delivery") }) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Status: ${OrderStatus.label(order.status)}", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.size(12.dp))

                    Text(text = "Pickup from", style = MaterialTheme.typography.labelMedium)
                    Text(text = "${order.restaurant.emoji.orEmpty()} ${order.restaurant.name}", style = MaterialTheme.typography.bodyLarge)
                    order.restaurant.address?.let { Text(text = it, style = MaterialTheme.typography.bodyMedium) }
                    order.restaurant.phone?.let { Text(text = it, style = MaterialTheme.typography.bodyMedium) }

                    Spacer(modifier = Modifier.size(16.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.size(16.dp))

                    Text(text = "Deliver to", style = MaterialTheme.typography.labelMedium)
                    Text(text = order.customer.name, style = MaterialTheme.typography.bodyLarge)
                    order.customer.address?.let { Text(text = it, style = MaterialTheme.typography.bodyMedium) }
                    order.customer.phone?.let { Text(text = it, style = MaterialTheme.typography.bodyMedium) }

                    Spacer(modifier = Modifier.size(16.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.size(16.dp))

                    Text(text = "Order", style = MaterialTheme.typography.labelMedium)
                    order.items.forEach { item ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(text = "${item.quantity} × ${item.menuItem?.name ?: "Item"}")
                            Text(text = formatRupees(item.price * item.quantity))
                        }
                    }
                    Spacer(modifier = Modifier.size(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(text = "Total", style = MaterialTheme.typography.titleSmall)
                        Text(text = formatRupees(order.totalPrice), style = MaterialTheme.typography.titleSmall)
                    }
                }
            }

            Spacer(modifier = Modifier.size(16.dp))

            OutlinedButton(
                onClick = { openNavigation(context, navigateTarget) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Filled.Navigation, contentDescription = null)
                Spacer(modifier = Modifier.size(8.dp))
                Text(if (order.status == OrderStatus.ON_THE_WAY) "Navigate to customer" else "Navigate to restaurant")
            }

            Spacer(modifier = Modifier.size(12.dp))

            if (nextStatus != null) {
                Button(
                    onClick = { viewModel.advanceStatus(order.id, nextStatus) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(advanceButtonLabel(nextStatus))
                }
            }
        }
    }
}

private fun advanceButtonLabel(nextStatus: String): String = when (nextStatus) {
    OrderStatus.PREPARING -> "Mark as preparing"
    OrderStatus.ON_THE_WAY -> "Picked up - on the way"
    OrderStatus.DELIVERED -> "Mark delivered"
    else -> "Advance status"
}

private fun openNavigation(context: android.content.Context, address: String?) {
    if (address.isNullOrBlank()) {
        Toast.makeText(context, "No address available", Toast.LENGTH_SHORT).show()
        return
    }
    val uri = Uri.parse("geo:0,0?q=${Uri.encode(address)}")
    val intent = Intent(Intent.ACTION_VIEW, uri)
    try {
        context.startActivity(intent)
    } catch (e: ActivityNotFoundException) {
        Toast.makeText(context, "No maps app available", Toast.LENGTH_SHORT).show()
    }
}
