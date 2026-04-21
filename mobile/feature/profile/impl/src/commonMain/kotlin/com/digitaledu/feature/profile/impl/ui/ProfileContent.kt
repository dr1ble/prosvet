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
import androidx.compose.material.icons.rounded.Logout
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PersonSearch
import androidx.compose.material.icons.rounded.RecordVoiceOver
import androidx.compose.material.icons.rounded.Settings
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
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.accessibilityControlScale
import com.digitaledu.core.ui.components.accessibilityFocusHighlight
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileStatus
import com.digitaledu.feature.profile.api.ProfileUiState
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
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account_email
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_account_placeholder
import digital_education_mobile.feature.profile.`impl`.generated.resources.profile_error_dismiss
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
    val errorMessage = (uiState.status as? ProfileStatus.Error)?.message
    var section by rememberSaveable { mutableStateOf(ProfileSection.Main) }

    when (section) {
        ProfileSection.Main -> {
            ProfileMain(
                isLoggingOut = isLoggingOut,
                errorMessage = errorMessage,
                accessibilitySettings = uiState.accessibilitySettings,
                onOpenAccessibility = { section = ProfileSection.Accessibility },
                onOpenAccount = { section = ProfileSection.Account },
                onLogout = { onIntent(ProfileIntent.Logout) },
                onDismissError = { onIntent(ProfileIntent.DismissError) },
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
                onBack = { section = ProfileSection.Main },
                modifier = modifier,
            )
        }
    }
}

@Composable
private fun ProfileMain(
    isLoggingOut: Boolean,
    errorMessage: String?,
    accessibilitySettings: com.digitaledu.core.model.preferences.AccessibilitySettings,
    onOpenAccessibility: () -> Unit,
    onOpenAccount: () -> Unit,
    onLogout: () -> Unit,
    onDismissError: () -> Unit,
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
                        text = stringResource(Res.string.profile_name),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = UiSpacing.sm),
                    )
                    Text(
                        text = stringResource(Res.string.profile_title),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    Row(
                        modifier = Modifier
                            .padding(top = UiSpacing.sm)
                            .clip(UiShapes.pill)
                            .background(MaterialTheme.colorScheme.secondaryContainer)
                            .padding(horizontal = UiSpacing.md, vertical = UiSpacing.xs),
                        horizontalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Stars,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.size(16.dp),
                        )
                        Text(
                            text = stringResource(Res.string.profile_points),
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.secondary,
                            fontWeight = FontWeight.Bold,
                        )
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = UiSpacing.md),
                        horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                    ) {
                        QuickAction(
                            title = stringResource(Res.string.profile_featured),
                            counter = "32",
                            icon = Icons.Rounded.Favorite,
                            modifier = Modifier.weight(1f),
                        )
                        QuickAction(
                            title = "Словарь",
                            icon = Icons.Rounded.TextFields,
                            modifier = Modifier.weight(1f),
                        )
                        QuickAction(
                            title = "Заметки",
                            icon = Icons.Rounded.Description,
                            modifier = Modifier.weight(1f),
                        )
                    }
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
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                userScrollEnabled = false,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(252.dp),
            ) {
                item {
                    ProgressCard(
                        icon = Icons.Rounded.AutoStories,
                        value = "12",
                        subtitle = "Уроков пройдено",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
                item {
                    ProgressCard(
                        icon = Icons.Rounded.EventAvailable,
                        value = "5 дней",
                        subtitle = "Ударный темп",
                        tint = MaterialTheme.colorScheme.secondary,
                    )
                }
                item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
                    Card(
                        shape = UiShapes.cardLg,
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                        ),
                    ) {
                        Column(modifier = Modifier.padding(UiSpacing.md)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Текущий курс", fontWeight = FontWeight.Bold)
                                Text("60%", color = MaterialTheme.colorScheme.secondary)
                            }
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = UiSpacing.xs)
                                    .height(12.dp)
                                    .clip(UiShapes.pill)
                                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(0.6f)
                                        .height(12.dp)
                                        .clip(UiShapes.pill)
                                        .background(MaterialTheme.colorScheme.primary),
                                )
                            }
                            Text(
                                text = "Цифровая грамотность: Базовый уровень",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = UiSpacing.xs),
                            )
                        }
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
                subtitle = accessibilitySubtitle(accessibilitySettings),
                onClick = onOpenAccessibility,
                voiceSupport = accessibilitySettings.voiceSupport,
                tremorFilter = accessibilitySettings.tremorFilter,
            )
        }

        item {
            SettingsRow(
                icon = Icons.Rounded.Settings,
                title = stringResource(Res.string.profile_account),
                subtitle = "Персональные данные, уведомления",
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
                    Icon(imageVector = Icons.Rounded.Logout, contentDescription = null)
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

        if (errorMessage != null) {
            item {
                Card(
                    shape = UiShapes.cardMd,
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Column(modifier = Modifier.padding(UiSpacing.md)) {
                        Text(
                            text = errorMessage,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                        )
                        Text(
                            text = stringResource(Res.string.profile_error_dismiss),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier
                                .padding(top = UiSpacing.xs)
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.profile_error_dismiss),
                                    role = Role.Button,
                                )
                                .clickable(onClick = onDismissError),
                        )
                    }
                }
            }
        }
    }
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
                        text = "Этот текст меняется в зависимости от выбранных вами настроек. Мы стремимся сделать приложение удобным для каждого.",
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
                        Text("Кнопка действия")
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
                    feedbackMessage = "Размер шрифта: ${String.format("%.1f", it)}x"
                },
            )
        }
        item {
            FontScaleRow(
                icon = Icons.Rounded.Settings,
                title = stringResource(Res.string.profile_accessibility_controls_size),
                value = settings.controlScale,
                rangeStart = 1.0f,
                rangeEnd = 1.6f,
                steps = 5,
                onValueChange = {
                    onSetControlScale(it)
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
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var email by rememberSaveable { mutableStateOf("") }

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
                        Text(
                            text = stringResource(Res.string.profile_account_email),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
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
                        label = { Text(stringResource(Res.string.profile_account_placeholder)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = UiSpacing.md),
                    )

                    Button(
                        onClick = { },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = UiSpacing.md)
                            .accessibilityTouchTarget
                            .accessibilitySemantics(
                                label = stringResource(Res.string.profile_account_bind),
                                role = Role.Button,
                            ),
                        shape = UiShapes.cardLg,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                        ),
                    ) {
                        Text(
                            text = stringResource(Res.string.profile_account_bind),
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }

        item {
            SettingsRow(
                icon = Icons.Rounded.LockReset,
                title = "Смена пароля",
                subtitle = "Обновите ваш пароль",
                onClick = { },
                voiceSupport = false,
                tremorFilter = false,
            )
        }
        item {
            SettingsRow(
                icon = Icons.Rounded.NotificationsActive,
                title = "Уведомления",
                subtitle = "Настройте важные оповещения",
                onClick = { },
                voiceSupport = false,
                tremorFilter = false,
            )
        }
        item {
            SettingsRow(
                icon = Icons.Rounded.Shield,
                title = "Конфиденциальность",
                subtitle = "Управление вашими данными",
                onClick = { },
                voiceSupport = false,
                tremorFilter = false,
            )
        }
    }
}

@Composable
private fun QuickAction(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    counter: String? = null,
) {
    Card(
        shape = UiShapes.cardMd,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        modifier = modifier.heightIn(min = 96.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.sm),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                contentAlignment = Alignment.Center,
            ) {
                Icon(imageVector = icon, contentDescription = null)
            }
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = UiSpacing.xs),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (counter != null) {
                Text(
                    text = counter,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .padding(top = UiSpacing.xxs)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = UiOpacity.medium))
                        .padding(horizontal = UiSpacing.xs, vertical = 2.dp),
                )
            }
        }
    }
}

@Composable
private fun ProgressCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    subtitle: String,
    tint: Color,
) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
    ) {
        Column(modifier = Modifier.padding(UiSpacing.md)) {
            Icon(imageVector = icon, contentDescription = null, tint = tint, modifier = Modifier.size(28.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = UiSpacing.sm),
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun accessibilitySubtitle(settings: com.digitaledu.core.model.preferences.AccessibilitySettings): String {
    val active = buildList {
        if (settings.fontScale > 1.0f) add("шрифт ${String.format("%.1f", settings.fontScale)}x")
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
    rangeStart: Float = 0.9f,
    rangeEnd: Float = 1.6f,
    steps: Int = 6,
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
            Row(
                horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(text = "${String.format("%.1f", value)}x", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
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
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
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
        modifier = Modifier
            .accessibilityControlScale
            .accessibilityFocusHighlight(shape = UiShapes.cardLg, color = MaterialTheme.colorScheme.primary),
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
                        .size(52.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(28.dp),
                    )
                }
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Start,
                    )
                }
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange, modifier = Modifier.accessibilityControlScale.accessibilitySemantics(label = title, state = if (checked) "включено" else "выключено", role = Role.Switch))
        }
    }
}
