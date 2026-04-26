package com.digitaledu.feature.profile.impl.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
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
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_accessibility_controls_size
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
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_featured
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_logout
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_logout_loading
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_name
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_points
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_progress
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_settings
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_title
import org.jetbrains.compose.resources.stringResource

private enum class ProfileSection {
    Main,
    Accessibility,
    Account,
}

@Composable
fun ProfileContent(
    uiState: ProfileUiState,
    onIntent: (ProfileIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    val isLoggingOut = uiState.status is ProfileStatus.LoggingOut
    var section by rememberSaveable { mutableStateOf(ProfileSection.Main) }

    SuccessDialog(
        message = uiState.successMessage,
        onDismiss = { onIntent(ProfileIntent.DismissSuccess) },
    )

    when (section) {
        ProfileSection.Main -> {
            ProfileMain(
                displayName = uiState.displayName,
                role = uiState.role,
                accountStatus = uiState.accountStatus,
                isLoggingOut = isLoggingOut,
                accessibilitySettings = uiState.accessibilitySettings,
                courseProgress = uiState.courseProgress,
                isLoadingProgress = uiState.isLoadingProgress,
                onOpenAccessibility = { section = ProfileSection.Accessibility },
                onOpenAccount = { section = ProfileSection.Account },
                onLogout = { onIntent(ProfileIntent.Logout) },
                modifier = modifier,
            )
        }

        ProfileSection.Accessibility -> {
            AccessibilitySettingsContent(
                settings = uiState.accessibilitySettings,
                onSetFontScale = { onIntent(ProfileIntent.SetFontScale(it)) },
                onSetControlScale = { onIntent(ProfileIntent.SetControlScale(it)) },
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
                boundEmail = uiState.email,
                isBindingEmail = uiState.isBindingEmail,
                onBindEmail = { email -> onIntent(ProfileIntent.BindEmail(email)) },
                onBack = { section = ProfileSection.Main },
                modifier = modifier,
            )
        }
    }
}

@Composable
private fun ProfileMain(
    displayName: String?,
    role: String?,
    accountStatus: String?,
    isLoggingOut: Boolean,
    accessibilitySettings: com.digitaledu.core.model.preferences.AccessibilitySettings,
    courseProgress: List<CourseProgressInfo>,
    isLoadingProgress: Boolean,
    onOpenAccessibility: () -> Unit,
    onOpenAccount: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
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
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(UiShapes.pill)
                            .background(MaterialTheme.colorScheme.primaryFixed)
                            .border(4.dp, MaterialTheme.colorScheme.primaryFixed, UiShapes.pill),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Person,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(40.dp),
                        )
                    }

                    Text(
                        text = displayName?.trim()?.takeIf { it.isNotEmpty() }
                            ?: stringResource(Res.string.profile_name),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = UiSpacing.sm),
                    )
                    Text(
                        text = buildProfileSubtitle(role = role, accountStatus = accountStatus)
                            ?: stringResource(Res.string.profile_title),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
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

private fun buildProfileSubtitle(role: String?, accountStatus: String?): String? {
    val values = listOfNotNull(
        role?.trim()?.takeIf { it.isNotEmpty() },
        accountStatus?.trim()?.takeIf { it.isNotEmpty() },
    )
    return if (values.isEmpty()) null else values.joinToString(separator = " • ")
}

@Composable
fun AccessibilitySettingsContent(
    settings: com.digitaledu.core.model.preferences.AccessibilitySettings,
    onSetFontScale: (Float) -> Unit,
    onSetControlScale: (Float) -> Unit,
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
            FontScaleRow(
                icon = Icons.Rounded.Settings,
                title = stringResource(Res.string.profile_accessibility_controls_size),
                value = settings.controlScale,
                rangeStart = 1.0f,
                rangeEnd = 1.3f,
                steps = 2,
                onValueChange = {
                    onSetControlScale(it)
                    feedbackMessage = "Размер элементов управления: ${formatOneDecimal(it)}x"
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
    boundEmail: String?,
    isBindingEmail: Boolean,
    onBindEmail: (String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val normalizedBoundEmail = boundEmail?.trim().orEmpty()
    val hasBoundEmail = normalizedBoundEmail.isNotEmpty()
    var isEditingEmail by rememberSaveable { mutableStateOf(!hasBoundEmail) }
    var email by rememberSaveable { mutableStateOf(normalizedBoundEmail) }

    LaunchedEffect(normalizedBoundEmail) {
        email = normalizedBoundEmail
        isEditingEmail = normalizedBoundEmail.isEmpty()
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
            Surface(
                shape = UiShapes.cardLg,
                color = MaterialTheme.colorScheme.surfaceContainer,
            ) {
                Column(
                    modifier = Modifier.padding(UiSpacing.lg),
                    verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                ) {
                    Text(
                        text = "Дополнительные настройки профиля пока недоступны",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Когда backend-контракты для уведомлений, пароля и приватности будут готовы, эти разделы появятся здесь без ложных кнопок и заглушек.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
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
