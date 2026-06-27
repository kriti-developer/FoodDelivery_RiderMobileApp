package com.foodexpress.rider.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "rider_prefs")

// Stand-in for a real backend session: the backend has no rider accounts,
// so "logged in" just means a name is saved on-device, mirroring the
// customer app's own local-only auth.
class RiderPreferences(private val context: Context) {

    private object Keys {
        val RIDER_NAME = stringPreferencesKey("rider_name")
        val RIDER_PHONE = stringPreferencesKey("rider_phone")
        val ACTIVE_ORDER_ID = stringPreferencesKey("active_order_id")
        val HISTORY_ORDER_IDS = stringSetPreferencesKey("history_order_ids")
    }

    val riderName: Flow<String?> = context.dataStore.data.map { it[Keys.RIDER_NAME] }
    val riderPhone: Flow<String?> = context.dataStore.data.map { it[Keys.RIDER_PHONE] }
    val activeOrderId: Flow<String?> = context.dataStore.data.map { it[Keys.ACTIVE_ORDER_ID] }
    val historyOrderIds: Flow<Set<String>> =
        context.dataStore.data.map { it[Keys.HISTORY_ORDER_IDS] ?: emptySet() }

    suspend fun saveRiderProfile(name: String, phone: String?) {
        context.dataStore.edit { prefs ->
            prefs[Keys.RIDER_NAME] = name
            if (phone.isNullOrBlank()) prefs.remove(Keys.RIDER_PHONE) else prefs[Keys.RIDER_PHONE] = phone
        }
    }

    suspend fun setActiveOrderId(orderId: String?) {
        context.dataStore.edit { prefs ->
            if (orderId == null) prefs.remove(Keys.ACTIVE_ORDER_ID) else prefs[Keys.ACTIVE_ORDER_ID] = orderId
        }
    }

    suspend fun addHistoryOrderId(orderId: String) {
        context.dataStore.edit { prefs ->
            val current = prefs[Keys.HISTORY_ORDER_IDS] ?: emptySet()
            prefs[Keys.HISTORY_ORDER_IDS] = current + orderId
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { it.clear() }
    }

    suspend fun currentRiderName(): String? = riderName.first()
}
