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
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.feature.home.impl.ui.CoursesContent
import com.digitaledu.feature.home.impl.ui.LessonContent
import com.digitaledu.feature.home.impl.ui.ProfileContent

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    selectedTab: HomeTab,
    onTabSelected: (HomeTab) -> Unit,
    uiState: HomeUiState,
    isLoggingOut: Boolean,
    profileErrorMessage: String?,
    snackbarHostState: SnackbarHostState,
    onRefreshCourses: () -> Unit,
    onCourseClick: (CatalogCourse) -> Unit,
    onBackToCatalog: () -> Unit,
    onOpenCatalog: () -> Unit,
    onPreviousScreen: () -> Unit,
    onNextScreen: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = when (selectedTab) {
                            HomeTab.Courses -> "Каталог курсов"
                            HomeTab.Lesson -> "Прохождение курса"
                            HomeTab.Profile -> "Профиль"
                        },
                    )
                },
                actions = {
                    if (uiState.isLoading && selectedTab != HomeTab.Profile) {
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
                    uiState = uiState,
                    onRefresh = onRefreshCourses,
                    onCourseClick = onCourseClick,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }

            HomeTab.Lesson -> {
                LessonContent(
                    uiState = uiState,
                    onBackToCatalog = onBackToCatalog,
                    onOpenCatalog = onOpenCatalog,
                    onPreviousScreen = onPreviousScreen,
                    onNextScreen = onNextScreen,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }

            HomeTab.Profile -> {
                ProfileContent(
                    isLoggingOut = isLoggingOut,
                    errorMessage = profileErrorMessage,
                    onLogout = onLogout,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }
        }
    }
}
