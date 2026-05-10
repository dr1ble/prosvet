package com.digitaledu.feature.profile.impl.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.rounded.AutoStories
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Contrast
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.LockReset
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PersonSearch
import androidx.compose.material.icons.rounded.RecordVoiceOver
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.Stars
import androidx.compose.material.icons.rounded.TextFields
import androidx.compose.material.icons.rounded.Vibration
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.digitaledu.core.common.formatOneDecimal
import com.digitaledu.core.ui.components.SuccessDialog
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.AccessibilityScaledControlContainer
import com.digitaledu.core.ui.components.AccessibilitySettingHeader
import com.digitaledu.core.ui.components.AccessibilityStackedControlRow
import com.digitaledu.core.ui.components.accessibilityControlScale
import com.digitaledu.core.ui.components.accessibilityFocusHighlight
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileStatus
import com.digitaledu.feature.profile.api.ProfileUiState
import com.digitaledu.core.model.progress.CourseProgressInfo
import digital_education_mobile.feature.profile.`impl`.generated.resources.Res
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_accessibility
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_accessibility_font_size
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_accessibility_bold_text
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_accessibility_reset
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_accessibility_large_text
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_accessibility_preview
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_accessibility_tremor
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_accessibility_voice
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account_bind
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account_bound_label
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account_cancel
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account_change
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account_save
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account_email
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account_placeholder
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_achievement_dictionary
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_achievement_favorites
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_achievement_first_course
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_achievement_notes
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_achievements_title
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_featured
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_dictionary
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_logout
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_logout_loading
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_name
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_notes
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_points
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_progress
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_progress_courses_format
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_progress_lessons_format
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_progress_summary_title
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_settings
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_title
import org.jetbrains.compose.resources.stringResource

private enum class ProfileSection {
    Main,
    Progress,
    Accessibility,
    Account,
    Memos,
    MemoDetail,
}

@Composable
fun ProfileContent(
    uiState: ProfileUiState,
    onIntent: (ProfileIntent) -> Unit,
    onOpenFavorites: () -> Unit = {},
    onOpenGlossary: () -> Unit = {},
    onOpenNotes: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val isLoggingOut = uiState.status is ProfileStatus.LoggingOut
    var section by rememberSaveable { mutableStateOf(ProfileSection.Main) }
    var selectedMemoId by rememberSaveable { mutableStateOf<String?>(null) }

    SuccessDialog(
        message = uiState.successMessage,
        onDismiss = { onIntent(ProfileIntent.DismissSuccess) },
    )

    when (section) {
        ProfileSection.Main -> {
            ProfileMain(
                displayName = uiState.displayName,
                avatarKey = uiState.avatarKey,
                avatarUrl = uiState.avatarUrl,
                role = null,
                accountStatus = uiState.accountStatus,
                isLoggingOut = isLoggingOut,
                accessibilitySettings = uiState.accessibilitySettings,
                courseProgress = uiState.courseProgress,
                favoriteCourseCount = uiState.favoriteCourseCount,
                glossaryTermCount = uiState.glossaryTerms.size,
                noteCount = uiState.notes.size,
                memoCount = uiState.memos.size,
                isLoadingProgress = uiState.isLoadingProgress,
                onOpenFavorites = onOpenFavorites,
                onOpenGlossary = onOpenGlossary,
                onOpenNotes = onOpenNotes,
                onOpenMemos = {
                    onIntent(ProfileIntent.RefreshMemos)
                    section = ProfileSection.Memos
                },
                onOpenProgress = { section = ProfileSection.Progress },
                onOpenAccessibility = { section = ProfileSection.Accessibility },
                onOpenAccount = { section = ProfileSection.Account },
                onLogout = { onIntent(ProfileIntent.Logout) },
                modifier = modifier,
            )
        }

        ProfileSection.Memos -> {
            MemosListContent(
                memos = uiState.memos,
                onOpenMemo = { memoId ->
                    selectedMemoId = memoId
                    section = ProfileSection.MemoDetail
                },
                onBack = { section = ProfileSection.Main },
                modifier = modifier,
            )
        }

        ProfileSection.MemoDetail -> {
            val memo = uiState.memos.firstOrNull { it.id == selectedMemoId }
            if (memo == null) {
                section = ProfileSection.Memos
                selectedMemoId = null
            } else {
                MemoDetailContent(
                    memo = memo,
                    onBack = { section = ProfileSection.Memos },
                    onDelete = {
                        onIntent(ProfileIntent.DeleteMemo(memo.id))
                        selectedMemoId = null
                        section = ProfileSection.Memos
                    },
                    modifier = modifier,
                )
            }
        }

        ProfileSection.Progress -> {
            ProgressDetailsContent(
                courseProgress = uiState.courseProgress,
                favoriteCourseCount = uiState.favoriteCourseCount,
                glossaryTermCount = uiState.glossaryTerms.size,
                noteCount = uiState.notes.size,
                isLoadingProgress = uiState.isLoadingProgress,
                onBack = { section = ProfileSection.Main },
                modifier = modifier,
            )
        }

        ProfileSection.Accessibility -> {
            AccessibilitySettingsContent(
                settings = uiState.accessibilitySettings,
                onSetFontScale = { onIntent(ProfileIntent.SetFontScale(it)) },
                onSetBoldText = { onIntent(ProfileIntent.SetBoldText(it)) },
                onResetAccessibility = { onIntent(ProfileIntent.ResetAccessibility) },
                onSetHighContrast = { onIntent(ProfileIntent.SetHighContrast(it)) },
                onSetVoiceSupport = { onIntent(ProfileIntent.SetVoiceSupport(it)) },
                onSetTremorFilter = { onIntent(ProfileIntent.SetTremorFilter(it)) },
                onBack = { section = ProfileSection.Main },
                modifier = modifier,
            )
        }

        ProfileSection.Account -> {
            AccountSettings(
                displayName = uiState.displayName,
                avatarKey = uiState.avatarKey,
                avatarUrl = uiState.avatarUrl,
                boundEmail = uiState.email,
                isUpdatingDisplayName = uiState.isUpdatingDisplayName,
                isUpdatingAvatar = uiState.isUpdatingAvatar,
                isBindingEmail = uiState.isBindingEmail,
                isChangingPassword = uiState.isChangingPassword,
                isUpdatingSettings = uiState.isUpdatingAccountSettings,
                learningRemindersEnabled = uiState.learningRemindersEnabled,
                securityAlertsEnabled = uiState.securityAlertsEnabled,
                profileVisible = uiState.profileVisible,
                onUpdateDisplayName = { name -> onIntent(ProfileIntent.UpdateDisplayName(name)) },
                onUploadAvatar = { filename, contentType, content ->
                    onIntent(ProfileIntent.UploadAvatar(filename, contentType, content))
                },
                onBindEmail = { email -> onIntent(ProfileIntent.BindEmail(email)) },
                onChangePassword = { current, new -> onIntent(ProfileIntent.ChangePassword(current, new)) },
                onSetLearningReminders = { onIntent(ProfileIntent.SetLearningReminders(it)) },
                onSetSecurityAlerts = { onIntent(ProfileIntent.SetSecurityAlerts(it)) },
                onSetProfileVisible = { onIntent(ProfileIntent.SetProfileVisible(it)) },
                onBack = { section = ProfileSection.Main },
                modifier = modifier,
            )
        }
    }
}

@Composable
private fun ProfileMain(
    displayName: String?,
    avatarKey: String?,
    avatarUrl: String?,
    role: String?,
    accountStatus: String?,
    isLoggingOut: Boolean,
    accessibilitySettings: com.digitaledu.core.model.preferences.AccessibilitySettings,
    courseProgress: List<CourseProgressInfo>,
    favoriteCourseCount: Int,
    glossaryTermCount: Int,
    noteCount: Int,
    memoCount: Int,
    isLoadingProgress: Boolean,
    onOpenFavorites: () -> Unit,
    onOpenGlossary: () -> Unit,
    onOpenNotes: () -> Unit,
    onOpenMemos: () -> Unit,
    onOpenProgress: () -> Unit,
    onOpenAccessibility: () -> Unit,
    onOpenAccount: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val progressSummary = buildProfileProgressSummaryState(
        courseProgress = courseProgress,
        favoriteCourseCount = favoriteCourseCount,
        glossaryTermCount = glossaryTermCount,
        noteCount = noteCount,
    )

    LazyColumn(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.sm,
            bottom = UiSpacing.xxl,
        ),
    ) {
        item {
            Card(
                shape = UiShapes.cardLg,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                ),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(UiSpacing.lg),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                    ProfileAvatar(
                        avatarKey = avatarKey,
                        avatarUrl = avatarUrl,
                        displayName = displayName,
                        size = 82,
                    )
                    Text(
                        text = displayName?.trim()?.takeIf { it.isNotEmpty() }
                            ?: stringResource(Res.string.profile_name),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = UiSpacing.sm),
                    )
                    role?.takeIf { it.isNotBlank() }?.let { roleText ->
                        Text(
                            text = roleText,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = UiSpacing.xxs),
                        )
                    }
                }
            }
        }

        item {
            QuickProfileActions(
                favoriteCourseCount = favoriteCourseCount,
                memoCount = memoCount,
                onOpenFavorites = onOpenFavorites,
                onOpenGlossary = onOpenGlossary,
                onOpenNotes = onOpenNotes,
                onOpenMemos = onOpenMemos,
            )
        }

        item {
            Text(
                text = stringResource(Res.string.profile_progress),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = UiSpacing.xs),
            )
        }

        item {
            ProfileProgressSummaryCard(
                state = progressSummary,
                onClick = onOpenProgress,
            )
        }

        item {
            if (isLoadingProgress) {
                CircularProgressIndicator(
                    modifier = Modifier.size(32.dp),
                    strokeWidth = 3.dp,
                )
            } else if (courseProgress.isEmpty()) {
                Surface(
                    shape = UiShapes.cardLg,
                    color = MaterialTheme.colorScheme.surfaceContainerLowest,
                ) {
                    Column(
                        modifier = Modifier.padding(UiSpacing.lg),
                        verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                    ) {
                        Text(
                            text = "Пока нет пройденных уроков",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                        )
                        Text(
                            text = "Начните проходить курсы, и здесь появится ваш прогресс.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                    for (course in courseProgress) {
                        CourseProgressCard(course)
                    }
                }
            }
        }

        item {
            Text(
                text = stringResource(Res.string.profile_settings),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = UiSpacing.xs),
            )
        }

        item {
            SettingsRow(
                icon = Icons.Rounded.Visibility,
                title = stringResource(Res.string.profile_accessibility),
                subtitle = "",
                onClick = onOpenAccessibility,
                voiceSupport = accessibilitySettings.voiceSupport,
                tremorFilter = accessibilitySettings.tremorFilter,
            )
        }

        item {
            SettingsRow(
                icon = Icons.Rounded.Settings,
                title = stringResource(Res.string.profile_account),
                subtitle = "",
                onClick = onOpenAccount,
                voiceSupport = accessibilitySettings.voiceSupport,
                tremorFilter = accessibilitySettings.tremorFilter,
            )
        }

        item {
            Button(
                onClick = onLogout,
                enabled = !isLoggingOut,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = UiSpacing.md)
                    .accessibilityTouchTarget
                    .accessibilitySemantics(
                        label = if (isLoggingOut) {
                            stringResource(Res.string.profile_logout_loading)
                        } else {
                            stringResource(Res.string.profile_logout)
                        },
                        role = Role.Button,
                        enabled = !isLoggingOut,
                    ),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer,
                    contentColor = MaterialTheme.colorScheme.error,
                ),
                shape = UiShapes.cardLg,
            ) {
                if (isLoggingOut) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.error,
                    )
                } else {
                    Icon(imageVector = Icons.AutoMirrored.Rounded.Logout, contentDescription = null)
                }
                Text(
                    text = if (isLoggingOut) {
                        stringResource(Res.string.profile_logout_loading)
                    } else {
                        stringResource(Res.string.profile_logout)
                    },
                    modifier = Modifier.padding(start = UiSpacing.xs),
                    fontWeight = FontWeight.Bold,
                )
            }
        }

    }
}

@Composable
private fun QuickProfileActions(
    favoriteCourseCount: Int,
    memoCount: Int,
    onOpenFavorites: () -> Unit,
    onOpenGlossary: () -> Unit,
    onOpenNotes: () -> Unit,
    onOpenMemos: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = UiShapes.cardLg,
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
            horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            QuickProfileAction(
                icon = Icons.Rounded.Favorite,
                title = stringResource(Res.string.profile_featured),
                badge = favoriteCourseCount.toString(),
                onClick = onOpenFavorites,
                modifier = Modifier.weight(1f),
            )
            QuickProfileAction(
                icon = Icons.Rounded.AutoStories,
                title = stringResource(Res.string.profile_dictionary),
                onClick = onOpenGlossary,
                modifier = Modifier.weight(1f),
            )
            QuickProfileAction(
                icon = Icons.Rounded.Description,
                title = stringResource(Res.string.profile_notes),
                onClick = onOpenNotes,
                modifier = Modifier.weight(1f),
            )
            QuickProfileAction(
                icon = Icons.Filled.Bookmark,
                title = "Памятки",
                badge = memoCount.toString(),
                onClick = onOpenMemos,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun ProfileProgressSummaryCard(
    state: ProfileProgressSummaryState,
    onClick: (() -> Unit)? = null,
) {
    val clickModifier = if (onClick != null) {
        Modifier
            .accessibilityTouchTarget
            .accessibilitySemantics(label = "Открыть подробный прогресс", role = Role.Button)
            .accessibilityFocusHighlight(shape = UiShapes.cardLg, color = MaterialTheme.colorScheme.primary)
            .clickable(onClick = onClick)
    } else {
        Modifier
    }
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        modifier = Modifier.fillMaxWidth().then(clickModifier),
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs)) {
                    Text(
                        text = stringResource(Res.string.profile_progress_summary_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                    Text(
                        text = stringResource(
                            Res.string.profile_progress_lessons_format,
                            state.completedLessons,
                            state.totalLessons,
                        ),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
                Text(
                    text = "${state.progressPercent}%",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    fontWeight = FontWeight.Bold,
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp)
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(state.progressPercent / 100f)
                        .height(10.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.primary),
                )
            }

            Text(
                text = stringResource(Res.string.profile_progress_courses_format, state.completedCourses),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                fontWeight = FontWeight.SemiBold,
            )

            Text(
                text = stringResource(Res.string.profile_achievements_title),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                fontWeight = FontWeight.Bold,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.xs),
            ) {
                state.achievements.forEach { achievement ->
                    AchievementPill(
                        title = achievement.titleText(),
                        isUnlocked = achievement.isUnlocked,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun ProgressDetailsContent(
    courseProgress: List<CourseProgressInfo>,
    favoriteCourseCount: Int,
    glossaryTermCount: Int,
    noteCount: Int,
    isLoadingProgress: Boolean,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val summary = buildProfileProgressSummaryState(
        courseProgress = courseProgress,
        favoriteCourseCount = favoriteCourseCount,
        glossaryTermCount = glossaryTermCount,
        noteCount = noteCount,
    )
    val nextCourse = courseProgress
        .filter { it.completedLessons < it.totalLessons }
        .maxByOrNull { it.completionRate }

    LazyColumn(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.md,
            bottom = UiSpacing.xxl,
        ),
    ) {
        item {
            Box(modifier = Modifier.fillMaxWidth()) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .clip(UiShapes.pill)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .clickable(onClick = onBack)
                        .padding(UiSpacing.xs),
                )
                Text(
                    text = stringResource(Res.string.profile_progress),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
        }

        item {
            Card(
                shape = UiShapes.cardLg,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            ) {
                Column(
                    modifier = Modifier.padding(UiSpacing.xl),
                    verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box(
                        modifier = Modifier
                            .size(176.dp)
                            .clip(UiShapes.pill)
                            .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "${summary.progressPercent}%",
                            style = MaterialTheme.typography.displaySmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                    Text(
                        text = "Ваш путь к успеху",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        text = if (summary.totalLessons == 0) {
                            "Начните первый курс, и здесь появятся уроки, достижения и следующий шаг."
                        } else {
                            "Вы прошли ${summary.completedLessons} из ${summary.totalLessons} уроков. Продолжайте в том же темпе."
                        },
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                ProgressStatCard("Уроков", summary.completedLessons.toString(), Modifier.weight(1f))
                ProgressStatCard("Курсов", summary.completedCourses.toString(), Modifier.weight(1f))
                ProgressStatCard("Терминов", glossaryTermCount.toString(), Modifier.weight(1f))
            }
        }

        item {
            Text(
                text = stringResource(Res.string.profile_achievements_title),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                summary.achievements.forEach { achievement ->
                    AchievementRow(achievement)
                }
            }
        }

        item {
            Card(
                shape = UiShapes.cardLg,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
            ) {
                Column(
                    modifier = Modifier.padding(UiSpacing.lg),
                    verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                ) {
                    Text(
                        text = "Ваш следующий шаг",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onTertiaryContainer,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = nextCourse?.let { "Продолжить: ${it.courseTitle}" }
                            ?: "Выберите новый курс на главной странице",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onTertiaryContainer,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = nextCourse?.let { "${it.completedLessons} из ${it.totalLessons} уроков уже пройдено" }
                            ?: "Новые достижения появятся после следующих уроков.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onTertiaryContainer,
                    )
                }
            }
        }

        if (isLoadingProgress) {
            item { CircularProgressIndicator() }
        }

        courseProgress.forEach { course ->
            item { CourseProgressCard(course) }
        }
    }
}

@Composable
private fun ProgressStatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.md),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
        ) {
            Text(text = value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(text = label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun AchievementRow(achievement: ProfileAchievementState) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(
            containerColor = if (achievement.isUnlocked) {
                MaterialTheme.colorScheme.surfaceContainerLowest
            } else {
                MaterialTheme.colorScheme.surfaceContainer
            },
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
            horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(UiShapes.pill)
                    .background(
                        if (achievement.isUnlocked) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surfaceContainerHigh
                        },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = if (achievement.isUnlocked) Icons.Rounded.Stars else Icons.Rounded.LockReset,
                    contentDescription = null,
                    tint = if (achievement.isUnlocked) {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(text = achievement.titleText(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    text = if (achievement.isUnlocked) "Открыто" else "Пока заблокировано",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun AchievementPill(
    title: String,
    isUnlocked: Boolean,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .clip(UiShapes.cardMd)
            .background(
                if (isUnlocked) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.surfaceContainerHigh
                },
            )
            .padding(horizontal = UiSpacing.xs, vertical = UiSpacing.sm),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
    ) {
        Icon(
            imageVector = if (isUnlocked) Icons.Rounded.Stars else Icons.Rounded.EventAvailable,
            contentDescription = null,
            tint = if (isUnlocked) {
                MaterialTheme.colorScheme.onPrimary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
            modifier = Modifier.size(22.dp),
        )
        Text(
            text = title,
            style = MaterialTheme.typography.labelSmall,
            color = if (isUnlocked) {
                MaterialTheme.colorScheme.onPrimary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ProfileAchievementState.titleText(): String {
    return when (kind) {
        ProfileAchievementKind.FirstCourseCompleted -> stringResource(Res.string.profile_achievement_first_course)
        ProfileAchievementKind.FavoritesCollector -> stringResource(Res.string.profile_achievement_favorites)
        ProfileAchievementKind.DictionaryStarted -> stringResource(Res.string.profile_achievement_dictionary)
        ProfileAchievementKind.NotesStarted -> stringResource(Res.string.profile_achievement_notes)
    }
}

@Composable
private fun QuickProfileAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    badge: String? = null,
    onClick: (() -> Unit)? = null,
) {
    val clickModifier = if (onClick != null) {
        Modifier
            .accessibilityTouchTarget
            .accessibilitySemantics(label = title, role = Role.Button)
            .accessibilityFocusHighlight(shape = UiShapes.cardLg, color = MaterialTheme.colorScheme.primary)
            .clickable(onClick = onClick)
    } else {
        Modifier
    }

    Surface(
        modifier = modifier
            .height(96.dp)
            .then(clickModifier),
        shape = UiShapes.cardLg,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = UiSpacing.xs, vertical = UiSpacing.sm),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            BadgedBox(
                badge = {
                    if (!badge.isNullOrBlank() && badge != "0") {
                        Badge(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary,
                        ) {
                            Text(
                                text = badge,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                },
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.primaryFixed),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = UiSpacing.xs),
            )
        }
    }
}

@Composable
fun AccessibilitySettingsContent(
    settings: com.digitaledu.core.model.preferences.AccessibilitySettings,
    onSetFontScale: (Float) -> Unit,
    onSetBoldText: (Boolean) -> Unit,
    onResetAccessibility: () -> Unit,
    onSetHighContrast: (Boolean) -> Unit,
    onSetVoiceSupport: (Boolean) -> Unit,
    onSetTremorFilter: (Boolean) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val snackbarHostState = remember { SnackbarHostState() }
    var feedbackMessage by rememberSaveable { mutableStateOf<String?>(null) }
    val resetLabel = stringResource(Res.string.profile_accessibility_reset)
    LazyColumn(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.md,
            bottom = UiSpacing.xxl,
        ),
    ) {
        item {
            Box(modifier = Modifier.fillMaxWidth()) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .clip(UiShapes.pill)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .clickable(onClick = onBack)
                        .padding(UiSpacing.xs),
                )
                Text(
                    text = stringResource(Res.string.profile_settings),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
        }

        item {
            Text(
                text = stringResource(Res.string.profile_accessibility_preview),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            Card(
                shape = UiShapes.cardLg,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            ) {
                Column(modifier = Modifier.padding(UiSpacing.lg)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(UiShapes.pill)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.PersonSearch,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                            )
                        }
                        Column {
                            Text("Пример заголовка", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text("Так будет выглядеть текст", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Text(
                        text = "Этот блок показывает, как будут выглядеть текст и элементы управления после изменения настроек доступности.",
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.padding(top = UiSpacing.md),
                    )
                    Button(
                        onClick = { },
                        shape = UiShapes.pill,
                        modifier = Modifier
                            .padding(top = UiSpacing.md)
                            .accessibilityTouchTarget
                            .accessibilitySemantics(label = "Кнопка действия", role = Role.Button),
                    ) {
                        AccessibilityScaledControlContainer {
                            Text("Кнопка действия")
                        }
                    }
                }
            }
        }

        item {
            feedbackMessage?.let { message ->
                SnackbarHost(hostState = snackbarHostState)
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }

        item {
            FontScaleRow(
                icon = Icons.Rounded.TextFields,
                title = stringResource(Res.string.profile_accessibility_font_size),
                value = settings.fontScale,
                onValueChange = {
                    onSetFontScale(it)
                    feedbackMessage = "Размер шрифта: ${formatOneDecimal(it)}x"
                },
            )
        }
        item {
            ToggleRow(
                icon = Icons.Rounded.TextFields,
                title = stringResource(Res.string.profile_accessibility_bold_text),
                subtitle = "Усиленный вес шрифта для лучшей читаемости",
                checked = settings.boldText,
                onCheckedChange = onSetBoldText,
            )
        }
        item {
            ToggleRow(
                icon = Icons.Rounded.Contrast,
                title = "Высокий контраст",
                subtitle = "Более четкие границы и цвета",
                checked = settings.highContrast,
                onCheckedChange = onSetHighContrast,
            )
        }
        item {
            ToggleRow(
                icon = Icons.Rounded.RecordVoiceOver,
                title = stringResource(Res.string.profile_accessibility_voice),
                subtitle = "Озвучивание элементов экрана",
                checked = settings.voiceSupport,
                onCheckedChange = onSetVoiceSupport,
            )
        }
        item {
            ToggleRow(
                icon = Icons.Rounded.Vibration,
                title = stringResource(Res.string.profile_accessibility_tremor),
                subtitle = "Игнорирование случайных нажатий",
                checked = settings.tremorFilter,
                onCheckedChange = onSetTremorFilter,
            )
        }
        item {
            Button(
                onClick = {
                    onResetAccessibility()
                    feedbackMessage = resetLabel
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = UiSpacing.md)
                    .accessibilityTouchTarget
                    .accessibilitySemantics(label = resetLabel, role = Role.Button),
                shape = UiShapes.cardLg,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                ),
            ) {
                Text(text = resetLabel, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun AccountSettings(
    displayName: String?,
    avatarKey: String?,
    avatarUrl: String?,
    boundEmail: String?,
    isUpdatingDisplayName: Boolean,
    isUpdatingAvatar: Boolean,
    isBindingEmail: Boolean,
    isChangingPassword: Boolean,
    isUpdatingSettings: Boolean,
    learningRemindersEnabled: Boolean,
    securityAlertsEnabled: Boolean,
    profileVisible: Boolean,
    onUpdateDisplayName: (String) -> Unit,
    onUploadAvatar: (String, String, ByteArray) -> Unit,
    onBindEmail: (String) -> Unit,
    onChangePassword: (String, String) -> Unit,
    onSetLearningReminders: (Boolean) -> Unit,
    onSetSecurityAlerts: (Boolean) -> Unit,
    onSetProfileVisible: (Boolean) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val normalizedBoundEmail = boundEmail?.trim().orEmpty()
    val hasBoundEmail = normalizedBoundEmail.isNotEmpty()
    val normalizedDisplayName = displayName?.trim().orEmpty()
    var editedDisplayName by rememberSaveable { mutableStateOf(normalizedDisplayName) }
    var isEditingEmail by rememberSaveable { mutableStateOf(!hasBoundEmail) }
    var email by rememberSaveable { mutableStateOf(normalizedBoundEmail) }
    var currentPassword by rememberSaveable { mutableStateOf("") }
    var newPassword by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(normalizedBoundEmail) {
        email = normalizedBoundEmail
        isEditingEmail = normalizedBoundEmail.isEmpty()
    }

    LaunchedEffect(normalizedDisplayName) {
        editedDisplayName = normalizedDisplayName
    }

    LazyColumn(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.md,
            bottom = UiSpacing.xxl,
        ),
    ) {
        item {
            Box(modifier = Modifier.fillMaxWidth()) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .clip(UiShapes.pill)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .clickable(onClick = onBack)
                        .padding(UiSpacing.xs),
                )
                Text(
                    text = stringResource(Res.string.profile_account),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
        }

        item {
            AccountAvatarCard(
                selectedAvatarKey = avatarKey,
                avatarUrl = avatarUrl,
                displayName = displayName,
                isUpdatingAvatar = isUpdatingAvatar,
                onUploadAvatar = onUploadAvatar,
            )
        }

        item {
            AccountNameCard(
                displayName = editedDisplayName,
                isUpdatingDisplayName = isUpdatingDisplayName,
                onDisplayNameChange = { editedDisplayName = it },
                onSubmit = { onUpdateDisplayName(editedDisplayName) },
                canSubmit = editedDisplayName.trim().length >= 2 &&
                    editedDisplayName.trim() != normalizedDisplayName,
            )
        }

        item {
            Card(
                shape = UiShapes.cardLg,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            ) {
                Column(modifier = Modifier.padding(UiSpacing.lg)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(UiShapes.pill)
                                .background(MaterialTheme.colorScheme.secondaryContainer.copy(alpha = UiOpacity.soft)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Person,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.secondary,
                            )
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = stringResource(Res.string.profile_account_email),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                            )
                            if (hasBoundEmail && !isEditingEmail) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                                ) {
                                    Icon(
                                        imageVector = Icons.Rounded.CheckCircle,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(18.dp),
                                    )
                                    Text(
                                        text = stringResource(Res.string.profile_account_bound_label),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Medium,
                                    )
                                }
                            }
                        }
                    }

                    Text(
                        text = "Укажите почту, чтобы восстановить доступ в случае потери данных. Мы отправим письмо с подтверждением.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = UiSpacing.md),
                    )

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        enabled = isEditingEmail && !isBindingEmail,
                        label = { Text(stringResource(Res.string.profile_account_placeholder)) },
                        trailingIcon = {
                            if (hasBoundEmail && !isEditingEmail) {
                                Icon(
                                    imageVector = Icons.Rounded.CheckCircle,
                                    contentDescription = stringResource(Res.string.profile_account_bound_label),
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                            }
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = UiSpacing.md),
                    )

                    if (hasBoundEmail && !isEditingEmail) {
                        Button(
                            onClick = { isEditingEmail = true },
                            enabled = !isBindingEmail,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = UiSpacing.md)
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.profile_account_change),
                                    role = Role.Button,
                                    enabled = !isBindingEmail,
                                ),
                            shape = UiShapes.cardLg,
                        ) {
                            Text(
                                text = stringResource(Res.string.profile_account_change),
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    } else {
                        Button(
                            onClick = { onBindEmail(email) },
                            enabled = !isBindingEmail && email.isNotBlank() && email != normalizedBoundEmail,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = UiSpacing.md)
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = if (hasBoundEmail) {
                                        stringResource(Res.string.profile_account_save)
                                    } else {
                                        stringResource(Res.string.profile_account_bind)
                                    },
                                    role = Role.Button,
                                    enabled = !isBindingEmail && email.isNotBlank() && email != normalizedBoundEmail,
                                ),
                            shape = UiShapes.cardLg,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                            ),
                        ) {
                            Text(
                                text = if (isBindingEmail) {
                                    "Сохраняем..."
                                } else if (hasBoundEmail) {
                                    stringResource(Res.string.profile_account_save)
                                } else {
                                    stringResource(Res.string.profile_account_bind)
                                },
                                fontWeight = FontWeight.Bold,
                            )
                        }

                        if (hasBoundEmail) {
                            Button(
                                onClick = {
                                    email = normalizedBoundEmail
                                    isEditingEmail = false
                                },
                                enabled = !isBindingEmail,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = UiSpacing.sm)
                                    .accessibilityTouchTarget
                                    .accessibilitySemantics(
                                        label = stringResource(Res.string.profile_account_cancel),
                                        role = Role.Button,
                                        enabled = !isBindingEmail,
                                    ),
                                shape = UiShapes.cardLg,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                    contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                                ),
                            ) {
                                Text(
                                    text = stringResource(Res.string.profile_account_cancel),
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }
            }
        }

        item {
            AccountPasswordCard(
                currentPassword = currentPassword,
                newPassword = newPassword,
                isChangingPassword = isChangingPassword,
                onCurrentPasswordChange = { currentPassword = it },
                onNewPasswordChange = { newPassword = it },
                onSubmit = {
                    onChangePassword(currentPassword, newPassword)
                    currentPassword = ""
                    newPassword = ""
                },
            )
        }

        item {
            AccountSwitchCard(
                icon = Icons.Rounded.NotificationsActive,
                title = "Уведомления",
                subtitle = "Напоминать о продолжении обучения",
                checked = learningRemindersEnabled,
                enabled = !isUpdatingSettings,
                onCheckedChange = onSetLearningReminders,
            )
        }

        item {
            AccountSwitchCard(
                icon = Icons.Rounded.Shield,
                title = "Безопасность",
                subtitle = "Получать предупреждения о важных действиях",
                checked = securityAlertsEnabled,
                enabled = !isUpdatingSettings,
                onCheckedChange = onSetSecurityAlerts,
            )
        }

        item {
            AccountSwitchCard(
                icon = Icons.Rounded.Visibility,
                title = "Конфиденциальность",
                subtitle = "Показывать профиль наставникам и участникам группы",
                checked = profileVisible,
                enabled = !isUpdatingSettings,
                onCheckedChange = onSetProfileVisible,
            )
        }
    }
}

private val profileAvatarKeys = listOf(
    "avatar_01",
    "avatar_02",
    "avatar_03",
    "avatar_04",
    "avatar_05",
    "avatar_06",
    "avatar_07",
    "avatar_08",
)

@Composable
private fun AccountAvatarCard(
    selectedAvatarKey: String?,
    avatarUrl: String?,
    displayName: String?,
    isUpdatingAvatar: Boolean,
    onUploadAvatar: (String, String, ByteArray) -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                ProfileAvatar(
                    avatarKey = selectedAvatarKey,
                    avatarUrl = avatarUrl,
                    displayName = displayName,
                    size = 54,
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = "Аватар", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = "Загрузите фотографию профиля в формате JPG, PNG или WebP",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            AvatarUploadPicker(
                enabled = !isUpdatingAvatar,
                isUploading = isUpdatingAvatar,
                onUploadAvatar = onUploadAvatar,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun ProfileAvatar(
    avatarKey: String?,
    avatarUrl: String?,
    displayName: String?,
    size: Int,
) {
    val effectiveKey = avatarKey?.takeIf { it in profileAvatarKeys }
    val colors = avatarColors(effectiveKey)

    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(UiShapes.pill)
            .background(colors.first),
        contentAlignment = Alignment.Center,
    ) {
        if (!avatarUrl.isNullOrBlank()) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
            )
        } else if (effectiveKey == null) {
            Text(
                text = displayName.initialsFallback(),
                style = MaterialTheme.typography.titleLarge,
                color = colors.second,
                fontWeight = FontWeight.Bold,
            )
        } else {
            Icon(
                imageVector = avatarIcon(effectiveKey),
                contentDescription = null,
                tint = colors.second,
                modifier = Modifier.size((size * 0.46f).dp),
            )
        }
    }
}

@Composable
private fun avatarColors(avatarKey: String?): Pair<Color, Color> {
    val colorScheme = MaterialTheme.colorScheme
    return when (avatarKey) {
        "avatar_01" -> colorScheme.primaryContainer to colorScheme.onPrimaryContainer
        "avatar_02" -> colorScheme.secondaryContainer to colorScheme.onSecondaryContainer
        "avatar_03" -> colorScheme.tertiaryContainer to colorScheme.onTertiaryContainer
        "avatar_04" -> colorScheme.errorContainer to colorScheme.onErrorContainer
        "avatar_05" -> colorScheme.surfaceContainerHigh to colorScheme.onSurfaceVariant
        "avatar_06" -> colorScheme.primaryContainer to colorScheme.primary
        "avatar_07" -> colorScheme.secondaryContainer to colorScheme.secondary
        "avatar_08" -> colorScheme.tertiaryContainer to colorScheme.tertiary
        else -> colorScheme.primaryContainer to colorScheme.onPrimaryContainer
    }
}

private fun avatarIcon(avatarKey: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (avatarKey) {
        "avatar_01" -> Icons.Rounded.Favorite
        "avatar_02" -> Icons.Rounded.AutoStories
        "avatar_03" -> Icons.Rounded.Stars
        "avatar_04" -> Icons.Rounded.Shield
        "avatar_05" -> Icons.Rounded.Person
        "avatar_06" -> Icons.Rounded.Description
        "avatar_07" -> Icons.Rounded.CheckCircle
        "avatar_08" -> Icons.Rounded.EventAvailable
        else -> Icons.Rounded.Person
    }
}

@Composable
internal expect fun AvatarUploadPicker(
    enabled: Boolean,
    isUploading: Boolean,
    onUploadAvatar: (String, String, ByteArray) -> Unit,
    modifier: Modifier = Modifier,
)

private fun String?.initialsFallback(): String {
    val words = this
        ?.trim()
        ?.split(Regex("\\s+"))
        ?.filter { it.isNotBlank() }
        .orEmpty()
    return words
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }
        .joinToString("")
        .ifBlank { "?" }
}

@Composable
private fun AccountNameCard(
    displayName: String,
    isUpdatingDisplayName: Boolean,
    canSubmit: Boolean,
    onDisplayNameChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                Icon(imageVector = Icons.Rounded.Person, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Text(text = "Имя в профиле", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
            OutlinedTextField(
                value = displayName,
                onValueChange = onDisplayNameChange,
                enabled = !isUpdatingDisplayName,
                label = { Text("Как вас называть") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Button(
                onClick = onSubmit,
                enabled = !isUpdatingDisplayName && canSubmit,
                shape = UiShapes.cardLg,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(text = if (isUpdatingDisplayName) "Сохраняем..." else "Сохранить имя", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun AccountPasswordCard(
    currentPassword: String,
    newPassword: String,
    isChangingPassword: Boolean,
    onCurrentPasswordChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                Icon(imageVector = Icons.Rounded.LockReset, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Text(text = "Смена пароля", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
            OutlinedTextField(
                value = currentPassword,
                onValueChange = onCurrentPasswordChange,
                enabled = !isChangingPassword,
                label = { Text("Текущий пароль") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = newPassword,
                onValueChange = onNewPasswordChange,
                enabled = !isChangingPassword,
                label = { Text("Новый пароль") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Button(
                onClick = onSubmit,
                enabled = !isChangingPassword && currentPassword.length >= 8 && newPassword.length >= 8,
                shape = UiShapes.cardLg,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(text = if (isChangingPassword) "Сохраняем..." else "Обновить пароль", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun AccountSwitchCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    enabled: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
                Column {
                    Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Switch(
                checked = checked,
                enabled = enabled,
                onCheckedChange = onCheckedChange,
            )
        }
    }
}

@Composable
private fun accessibilitySubtitle(settings: com.digitaledu.core.model.preferences.AccessibilitySettings): String {
    val active = buildList {
        if (settings.fontScale > 1.0f) add("шрифт ${formatOneDecimal(settings.fontScale)}x")
        if (settings.highContrast) add("высокий контраст")
        if (settings.voiceSupport) add("озвучивание")
        if (settings.tremorFilter) add("фильтр касаний")
    }
    return if (active.isEmpty()) {
        "Стандартный режим"
    } else {
        active.joinToString(separator = " • ")
    }
}

@Composable
private fun FontScaleRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    value: Float,
    rangeStart: Float = 1.0f,
    rangeEnd: Float = 1.6f,
    steps: Int = 5,
    onValueChange: (Float) -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            AccessibilitySettingHeader(
                icon = {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(28.dp),
                    )
                },
                title = title,
                iconSize = 52.dp,
            )
            Slider(
                value = value,
                onValueChange = { onValueChange((it * 10).toInt() / 10f) },
                valueRange = rangeStart..rangeEnd,
                steps = steps,
            )
        }
    }
}

@Composable
private fun SettingsRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    voiceSupport: Boolean,
    tremorFilter: Boolean,
) {
    val rowVerticalPadding = if (tremorFilter) UiSpacing.lg else UiSpacing.md

    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier
            .fillMaxWidth()
            .accessibilityTouchTarget
            .accessibilitySemantics(
                label = if (voiceSupport) "$title. $subtitle" else title,
                state = "кнопка настройки",
                role = Role.Button,
            )
            .accessibilityFocusHighlight(shape = UiShapes.cardLg, color = MaterialTheme.colorScheme.primary)
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = UiSpacing.md, vertical = rowVerticalPadding),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(imageVector = icon, contentDescription = null)
                }
                Column {
                    Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (subtitle.isNotBlank()) {
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Icon(
                imageVector = Icons.Rounded.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.outline,
            )
        }
    }
}

@Composable
private fun ToggleRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier.accessibilityFocusHighlight(shape = UiShapes.cardLg, color = MaterialTheme.colorScheme.primary),
    ) {
        AccessibilityStackedControlRow(
            modifier = Modifier.padding(UiSpacing.md),
            header = {
                AccessibilitySettingHeader(
                    icon = {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(28.dp),
                        )
                    },
                    title = title,
                    subtitle = subtitle,
                    iconSize = 52.dp,
                )
            },
            trailingControl = {
                AccessibilityScaledControlContainer {
                    Switch(
                        checked = checked,
                        onCheckedChange = onCheckedChange,
                        modifier = Modifier.accessibilitySemantics(label = title, state = if (checked) "включено" else "выключено", role = Role.Switch),
                    )
                }
            },
        )
    }
}

@Composable
private fun CourseProgressCard(course: CourseProgressInfo) {
    val percent = (course.completionRate * 100).toInt().coerceIn(0, 100)
    val totalLessons = course.totalLessons.coerceAtLeast(1)
    val completedDisplay = course.completedLessons.coerceAtMost(totalLessons)

    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Text(
                text = course.courseTitle,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "$completedDisplay из $totalLessons уроков",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "$percent%",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                )
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(course.completionRate.coerceIn(0f, 1f))
                        .height(8.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.primary),
                )
            }
        }
    }
}
