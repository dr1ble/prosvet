package com.digitaledu.feature.home.impl

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.digitaledu.feature.home.impl.catalog.CatalogIntent
import com.digitaledu.feature.home.impl.catalog.CatalogUiState
import com.digitaledu.feature.home.impl.player.PlayerIntent
import com.digitaledu.feature.home.impl.player.PlayerUiState
import com.digitaledu.feature.home.impl.profile.ProfileIntent
import com.digitaledu.feature.home.impl.profile.ProfileUiState
import com.digitaledu.feature.home.impl.ui.CoursesContent
import com.digitaledu.feature.home.impl.ui.LessonContent
import com.digitaledu.feature.home.impl.ui.ProfileContent
import com.digitaledu.feature.home.impl.ui.player.LessonPlayerScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    selectedTab: HomeTab,
    onTabSelected: (HomeTab) -> Unit,
    catalogUiState: CatalogUiState,
    playerUiState: PlayerUiState,
    profileUiState: ProfileUiState,
    mediaAccessToken: String?,
    resolveUrl: (String) -> String,
    snackbarHostState: SnackbarHostState,
    onCatalogIntent: (CatalogIntent) -> Unit,
    onPlayerIntent: (PlayerIntent) -> Unit,
    onProfileIntent: (ProfileIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (playerUiState.isFullscreenMode && playerUiState.hasBundle) {
        val bundle = playerUiState.bundle ?: return
        LessonPlayerScreen(
            bundle = bundle,
            currentScreenIndex = playerUiState.currentScreenIndex,
            mediaAccessToken = mediaAccessToken,
            activeHotspotHint = playerUiState.activeHotspotHint,
            completedScreens = playerUiState.completedScreens,
            onIntent = onPlayerIntent,
            resolveUrl = resolveUrl,
            modifier = modifier,
        )
        return
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = when (selectedTab) {
                            HomeTab.Courses -> "Каталог курсов"
                            HomeTab.Lesson -> "Обучение"
                            HomeTab.Profile -> "Профиль"
                        },
                    )
                },
                actions = {
                    if (catalogUiState.isLoading && selectedTab != HomeTab.Profile) {
                        CircularProgressIndicator(
                            modifier = Modifier
                                .padding(end = 16.dp)
                                .size(20.dp),
                            strokeWidth = 2.dp,
                        )
                    }
                },
            )
        },
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState)
        },
        bottomBar = {
            NavigationBar {
                HomeTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { onTabSelected(tab) },
                        icon = { Icon(imageVector = tab.icon, contentDescription = tab.label) },
                        label = { Text(text = tab.label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        when (selectedTab) {
            HomeTab.Courses -> {
                CoursesContent(
                    uiState = catalogUiState,
                    onIntent = onCatalogIntent,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }

            HomeTab.Lesson -> {
                LessonContent(
                    uiState = playerUiState,
                    onIntent = onPlayerIntent,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }

            HomeTab.Profile -> {
                ProfileContent(
                    uiState = profileUiState,
                    onIntent = onProfileIntent,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }
        }
    }
}
