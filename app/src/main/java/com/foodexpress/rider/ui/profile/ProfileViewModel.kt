package com.foodexpress.rider.ui.profile

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.foodexpress.rider.data.ServiceLocator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ProfileState(val name: String = "", val phone: String = "")

class ProfileViewModel(application: Application) : AndroidViewModel(application) {
    private val prefs = ServiceLocator.riderPreferences(application)

    val profile: StateFlow<ProfileState> = combine(prefs.riderName, prefs.riderPhone) { name, phone ->
        ProfileState(name = name.orEmpty(), phone = phone.orEmpty())
    }.stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Eagerly, ProfileState())

    fun logOut(onDone: () -> Unit) {
        viewModelScope.launch {
            prefs.clearSession()
            onDone()
        }
    }
}
