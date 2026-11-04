package com.eduvault.wb.core.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// EduVault Exact Reference Palette
val PrimaryPurple = Color(0xFF7564D8)
val SecondaryPurple = Color(0xFFA7A0ED)
val LightLavender = Color(0xFFF0EEFF)
val BackgroundWhite = Color(0xFFFFFFFF)
val SurfaceLavender = Color(0xFFFAFAFD)
val PrimaryText = Color(0xFF24232E)
val SecondaryText = Color(0xFF858593)
val BorderColor = Color(0xFFECEBF2)
val SuccessGreen = Color(0xFF25A878)
val ErrorRed = Color(0xFFE65C65)
val WarningAmber = Color(0xFFF59E0B)

// Dark Mode Tokens (PDF Reader & Night Study Mode)
val DarkBackground = Color(0xFF13121A)
val DarkSurface = Color(0xFF1D1B27)
val DarkBorder = Color(0xFF2E2B3D)
val DarkTextPrimary = Color(0xFFF4F3FA)
val DarkTextSecondary = Color(0xFFA2A0B3)

private val LightColors = lightColorScheme(
    primary = PrimaryPurple,
    onPrimary = Color.White,
    primaryContainer = LightLavender,
    onPrimaryContainer = PrimaryPurple,
    secondary = SecondaryPurple,
    onSecondary = Color.White,
    background = BackgroundWhite,
    onBackground = PrimaryText,
    surface = SurfaceLavender,
    onSurface = PrimaryText,
    surfaceVariant = LightLavender,
    onSurfaceVariant = SecondaryText,
    outline = BorderColor,
    error = ErrorRed,
    onError = Color.White
)

private val DarkColors = darkColorScheme(
    primary = SecondaryPurple,
    onPrimary = DarkBackground,
    primaryContainer = Color(0xFF2B254A),
    onPrimaryContainer = LightLavender,
    secondary = PrimaryPurple,
    onSecondary = Color.White,
    background = DarkBackground,
    onBackground = DarkTextPrimary,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = Color(0xFF262335),
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkBorder,
    error = ErrorRed,
    onError = Color.White
)

val EduVaultShapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

// Supports Hind Siliguri for Bengali & Inter for English
val EduVaultTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 36.sp,
        color = PrimaryText
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 30.sp
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 26.sp
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 24.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 24.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 20.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp
    )
)

@Composable
fun EduVaultTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colorScheme,
        typography = EduVaultTypography,
        shapes = EduVaultShapes,
        content = content
    )
}
