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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.rounded.AutoStories
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.BookmarkBorder
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.SupportAgent
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.SubcomposeAsyncImage
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.model.progress.GlossaryTermEntry
import com.digitaledu.core.model.progress.LessonNoteEntry
import com.digitaledu.core.model.progress.CourseHelpRequestEntry
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.core.ui.components.AccessibilityScaledControlContainer
import com.digitaledu.core.ui.components.ErrorDialog
import com.digitaledu.core.ui.components.SuccessDialog
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.accessibilityControlScale
import com.digitaledu.core.ui.components.accessibilityFocusHighlight
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.core.ui.util.BackHandler
import com.digitaledu.feature.catalog.api.CatalogCategories
import com.digitaledu.feature.catalog.api.CatalogIntent
import com.digitaledu.feature.catalog.api.CourseProgress
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.catalog.api.CatalogUiState
import com.digitaledu.feature.diagnostics.api.DiagnosticsIntent
import com.digitaledu.feature.diagnostics.api.DiagnosticsUiEntry
import com.digitaledu.feature.diagnostics.api.DiagnosticsUiState
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.player.api.PlayerUiState
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileStatus
import com.digitaledu.feature.profile.api.ProfileUiEntry
import com.digitaledu.feature.profile.api.ProfileUiState
import com.digitaledu.feature.home.impl.voice.VoiceSearchState
import com.digitaledu.feature.home.impl.voice.rememberVoiceSearchController
import digital_education_mobile.feature.home.`impl`.generated.resources.Res
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_courses_tab
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_no_courses
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_no_courses_hint
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_no_notes
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_no_notes_hint
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_notes_tab
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_remove_course
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_saved_courses
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_search_placeholder
import digital_education_mobile.feature.home.`impl`.generated.resources.favorites_title
import digital_education_mobile.feature.home.`impl`.generated.resources.glossary_bookmark
import digital_education_mobile.feature.home.`impl`.generated.resources.glossary_empty_hint
import digital_education_mobile.feature.home.`impl`.generated.resources.glossary_empty_title
import digital_education_mobile.feature.home.`impl`.generated.resources.glossary_search_placeholder
import digital_education_mobile.feature.home.`impl`.generated.resources.glossary_source_format
import digital_education_mobile.feature.home.`impl`.generated.resources.glossary_subtitle
import digital_education_mobile.feature.home.`impl`.generated.resources.glossary_title
import digital_education_mobile.feature.home.`impl`.generated.resources.home_continue_learning
import digital_education_mobile.feature.home.`impl`.generated.resources.home_continue_progress_empty
import digital_education_mobile.feature.home.`impl`.generated.resources.home_continue_progress_format
import digital_education_mobile.feature.home.`impl`.generated.resources.home_continue_select_course
import digital_education_mobile.feature.home.`impl`.generated.resources.home_continue_start
import digital_education_mobile.feature.home.`impl`.generated.resources.home_recommended
import digital_education_mobile.feature.home.`impl`.generated.resources.home_recommended_all
import digital_education_mobile.feature.home.`impl`.generated.resources.home_search_placeholder
import digital_education_mobile.feature.home.`impl`.generated.resources.home_voice_search_error
import digital_education_mobile.feature.home.`impl`.generated.resources.home_voice_search_listening
import digital_education_mobile.feature.home.`impl`.generated.resources.home_voice_search_unavailable
import digital_education_mobile.feature.home.`impl`.generated.resources.home_sos
import digital_education_mobile.feature.home.`impl`.generated.resources.home_sos_subtitle
import digital_education_mobile.feature.home.`impl`.generated.resources.home_sos_title
import digital_education_mobile.feature.home.`impl`.generated.resources.home_tab_courses
import digital_education_mobile.feature.home.`impl`.generated.resources.home_tab_lesson
import digital_education_mobile.feature.home.`impl`.generated.resources.home_tab_profile
import digital_education_mobile.feature.home.`impl`.generated.resources.home_title_courses_default
import digital_education_mobile.feature.home.`impl`.generated.resources.home_title_courses_personalized
import digital_education_mobile.feature.home.`impl`.generated.resources.home_title_lesson
import digital_education_mobile.feature.home.`impl`.generated.resources.notes_delete
import digital_education_mobile.feature.home.`impl`.generated.resources.notes_empty_hint
import digital_education_mobile.feature.home.`impl`.generated.resources.notes_empty_title
import digital_education_mobile.feature.home.`impl`.generated.resources.notes_search_placeholder
import digital_education_mobile.feature.home.`impl`.generated.resources.notes_source_format
import digital_education_mobile.feature.home.`impl`.generated.resources.notes_title
import org.jetbrains.compose.resources.stringResource
import kotlinx.coroutines.launch

private enum class HomeOverlayScreen {
    None,
    Favorites,
    Glossary,
    Notes,
    Sos,
    LearningPreview,
    Diagnostics,
}

private enum class FavoritesTab {
    Courses,
    Notes,
}

@Composable
fun HomeScreen(
    selectedTab: HomeTab,
    onTabSelected: (HomeTab) -> Unit,
    catalogUiState: CatalogUiState,
    diagnosticsUiState: DiagnosticsUiState,
    playerUiState: PlayerUiState,
    profileUiState: ProfileUiState,
    catalogUiEntry: CatalogUiEntry,
    diagnosticsUiEntry: DiagnosticsUiEntry,
    playerUiEntry: PlayerUiEntry,
    profileUiEntry: ProfileUiEntry,
    resolveUrl: (String) -> String,
    snackbarHostState: SnackbarHostState,
    onCatalogIntent: (CatalogIntent) -> Unit,
    onDiagnosticsIntent: (DiagnosticsIntent) -> Unit,
    onPlayerIntent: (PlayerIntent) -> Unit,
    onProfileIntent: (ProfileIntent) -> Unit,
    onCreateHelpRequest: suspend (SosHelpRequestType, String) -> Unit,
    myHelpRequests: List<CourseHelpRequestEntry>,
    hasUnreadHelpReplies: Boolean,
    onLoadMyHelpRequests: suspend () -> Unit,
    onMarkHelpRepliesRead: suspend () -> Unit,
    modifier: Modifier = Modifier,
 ) {
    var overlayScreen by rememberSaveable { mutableStateOf(HomeOverlayScreen.None) }
    var isProfileCompletionSkipped by rememberSaveable { mutableStateOf(false) }
    var previewCourse by remember { mutableStateOf<CatalogCourse?>(null) }


    if (playerUiEntry.shouldShowFullscreen(playerUiState)) {
        if (overlayScreen == HomeOverlayScreen.Sos) {
            SosHelpContent(
                state = buildSosHelpState(),
                onBack = { overlayScreen = HomeOverlayScreen.None },
                onCreateHelpRequest = onCreateHelpRequest,
                myHelpRequests = myHelpRequests,
                onLoadMyHelpRequests = onLoadMyHelpRequests,
                onMarkHelpRepliesRead = onMarkHelpRepliesRead,
                modifier = modifier.fillMaxSize(),
            )
            return
        }

        playerUiEntry.FullscreenContent(
            uiState = playerUiState,
            onIntent = onPlayerIntent,
            onHelpClick = { overlayScreen = HomeOverlayScreen.Sos },
            resolveUrl = resolveUrl,
            modifier = modifier,
        )
        return
    }

    val profileCompletionGateState = buildProfileCompletionGateState(
        displayName = profileUiState.displayName,
        isProfileLoaded = profileUiState.isProfileLoaded,
        isSkipped = isProfileCompletionSkipped,
    )
    if (profileCompletionGateState.requiresCompletion) {
        ProfileCompletionGateContent(
            initialDisplayName = profileUiState.displayName,
            initialEmail = profileUiState.email,
            isSubmitting = profileUiState.isUpdatingDisplayName || profileUiState.isBindingEmail,
            status = profileUiState.status,
            onSubmit = { name, email -> onProfileIntent(ProfileIntent.CompleteProfile(name, email)) },
            onSkip = { isProfileCompletionSkipped = true },
            onDismissError = { onProfileIntent(ProfileIntent.DismissError) },
            modifier = modifier.fillMaxSize(),
        )
        return
    }

    BackHandler(enabled = overlayScreen != HomeOverlayScreen.None) {
        overlayScreen = HomeOverlayScreen.None
    }

    Scaffold(
        modifier = modifier,
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState)
        },
        floatingActionButton = {
            if (selectedTab == HomeTab.Home || (selectedTab == HomeTab.Learning && playerUiState.bundle == null)) {
                Box {
                    FloatingActionButton(
                        onClick = { overlayScreen = HomeOverlayScreen.Sos },
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                        contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                        shape = UiShapes.pill,
                        modifier = Modifier
                            .size(64.dp)
                            .accessibilityTouchTarget
                            .accessibilitySemantics(
                                label = stringResource(Res.string.home_sos),
                                role = Role.Button,
                            ),
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.SupportAgent,
                            contentDescription = null,
                            modifier = Modifier.size(28.dp),
                        )
                    }
                    if (hasUnreadHelpReplies) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .size(10.dp)
                                .clip(UiShapes.pill)
                                .background(MaterialTheme.colorScheme.error),
                        )
                    }
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
                        HomeTab.Home -> stringResource(Res.string.home_tab_courses)
                        HomeTab.Learning -> stringResource(Res.string.home_tab_lesson)
                        HomeTab.Profile -> stringResource(Res.string.home_tab_profile)
                    }
                    val selected = selectedTab == tab

                    Column(
                        modifier = Modifier
                            .clip(if (selected) UiShapes.cardXl else UiShapes.pill)
                            .background(
                                if (selected) MaterialTheme.colorScheme.primary else Color.Transparent,
                            )
                            .accessibilityTouchTarget
                            .accessibilitySemantics(label = label, state = if (selected) "текущая вкладка" else null, role = Role.Tab)
                            .accessibilityFocusHighlight(shape = if (selected) UiShapes.cardXl else UiShapes.pill, color = MaterialTheme.colorScheme.secondary)
                            .clickable {
                                overlayScreen = HomeOverlayScreen.None
                                onTabSelected(tab)
                            }
                            .padding(horizontal = UiSpacing.lg, vertical = UiSpacing.xs),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
                    ) {
                        AccessibilityScaledControlContainer {
                            Column(
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
                }
            }
        },
    ) { innerPadding ->
        if (overlayScreen == HomeOverlayScreen.Favorites) {
            FavoritesContent(
                courses = catalogUiState.courses,
                progressByCourseId = catalogUiState.progressByCourseId,
                onBack = { overlayScreen = HomeOverlayScreen.None },
                onOpenCourse = { slug ->
                    overlayScreen = HomeOverlayScreen.None
                    onTabSelected(HomeTab.Learning)
                    onCatalogIntent(CatalogIntent.OpenCourse(slug))
                },
                onRemoveCourse = { courseId -> onCatalogIntent(CatalogIntent.ToggleFavorite(courseId)) },
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
            )
            return@Scaffold
        }

        if (overlayScreen == HomeOverlayScreen.Glossary) {
            GlossaryContent(
                terms = profileUiState.glossaryTerms,
                onBack = { overlayScreen = HomeOverlayScreen.None },
                onToggleBookmark = { termId -> onProfileIntent(ProfileIntent.ToggleGlossaryBookmark(termId)) },
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
            )
            return@Scaffold
        }

        if (overlayScreen == HomeOverlayScreen.Notes) {
            NotesContent(
                notes = profileUiState.notes,
                onBack = { overlayScreen = HomeOverlayScreen.None },
                onDeleteNote = { noteId -> onProfileIntent(ProfileIntent.DeleteNote(noteId)) },
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
            )
            return@Scaffold
        }

        if (overlayScreen == HomeOverlayScreen.Sos) {
            SosHelpContent(
                state = buildSosHelpState(),
                onBack = { overlayScreen = HomeOverlayScreen.None },
                onCreateHelpRequest = onCreateHelpRequest,
                myHelpRequests = myHelpRequests,
                onLoadMyHelpRequests = onLoadMyHelpRequests,
                onMarkHelpRepliesRead = onMarkHelpRepliesRead,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
            )
            return@Scaffold
        }

        if (overlayScreen == HomeOverlayScreen.Diagnostics) {
            diagnosticsUiEntry.Content(
                uiState = diagnosticsUiState,
                onIntent = onDiagnosticsIntent,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
            )
            return@Scaffold
        }

        if (overlayScreen == HomeOverlayScreen.LearningPreview) {
            val course = previewCourse
            if (course != null) {
                LearningCoursePreviewContent(
                    course = course,
                    progress = catalogUiState.progressByCourseId[course.id],
                    onBack = {
                        previewCourse = null
                        overlayScreen = HomeOverlayScreen.None
                    },
                    onStart = {
                        previewCourse = null
                        overlayScreen = HomeOverlayScreen.None
                        onCatalogIntent(CatalogIntent.OpenCourse(course.slug))
                    },
                    onContents = {
                        previewCourse = null
                        overlayScreen = HomeOverlayScreen.None
                        onCatalogIntent(CatalogIntent.OpenCourseContents(course.slug))
                    },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
                return@Scaffold
            }
            overlayScreen = HomeOverlayScreen.None
        }

        when (selectedTab) {
            HomeTab.Home -> {
                HomeCoursesContent(
                    uiState = catalogUiState,
                    diagnosticsUiState = diagnosticsUiState,
                    currentUserDisplayName = profileUiState.displayName?.trim()?.takeIf { it.isNotEmpty() },
                    onContinueCourse = { slug -> onCatalogIntent(CatalogIntent.OpenCourse(slug)) },
                    onOpenCourse = { course -> onCatalogIntent(CatalogIntent.OpenCourseInLearning(course.slug)) },
                    onOpenDiagnostics = { overlayScreen = HomeOverlayScreen.Diagnostics },
                    onOpenLearningTab = { onTabSelected(HomeTab.Learning) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }

            HomeTab.Learning -> {
                if (playerUiState.bundle != null) {
                    playerUiEntry.TabContent(
                        uiState = playerUiState,
                        onIntent = onPlayerIntent,
                        onHelpClick = { overlayScreen = HomeOverlayScreen.Sos },
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding),
                    )
                } else {
                    LearningCoursesContent(
                        uiState = catalogUiState,
                        onOpenCourse = { course -> onCatalogIntent(CatalogIntent.OpenCourseInLearning(course.slug)) },
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding),
                    )
                }
            }

            HomeTab.Profile -> {
                profileUiEntry.Content(
                    uiState = profileUiState,
                    onIntent = onProfileIntent,
                    onOpenFavorites = {
                        onCatalogIntent(CatalogIntent.RefreshCourses)
                        overlayScreen = HomeOverlayScreen.Favorites
                    },
                    onOpenGlossary = {
                        onProfileIntent(ProfileIntent.RefreshGlossary)
                        overlayScreen = HomeOverlayScreen.Glossary
                    },
                    onOpenNotes = {
                        onProfileIntent(ProfileIntent.RefreshNotes)
                        overlayScreen = HomeOverlayScreen.Notes
                    },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                )
            }
        }
    }
}

@Composable
private fun ProfileCompletionGateContent(
    initialDisplayName: String?,
    initialEmail: String?,
    isSubmitting: Boolean,
    status: ProfileStatus,
    onSubmit: (String, String?) -> Unit,
    onSkip: () -> Unit,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var displayName by rememberSaveable(initialDisplayName) {
        mutableStateOf(initialDisplayName.orEmpty())
    }
    var email by rememberSaveable(initialEmail) {
        mutableStateOf(initialEmail.orEmpty())
    }
    val formState = buildProfileCompletionFormState(displayName = displayName, email = email)
    val errorMessage = (status as? ProfileStatus.Error)?.message

    ErrorDialog(message = errorMessage, onDismiss = onDismissError)

    Box(
        modifier = modifier
            .background(MaterialTheme.colorScheme.background)
            .padding(UiSpacing.md),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            shape = UiShapes.cardXl,
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
            ),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(UiSpacing.lg),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
            ) {
                Text(
                    text = "Как вас зовут?",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Это имя будет видно в вашем профиле и прогрессе обучения.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(
                    value = displayName,
                    onValueChange = { displayName = it },
                    enabled = !isSubmitting,
                    singleLine = true,
                    label = { Text("Ваше имя") },
                    isError = formState.nameError != null && displayName.isNotEmpty(),
                    supportingText = {
                        if (formState.nameError != null && displayName.isNotEmpty()) {
                            Text(formState.nameError)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    enabled = !isSubmitting,
                    singleLine = true,
                    label = { Text("Ваша почта") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    isError = formState.emailError != null,
                    supportingText = {
                        Text(
                            text = formState.emailError
                                ?: "Почта необязательна. Ее можно добавить позже в настройках.",
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    text = "Если вы выйдете из приложения, попросите сотрудника выдать новый QR-код для входа.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(
                    onClick = { onSubmit(formState.normalizedName, formState.normalizedEmail) },
                    enabled = formState.canSubmit && !isSubmitting,
                    shape = UiShapes.cardLg,
                    modifier = Modifier
                        .fillMaxWidth()
                        .accessibilityTouchTarget
                        .accessibilitySemantics(
                            label = "Сохранить профиль и продолжить",
                            role = Role.Button,
                            enabled = formState.canSubmit && !isSubmitting,
                        ),
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                        Spacer(modifier = Modifier.width(UiSpacing.xs))
                    }
                    Text("Сохранить и продолжить")
                }
                TextButton(
                    onClick = onSkip,
                    enabled = !isSubmitting,
                    modifier = Modifier
                        .fillMaxWidth()
                        .accessibilityTouchTarget
                        .accessibilitySemantics(
                            label = "Пропустить заполнение профиля",
                            role = Role.Button,
                            enabled = !isSubmitting,
                        ),
                ) {
                    Text("Пропустить")
                }
            }
        }
    }
}

@Composable
private fun SosHelpContent(
    state: SosHelpState,
    onBack: () -> Unit,
    onCreateHelpRequest: suspend (SosHelpRequestType, String) -> Unit,
    myHelpRequests: List<CourseHelpRequestEntry>,
    onLoadMyHelpRequests: suspend () -> Unit,
    onMarkHelpRepliesRead: suspend () -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedTab by rememberSaveable { mutableStateOf(SosHelpTab.NewRequest) }
    var selectedType by rememberSaveable { mutableStateOf<SosHelpRequestType?>(null) }
    var message by rememberSaveable { mutableStateOf("") }
    var isSubmitting by rememberSaveable { mutableStateOf(false) }
    var isLoadingRequests by rememberSaveable { mutableStateOf(false) }
    var errorMessage by rememberSaveable { mutableStateOf<String?>(null) }
    var successMessage by rememberSaveable { mutableStateOf<String?>(null) }
    val formState = buildSosHelpFormState(selectedType = selectedType, message = message)
    val scope = rememberCoroutineScope()

    ErrorDialog(message = errorMessage, onDismiss = { errorMessage = null })
    SuccessDialog(message = successMessage, onDismiss = { successMessage = null })

    LaunchedEffect(selectedTab) {
        if (selectedTab == SosHelpTab.MyRequests) {
            isLoadingRequests = true
            runCatching {
                onLoadMyHelpRequests()
                onMarkHelpRepliesRead()
            }.onFailure { throwable ->
                errorMessage = throwable.toUserMessage()
            }
            isLoadingRequests = false
        }
    }

    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.md,
            bottom = UiSpacing.xxl + UiSpacing.xxl,
        ),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            ) {
                Box(
                    modifier = Modifier
                        .clip(UiShapes.pill)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .accessibilityFocusHighlight(shape = UiShapes.pill, color = MaterialTheme.colorScheme.primary)
                        .clickable(onClick = onBack)
                        .padding(UiSpacing.xs),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs)) {
                    Text(
                        text = stringResource(Res.string.home_sos_title),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = stringResource(Res.string.home_sos_subtitle),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                listOf(
                    SosHelpTab.NewRequest to "Новая заявка",
                    SosHelpTab.MyRequests to "Мои заявки",
                ).forEach { (tab, title) ->
                    val selected = selectedTab == tab
                    Button(
                        onClick = { selectedTab = tab },
                        shape = UiShapes.pill,
                        colors = if (selected) {
                            ButtonDefaults.buttonColors()
                        } else {
                            ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                                contentColor = MaterialTheme.colorScheme.onSurface,
                            )
                        },
                    ) {
                        Text(title)
                    }
                }
            }
        }

        if (selectedTab == SosHelpTab.NewRequest) item {
            OutlinedTextField(
                value = message,
                onValueChange = { message = it },
                label = { Text("Что случилось в курсе?") },
                placeholder = { Text("Например: не понимаю, что нажать на этом шаге") },
                minLines = 3,
                maxLines = 5,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        if (selectedTab == SosHelpTab.NewRequest) item {
            Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.xs)) {
                Text(
                    text = "Тип обращения",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = if (selectedType == null) "Выберите один вариант" else "Выбранный вариант можно изменить",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                state.options.forEach { option ->
                    val selected = selectedType == option.type
                    val icon = when (option.type) {
                        SosHelpRequestType.LessonHelp -> Icons.Rounded.AutoStories
                        SosHelpRequestType.MentorQuestion -> Icons.Rounded.SupportAgent
                        SosHelpRequestType.TechnicalIssue -> Icons.Rounded.Warning
                    }
                    Card(
                        shape = UiShapes.cardLg,
                        colors = CardDefaults.cardColors(
                            containerColor = if (selected) {
                                MaterialTheme.colorScheme.primaryContainer
                            } else {
                                MaterialTheme.colorScheme.surfaceContainerLowest
                            },
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(UiShapes.cardLg)
                            .accessibilityTouchTarget
                            .accessibilitySemantics(
                                label = option.title,
                                state = if (selected) "выбрано" else null,
                                role = Role.RadioButton,
                            )
                            .accessibilityFocusHighlight(shape = UiShapes.cardLg, color = MaterialTheme.colorScheme.error)
                            .clickable { selectedType = option.type }
                            .border(
                                width = 1.dp,
                                color = if (selected) {
                                    MaterialTheme.colorScheme.primaryContainer
                                } else {
                                    MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.border)
                                },
                                shape = UiShapes.cardLg,
                            ),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = UiSpacing.md, vertical = UiSpacing.sm),
                            horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(UiShapes.pill)
                                    .background(
                                        if (selected) {
                                            MaterialTheme.colorScheme.primary
                                        } else {
                                            MaterialTheme.colorScheme.errorContainer
                                        },
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = icon,
                                    contentDescription = null,
                                    tint = if (selected) {
                                        MaterialTheme.colorScheme.onPrimary
                                    } else {
                                        MaterialTheme.colorScheme.onErrorContainer
                                    },
                                )
                            }
                            Text(
                                text = option.title,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (selected) {
                                    MaterialTheme.colorScheme.onPrimaryContainer
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }
        }

        if (selectedTab == SosHelpTab.NewRequest) item {
            Button(
                enabled = formState.canSubmit && !isSubmitting,
                onClick = {
                    scope.launch {
                        isSubmitting = true
                        runCatching {
                            val requestType = formState.selectedType ?: return@launch
                            onCreateHelpRequest(requestType, formState.trimmedMessage)
                        }.onSuccess {
                            message = ""
                            successMessage = "Заявка отправлена. Вам скоро помогут."
                        }.onFailure { throwable ->
                            errorMessage = throwable.toUserMessage()
                        }
                        isSubmitting = false
                    }
                },
                shape = UiShapes.pill,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp,
                    )
                    Spacer(modifier = Modifier.width(UiSpacing.sm))
                }
                Text(text = "Отправить заявку")
            }
        }

        if (selectedTab == SosHelpTab.MyRequests) {
            if (isLoadingRequests) {
                item { CenteredLoadingIndicator(modifier = Modifier.fillMaxWidth()) }
            } else if (myHelpRequests.isEmpty()) {
                item {
                    Text(
                        text = "Пока нет заявок. Отправьте первую заявку во вкладке \"Новая заявка\".",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                items(myHelpRequests, key = { it.id }) { request ->
                    MyHelpRequestCard(request = request)
                }
            }
        }
    }
}

@Composable
private fun MyHelpRequestCard(request: CourseHelpRequestEntry) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = request.requestTypeTitle(),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = request.statusTitle(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                )
                if (request.isStaffReplyUnread) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(UiShapes.pill)
                            .background(MaterialTheme.colorScheme.error),
                    )
                }
            }
            Text(
                text = request.message,
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                text = request.staffComment ?: "Ответа пока нет",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun NotesContent(
    notes: List<LessonNoteEntry>,
    onBack: () -> Unit,
    onDeleteNote: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var query by rememberSaveable { mutableStateOf("") }
    val filteredNotes = notes.filter { note ->
        val normalizedQuery = query.trim()
        normalizedQuery.isEmpty() ||
            note.content.contains(normalizedQuery, ignoreCase = true) ||
            note.courseTitle.contains(normalizedQuery, ignoreCase = true) ||
            note.lessonTitle.contains(normalizedQuery, ignoreCase = true)
    }

    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.md,
            bottom = UiSpacing.xxl + UiSpacing.xxl,
        ),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.lg),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            ) {
                Box(
                    modifier = Modifier
                        .clip(UiShapes.pill)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .accessibilityFocusHighlight(shape = UiShapes.pill, color = MaterialTheme.colorScheme.primary)
                        .clickable(onClick = onBack)
                        .padding(UiSpacing.xs),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
                Text(
                    text = stringResource(Res.string.notes_title),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(UiShapes.cardLg)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .padding(UiSpacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            ) {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                BasicTextField(
                    value = query,
                    onValueChange = { query = it },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.titleMedium.copy(
                        color = MaterialTheme.colorScheme.onSurface,
                    ),
                    modifier = Modifier.weight(1f),
                    decorationBox = { innerTextField ->
                        if (query.isBlank()) {
                            Text(
                                text = stringResource(Res.string.notes_search_placeholder),
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        innerTextField()
                    },
                )
            }
        }

        if (filteredNotes.isEmpty()) {
            item { NotesEmptyState() }
        } else {
            items(filteredNotes, key = { note -> note.id }) { note ->
                NoteCard(
                    note = note,
                    onDelete = { onDeleteNote(note.id) },
                )
            }
        }
    }
}

@Composable
private fun NoteCard(
    note: LessonNoteEntry,
    onDelete: () -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.border), UiShapes.cardLg),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.lg),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(UiSpacing.md),
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.secondaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Description,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSecondaryContainer,
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
            ) {
                Text(
                    text = note.content,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = stringResource(
                        Res.string.notes_source_format,
                        note.courseTitle,
                        note.lessonTitle,
                    ),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Box(
                modifier = Modifier
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.errorContainer)
                    .accessibilityTouchTarget
                    .accessibilitySemantics(
                        label = stringResource(Res.string.notes_delete),
                        role = Role.Button,
                    )
                    .clickable(onClick = onDelete)
                    .padding(UiSpacing.sm),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Delete,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onErrorContainer,
                )
            }
        }
    }
}

@Composable
private fun NotesEmptyState() {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Icon(
                imageVector = Icons.Rounded.Description,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.outline,
                modifier = Modifier.size(48.dp),
            )
            Text(
                text = stringResource(Res.string.notes_empty_title),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Text(
                text = stringResource(Res.string.notes_empty_hint),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}

@Composable
private fun HomeCoursesContent(
    uiState: CatalogUiState,
    diagnosticsUiState: DiagnosticsUiState,
    currentUserDisplayName: String?,
    onContinueCourse: (String) -> Unit,
    onOpenCourse: (CatalogCourse) -> Unit,
    onOpenDiagnostics: () -> Unit,
    onOpenLearningTab: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val titleText = if (currentUserDisplayName != null) {
        stringResource(Res.string.home_title_courses_personalized, currentUserDisplayName)
    } else {
        stringResource(Res.string.home_title_courses_default)
    }

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
                text = titleText,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
        }

        val continueCourse = uiState.resolveContinueCourse()
        if (continueCourse != null) {
            item {
                ContinueLearningCard(
                    course = continueCourse,
                    progress = uiState.progressByCourseId[continueCourse.id],
                    onStart = { onContinueCourse(continueCourse.slug) },
                )
            }
        }

        item {
            DiagnosticSummaryCard(
                diagnosticsUiState = diagnosticsUiState,
                onOpenDiagnostics = onOpenDiagnostics,
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
                    modifier = Modifier
                        .accessibilityTouchTarget
                        .accessibilitySemantics(
                            label = stringResource(Res.string.home_recommended_all),
                            role = Role.Button,
                        )
                        .clickable(onClick = onOpenLearningTab),
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
            items(
                items = uiState.courses.take(3),
                key = { course -> course.id },
            ) { course ->
                RecommendedCourseCard(
                    course = course,
                    progress = uiState.progressByCourseId[course.id],
                    onClick = { onOpenCourse(course) },
                )
            }
        }
    }
}

@Composable
private fun DiagnosticSummaryCard(
    diagnosticsUiState: DiagnosticsUiState,
    onOpenDiagnostics: () -> Unit,
) {
    val isCompleted = diagnosticsUiState.hasCompletedDiagnostic
    val title = if (isCompleted) {
        "Персональная траектория готова"
    } else {
        "Соберём персональную траекторию"
    }
    val subtitle = if (isCompleted) {
        "Профиль готов. Откройте маршрут и продолжайте с подходящего шага."
    } else {
        "Ответьте на короткие вопросы, а мы подберём уровень и порядок курсов."
    }
    val buttonText = if (isCompleted) "Открыть маршрут" else "Начать диагностику"

    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.border), UiShapes.cardLg),
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            if (isCompleted) {
                Icon(
                    imageVector = Icons.Rounded.CheckCircle,
                    contentDescription = "Траектория готова",
                    tint = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(UiSpacing.md)
                        .size(30.dp),
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(UiSpacing.md),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = if (isCompleted) Modifier.padding(end = 42.dp) else Modifier,
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(
                    onClick = onOpenDiagnostics,
                    shape = UiShapes.cardMd,
                    modifier = Modifier
                        .fillMaxWidth()
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = buttonText, role = Role.Button),
                ) {
                    Text(
                        text = buttonText,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = UiSpacing.xxs),
                    )
                }
            }
        }
    }
}

@Composable
private fun LearningCoursesContent(
    uiState: CatalogUiState,
    onOpenCourse: (CatalogCourse) -> Unit,
    modifier: Modifier = Modifier,
) {
    var voiceSearchState by remember { mutableStateOf(VoiceSearchState()) }
    var selectedCategoryId by rememberSaveable { mutableStateOf(CatalogCategories.ALL_ID) }
    val unavailableMessage = stringResource(Res.string.home_voice_search_unavailable)
    val recognitionErrorMessage = stringResource(Res.string.home_voice_search_error)
    val voiceSearchController = rememberVoiceSearchController(
        unavailableMessage = unavailableMessage,
        recognitionErrorMessage = recognitionErrorMessage,
        onResult = { result -> voiceSearchState = voiceSearchState.applyResult(result) },
    )
    val filteredCourses = filterLearningCourses(
        courses = uiState.courses,
        query = voiceSearchState.query,
        selectedCategoryId = selectedCategoryId,
    )

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
                text = stringResource(Res.string.home_title_lesson),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
        }

        item {
            LearningSearchField(
                query = voiceSearchState.query,
                onQueryChange = { voiceSearchState = voiceSearchState.withQuery(it) },
                onVoiceSearchClick = {
                    voiceSearchState = voiceSearchState.startListening()
                    voiceSearchController.startListening()
                },
                isVoiceListening = voiceSearchState.isListening,
                voiceMessage = voiceSearchState.message,
                placeholder = stringResource(Res.string.home_search_placeholder),
                listeningText = stringResource(Res.string.home_voice_search_listening),
            )
        }

        item {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                contentPadding = PaddingValues(horizontal = UiSpacing.xxs),
            ) {
                items(
                    items = CatalogCategories.all,
                    key = { category -> category.id },
                ) { category ->
                    FilterChip(
                        selected = category.id == selectedCategoryId,
                        onClick = { selectedCategoryId = category.id },
                        label = { Text(text = category.label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                        ),
                    )
                }
            }
        }

        item {
            Text(
                text = stringResource(Res.string.home_recommended_all),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
        }

        if (filteredCourses.isEmpty()) {
            item {
                Text(
                    text = "Курсы не найдены",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            items(
                items = filteredCourses,
                key = { course -> course.id },
            ) { course ->
                RecommendedCourseCard(
                    course = course,
                    progress = uiState.progressByCourseId[course.id],
                    onClick = { onOpenCourse(course) },
                )
            }
        }
    }
}

@Composable
private fun LearningSearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    onVoiceSearchClick: () -> Unit,
    isVoiceListening: Boolean,
    voiceMessage: String?,
    placeholder: String,
    listeningText: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
    ) {
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
                value = query,
                onValueChange = onQueryChange,
                textStyle = MaterialTheme.typography.titleMedium.copy(color = MaterialTheme.colorScheme.onSurface),
                singleLine = true,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = UiSpacing.sm),
                decorationBox = { innerTextField ->
                    if (query.isEmpty()) {
                        Text(
                            text = placeholder,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    innerTextField()
                },
            )
            IconButton(
                onClick = onVoiceSearchClick,
                enabled = !isVoiceListening,
                modifier = Modifier
                    .size(56.dp)
                    .clip(UiShapes.pill)
                    .background(
                        if (isVoiceListening) {
                            MaterialTheme.colorScheme.tertiary
                        } else {
                            MaterialTheme.colorScheme.primary
                        }
                    )
                    .accessibilityTouchTarget
                    .accessibilitySemantics(label = "Голосовой поиск", role = Role.Button),
            ) {
                Icon(
                    imageVector = Icons.Filled.Mic,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.accessibilityControlScale,
                )
            }
        }
        val helperText = if (isVoiceListening) listeningText else voiceMessage
        helperText?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = UiSpacing.sm),
            )
        }
    }
}

@Composable
private fun FavoritesContent(
    courses: List<CatalogCourse>,
    progressByCourseId: Map<String, CourseProgress>,
    onBack: () -> Unit,
    onOpenCourse: (String) -> Unit,
    onRemoveCourse: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedTab by rememberSaveable { mutableStateOf(FavoritesTab.Courses) }
    var query by rememberSaveable { mutableStateOf("") }
    val favoriteCourses = filterFavoriteCourses(courses, query)

    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.md,
            bottom = UiSpacing.xxl + UiSpacing.xxl,
        ),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.lg),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            ) {
                Box(
                    modifier = Modifier
                        .clip(UiShapes.pill)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .accessibilityFocusHighlight(shape = UiShapes.pill, color = MaterialTheme.colorScheme.primary)
                        .clickable(onClick = onBack)
                        .padding(UiSpacing.xs),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
                Text(
                    text = stringResource(Res.string.favorites_title),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(UiShapes.cardLg)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .padding(UiSpacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            ) {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                BasicTextField(
                    value = query,
                    onValueChange = { query = it },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.titleMedium.copy(
                        color = MaterialTheme.colorScheme.onSurface,
                    ),
                    modifier = Modifier.weight(1f),
                    decorationBox = { innerTextField ->
                        if (query.isBlank()) {
                            Text(
                                text = stringResource(Res.string.favorites_search_placeholder),
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        innerTextField()
                    },
                )
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                FavoriteFilterChip(
                    label = stringResource(Res.string.favorites_courses_tab),
                    selected = selectedTab == FavoritesTab.Courses,
                    onClick = { selectedTab = FavoritesTab.Courses },
                )
                FavoriteFilterChip(
                    label = stringResource(Res.string.favorites_notes_tab),
                    selected = selectedTab == FavoritesTab.Notes,
                    onClick = { selectedTab = FavoritesTab.Notes },
                )
            }
        }

        when (selectedTab) {
            FavoritesTab.Courses -> {
                item {
                    Text(
                        text = stringResource(Res.string.favorites_saved_courses),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                }

                if (favoriteCourses.isEmpty()) {
                    item {
                        FavoritesEmptyState(
                            title = stringResource(Res.string.favorites_no_courses),
                            message = stringResource(Res.string.favorites_no_courses_hint),
                        )
                    }
                } else {
                    items(favoriteCourses, key = { course -> course.id }) { course ->
                        FavoriteCourseCard(
                            course = course,
                            progress = progressByCourseId[course.id],
                            onOpen = { onOpenCourse(course.slug) },
                            onRemove = { onRemoveCourse(course.id) },
                        )
                    }
                }
            }

            FavoritesTab.Notes -> {
                item {
                    FavoritesEmptyState(
                        title = stringResource(Res.string.favorites_no_notes),
                        message = stringResource(Res.string.favorites_no_notes_hint),
                    )
                }
            }
        }
    }
}

@Composable
private fun FavoriteFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        modifier = Modifier
            .accessibilityTouchTarget
            .accessibilitySemantics(label = label, state = if (selected) "выбрано" else null, role = Role.Tab),
        label = {
            Text(
                text = label,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
            )
        },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = MaterialTheme.colorScheme.primary,
            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
        ),
    )
}

@Composable
private fun GlossaryContent(
    terms: List<GlossaryTermEntry>,
    onBack: () -> Unit,
    onToggleBookmark: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var query by rememberSaveable { mutableStateOf("") }
    val groups = buildGlossaryGroups(terms, query)

    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.md,
            bottom = UiSpacing.xxl + UiSpacing.xxl,
        ),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.lg),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            ) {
                Box(
                    modifier = Modifier
                        .clip(UiShapes.pill)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .accessibilityFocusHighlight(shape = UiShapes.pill, color = MaterialTheme.colorScheme.primary)
                        .clickable(onClick = onBack)
                        .padding(UiSpacing.xs),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs)) {
                    Text(
                        text = stringResource(Res.string.glossary_title),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = stringResource(Res.string.glossary_subtitle),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(UiShapes.cardLg)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .padding(UiSpacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
            ) {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                BasicTextField(
                    value = query,
                    onValueChange = { query = it },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.titleMedium.copy(
                        color = MaterialTheme.colorScheme.onSurface,
                    ),
                    modifier = Modifier.weight(1f),
                    decorationBox = { innerTextField ->
                        if (query.isBlank()) {
                            Text(
                                text = stringResource(Res.string.glossary_search_placeholder),
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        innerTextField()
                    },
                )
            }
        }

        if (groups.isEmpty()) {
            item {
                GlossaryEmptyState()
            }
        } else {
            groups.forEach { group ->
                item(key = "letter-${group.letter}") {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .clip(UiShapes.pill)
                                .background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = group.letter,
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }

                items(group.terms, key = { term -> term.id }) { term ->
                    GlossaryTermCard(
                        term = term,
                        onToggleBookmark = { onToggleBookmark(term.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun GlossaryTermCard(
    term: GlossaryTermEntry,
    onToggleBookmark: () -> Unit,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.border), UiShapes.cardLg),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.lg),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(UiSpacing.md),
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.AutoStories,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
            ) {
                Text(
                    text = term.term,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = term.definition,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = stringResource(Res.string.glossary_source_format, term.courseTitle),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Box(
                modifier = Modifier
                    .clip(UiShapes.pill)
                    .background(
                        if (term.isBookmarked) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surfaceContainerHigh
                        },
                    )
                    .accessibilityTouchTarget
                    .accessibilitySemantics(
                        label = stringResource(Res.string.glossary_bookmark),
                        state = if (term.isBookmarked) "выбрано" else null,
                        role = Role.Button,
                    )
                    .clickable(onClick = onToggleBookmark)
                    .padding(UiSpacing.sm),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = if (term.isBookmarked) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                    contentDescription = null,
                    tint = if (term.isBookmarked) {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
        }
    }
}

@Composable
private fun GlossaryEmptyState() {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Icon(
                imageVector = Icons.Rounded.AutoStories,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.outline,
                modifier = Modifier.size(48.dp),
            )
            Text(
                text = stringResource(Res.string.glossary_empty_title),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Text(
                text = stringResource(Res.string.glossary_empty_hint),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}

@Composable
private fun FavoriteCourseCard(
    course: CatalogCourse,
    progress: CourseProgress?,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
) {
    val subtitle = course.description?.trim()?.takeIf { it.isNotEmpty() }
    val imageUrl = course.coverImageUrl?.takeIf { it.isNotBlank() }

    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.border), UiShapes.cardLg)
            .accessibilityTouchTarget
            .accessibilitySemantics(label = course.title, state = "избранный курс", role = Role.Button)
            .accessibilityFocusHighlight(shape = UiShapes.cardLg, color = MaterialTheme.colorScheme.primary)
            .clickable(onClick = onOpen),
    ) {
        Box {
            if (imageUrl == null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(188.dp)
                        .background(
                            Brush.linearGradient(
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
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(188.dp),
                    loading = {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(MaterialTheme.colorScheme.surfaceContainer),
                        )
                    },
                )
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(188.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                MaterialTheme.colorScheme.scrim.copy(alpha = UiOpacity.scrimOverlay),
                            ),
                        ),
                    ),
            )
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(UiSpacing.sm)
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .accessibilityTouchTarget
                    .accessibilitySemantics(
                        label = stringResource(Res.string.favorites_remove_course),
                        role = Role.Button,
                    )
                    .clickable(onClick = onRemove)
                    .padding(UiSpacing.sm),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Favorite,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            }
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(UiSpacing.lg),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
            ) {
                Text(
                    text = course.title,
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = UiOpacity.textSecondaryOnScrim),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                progress?.let {
                    Text(
                        text = "${it.completedLessons}/${it.totalLessons}",
                        style = MaterialTheme.typography.labelLarge,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun FavoritesEmptyState(
    title: String,
    message: String,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Icon(
                imageVector = Icons.Rounded.Favorite,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.outline,
                modifier = Modifier.size(48.dp),
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}

@Composable
private fun ContinueLearningCard(
    course: CatalogCourse?,
    progress: CourseProgress?,
    onStart: () -> Unit,
) {
    val title = course?.title ?: stringResource(Res.string.home_continue_select_course)
    val completedLessons = progress?.completedLessons ?: 0
    val totalLessons = progress?.totalLessons ?: 0
    val progressPercent = if (totalLessons > 0) {
        (completedLessons.toFloat() / totalLessons.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    val progressLabel = if (totalLessons > 0) {
        stringResource(Res.string.home_continue_progress_format, completedLessons, totalLessons)
    } else {
        stringResource(Res.string.home_continue_progress_empty)
    }
    val progressPercentLabel = "${(progressPercent * 100).toInt()}%"

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
                    text = progressLabel,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = progressPercentLabel,
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
                        .fillMaxWidth(progressPercent)
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
                    .accessibilityTouchTarget
                    .accessibilitySemantics(
                        label = stringResource(Res.string.home_continue_start),
                        role = Role.Button,
                    )
                    .clickable(onClick = onStart)
                    .padding(vertical = UiSpacing.md),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AccessibilityScaledControlContainer {
                    Row(
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
    }
}

@Composable
private fun RecommendedCourseCard(
    course: CatalogCourse,
    progress: CourseProgress?,
    onClick: () -> Unit,
) {
    val subtitle = course.description?.trim()?.takeIf { it.isNotEmpty() }

    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.border), UiShapes.cardLg)
            .accessibilityTouchTarget
            .accessibilitySemantics(label = course.title, state = "кнопка открыть курс", role = Role.Button)
            .accessibilityFocusHighlight(shape = UiShapes.cardLg, color = MaterialTheme.colorScheme.primary)
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

            Column(
                verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
                modifier = Modifier.weight(1f),
            ) {
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.secondary,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Text(
                    text = course.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                progress?.let {
                    val totalLessons = it.totalLessons.coerceAtLeast(1)
                    val completedLessons = it.completedLessons.coerceIn(0, totalLessons)
                    val progressFraction = completedLessons.toFloat() / totalLessons.toFloat()
                    Column(
                        verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
                        modifier = Modifier.padding(top = UiSpacing.xs),
                    ) {
                        Text(
                            text = "Прогресс: $completedLessons из $totalLessons",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold,
                        )
                        LinearProgressIndicator(
                            progress = { progressFraction },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(UiShapes.pill),
                            color = MaterialTheme.colorScheme.primary,
                            trackColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                        )
                    }
                }
            }
        }
    }
}

private fun CatalogUiState.resolveContinueCourse(): CatalogCourse? {
    val startedCourseIds = progressByCourseId
        .filterValues { progress -> progress.completedLessons > 0 && progress.completedLessons < progress.totalLessons }
        .keys
    return courses.firstOrNull { it.id in startedCourseIds }
}
