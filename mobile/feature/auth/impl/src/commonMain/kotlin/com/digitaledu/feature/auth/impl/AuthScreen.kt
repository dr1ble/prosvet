package com.digitaledu.feature.auth.impl

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.digitaledu.core.ui.ObserveEffects
import org.koin.mp.KoinPlatform

private const val ROUTE_ONBOARDING = "auth/onboarding"
private const val ROUTE_LOGIN = "auth/login"
private const val ROUTE_REGISTER = "auth/register"
private const val ROUTE_QR = "auth/qr"
private const val ROUTE_RECOVERY = "auth/recovery"

@Composable
internal fun AuthRoute(
    onAuthenticated: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel = remember { KoinPlatform.getKoin().get<AuthViewModel>() }
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ObserveEffects(viewModel.effects) { effect ->
        if (effect is AuthEffect.Authenticated) onAuthenticated()
    }

    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = ROUTE_ONBOARDING,
        modifier = modifier,
    ) {
        composable(ROUTE_ONBOARDING) {
            OnboardingScreen(
                onStartLearning = { navController.navigate(ROUTE_LOGIN) },
                onOpenAccessibility = { navController.navigate(ROUTE_LOGIN) },
            )
        }
        composable(ROUTE_LOGIN) {
            LoginScreen(
                uiState = uiState,
                onIntent = viewModel::processIntent,
                onOpenRegistration = { navController.navigate(ROUTE_REGISTER) },
                onOpenQrLogin = { navController.navigate(ROUTE_QR) },
                onOpenRecovery = { navController.navigate(ROUTE_RECOVERY) },
            )
        }
        composable(ROUTE_REGISTER) {
            RegistrationScreen(
                onBack = { navController.popBackStack() },
                onRegistered = onAuthenticated,
            )
        }
        composable(ROUTE_QR) {
            QrLoginScreen(
                onBack = { navController.popBackStack() },
                onManualLogin = { navController.navigate(ROUTE_LOGIN) { popUpTo(ROUTE_LOGIN) { inclusive = true } } },
            )
        }
        composable(ROUTE_RECOVERY) {
            PasswordRecoveryScreen(
                onBack = { navController.popBackStack() },
            )
        }
    }
}
