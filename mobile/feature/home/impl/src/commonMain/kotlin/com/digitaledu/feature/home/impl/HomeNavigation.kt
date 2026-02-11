package com.digitaledu.feature.home.impl

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.digitaledu.feature.home.api.HOME_ROUTE

internal fun NavGraphBuilder.homeScreen(
    onLoggedOut: () -> Unit,
) {
    composable(route = HOME_ROUTE) {
        HomeRoute(
            onLoggedOut = onLoggedOut,
        )
    }
}
