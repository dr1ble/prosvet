package com.digitaledu.feature.home.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.SubcomposeAsyncImage
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
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
import digital_education_mobile.feature.home.`impl`.generated.resources.home_continue_learning
import digital_education_mobile.feature.home.`impl`.generated.resources.home_continue_progress
import digital_education_mobile.feature.home.`impl`.generated.resources.home_continue_start
import digital_education_mobile.feature.home.`impl`.generated.resources.home_recommended
import digital_education_mobile.feature.home.`impl`.generated.resources.home_recommended_all
import digital_education_mobile.feature.home.`impl`.generated.resources.home_search_placeholder
import digital_education_mobile.feature.home.`impl`.generated.resources.home_sos
import digital_education_mobile.feature.home.`impl`.generated.resources.home_tab_courses
import digital_education_mobile.feature.home.`impl`.generated.resources.home_tab_lesson
import digital_education_mobile.feature.home.`impl`.generated.resources.home_tab_profile
import digital_education_mobile.feature.home.`impl`.generated.resources.home_title_courses
import digital_education_mobile.feature.home.`impl`.generated.resources.home_title_lesson
import org.jetbrains.compose.resources.stringResource

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
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState)
        },
        floatingActionButton = {
            if (selectedTab == HomeTab.Courses) {
                FloatingActionButton(
                    onClick = { },
                    containerColor = MaterialTheme.colorScheme.error,
                    contentColor = MaterialTheme.colorScheme.onError,
                    shape = UiShapes.pill,
                ) {
                    Text(
                        text = stringResource(Res.string.home_sos),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        },
        bottomBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface.copy(alpha = UiOpacity.textSecondaryOnScrim))
                    .navigationBarsPadding()
                    .padding(horizontal = UiSpacing.md, vertical = UiSpacing.sm),
                horizontalArrangement = Arrangement.SpaceAround,
            ) {
                HomeTab.entries.forEach { tab ->
                    val label = when (tab) {
                        HomeTab.Courses -> stringResource(Res.string.home_tab_courses)
                        HomeTab.Lesson -> stringResource(Res.string.home_tab_lesson)
                        HomeTab.Profile -> stringResource(Res.string.home_tab_profile)
                    }
                    val selected = selectedTab == tab

                    Column(
                        modifier = Modifier
                            .clip(if (selected) UiShapes.cardXl else UiShapes.pill)
                            .background(
                                if (selected) MaterialTheme.colorScheme.primary else Color.Transparent,
                            )
                            .clickable { onTabSelected(tab) }
                            .padding(horizontal = UiSpacing.lg, vertical = UiSpacing.xs),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
                    ) {
                        Icon(
                            imageVector = tab.icon,
                            contentDescription = label,
                            tint = if (selected) {
                                MaterialTheme.colorScheme.onPrimary
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            },
                        )
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (selected) {
                                MaterialTheme.colorScheme.onPrimary
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            },
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        when (selectedTab) {
            HomeTab.Courses -> {
                HomeCoursesContent(
                    uiState = catalogUiState,
                    onOpenCourse = { slug -> onCatalogIntent(CatalogIntent.OpenCourse(slug)) },
                    onRefresh = { onCatalogIntent(CatalogIntent.RefreshCourses) },
                    onOpenLessonTab = { onTabSelected(HomeTab.Lesson) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }

            HomeTab.Lesson -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    Text(
                        text = stringResource(Res.string.home_title_lesson),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = UiSpacing.lg, vertical = UiSpacing.md),
                    )
                    playerUiEntry.TabContent(
                        uiState = playerUiState,
                        onIntent = onPlayerIntent,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = UiSpacing.md),
                    )
                }
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

@Composable
private fun HomeCoursesContent(
    uiState: CatalogUiState,
    onOpenCourse: (String) -> Unit,
    onRefresh: () -> Unit,
    onOpenLessonTab: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (uiState.isLoading && uiState.courses.isEmpty()) {
        CenteredLoadingIndicator(modifier = modifier)
        return
    }

    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.lg,
            bottom = UiSpacing.xxl + UiSpacing.xxl,
        ),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.lg),
    ) {
        item {
            Text(
                text = stringResource(Res.string.home_title_courses),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(UiShapes.cardLg)
                    .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                    .padding(UiSpacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = UiSpacing.xs),
                )
                Text(
                    text = stringResource(Res.string.home_search_placeholder),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = UiSpacing.sm),
                )
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Mic,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
        }

        item {
            ContinueLearningCard(
                course = uiState.courses.firstOrNull(),
                onStart = {
                    val firstSlug = uiState.courses.firstOrNull()?.slug
                    if (firstSlug != null) {
                        onOpenCourse(firstSlug)
                    } else {
                        onRefresh()
                    }
                },
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom,
            ) {
                Text(
                    text = stringResource(Res.string.home_recommended),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = stringResource(Res.string.home_recommended_all),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable(onClick = onOpenLessonTab),
                )
            }
        }

        if (uiState.courses.isEmpty()) {
            item {
                Text(
                    text = "Курсы загружаются. Нажмите обновить.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            itemsIndexed(
                items = uiState.courses.take(3),
                key = { _, course -> course.id },
            ) { index, course ->
                RecommendedCourseCard(
                    course = course,
                    duration = when (index) {
                        0 -> "15 мин"
                        1 -> "10 мин"
                        else -> "20 мин"
                    },
                    onClick = { onOpenCourse(course.slug) },
                )
            }
        }
    }
}

@Composable
private fun ContinueLearningCard(
    course: CatalogCourse?,
    onStart: () -> Unit,
) {
    val title = course?.title ?: "Как пользоваться\nГосуслугами"

    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.border), UiShapes.cardLg),
    ) {
        Column(modifier = Modifier.padding(UiSpacing.lg)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                    Text(
                        text = stringResource(Res.string.home_continue_learning),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier
                            .clip(UiShapes.pill)
                            .background(MaterialTheme.colorScheme.secondaryContainer)
                            .padding(horizontal = UiSpacing.md, vertical = UiSpacing.xs),
                    )
                    Text(
                        text = title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(UiShapes.cardMd)
                        .background(MaterialTheme.colorScheme.primaryFixed),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.School,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(UiSpacing.md))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = stringResource(Res.string.home_continue_progress),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = "45%",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = UiSpacing.sm)
                    .height(14.dp)
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.45f)
                        .height(14.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.primary),
                )
            }

            Row(
                modifier = Modifier
                    .padding(top = UiSpacing.lg)
                    .fillMaxWidth()
                    .clip(UiShapes.cardLg)
                    .background(MaterialTheme.colorScheme.primary)
                    .clickable(onClick = onStart)
                    .padding(vertical = UiSpacing.md),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(Res.string.home_continue_start),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onPrimary,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.width(UiSpacing.xs))
                Icon(
                    imageVector = Icons.Filled.PlayArrow,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }
    }
}

@Composable
private fun RecommendedCourseCard(
    course: CatalogCourse,
    duration: String,
    onClick: () -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.border), UiShapes.cardLg)
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
            horizontalArrangement = Arrangement.spacedBy(UiSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val imageUrl = course.coverImageUrl?.takeIf { it.isNotBlank() }
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(UiShapes.cardMd)
                    .background(MaterialTheme.colorScheme.surfaceContainer),
            ) {
                if (imageUrl == null) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                brush = Brush.linearGradient(
                                    colors = listOf(
                                        MaterialTheme.colorScheme.primaryContainer,
                                        MaterialTheme.colorScheme.primary,
                                    ),
                                ),
                            ),
                    )
                } else {
                    SubcomposeAsyncImage(
                        model = imageUrl,
                        contentDescription = course.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                        loading = {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(MaterialTheme.colorScheme.surfaceContainer),
                            )
                        },
                    )
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs)) {
                Text(
                    text = duration,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.secondary,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = course.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
