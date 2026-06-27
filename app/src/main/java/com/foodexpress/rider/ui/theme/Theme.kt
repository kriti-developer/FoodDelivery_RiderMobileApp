package com.foodexpress.rider.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Matches the customer app's theme/colors.js so both apps feel like one product.
val Accent = Color(0xFFC4501F)
val AccentSoft = Color(0xFFF3E2D5)
val Background = Color(0xFFFAF7F2)
val Surface = Color(0xFFFFFFFF)
val Ink = Color(0xFF2B2420)
val Muted = Color(0xFF8A7F73)
val Live = Color(0xFF2F7A4F)
val LiveSoft = Color(0xFFE3F0E8)

private val LightColors = lightColorScheme(
    primary = Accent,
    onPrimary = Color.White,
    secondaryContainer = AccentSoft,
    background = Background,
    surface = Surface,
    onBackground = Ink,
    onSurface = Ink,
)

private val DarkColors = darkColorScheme(
    primary = Accent,
    onPrimary = Color.White,
)

@Composable
fun RiderAppTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) DarkColors else LightColors
    MaterialTheme(colorScheme = colors, content = content)
}
