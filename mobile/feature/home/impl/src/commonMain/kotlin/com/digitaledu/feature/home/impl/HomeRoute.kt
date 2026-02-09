package com.digitaledu.feature.home.impl

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.digitaledu.core.common.di.BACKEND_BASE_URL_QUALIFIER
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.data.catalog.CatalogRepository
import kotlinx.coroutines.launch
import org.koin.core.context.GlobalContext
import org.koin.core.qualifier.named

@Composable
fun HomeRoute(
    onLoggedOut: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val authRepository = remember {
        GlobalContext.get().get<AuthRepository>()
    }
    val catalogRepository = remember {
        GlobalContext.get().get<CatalogRepository>()
    }
    val backendBaseUrl = remember {
        GlobalContext.get().get<String>(qualifier = named(BACKEND_BASE_URL_QUALIFIER))
    }
    val viewModel: HomeViewModel = viewModel(
        factory = HomeViewModel.provideFactory(catalogRepository),
    )
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var selectedTab by rememberSaveable { mutableStateOf(HomeTab.Courses) }
    var isLoggingOut by rememberSaveable { mutableStateOf(false) }
    var profileErrorMessage by rememberSaveable { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { androidx.compose.material3.SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(uiState.errorMessage) {
        val message = uiState.errorMessage ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(message = message)
        viewModel.dismissError()
    }

    val mediaAccessToken = authRepository.getCachedTokens()?.accessToken

    HomeScreen(
        selectedTab = selectedTab,
        onTabSelected = { selectedTab = it },
        uiState = uiState,
        isLoggingOut = isLoggingOut,
        profileErrorMessage = profileErrorMessage,
        snackbarHostState = snackbarHostState,
        onRefreshCourses = viewModel::loadCourses,
        onCourseClick = { course ->
            selectedTab = HomeTab.Lesson
            viewModel.openCourse(courseSlug = course.slug)
        },
        onBackToCatalog = {
            selectedTab = HomeTab.Courses
            viewModel.closeCourse()
        },
        onOpenCatalog = { selectedTab = HomeTab.Courses },
        onPreviousScreen = viewModel::goToPreviousScreen,
        onNextScreen = viewModel::goToNextScreen,
        onEnterFullscreen = viewModel::enterFullscreenPlayer,
        onExitFullscreen = viewModel::exitFullscreenMode,
        baseUrl = backendBaseUrl,
        mediaAccessToken = mediaAccessToken,
        onNavigateToScreen = viewModel::navigateToScreenKey,
        onLogout = {
            if (isLoggingOut) return@HomeScreen

            coroutineScope.launch {
                isLoggingOut = true
                profileErrorMessage = null
                runCatching {
                    authRepository.logout()
                }.onSuccess {
                    onLoggedOut()
                }.onFailure { throwable ->
                    profileErrorMessage = throwable.message ?: "Не удалось выйти из профиля"
                }
                isLoggingOut = false
            }
        },
        modifier = modifier,
    )
}
