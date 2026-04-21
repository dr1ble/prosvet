package com.digitaledu.feature.home.impl

import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.ui.ObserveEffects
import com.digitaledu.feature.home.impl.catalog.CatalogEffect
import com.digitaledu.feature.home.impl.catalog.CatalogIntent
import com.digitaledu.feature.home.impl.catalog.CatalogViewModel
import com.digitaledu.feature.home.impl.player.PlayerEffect
import com.digitaledu.feature.home.impl.player.PlayerViewModel
import com.digitaledu.feature.home.impl.profile.ProfileEffect
import com.digitaledu.feature.home.impl.profile.ProfileIntent
import com.digitaledu.feature.home.impl.profile.ProfileViewModel
import org.koin.mp.KoinPlatform

@Composable
fun HomeRoute(
    onLoggedOut: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val koin = remember { KoinPlatform.getKoin() }
    val catalogViewModel = remember { koin.get<CatalogViewModel>() }
    val playerViewModel = remember { koin.get<PlayerViewModel>() }
    val profileViewModel = remember { koin.get<ProfileViewModel>() }

    val catalogUiState by catalogViewModel.uiState.collectAsState()
    val playerUiState by playerViewModel.uiState.collectAsState()
    val profileUiState by profileViewModel.uiState.collectAsState()

    var selectedTab by remember { mutableStateOf(HomeTab.Courses) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(
        playerUiState.bundle?.course?.id,
        playerUiState.bundle?.screens?.size,
        playerUiState.currentScreenIndex,
    ) {
        val bundle = playerUiState.bundle ?: return@LaunchedEffect
        val total = bundle.screens.size
        if (total == 0) return@LaunchedEffect
        val completed = (playerUiState.currentScreenIndex + 1).coerceAtMost(total)
        catalogViewModel.processIntent(
            CatalogIntent.UpdateProgress(
                courseId = bundle.course.id,
                completedLessons = completed,
                totalLessons = total,
            ),
        )
    }

    LaunchedEffect(catalogUiState.errorMessage, profileUiState.errorMessage) {
        catalogUiState.errorMessage?.let { message ->
            snackbarHostState.showSnackbar(message = message)
            catalogViewModel.processIntent(CatalogIntent.DismissError)
        }
        profileUiState.errorMessage?.let { message ->
            snackbarHostState.showSnackbar(message = message)
            profileViewModel.processIntent(ProfileIntent.DismissError)
        }
    }

    ObserveEffects(catalogViewModel.effects) { effect ->
        if (effect is CatalogEffect.CourseOpened) {
            playerViewModel.openBundle(effect.bundle)
            selectedTab = HomeTab.Lesson
        }
    }

    ObserveEffects(playerViewModel.effects) { effect ->
        if (effect is PlayerEffect.Closed) {
            selectedTab = HomeTab.Courses
        }
    }

    ObserveEffects(profileViewModel.effects) { effect ->
        if (effect is ProfileEffect.LoggedOut) {
            onLoggedOut()
        }
    }

    val authTokens by remember { koin.get<AuthRepository>().observeTokens() }
        .collectAsState(initial = koin.get<AuthRepository>().getCachedTokens())

    val mediaAccessToken = authTokens?.accessToken

    HomeScreen(
        selectedTab = selectedTab,
        onTabSelected = { tab -> selectedTab = tab },
        catalogUiState = catalogUiState,
        playerUiState = playerUiState,
        profileUiState = profileUiState,
        mediaAccessToken = mediaAccessToken,
        resolveUrl = playerViewModel::resolveImageUrl,
        snackbarHostState = snackbarHostState,
        onCatalogIntent = catalogViewModel::processIntent,
        onPlayerIntent = playerViewModel::processIntent,
        onProfileIntent = profileViewModel::processIntent,
        modifier = modifier,
    )
}
