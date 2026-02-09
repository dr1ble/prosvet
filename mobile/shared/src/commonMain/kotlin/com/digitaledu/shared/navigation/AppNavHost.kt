package com.digitaledu.shared.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavOptionsBuilder
import androidx.navigation.compose.NavHost
import com.digitaledu.feature.auth.api.AUTH_ROUTE
import com.digitaledu.feature.auth.impl.authScreen
import com.digitaledu.feature.home.api.HOME_ROUTE
import com.digitaledu.feature.home.impl.homeScreen

@Composable
fun AppNavHost(
    navController: NavHostController,
    hasAuthenticatedSession: Boolean,
    modifier: Modifier = Modifier,
) {
    val startDestination = if (hasAuthenticatedSession) HOME_ROUTE else AUTH_ROUTE

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
    ) {
        authScreen(
            onAuthenticated = {
                navController.navigate(HOME_ROUTE) {
                    popUpTo(AUTH_ROUTE) {
                        inclusive = true
                    }
                    launchSingleTop = true
                    restoreState = false
                }
            },
        )

        homeScreen(
            onLoggedOut = {
                navController.navigate(AUTH_ROUTE) {
                    clearHomeFromBackStack()
                }
            },
        )
    }
}

private fun NavOptionsBuilder.clearHomeFromBackStack() {
    popUpTo(HOME_ROUTE) {
        inclusive = true
    }
    launchSingleTop = true
    restoreState = false
}
