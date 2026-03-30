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
import com.digitaledu.core.ui.ObserveEffects
import com.digitaledu.feature.catalog.api.CatalogEffect
import com.digitaledu.feature.catalog.api.CatalogFeatureHost
import com.digitaledu.feature.catalog.api.CatalogIntent
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.player.api.PlayerEffect
import com.digitaledu.feature.player.api.PlayerFeatureHost
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.profile.api.ProfileEffect
import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileStatus
import com.digitaledu.feature.profile.api.ProfileUiEntry

@Composable
fun HomeRoute(
    onLoggedOut: () -> Unit,
    catalogFeatureHost: CatalogFeatureHost,
    playerFeatureHost: PlayerFeatureHost,
    profileFeatureHost: ProfileFeatureHost,
    catalogUiEntry: CatalogUiEntry,
    playerUiEntry: PlayerUiEntry,
    profileUiEntry: ProfileUiEntry,
    modifier: Modifier = Modifier,
) {
    val catalogUiState by catalogFeatureHost.uiState.collectAsState()
    val playerUiState by playerFeatureHost.uiState.collectAsState()
    val profileUiState by profileFeatureHost.uiState.collectAsState()

    var selectedTab by remember { mutableStateOf(HomeTab.Courses) }
    val snackbarHostState = remember { SnackbarHostState() }
    val profileErrorMessage = (profileUiState.status as? ProfileStatus.Error)?.message

    LaunchedEffect(catalogUiState.errorMessage, profileErrorMessage) {
        snackbarHostState.showAndDismissIfNeeded(
            message = catalogUiState.errorMessage,
            dismiss = { catalogFeatureHost.processIntent(CatalogIntent.DismissError) },
        )
        snackbarHostState.showAndDismissIfNeeded(
            message = profileErrorMessage,
            dismiss = { profileFeatureHost.processIntent(ProfileIntent.DismissError) },
        )
    }

    ObserveEffects(catalogFeatureHost.effects) { effect ->
        if (effect is CatalogEffect.CourseOpened) {
            playerFeatureHost.openBundle(effect.bundle)
            selectedTab = HomeTab.Lesson
        }
    }

    ObserveEffects(playerFeatureHost.effects) { effect ->
        if (effect is PlayerEffect.Closed) {
            selectedTab = HomeTab.Courses
        }
    }

    ObserveEffects(profileFeatureHost.effects) { effect ->
        if (effect is ProfileEffect.LoggedOut) {
            onLoggedOut()
        }
    }

    HomeScreen(
        selectedTab = selectedTab,
        onTabSelected = { tab -> selectedTab = tab },
        catalogUiState = catalogUiState,
        playerUiState = playerUiState,
        profileUiState = profileUiState,
        catalogUiEntry = catalogUiEntry,
        playerUiEntry = playerUiEntry,
        profileUiEntry = profileUiEntry,
        resolveUrl = playerFeatureHost::resolveImageUrl,
        snackbarHostState = snackbarHostState,
        onCatalogIntent = catalogFeatureHost::processIntent,
        onPlayerIntent = playerFeatureHost::processIntent,
        onProfileIntent = profileFeatureHost::processIntent,
        modifier = modifier,
    )
}

private suspend fun SnackbarHostState.showAndDismissIfNeeded(
    message: String?,
    dismiss: () -> Unit,
) {
    message ?: return
    try {
        showSnackbar(message = message)
    } finally {
        dismiss()
    }
}
