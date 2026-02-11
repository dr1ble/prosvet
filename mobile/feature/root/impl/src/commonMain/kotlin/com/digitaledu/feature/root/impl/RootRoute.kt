package com.digitaledu.feature.root.impl

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.feature.auth.api.AUTH_ROUTE
import com.digitaledu.feature.auth.api.AuthFeatureEntry
import com.digitaledu.feature.home.api.HOME_ROUTE
import com.digitaledu.feature.home.api.HomeFeatureEntry
import com.digitaledu.feature.root.impl.navigation.RootNavHost
import org.koin.mp.KoinPlatform

@Composable
fun RootRoute(
    modifier: Modifier = Modifier,
) {
    val navController = rememberNavController()
    val authRepository = remember {
        KoinPlatform.getKoin().get<AuthRepository>()
    }
    val authFeatureEntry = remember {
        KoinPlatform.getKoin().get<AuthFeatureEntry>()
    }
    val homeFeatureEntry = remember {
        KoinPlatform.getKoin().get<HomeFeatureEntry>()
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

    when (sessionBootstrapState) {
        SessionBootstrapState.Loading -> {
            CenteredLoadingIndicator(
                modifier = modifier.fillMaxSize(),
            )
        }

        SessionBootstrapState.Authenticated -> {
            RootNavHost(
                navController = navController,
                startDestination = HOME_ROUTE,
                authFeatureEntry = authFeatureEntry,
                homeFeatureEntry = homeFeatureEntry,
                modifier = modifier.fillMaxSize(),
            )
        }

        SessionBootstrapState.Unauthenticated -> {
            RootNavHost(
                navController = navController,
                startDestination = AUTH_ROUTE,
                authFeatureEntry = authFeatureEntry,
                homeFeatureEntry = homeFeatureEntry,
                modifier = modifier.fillMaxSize(),
            )
        }
    }
}

private enum class SessionBootstrapState {
    Loading,
    Authenticated,
    Unauthenticated,
}
