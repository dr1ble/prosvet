package com.digitaledu.feature.player.impl.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.SubcomposeAsyncImage
import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.content.ScreenPayload
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.core.model.content.UnknownPayload
import com.digitaledu.core.model.content.VideoPayload
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.accessibilityFocusHighlight
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.core.ui.util.BackHandler
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiState
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_all_courses
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_banks
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_choose_course_subtitle
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_course_details
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_course_progress
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_course_rating
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_course_steps
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_course_track_label
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_course_progress_label
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_course_time
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_course_your_progress
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_cybersecurity
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_gosuslugi
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_messengers
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_no_bundle_open_catalog
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_open_catalog
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_lesson_overview_title
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_lesson_progress_label
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_open_lesson
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_preview_only
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_progress_percent
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_search_placeholder
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_start_lesson
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_status_available
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_status_completed
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_status_current
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_status_locked
import digital_education_mobile.feature.player.`impl`.generated.resources.learning_you_will_learn
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_back_to_courses
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_choose_other_course
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_continue_learning
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_screen_progress
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_screen_unavailable_subtitle
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_screen_unavailable_title
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_article
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_cheat_sheet
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_completion
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_hotspot_count_few
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_hotspot_count_many
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_hotspot_count_one
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_interactive_simulation
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_question_few
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_question_many
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_question_one
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_quiz
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_start_screen
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_video
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

private enum class LearningScreen {
    Courses,
    CourseLessons,
    LessonDetails,
}

private enum class LearningCategory {
    Gosuslugi,
    Banks,
    Messengers,
    Cybersecurity,
}

private data class LearningCoursePreview(
    val id: String,
    val title: String,
    val description: String,
    val category: LearningCategory,
    val lessons: List<CatalogScreen>,
    val progressIndex: Int,
    val completedLessonsCount: Int,
    val totalLessonsCount: Int,
    val estimatedDurationMinutes: Int,
    val coverImageUrl: String,
    val isPlayableBundle: Boolean,
)

@Composable
fun LessonContent(
    uiState: PlayerUiState,
    onIntent: (PlayerIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    var activeScreen by rememberSaveable { mutableStateOf(LearningScreen.Courses) }
    val learningCourses = remember(uiState.bundle, uiState.currentScreenIndex) {
        buildLearningCoursePreviews(
            bundle = uiState.bundle,
            currentScreenIndex = uiState.currentScreenIndex,
        )
    }
    var selectedCourseId by rememberSaveable(uiState.bundle?.course?.id) {
        mutableStateOf(uiState.bundle?.course?.id)
    }
    var selectedLessonIndex by rememberSaveable { mutableStateOf(0) }

    if (selectedCourseId == null || learningCourses.none { it.id == selectedCourseId }) {
        val fallbackCourse = learningCourses.firstOrNull()
        selectedCourseId = fallbackCourse?.id
        selectedLessonIndex = fallbackCourse?.progressIndex ?: 0
    }

    val selectedCourse = learningCourses.firstOrNull { it.id == selectedCourseId }

    val initialScreen = remember(uiState.bundle) {
        if (uiState.bundle == null) LearningScreen.Courses else LearningScreen.CourseLessons
    }

    if (
        activeScreen == LearningScreen.Courses &&
        initialScreen == LearningScreen.CourseLessons &&
        selectedCourse != null
    ) {
        activeScreen = LearningScreen.CourseLessons
    }

    BackHandler(enabled = activeScreen != LearningScreen.Courses) {
        activeScreen = when (activeScreen) {
            LearningScreen.LessonDetails -> LearningScreen.CourseLessons
            LearningScreen.CourseLessons -> LearningScreen.Courses
            LearningScreen.Courses -> LearningScreen.Courses
        }
    }

    when (activeScreen) {
        LearningScreen.Courses -> LearningCoursesScreen(
            courses = learningCourses,
            onOpenCourse = { courseId ->
                val course = learningCourses.firstOrNull { it.id == courseId } ?: return@LearningCoursesScreen
                selectedCourseId = course.id
                selectedLessonIndex = course.progressIndex
                    .coerceIn(0, course.lessons.lastIndex.coerceAtLeast(0))
                activeScreen = LearningScreen.CourseLessons
            },
            modifier = modifier,
        )

        LearningScreen.CourseLessons -> {
            val course = selectedCourse ?: return
            LearningCourseLessonsScreen(
                selectedCourse = course,
                selectedLessonIndex = selectedLessonIndex,
                onSelectLesson = { index ->
                    selectedLessonIndex = index
                },
                onBackToCourses = {
                    activeScreen = LearningScreen.Courses
                },
                onOpenDetails = {
                    activeScreen = LearningScreen.LessonDetails
                },
                onOpenPlayableLesson = { screen ->
                    onIntent(PlayerIntent.NavigateToScreen(screen.screenKey))
                },
                modifier = modifier,
            )
        }

        LearningScreen.LessonDetails -> {
            val course = selectedCourse ?: return
            LearningLessonDetailsScreen(
                selectedCourse = course,
                selectedLessonIndex = selectedLessonIndex,
                onStartLesson = {
                    if (course.isPlayableBundle) {
                        onIntent(PlayerIntent.EnterFullscreen)
                    }
                },
                onBack = {
                    activeScreen = LearningScreen.CourseLessons
                },
                modifier = modifier,
            )
        }
    }
}

@Composable
private fun LearningCoursesScreen(
    courses: List<LearningCoursePreview>,
    onOpenCourse: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val chips = listOf(
        stringResource(Res.string.learning_all_courses),
        stringResource(Res.string.learning_gosuslugi),
        stringResource(Res.string.learning_banks),
        stringResource(Res.string.learning_messengers),
        stringResource(Res.string.learning_cybersecurity),
    )

    val selectedChip = remember { mutableStateOf(0) }
    var searchQuery by rememberSaveable { mutableStateOf("") }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.xs,
            bottom = UiSpacing.xxl,
        ),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
    ) {
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

                BasicTextField(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = UiSpacing.sm),
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.titleMedium.copy(
                        color = MaterialTheme.colorScheme.onSurface,
                    ),
                    decorationBox = { innerTextField ->
                        if (searchQuery.isBlank()) {
                            Text(
                                text = stringResource(Res.string.learning_search_placeholder),
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        innerTextField()
                    },
                )

                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.primary)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Голосовой поиск", role = Role.Button),
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
            LazyRow(horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                itemsIndexed(chips, key = { index, _ -> index }) { index, label ->
                    FilterChip(
                        selected = selectedChip.value == index,
                        onClick = { selectedChip.value = index },
                        modifier = Modifier
                            .accessibilityTouchTarget
                            .accessibilitySemantics(label = label, role = Role.Button),
                        label = {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.titleSmall,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                        ),
                    )
                }
            }
        }

        val filteredCourses = courses.filter { course ->
            val matchesCategory = when (selectedChip.value) {
                1 -> course.category == LearningCategory.Gosuslugi
                2 -> course.category == LearningCategory.Banks
                3 -> course.category == LearningCategory.Messengers
                4 -> course.category == LearningCategory.Cybersecurity
                else -> true
            }
            val query = searchQuery.trim().lowercase()
            val matchesQuery = query.isBlank() ||
                course.title.lowercase().contains(query) ||
                course.description.lowercase().contains(query)
            matchesCategory && matchesQuery
        }

        if (filteredCourses.isEmpty()) {
            item {
                Card(
                    shape = UiShapes.cardLg,
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    ),
                ) {
                    Text(
                        text = stringResource(Res.string.learning_no_bundle_open_catalog),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(UiSpacing.lg),
                    )
                }
            }
        }

        items(filteredCourses, key = { it.id }) { course ->
            val categoryLabel = when (course.category) {
                LearningCategory.Gosuslugi -> stringResource(Res.string.learning_gosuslugi)
                LearningCategory.Banks -> stringResource(Res.string.learning_banks)
                LearningCategory.Messengers -> stringResource(Res.string.learning_messengers)
                LearningCategory.Cybersecurity -> stringResource(Res.string.learning_cybersecurity)
            }
            CoursePreviewCard(
                title = course.title,
                subtitle = course.description,
                categoryLabel = categoryLabel,
                coverImageUrl = course.coverImageUrl,
                durationText = formatDuration(course.estimatedDurationMinutes),
                progressText = stringResource(
                    Res.string.learning_course_progress,
                    course.completedLessonsCount.coerceAtMost(course.totalLessonsCount.coerceAtLeast(1)),
                    course.totalLessonsCount.coerceAtLeast(1),
                ),
                progress =
                    course.completedLessonsCount.toFloat() / course.totalLessonsCount.coerceAtLeast(1).toFloat(),
                onClick = { onOpenCourse(course.id) },
            )
        }
    }
}

@Composable
private fun CoursePreviewCard(
    title: String,
    subtitle: String,
    categoryLabel: String,
    coverImageUrl: String,
    durationText: String,
    progressText: String,
    progress: Float,
    onClick: () -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .accessibilityTouchTarget
            .accessibilitySemantics(label = title, role = Role.Button)
            .clickable(onClick = onClick),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
            Box {
                SubcomposeAsyncImage(
                    model = coverImageUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(188.dp),
                    contentScale = ContentScale.Crop,
                    loading = {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                        )
                    },
                    error = {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                        )
                    },
                )

                Surface(
                    shape = UiShapes.pill,
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(UiSpacing.md),
                ) {
                    Text(
                        text = categoryLabel.uppercase(),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.padding(horizontal = UiSpacing.sm, vertical = UiSpacing.xxs),
                    )
                }
            }

            Column(
                modifier = Modifier.padding(horizontal = UiSpacing.lg, vertical = UiSpacing.sm),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Schedule,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(UiSpacing.md),
                        )
                        Text(
                            text = durationText,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                    Text(
                        text = progressText,
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.secondary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                LinearProgressIndicator(
                    progress = { progress.coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(UiSpacing.xs)
                        .clip(UiShapes.pill),
                    color = MaterialTheme.colorScheme.secondary,
                    trackColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                )
            }
        }
    }
}

@Composable
private fun LearningCourseLessonsScreen(
    selectedCourse: LearningCoursePreview,
    selectedLessonIndex: Int,
    onSelectLesson: (Int) -> Unit,
    onBackToCourses: () -> Unit,
    onOpenDetails: () -> Unit,
    onOpenPlayableLesson: (CatalogScreen) -> Unit,
    modifier: Modifier = Modifier,
) {
    val totalSteps = selectedCourse.lessons.size.coerceAtLeast(1)
    val completedSteps = selectedCourse.completedLessonsCount.coerceIn(0, totalSteps)
    val progress = completedSteps.toFloat() / totalSteps.toFloat()
    val progressPercent = (progress * 100).toInt().coerceIn(0, 100)
    val unlockedIndex = (selectedCourse.progressIndex + 1).coerceAtMost(selectedCourse.lessons.lastIndex)

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.md,
            bottom = UiSpacing.xxl,
        ),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
    ) {
        item {
            Text(
                text = selectedCourse.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
        }

        item {
            Card(
                shape = UiShapes.cardLg,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(UiSpacing.lg),
                    verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                ) {
                    Text(
                        text = stringResource(Res.string.learning_course_progress_label),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = stringResource(
                            Res.string.learning_course_progress,
                            completedSteps,
                            totalSteps,
                        ),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = stringResource(Res.string.learning_course_your_progress, progressPercent),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(UiSpacing.xs)
                            .clip(UiShapes.pill),
                    )
                }
            }
        }

        itemsIndexed(selectedCourse.lessons, key = { _, screen -> screen.id }) { index, screen ->
            val lessonStatus = when {
                index < selectedCourse.progressIndex -> LessonStatus.Completed
                index == selectedCourse.progressIndex -> LessonStatus.InProgress
                index <= unlockedIndex -> LessonStatus.Available
                else -> LessonStatus.Locked
            }

            LessonRow(
                index = index,
                totalLessons = selectedCourse.lessons.size,
                screen = screen,
                status = lessonStatus,
                isCurrentLesson = index == selectedLessonIndex,
                onOpen = {
                    if (lessonStatus != LessonStatus.Locked) {
                        onSelectLesson(index)
                        if (selectedCourse.isPlayableBundle) {
                            onOpenPlayableLesson(screen)
                        }
                        onOpenDetails()
                    }
                },
            )
        }

        item {
            OutlinedButton(
                onClick = onBackToCourses,
                modifier = Modifier
                    .fillMaxWidth()
                    .accessibilityTouchTarget
                    .accessibilitySemantics(
                        label = stringResource(Res.string.lesson_choose_other_course),
                        role = Role.Button,
                    ),
                shape = UiShapes.cardMd,
            ) {
                Text(
                    text = stringResource(Res.string.lesson_choose_other_course),
                    style = MaterialTheme.typography.titleMedium,
                )
            }
        }
    }
}

private enum class LessonStatus {
    Completed,
    InProgress,
    Available,
    Locked,
}

@Composable
private fun LessonRow(
    index: Int,
    totalLessons: Int,
    screen: CatalogScreen,
    status: LessonStatus,
    isCurrentLesson: Boolean,
    onOpen: () -> Unit,
) {
    val rowColor = when (status) {
        LessonStatus.Completed -> MaterialTheme.colorScheme.surfaceContainerLowest
        LessonStatus.InProgress -> MaterialTheme.colorScheme.surfaceContainerLowest
        LessonStatus.Available -> MaterialTheme.colorScheme.surfaceContainerLowest
        LessonStatus.Locked -> MaterialTheme.colorScheme.surfaceContainerLow
    }

    val borderColor = if (status == LessonStatus.InProgress) {
        MaterialTheme.colorScheme.outlineVariant
    } else {
        Color.Transparent
    }

    val titleColor = if (status == LessonStatus.Locked) {
        MaterialTheme.colorScheme.onSurfaceVariant
    } else {
        MaterialTheme.colorScheme.onSurface
    }

    Card(
        shape = UiShapes.cardMd,
        colors = CardDefaults.cardColors(containerColor = rowColor),
        modifier = Modifier
            .fillMaxWidth()
            .border(width = 2.dp, color = borderColor, shape = UiShapes.cardMd)
            .accessibilityTouchTarget
            .accessibilitySemantics(
                label = screen.title,
                state = when (status) {
                    LessonStatus.Completed -> "завершён"
                    LessonStatus.InProgress -> "текущий урок"
                    LessonStatus.Available -> "доступен"
                    LessonStatus.Locked -> "недоступен"
                },
                role = Role.Button,
                enabled = status != LessonStatus.Locked,
            )
            .accessibilityFocusHighlight(shape = UiShapes.cardMd, color = MaterialTheme.colorScheme.primary)
            .clickable(enabled = status != LessonStatus.Locked, onClick = onOpen),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                when (status) {
                    LessonStatus.Completed -> Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.size(UiSpacing.xl),
                    )

                    LessonStatus.InProgress -> Surface(
                        shape = UiShapes.pill,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(UiSpacing.xl),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Filled.PlayArrow,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                            )
                        }
                    }

                    LessonStatus.Available -> Surface(
                        shape = UiShapes.pill,
                        color = MaterialTheme.colorScheme.surfaceContainerHigh,
                        modifier = Modifier.size(UiSpacing.xl),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text((index + 1).toString(), style = MaterialTheme.typography.labelLarge)
                        }
                    }

                    LessonStatus.Locked -> Icon(
                        imageVector = Icons.Filled.Lock,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.outline,
                        modifier = Modifier.size(UiSpacing.xl),
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(Res.string.learning_open_lesson, index + 1),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = screen.title,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = titleColor,
                    )
                }

                if (status == LessonStatus.Completed || status == LessonStatus.InProgress) {
                    Text(
                        text = when (status) {
                            LessonStatus.Completed -> stringResource(Res.string.learning_status_completed)
                            LessonStatus.InProgress -> stringResource(Res.string.learning_status_current)
                            LessonStatus.Available -> stringResource(Res.string.learning_status_available)
                            LessonStatus.Locked -> stringResource(Res.string.learning_status_locked)
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = when (status) {
                            LessonStatus.Completed -> MaterialTheme.colorScheme.secondary
                            LessonStatus.InProgress -> MaterialTheme.colorScheme.primary
                            LessonStatus.Available -> MaterialTheme.colorScheme.onSurfaceVariant
                            LessonStatus.Locked -> MaterialTheme.colorScheme.outline
                        },
                        fontWeight = FontWeight.Medium,
                    )
                }
            }

            if (isCurrentLesson && status == LessonStatus.InProgress) {
                Spacer(Modifier.height(UiSpacing.sm))
                val lessonProgress = ((index + 1).toFloat() / totalLessons.toFloat()).coerceIn(0f, 1f)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(Res.string.learning_lesson_progress_label),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = stringResource(
                            Res.string.learning_progress_percent,
                            (lessonProgress * 100).toInt().coerceIn(0, 100),
                        ),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.height(UiSpacing.xxs))
                LinearProgressIndicator(
                    progress = { lessonProgress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(UiSpacing.xs)
                        .clip(UiShapes.pill),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                )
            }
        }
    }
}

@Composable
private fun LearningLessonDetailsScreen(
    selectedCourse: LearningCoursePreview,
    selectedLessonIndex: Int,
    onStartLesson: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val currentScreen = selectedCourse.lessons.getOrNull(selectedLessonIndex)
    val progressPercent = ((selectedLessonIndex + 1) * 100 / selectedCourse.lessons.size.coerceAtLeast(1))
    val learningItems = remember(currentScreen) {
        currentScreen?.payload?.toLearningPoints() ?: emptyList()
    }
    val canStartLesson = selectedCourse.isPlayableBundle

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = UiSpacing.md, vertical = UiSpacing.md),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
    ) {
        Card(
            shape = UiShapes.cardLg,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        ) {
            Box {
                SubcomposeAsyncImage(
                    model = selectedCourse.coverImageUrl,
                    contentDescription = selectedCourse.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp),
                    loading = {
                        Surface(
                            modifier = Modifier.fillMaxSize(),
                            color = MaterialTheme.colorScheme.surfaceContainer,
                        ) {}
                    },
                    error = {
                        Surface(
                            modifier = Modifier.fillMaxSize(),
                            color = MaterialTheme.colorScheme.surfaceContainerHigh,
                        ) {}
                    },
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    MaterialTheme.colorScheme.scrim,
                                ),
                            ),
                        ),
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(UiSpacing.lg),
                    verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                ) {
                    Surface(
                        shape = UiShapes.pill,
                        color = MaterialTheme.colorScheme.secondaryContainer,
                    ) {
                        Text(
                            text = stringResource(Res.string.learning_course_track_label),
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            modifier = Modifier.padding(horizontal = UiSpacing.sm, vertical = UiSpacing.xxs),
                        )
                    }
                    Text(
                        text = currentScreen?.title ?: stringResource(Res.string.lesson_screen_unavailable_title),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                }
            }
        }

        LearningStatsRow(
            totalSteps = selectedCourse.lessons.size,
            progressPercent = progressPercent,
            estimatedDurationMinutes = selectedCourse.estimatedDurationMinutes,
        )

        Card(
            shape = UiShapes.cardLg,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        ) {
            Column(
                modifier = Modifier.padding(UiSpacing.lg),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            ) {
                Text(
                    text = stringResource(Res.string.learning_lesson_overview_title),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = currentScreen?.payload?.getPayloadPreview()
                        ?: stringResource(Res.string.lesson_screen_unavailable_subtitle),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        if (learningItems.isNotEmpty()) {
            Card(
                shape = UiShapes.cardLg,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
            ) {
                Column(
                    modifier = Modifier.padding(UiSpacing.lg),
                    verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                ) {
                    Text(
                        text = stringResource(Res.string.learning_you_will_learn),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    learningItems.forEach { item ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(UiSpacing.sm)
                                    .clip(UiShapes.pill)
                                    .background(MaterialTheme.colorScheme.primary),
                            )
                            Text(
                                text = item,
                                style = MaterialTheme.typography.bodyLarge,
                            )
                        }
                    }
                }
            }
        }

        Button(
            onClick = onStartLesson,
            enabled = canStartLesson,
            modifier = Modifier
                .fillMaxWidth()
                .accessibilityTouchTarget
                .accessibilitySemantics(
                    label = if (canStartLesson) {
                        stringResource(Res.string.learning_start_lesson)
                    } else {
                        stringResource(Res.string.learning_preview_only)
                    },
                    role = Role.Button,
                    enabled = canStartLesson,
                ),
            shape = UiShapes.cardMd,
            colors = ButtonDefaults.buttonColors(
                disabledContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                disabledContentColor = MaterialTheme.colorScheme.onSurfaceVariant,
            ),
        ) {
            Text(
                text = if (canStartLesson) {
                    stringResource(Res.string.learning_start_lesson)
                } else {
                    stringResource(Res.string.learning_preview_only)
                },
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(vertical = UiSpacing.xxs),
            )
        }

        OutlinedButton(
            onClick = onBack,
            modifier = Modifier
                .fillMaxWidth()
                .accessibilityTouchTarget
                .accessibilitySemantics(
                    label = stringResource(Res.string.lesson_back_to_courses),
                    role = Role.Button,
                ),
            shape = UiShapes.cardMd,
        ) {
            Text(
                text = stringResource(Res.string.lesson_back_to_courses),
                style = MaterialTheme.typography.titleMedium,
            )
        }
    }
}

@Composable
private fun LearningStatsRow(
    totalSteps: Int,
    progressPercent: Int,
    estimatedDurationMinutes: Int,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
        LearningStatCard(
            icon = {
                Icon(
                    imageVector = Icons.Filled.Schedule,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
            },
            value = pluralStringResource(
                Res.plurals.learning_course_time,
                estimatedDurationMinutes,
                estimatedDurationMinutes,
            ),
            modifier = Modifier.weight(1f),
        )
        LearningStatCard(
            icon = {
                Text("#", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleMedium)
            },
            value = stringResource(Res.string.learning_course_steps, totalSteps),
            modifier = Modifier.weight(1f),
        )
        LearningStatCard(
            icon = {
                Text("★", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleMedium)
            },
            value = if (progressPercent > 0) {
                stringResource(Res.string.learning_course_rating)
            } else {
                stringResource(Res.string.learning_course_your_progress, progressPercent)
            },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun LearningStatCard(
    icon: @Composable () -> Unit,
    value: String,
    modifier: Modifier = Modifier,
) {
    Card(
        shape = UiShapes.cardMd,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.sm),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            icon()
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )
        }
    }
}

private fun buildLearningCoursePreviews(
    bundle: CatalogBundle?,
    currentScreenIndex: Int,
): List<LearningCoursePreview> {
    val openedBundle = bundle ?: return emptyList()
    val category = inferCategoryFromTitle(openedBundle.course.title)
    return listOf(
        LearningCoursePreview(
            id = openedBundle.course.id,
            title = openedBundle.course.title,
            description = openedBundle.course.description ?: "Практический курс с пошаговыми уроками",
            category = category,
            lessons = openedBundle.screens,
            progressIndex = currentScreenIndex.coerceIn(0, openedBundle.screens.lastIndex.coerceAtLeast(0)),
            completedLessonsCount = (currentScreenIndex + 1).coerceIn(0, openedBundle.screens.size),
            totalLessonsCount = openedBundle.screens.size.coerceAtLeast(1),
            estimatedDurationMinutes = estimateDurationMinutes(openedBundle.screens),
            coverImageUrl = resolveCoverImageUrl(openedBundle.screens, category),
            isPlayableBundle = true,
        ),
    )
}

private fun formatDuration(totalMinutes: Int): String {
    if (totalMinutes < 60) {
        return "$totalMinutes минут"
    }
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return if (minutes == 0) "$hours часа" else "$hours час $minutes мин"
}

private fun estimateDurationMinutes(screens: List<CatalogScreen>): Int {
    val total = screens.sumOf { screen ->
        when (val payload = screen.payload) {
            is VideoPayload -> (payload.durationSec / 60).coerceAtLeast(1L)
            else -> 10
        }
    }
    return total.coerceAtLeast(15L).toInt()
}

private fun resolveCoverImageUrl(screens: List<CatalogScreen>, category: LearningCategory): String {
    val simulationCover = screens
        .asSequence()
        .mapNotNull { it.payload as? SimulationPayload }
        .map { it.imageUrl }
        .firstOrNull()

    if (!simulationCover.isNullOrBlank()) {
        return simulationCover
    }

    return when (category) {
        LearningCategory.Gosuslugi -> "https://lh3.googleusercontent.com/aida-public/AB6AXuDNPc7h1B1AZXRWDyhSY4RA70NpHIaz0wflGRhwQWxdLW0IpOtXfMY0PHDd2yo_i_cbSrgLJ2iwilYnaHuRIroUwM8bkf2tH6oKiWLkAECJ95jUWcA4LzBcCOR3Xb3HLgekcT0pg2kpuSAd4FIjkZdCcZKC1KLdnlf6wsU_UH2Ee809RrI90E5KPYw8kMiz5Y1luqqcheZrEaTs_QC3S30yGY1NOuMIYkVMuBCkBUPmpWRcuH0NbTjw6ptZdIqZx_YY9-IsPS6C4fKU"
        LearningCategory.Banks -> "https://lh3.googleusercontent.com/aida-public/AB6AXuBCcKwODqyUG45Tw2Nyq-Z8LfyGvVaLnKcy7KSOC_IuvyZdwvqwe-t70yg3US5qXClTMZwu4YIm6QqBXuNgHxB5mJlIDa7TXyppuCc_bMOQuaU7l1Okvi1uQzamUP2_2jjXPr94-hAqMhGMPWc_up9huCWSq0ZIMoqrQ5u0Ny4W7FkBf8JYJFqi4Dxpese_wpMkiF8tkuJICB4W_JUZd34eBuhffRAgoj97NVa3IPbRuqZp5ilfSE2s0kWtl7xWlCrVIf-FWDbvKOe3"
        LearningCategory.Messengers -> "https://lh3.googleusercontent.com/aida-public/AB6AXuDNcE6OGAOxEXYGTS8dYM7BjDVMoTRuuWYaIas1n8aWW-puqdOOiq55KIK5nZ4gxTlwpYB0CMvZX1WQUX8tU0fvjhBE8vCQR7m1oJwagmrk3FFhV_wGhfmqqPwPWYZuampmu_SXeld6JWSBzs3mI-2VdQDBxXxgtqjljtl5Nj_CqX9jPczzfDE5bn5VGvsR5nd8qZtXB_JXXprgpU0U3JhIFxOKqjVeKpwyxwr7CGM0m4fxdfMT-WMlENm0yFwf6bCXhLyH6Eaok0ds"
        LearningCategory.Cybersecurity -> "https://lh3.googleusercontent.com/aida-public/AB6AXuB_D3ISYkeIT3VOKg4vMNgxNHXgE06mHS74vRzTvsQ2oXMkEb4WasctJdHN_9-oxxa95JrCYSEnloD8DBKzXP2DarClqxwoVV-ZcLR7y8gPiB2MOYg1bF-yAqWRsYhySbfITpo8nsX0wKpjLChTGy57z3p6RJ18kbRdJQfkLdAm_hc-ty0Q8EgjWllhCM3UuVwonEr7eC-iWFyHbkLkp2llUrw83irtCpLQDnsA09p_N4xSYAecFSyN_MDQGeI92zHJMhJEN9F6uap0"
    }
}

private fun inferCategoryFromTitle(title: String): LearningCategory {
    val normalized = title.lowercase()
    return when {
        "банк" in normalized || "платеж" in normalized || "карта" in normalized -> LearningCategory.Banks
        "мессен" in normalized || "чат" in normalized || "telegram" in normalized -> LearningCategory.Messengers
        "кибер" in normalized || "безопас" in normalized || "2fa" in normalized -> LearningCategory.Cybersecurity
        else -> LearningCategory.Gosuslugi
    }
}

private fun ScreenPayload.toLearningPoints(): List<String> {
    return when (this) {
        is SimulationPayload -> listOf(
            "Разбирать сценарии и активные зоны в симуляции",
            "Проходить ключевые шаги без ошибок",
        )

        is VideoPayload -> listOf(
            "Осваивать материал через видеоруководство",
            "Повторять шаги в удобном темпе",
        )

        is ArticlePayload -> listOf(
            "Читать инструкцию простым языком",
            "Закреплять материал через примеры",
        )

        is QuizPayload -> listOf(
            "Проверять знания на коротком тесте",
            "Получать мгновенную обратную связь",
        )

        is CheatSheetPayload -> listOf(
            "Сохранять ключевые тезисы урока",
            "Быстро возвращаться к важным пунктам",
        )

        is UnknownPayload -> listOf("Изучать дополнительный материал урока")
    }
}

@Composable
private fun ScreenPayload.getPayloadPreview(): String {
    return when (this) {
        is SimulationPayload -> {
            val parts = mutableListOf(stringResource(Res.string.payload_interactive_simulation))
            if (hotspots.isNotEmpty()) {
                val hotspotLabel = when (hotspots.size) {
                    1 -> stringResource(Res.string.payload_hotspot_count_one, hotspots.size)
                    in 2..4 -> stringResource(Res.string.payload_hotspot_count_few, hotspots.size)
                    else -> stringResource(Res.string.payload_hotspot_count_many, hotspots.size)
                }
                parts += hotspotLabel
            }
            if (isStart) parts += stringResource(Res.string.payload_start_screen)
            if (isCompletion) parts += stringResource(Res.string.payload_completion)
            parts.joinToString(separator = " • ")
        }
        is VideoPayload -> {
            val minutes = durationSec / 60
            val seconds = durationSec % 60
            stringResource(
                Res.string.payload_video,
                "${minutes}:${seconds.toString().padStart(2, '0')}",
            )
        }
        is ArticlePayload -> {
            stringResource(Res.string.payload_article, markdownContent.length)
        }
        is QuizPayload -> {
            val questionWord = when (questions.size) {
                1 -> stringResource(Res.string.payload_question_one)
                in 2..4 -> stringResource(Res.string.payload_question_few)
                else -> stringResource(Res.string.payload_question_many)
            }
            stringResource(Res.string.payload_quiz, questions.size, questionWord)
        }
        is CheatSheetPayload -> {
            stringResource(Res.string.payload_cheat_sheet)
        }
        is UnknownPayload -> {
            if (raw.length <= 100) raw else "${raw.take(100)}..."
        }
    }
}
