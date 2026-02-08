package com.digitaledu.feature.auth.impl

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.feature.auth.api.AUTH_ROUTE

fun NavGraphBuilder.authScreen(
    authRepository: AuthRepository,
    onAuthenticated: () -> Unit,
) {
    composable(route = AUTH_ROUTE) {
        AuthRoute(
            authRepository = authRepository,
            onAuthenticated = onAuthenticated,
        )
    }
}
