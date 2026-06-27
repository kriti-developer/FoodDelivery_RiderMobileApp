package com.foodexpress.rider.ui.login

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.foodexpress.rider.data.ServiceLocator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class LoginViewModel(application: Application) : AndroidViewModel(application) {
    private val prefs = ServiceLocator.riderPreferences(application)

    private val _saving = MutableStateFlow(false)
    val saving: StateFlow<Boolean> = _saving

    fun saveAndContinue(name: String, phone: String, onDone: () -> Unit) {
        val trimmedName = name.trim()
        if (trimmedName.isEmpty()) return
        viewModelScope.launch {
            _saving.value = true
            prefs.saveRiderProfile(trimmedName, phone.trim().ifBlank { null })
            _saving.value = false
            onDone()
        }
    }
}
