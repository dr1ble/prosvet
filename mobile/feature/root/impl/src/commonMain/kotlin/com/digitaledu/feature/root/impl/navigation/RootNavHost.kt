package com.digitaledu.feature.root.impl.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavOptionsBuilder
import androidx.navigation.compose.NavHost
import com.digitaledu.feature.auth.api.AUTH_ROUTE
import com.digitaledu.feature.auth.api.AuthFeatureEntry
import com.digitaledu.feature.home.api.HOME_ROUTE
import com.digitaledu.feature.home.api.HomeFeatureEntry

@Composable
fun RootNavHost(
    navController: NavHostController,
    startDestination: String,
    authFeatureEntry: AuthFeatureEntry,
    homeFeatureEntry: HomeFeatureEntry,
    initialGroupQrToken: String?,
    onGroupQrTokenConsumed: () -> Unit,
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
    ) {
        authFeatureEntry.register(
            navGraphBuilder = this,
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

        homeFeatureEntry.register(
            navGraphBuilder = this,
            onLoggedOut = {
                navController.navigate(AUTH_ROUTE) {
                    clearHomeFromBackStack()
                }
            },
            initialGroupQrToken = initialGroupQrToken,
            onGroupQrTokenConsumed = onGroupQrTokenConsumed,
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
