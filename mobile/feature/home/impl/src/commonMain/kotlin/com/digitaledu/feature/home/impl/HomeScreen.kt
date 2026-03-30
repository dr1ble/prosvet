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
import com.digitaledu.feature.catalog.api.CatalogIntent
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.catalog.api.CatalogUiState
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.player.api.PlayerUiState
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileUiEntry
import com.digitaledu.feature.profile.api.ProfileUiState
import digital_education_mobile.feature.home.`impl`.generated.resources.Res
import digital_education_mobile.feature.home.`impl`.generated.resources.home_tab_courses
import digital_education_mobile.feature.home.`impl`.generated.resources.home_tab_lesson
import digital_education_mobile.feature.home.`impl`.generated.resources.home_tab_profile
import digital_education_mobile.feature.home.`impl`.generated.resources.home_title_courses
import digital_education_mobile.feature.home.`impl`.generated.resources.home_title_lesson
import digital_education_mobile.feature.home.`impl`.generated.resources.home_title_profile
import org.jetbrains.compose.resources.stringResource

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    selectedTab: HomeTab,
    onTabSelected: (HomeTab) -> Unit,
    catalogUiState: CatalogUiState,
    playerUiState: PlayerUiState,
    profileUiState: ProfileUiState,
    catalogUiEntry: CatalogUiEntry,
    playerUiEntry: PlayerUiEntry,
    profileUiEntry: ProfileUiEntry,
    resolveUrl: (String) -> String,
    snackbarHostState: SnackbarHostState,
    onCatalogIntent: (CatalogIntent) -> Unit,
    onPlayerIntent: (PlayerIntent) -> Unit,
    onProfileIntent: (ProfileIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (playerUiEntry.shouldShowFullscreen(playerUiState)) {
        playerUiEntry.FullscreenContent(
            uiState = playerUiState,
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
                            HomeTab.Courses -> stringResource(Res.string.home_title_courses)
                            HomeTab.Lesson -> stringResource(Res.string.home_title_lesson)
                            HomeTab.Profile -> stringResource(Res.string.home_title_profile)
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
                    val label = when (tab) {
                        HomeTab.Courses -> stringResource(Res.string.home_tab_courses)
                        HomeTab.Lesson -> stringResource(Res.string.home_tab_lesson)
                        HomeTab.Profile -> stringResource(Res.string.home_tab_profile)
                    }

                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { onTabSelected(tab) },
                        icon = { Icon(imageVector = tab.icon, contentDescription = label) },
                        label = { Text(text = label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        when (selectedTab) {
            HomeTab.Courses -> {
                catalogUiEntry.Content(
                    uiState = catalogUiState,
                    onIntent = onCatalogIntent,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }

            HomeTab.Lesson -> {
                playerUiEntry.TabContent(
                    uiState = playerUiState,
                    onIntent = onPlayerIntent,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }

            HomeTab.Profile -> {
                profileUiEntry.Content(
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
