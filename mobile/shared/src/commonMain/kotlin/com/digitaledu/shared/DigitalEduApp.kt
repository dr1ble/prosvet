package com.digitaledu.shared

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.shared.navigation.AppNavHost

@Composable
fun DigitalEduApp(
    authRepository: AuthRepository,
    catalogRepository: CatalogRepository,
) {
    val navController = rememberNavController()

    val sessionBootstrapState by produceState(
        initialValue = SessionBootstrapState.Loading,
        key1 = authRepository,
    ) {
        val hasCachedTokens = authRepository.getCachedTokens() != null
        if (!hasCachedTokens) {
            value = SessionBootstrapState.Unauthenticated
            return@produceState
        }
        value = if (authRepository.restoreSession()) {
            SessionBootstrapState.Authenticated
        } else {
            SessionBootstrapState.Unauthenticated
        }
    }
    Scaffold { innerPadding ->
        when (sessionBootstrapState) {
            SessionBootstrapState.Loading -> {
                CenteredLoadingIndicator(
                    modifier = Modifier.padding(innerPadding),
                )
            }

            SessionBootstrapState.Authenticated -> {
                AppNavHost(
                    navController = navController,
                    authRepository = authRepository,
                    catalogRepository = catalogRepository,
                    hasAuthenticatedSession = true,
                    modifier = Modifier.padding(innerPadding),
                )
            }

            SessionBootstrapState.Unauthenticated -> {
                AppNavHost(
                    navController = navController,
                    authRepository = authRepository,
                    catalogRepository = catalogRepository,
                    hasAuthenticatedSession = false,
                    modifier = Modifier.padding(innerPadding),
                )
            }
        }
    }
}

private enum class SessionBootstrapState {
    Loading,
    Authenticated,
    Unauthenticated,
}
