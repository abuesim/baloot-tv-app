package com.akaklive.offline.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.akaklive.offline.R

val Gold = Color(0xFFF5B042)
val Orange = Color(0xFFFF5E3A)
val Pink = Color(0xFFE91E63)
val TeamOrange = Color(0xFFFF7C2A)
val TeamBlue = Color(0xFF38BDF8)
val DeepBlack = Color(0xFF0A0A0E)
val Navy = Color(0xFF15151C)
val NavyLight = Color(0xFF1F1F29)
val Border = Color(0xFF2A2A36)
val Danger = Color(0xFFEF4444)
val Success = Color(0xFF4ADE80)

private val AkakColors = darkColorScheme(
    primary = Gold,
    onPrimary = DeepBlack,
    secondary = Color(0xFF7AD7C4),
    background = DeepBlack,
    onBackground = Color.White,
    surface = Navy,
    onSurface = Color.White,
    surfaceVariant = NavyLight,
    error = Danger,
)

private val ReadexFamily = FontFamily(
    Font(R.font.readex_pro, weight = FontWeight.Light),
    Font(R.font.readex_pro, weight = FontWeight.Normal),
    Font(R.font.readex_pro, weight = FontWeight.Medium),
    Font(R.font.readex_pro, weight = FontWeight.SemiBold),
    Font(R.font.readex_pro, weight = FontWeight.Bold),
)

private val AkakTypography = androidx.compose.material3.Typography(
    displayLarge = TextStyle(fontFamily = ReadexFamily, fontWeight = FontWeight.Black, fontSize = 52.sp),
    headlineLarge = TextStyle(fontFamily = ReadexFamily, fontWeight = FontWeight.Bold, fontSize = 30.sp),
    headlineMedium = TextStyle(fontFamily = ReadexFamily, fontWeight = FontWeight.Bold, fontSize = 24.sp),
    titleLarge = TextStyle(fontFamily = ReadexFamily, fontWeight = FontWeight.Bold, fontSize = 20.sp),
    titleMedium = TextStyle(fontFamily = ReadexFamily, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    bodyLarge = TextStyle(fontFamily = ReadexFamily, fontWeight = FontWeight.Normal, fontSize = 16.sp),
    bodyMedium = TextStyle(fontFamily = ReadexFamily, fontWeight = FontWeight.Normal, fontSize = 14.sp),
    labelLarge = TextStyle(fontFamily = ReadexFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp),
)

@Composable
fun AkakTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = AkakColors, typography = AkakTypography, content = content)
}
