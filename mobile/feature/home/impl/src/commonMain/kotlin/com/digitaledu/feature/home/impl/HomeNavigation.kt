package com.digitaledu.feature.home.impl

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.feature.home.api.HOME_ROUTE

fun NavGraphBuilder.homeScreen(
    catalogRepository: CatalogRepository,
    authRepository: AuthRepository,
    onLoggedOut: () -> Unit,
) {
    composable(route = HOME_ROUTE) {
        HomeRoute(
            catalogRepository = catalogRepository,
            authRepository = authRepository,
            onLoggedOut = onLoggedOut,
        )
    }
}
