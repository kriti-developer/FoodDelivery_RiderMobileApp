package com.foodexpress.rider.ui.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.foodexpress.rider.ui.deliveries.ActiveDeliveryScreen
import com.foodexpress.rider.ui.deliveries.AvailableDeliveriesScreen
import com.foodexpress.rider.ui.history.HistoryScreen
import com.foodexpress.rider.ui.profile.ProfileScreen

private data class Tab(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val tabs = listOf(
    Tab("deliveries", "Deliveries", Icons.Filled.LocalShipping),
    Tab("history", "History", Icons.Filled.History),
    Tab("profile", "Profile", Icons.Filled.Person),
)

@Composable
fun MainScreen(onLogout: () -> Unit) {
    val navController = rememberNavController()
    val ordersViewModel: OrdersViewModel = viewModel()

    Scaffold(
        bottomBar = {
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentDestination = backStackEntry?.destination
            NavigationBar {
                tabs.forEach { tab ->
                    val selected = currentDestination?.hierarchy?.any { it.route == tab.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(tab.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "deliveries",
            modifier = Modifier.padding(padding),
        ) {
            composable("deliveries") {
                val activeOrder by ordersViewModel.activeOrder.collectAsState()
                if (activeOrder != null) {
                    ActiveDeliveryScreen(order = activeOrder!!, viewModel = ordersViewModel)
                } else {
                    AvailableDeliveriesScreen(viewModel = ordersViewModel)
                }
            }
            composable("history") {
                HistoryScreen(viewModel = ordersViewModel)
            }
            composable("profile") {
                ProfileScreen(onLoggedOut = onLogout)
            }
        }
    }
}
