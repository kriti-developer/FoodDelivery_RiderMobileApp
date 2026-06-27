package com.foodexpress.rider.ui.common

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val timeFormatter = DateTimeFormatter.ofPattern("hh:mm a").withZone(ZoneId.systemDefault())

fun formatOrderTime(iso: String?): String {
    if (iso == null) return ""
    return runCatching { timeFormatter.format(Instant.parse(iso)) }.getOrDefault("")
}

fun formatRupees(amount: Double): String = "₹${amount.toInt()}"

fun summarizeItems(itemNames: List<String>): String =
    if (itemNames.isEmpty()) "No items" else itemNames.joinToString(", ")
