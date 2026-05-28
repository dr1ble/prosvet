package com.digitaledu.feature.home.impl

import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.groups.GroupQrRepository
import com.digitaledu.core.data.progress.ProgressRepository
import com.digitaledu.core.model.progress.CourseHelpRequestCreate
import com.digitaledu.core.model.progress.CourseHelpRequestEntry
import com.digitaledu.core.ui.ObserveEffects
import com.digitaledu.core.ui.components.ErrorDialog
import com.digitaledu.core.ui.util.BackHandler
import com.digitaledu.feature.catalog.api.CatalogEffect
import com.digitaledu.feature.catalog.api.CatalogFeatureHost
import com.digitaledu.feature.catalog.api.CatalogIntent
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.diagnostics.api.DiagnosticsEffect
import com.digitaledu.feature.diagnostics.api.DiagnosticsFeatureHost
import com.digitaledu.feature.diagnostics.api.DiagnosticsIntent
import com.digitaledu.feature.diagnostics.api.DiagnosticsUiEntry
import com.digitaledu.feature.player.api.PlayerEffect
import com.digitaledu.feature.player.api.PlayerFeatureHost
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.profile.api.ProfileEffect
import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileStatus
import com.digitaledu.feature.profile.api.ProfileUiEntry
import com.digitaledu.feature.profile.api.ProfileUiState

@Composable
fun HomeRoute(
    onLoggedOut: () -> Unit,
    initialGroupQrToken: String?,
    onGroupQrTokenConsumed: () -> Unit,
    catalogFeatureHost: CatalogFeatureHost,
    diagnosticsFeatureHost: DiagnosticsFeatureHost,
    playerFeatureHost: PlayerFeatureHost,
    profileFeatureHost: ProfileFeatureHost,
    catalogUiEntry: CatalogUiEntry,
    diagnosticsUiEntry: DiagnosticsUiEntry,
    playerUiEntry: PlayerUiEntry,
    profileUiEntry: ProfileUiEntry,
    groupQrRepository: GroupQrRepository,
    progressRepository: ProgressRepository,
    modifier: Modifier = Modifier,
) {
    val catalogUiState by catalogFeatureHost.uiState.collectAsState()
    val diagnosticsUiState by diagnosticsFeatureHost.uiState.collectAsState()
    val playerUiState by playerFeatureHost.uiState.collectAsState()
    val profileUiState by profileFeatureHost.uiState.collectAsState()

    var selectedTab by remember { mutableStateOf(HomeTab.Home) }
    var courseReturnTab by remember { mutableStateOf(HomeTab.Home) }
    var pendingGroupQrToken by remember { mutableStateOf(initialGroupQrToken) }
    var qrHandledToken by remember { mutableStateOf<String?>(null) }
    var groupQrErrorMessage by remember { mutableStateOf<String?>(null) }
    var myHelpRequests by remember { mutableStateOf<List<CourseHelpRequestEntry>>(emptyList()) }
    var hasUnreadHelpReplies by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val profileErrorMessage = (profileUiState.status as? ProfileStatus.Error)?.message
    val routeErrorMessage = catalogUiState.errorMessage ?: profileErrorMessage ?: groupQrErrorMessage

    ErrorDialog(
        message = routeErrorMessage,
        onDismiss = {
            when (routeErrorMessage) {
                catalogUiState.errorMessage -> catalogFeatureHost.processIntent(CatalogIntent.DismissError)
                profileErrorMessage -> profileFeatureHost.processIntent(ProfileIntent.DismissError)
                groupQrErrorMessage -> groupQrErrorMessage = null
            }
        },
    )

    LaunchedEffect(initialGroupQrToken) {
        if (initialGroupQrToken.isNullOrBlank()) return@LaunchedEffect
        if (initialGroupQrToken == qrHandledToken) return@LaunchedEffect
        pendingGroupQrToken = initialGroupQrToken
    }

    LaunchedEffect(Unit) {
        catalogFeatureHost.processIntent(CatalogIntent.RefreshCourses)
    }

    LaunchedEffect(profileUiState.courseProgress) {
        syncCatalogProgressFromProfile(
            profileUiState = profileUiState,
            catalogFeatureHost = catalogFeatureHost,
        )
    }

    ObserveEffects(catalogFeatureHost.effects) { effect ->
        when (effect) {
            is CatalogEffect.CourseOpened -> {
                courseReturnTab = selectedTab
                playerFeatureHost.openBundle(effect.bundle, startFullscreen = true)
                selectedTab = HomeTab.Learning
            }
            is CatalogEffect.CourseOpenedInLearning -> {
                courseReturnTab = selectedTab
                playerFeatureHost.openBundle(effect.bundle, startFullscreen = false, showContents = false)
                selectedTab = HomeTab.Learning
            }
            is CatalogEffect.CourseContentsOpened -> {
                courseReturnTab = selectedTab
                playerFeatureHost.openBundle(effect.bundle, startFullscreen = false, showContents = true)
                selectedTab = HomeTab.Learning
            }
            CatalogEffect.FavoriteChanged -> {
                profileFeatureHost.processIntent(ProfileIntent.RefreshFavoriteCount)
            }
        }
    }

    ObserveEffects(diagnosticsFeatureHost.effects) { effect ->
        if (effect is DiagnosticsEffect.CourseRequested) {
            catalogFeatureHost.processIntent(CatalogIntent.OpenCourse(effect.courseSlug))
        }
    }

    ObserveEffects(playerFeatureHost.effects) { effect ->
        when (effect) {
            PlayerEffect.Closed -> {
                diagnosticsFeatureHost.processIntent(DiagnosticsIntent.Refresh)
                selectedTab = courseReturnTab
            }
            PlayerEffect.FavoriteChanged -> {
                catalogFeatureHost.processIntent(CatalogIntent.RefreshCourses)
                profileFeatureHost.processIntent(ProfileIntent.RefreshFavoriteCount)
            }
            PlayerEffect.NoteCreated -> profileFeatureHost.processIntent(ProfileIntent.RefreshNotes)
            PlayerEffect.MemoSaved -> profileFeatureHost.processIntent(ProfileIntent.RefreshMemos)
            PlayerEffect.MemoRemoved -> profileFeatureHost.processIntent(ProfileIntent.RefreshMemos)
        }
    }

    ObserveEffects(profileFeatureHost.effects) { effect ->
        if (effect is ProfileEffect.LoggedOut) {
            onLoggedOut()
        }
    }

    BackHandler(enabled = selectedTab != HomeTab.Home) {
        selectedTab = HomeTab.Home
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
            groupQrErrorMessage = throwable.toUserMessage()
        }

        qrHandledToken = token
        pendingGroupQrToken = null
        onGroupQrTokenConsumed()
    }

    HomeScreen(
        selectedTab = selectedTab,
        onTabSelected = { tab -> selectedTab = tab },
        catalogUiState = catalogUiState,
        diagnosticsUiState = diagnosticsUiState,
        playerUiState = playerUiState,
        profileUiState = profileUiState,
        catalogUiEntry = catalogUiEntry,
        diagnosticsUiEntry = diagnosticsUiEntry,
        playerUiEntry = playerUiEntry,
        profileUiEntry = profileUiEntry,
        resolveUrl = playerFeatureHost::resolveImageUrl,
        snackbarHostState = snackbarHostState,
        onCatalogIntent = catalogFeatureHost::processIntent,
        onDiagnosticsIntent = diagnosticsFeatureHost::processIntent,
        onPlayerIntent = playerFeatureHost::processIntent,
        onProfileIntent = profileFeatureHost::processIntent,
        onCreateHelpRequest = { requestType, message ->
            val currentScreen = playerUiState.currentScreen
            val currentBundle = playerUiState.bundle
            progressRepository.createHelpRequest(
                CourseHelpRequestCreate(
                    requestType = requestType.backendValue,
                    message = message,
                    courseId = currentBundle?.course?.id,
                    lessonId = currentScreen?.lessonId,
                    screenKey = currentScreen?.screenKey,
                    screenTitle = currentScreen?.title,
                )
            )
            val payload = progressRepository.getMyHelpRequests()
            myHelpRequests = payload.requests
            hasUnreadHelpReplies = payload.hasUnreadStaffReplies
        },
        myHelpRequests = myHelpRequests,
        hasUnreadHelpReplies = hasUnreadHelpReplies,
        onLoadMyHelpRequests = {
            val payload = progressRepository.getMyHelpRequests()
            myHelpRequests = payload.requests
            hasUnreadHelpReplies = payload.hasUnreadStaffReplies
        },
        onMarkHelpRepliesRead = {
            progressRepository.markHelpRepliesRead()
            val payload = progressRepository.getMyHelpRequests()
            myHelpRequests = payload.requests
            hasUnreadHelpReplies = payload.hasUnreadStaffReplies
        },
        modifier = modifier,
    )
}

private suspend fun syncCatalogProgressFromProfile(
    profileUiState: ProfileUiState,
    catalogFeatureHost: CatalogFeatureHost,
) {
    profileUiState.courseProgress.forEach { course ->
        catalogFeatureHost.processIntent(
            CatalogIntent.UpdateProgress(
                courseId = course.courseId,
                completedLessons = course.completedLessons,
                totalLessons = course.totalLessons,
            )
        )
    }
}
