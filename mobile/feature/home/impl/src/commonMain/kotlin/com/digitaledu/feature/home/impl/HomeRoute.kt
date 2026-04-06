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
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.data.groups.GroupQrRepository
import com.digitaledu.core.ui.ObserveEffects
import com.digitaledu.core.ui.util.BackHandler
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
    initialGroupQrToken: String?,
    onGroupQrTokenConsumed: () -> Unit,
    catalogFeatureHost: CatalogFeatureHost,
    playerFeatureHost: PlayerFeatureHost,
    profileFeatureHost: ProfileFeatureHost,
    catalogUiEntry: CatalogUiEntry,
    playerUiEntry: PlayerUiEntry,
    profileUiEntry: ProfileUiEntry,
    authRepository: AuthRepository,
    groupQrRepository: GroupQrRepository,
    modifier: Modifier = Modifier,
) {
    val catalogUiState by catalogFeatureHost.uiState.collectAsState()
    val playerUiState by playerFeatureHost.uiState.collectAsState()
    val profileUiState by profileFeatureHost.uiState.collectAsState()

    var selectedTab by remember { mutableStateOf(HomeTab.Courses) }
    var pendingGroupQrToken by remember { mutableStateOf(initialGroupQrToken) }
    var qrHandledToken by remember { mutableStateOf<String?>(null) }
    var currentUserDisplayName by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val profileErrorMessage = (profileUiState.status as? ProfileStatus.Error)?.message

    LaunchedEffect(initialGroupQrToken) {
        if (initialGroupQrToken.isNullOrBlank()) return@LaunchedEffect
        if (initialGroupQrToken == qrHandledToken) return@LaunchedEffect
        pendingGroupQrToken = initialGroupQrToken
    }

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

    LaunchedEffect(Unit) {
        currentUserDisplayName = runCatching {
            authRepository.getCurrentUser().displayName
        }.getOrNull()?.trim()?.takeIf { it.isNotEmpty() }
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

    BackHandler(enabled = selectedTab != HomeTab.Courses) {
        selectedTab = HomeTab.Courses
    }

    LaunchedEffect(pendingGroupQrToken) {
        val token = pendingGroupQrToken ?: return@LaunchedEffect
        if (token == qrHandledToken) return@LaunchedEffect

        runCatching {
            groupQrRepository.resolveGroupQr(token)
        }.onSuccess { resolution ->
            catalogFeatureHost.processIntent(CatalogIntent.OpenCourse(resolution.courseSlug))
            snackbarHostState.showSnackbar("${resolution.groupName}: course opened")
        }.onFailure { throwable ->
            snackbarHostState.showSnackbar(throwable.toUserMessage())
        }

        qrHandledToken = token
        pendingGroupQrToken = null
        onGroupQrTokenConsumed()
    }

    HomeScreen(
        selectedTab = selectedTab,
        onTabSelected = { tab -> selectedTab = tab },
        catalogUiState = catalogUiState,
        playerUiState = playerUiState,
        profileUiState = profileUiState,
        currentUserDisplayName = currentUserDisplayName,
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
