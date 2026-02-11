package com.digitaledu.feature.auth.impl

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.digitaledu.feature.auth.api.AUTH_ROUTE

internal fun NavGraphBuilder.authScreen(
    onAuthenticated: () -> Unit,
) {
    composable(route = AUTH_ROUTE) {
        AuthRoute(
            onAuthenticated = onAuthenticated,
        )
    }
}
