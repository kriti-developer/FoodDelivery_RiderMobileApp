package com.foodexpress.rider.ui.profile

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(onLoggedOut: () -> Unit, viewModel: ProfileViewModel = viewModel()) {
    val profile by viewModel.profile.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text("Profile") }) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp)) {
            Text(text = profile.name, style = MaterialTheme.typography.headlineSmall)
            if (profile.phone.isNotBlank()) {
                Text(text = profile.phone, style = MaterialTheme.typography.bodyMedium)
            }
            Spacer(modifier = Modifier.size(32.dp))
            OutlinedButton(
                onClick = { viewModel.logOut(onLoggedOut) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Log out")
            }
        }
    }
}
