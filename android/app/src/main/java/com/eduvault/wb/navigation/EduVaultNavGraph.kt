package com.eduvault.wb.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.eduvault.wb.core.designsystem.PrimaryPurple
import com.eduvault.wb.core.designsystem.SecondaryText

sealed class StudentDestination(val route: String, val label: String, val icon: ImageVector) {
    data object Home : StudentDestination("home", "Home", Icons.Default.Home)
    data object Library : StudentDestination("library", "Library", Icons.Default.MenuBook)
    data object AiAssistant : StudentDestination("ai_assistant", "AI", Icons.Default.AutoAwesome)
    data object Community : StudentDestination("community", "Community", Icons.Default.Forum)
    data object Profile : StudentDestination("profile", "Profile", Icons.Default.Person)
}

@Composable
fun EduVaultNavGraph(
    onNavSound: () -> Unit,
    homeContent: @Composable () -> Unit,
    libraryContent: @Composable () -> Unit,
    aiContent: @Composable () -> Unit,
    communityContent: @Composable () -> Unit,
    profileContent: @Composable () -> Unit
) {
    val navController = rememberNavController()
    val items = listOf(
        StudentDestination.Home,
        StudentDestination.Library,
        StudentDestination.AiAssistant,
        StudentDestination.Community,
        StudentDestination.Profile
    )

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = Color.White) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                items.forEach { screen ->
                    val selected = currentRoute == screen.route
                    NavigationBarItem(
                        icon = {
                            Icon(
                                imageVector = screen.icon,
                                contentDescription = screen.label,
                                tint = if (selected) PrimaryPurple else SecondaryText
                            )
                        },
                        label = {
                            Text(
                                text = screen.label,
                                color = if (selected) PrimaryPurple else SecondaryText
                            )
                        },
                        selected = selected,
                        onClick = {
                            if (!selected) {
                                onNavSound()
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = StudentDestination.Home.route,
            modifier = Modifier.padding(innerPadding),
            enterTransition = {
                fadeIn(animationSpec = tween(220)) + slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(220)
                )
            },
            exitTransition = {
                fadeOut(animationSpec = tween(180))
            }
        ) {
            composable(StudentDestination.Home.route) { homeContent() }
            composable(StudentDestination.Library.route) { libraryContent() }
            composable(StudentDestination.AiAssistant.route) { aiContent() }
            composable(StudentDestination.Community.route) { communityContent() }
            composable(StudentDestination.Profile.route) { profileContent() }
        }
    }
}
