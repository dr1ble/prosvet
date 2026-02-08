package com.digitaledu.mobile

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.digitaledu.core.data.auth.createAuthRepository
import com.digitaledu.core.data.catalog.createCatalogRepository
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.mobile.auth.SecureAuthSessionStore
import com.digitaledu.mobile.navigation.AppNavHost

@Composable
fun DigitalEduApp() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val authRepository = remember(context) {
        createAuthRepository(
            baseUrl = BuildConfig.BACKEND_BASE_URL,
            enableNetworkLogs = BuildConfig.DEBUG,
            authSessionStore = SecureAuthSessionStore(context),
        )
    }
    val catalogRepository = remember(context) {
        createCatalogRepository(
            baseUrl = BuildConfig.BACKEND_BASE_URL,
            enableNetworkLogs = BuildConfig.DEBUG,
        )
    }
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
