package com.digitaledu.feature.auth.impl

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Contrast
import androidx.compose.material.icons.rounded.RecordVoiceOver
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.TextFields
import androidx.compose.material.icons.rounded.Vibration
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.digitaledu.core.common.formatOneDecimal
import com.digitaledu.core.data.preferences.AccessibilityPreferencesRepository
import com.digitaledu.core.model.preferences.AccessibilitySettings
import com.digitaledu.core.ui.ObserveEffects
import com.digitaledu.core.ui.components.AccessibilityScaledControlContainer
import com.digitaledu.core.ui.components.AuthUiShapes
import com.digitaledu.core.ui.components.AuthUiSpacing
import com.digitaledu.core.ui.components.GradientPrimaryButton
import com.digitaledu.core.ui.components.accessibilityFocusHighlight
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import digital_education_mobile.feature.auth.`impl`.generated.resources.Res
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_start_accessibility
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_accessibility_controls_size
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_accessibility_bold_text
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_accessibility_reset
import org.jetbrains.compose.resources.stringResource
import org.koin.mp.KoinPlatform

private const val ROUTE_ONBOARDING = "auth/onboarding"
private const val ROUTE_LOGIN = "auth/login"
private const val ROUTE_REGISTER = "auth/register"
private const val ROUTE_QR = "auth/qr"
private const val ROUTE_RECOVERY = "auth/recovery"
private const val ROUTE_ACCESSIBILITY = "auth/accessibility"

@Composable
internal fun AuthRoute(
    onAuthenticated: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel = remember { KoinPlatform.getKoin().get<AuthViewModel>() }
    val accessibilityPreferencesRepository = remember {
        KoinPlatform.getKoin().get<AccessibilityPreferencesRepository>()
    }
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var initialLogin by rememberSaveable { mutableStateOf<String?>(null) }
    var initialPassword by rememberSaveable { mutableStateOf<String?>(null) }

    ObserveEffects(viewModel.effects) { effect ->
        when (effect) {
            AuthEffect.Authenticated -> onAuthenticated()
            is AuthEffect.InitialCredentialsReady -> {
                initialLogin = effect.login
                initialPassword = effect.password
            }
        }
    }

    val pendingLogin = initialLogin
    val pendingPassword = initialPassword
    if (pendingLogin != null && pendingPassword != null) {
        InitialCredentialsScreen(
            login = pendingLogin,
            password = pendingPassword,
            onContinue = {
                initialLogin = null
                initialPassword = null
                onAuthenticated()
            },
            modifier = modifier,
        )
        return
    }

    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = ROUTE_ONBOARDING,
        modifier = modifier,
    ) {
        composable(ROUTE_ONBOARDING) {
            OnboardingScreen(
                onStartLearning = { navController.navigate(ROUTE_LOGIN) },
                onOpenAccessibility = { navController.navigate(ROUTE_ACCESSIBILITY) },
            )
        }
        composable(ROUTE_LOGIN) {
            LoginScreen(
                uiState = uiState,
                onIntent = viewModel::processIntent,
                onOpenRegistration = { navController.navigate(ROUTE_REGISTER) },
                onOpenQrLogin = { navController.navigate(ROUTE_QR) },
                onOpenRecovery = { navController.navigate(ROUTE_RECOVERY) },
            )
        }
        composable(ROUTE_REGISTER) {
            RegistrationScreen(
                onBack = { navController.popBackStack() },
                onRegistered = onAuthenticated,
            )
        }
        composable(ROUTE_QR) {
            QrLoginScreen(
                onBack = { navController.popBackStack() },
                onManualLogin = { navController.navigate(ROUTE_LOGIN) { popUpTo(ROUTE_LOGIN) { inclusive = true } } },
                onIntent = viewModel::processIntent,
            )
        }
        composable(ROUTE_RECOVERY) {
            PasswordRecoveryScreen(
                onBack = { navController.popBackStack() },
            )
        }
        composable(ROUTE_ACCESSIBILITY) {
            val accessibilitySettings by accessibilityPreferencesRepository.settings.collectAsStateWithLifecycle(
                initialValue = AccessibilitySettings(),
            )
            AuthAccessibilityScreen(
                settings = accessibilitySettings,
                onSetFontScale = { value: Float ->
                    viewModel.updateAccessibility { copy(fontScale = value.coerceIn(1.0f, 1.6f)) }
                },
                onSetControlScale = { value: Float ->
                    viewModel.updateAccessibility { copy(controlScale = value.coerceIn(1.0f, 1.3f)) }
                },
                onSetBoldText = { enabled: Boolean ->
                    viewModel.updateAccessibility { copy(boldText = enabled) }
                },
                onResetAccessibility = { viewModel.updateAccessibility { AccessibilitySettings() } },
                onSetHighContrast = { enabled: Boolean ->
                    viewModel.updateAccessibility { copy(highContrast = enabled) }
                },
                onSetVoiceSupport = { enabled: Boolean ->
                    viewModel.updateAccessibility { copy(voiceSupport = enabled) }
                },
                onSetTremorFilter = { enabled: Boolean ->
                    viewModel.updateAccessibility { copy(tremorFilter = enabled) }
                },
                onBack = { navController.popBackStack() },
            )
        }
    }
}

@Composable
private fun InitialCredentialsScreen(
    login: String,
    password: String,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(AuthUiSpacing.screenHorizontal),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "Запишите данные для входа",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))
        Text(
            text = "Если вы выйдете из приложения, используйте эти данные для входа.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))
        CredentialCard(label = "Логин", value = login)
        Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))
        CredentialCard(label = "Пароль", value = password)
        Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))
        Text(
            text = "Логин, пароль и остальные данные можно изменить или заполнить позже в профиле.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))
        GradientPrimaryButton(
            text = "Я записал, продолжить",
            onClick = onContinue,
        )
    }
}

@Composable
private fun CredentialCard(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = AuthUiShapes.cardLg,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
        ),
    ) {
        Column(
            modifier = Modifier.padding(AuthUiSpacing.itemMd),
            verticalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemXs),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Composable
private fun AuthAccessibilityScreen(
    settings: AccessibilitySettings,
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
    val resetLabel = stringResource(Res.string.auth_accessibility_reset)
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemMd),
        contentPadding = PaddingValues(
            start = AuthUiSpacing.screenHorizontal,
            end = AuthUiSpacing.screenHorizontal,
            top = AuthUiSpacing.sectionMd,
            bottom = AuthUiSpacing.sectionLg,
        ),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemSm),
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh, AuthUiShapes.pill)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .clickable(onClick = onBack),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
                Text(
                    text = stringResource(Res.string.auth_start_accessibility),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        item{
            Spacer(modifier.height(8.dp))
        }

        item {
            Card(
                shape = AuthUiShapes.cardLg,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                ),
            ) {
                Column(modifier = Modifier.padding(AuthUiSpacing.itemMd)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemSm),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .background(
                                    MaterialTheme.colorScheme.primaryContainer,
                                    AuthUiShapes.pill,
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Visibility,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                            )
                        }
                        Column {
                            Text(
                                text = "Предпросмотр доступности",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = "Так будет выглядеть интерфейс до входа в приложение",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    Text(
                        text = "Проверьте размер текста, читаемость и удобство нажатий до авторизации.",
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.padding(top = AuthUiSpacing.itemMd),
                    )
                    Card(
                        shape = AuthUiShapes.pill,
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                        ),
                        modifier = Modifier
                            .padding(top = AuthUiSpacing.itemMd)
                            .accessibilityTouchTarget,
                    ) {
                        Text(
                            text = "Кнопка действия",
                            modifier = Modifier.padding(horizontal = AuthUiSpacing.itemMd, vertical = AuthUiSpacing.itemSm),
                            color = MaterialTheme.colorScheme.onPrimary,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }

        item {
            AccessibilityFontScaleRow(
                icon = Icons.Rounded.TextFields,
                title = "Размер шрифта",
                value = settings.fontScale,
                onValueChange = {
                    onSetFontScale(it)
                    feedbackMessage = "Размер шрифта: ${formatOneDecimal(it)}x"
                },
            )
        }
        item {
            AccessibilityFontScaleRow(
                icon = Icons.Rounded.Settings,
                title = stringResource(Res.string.auth_accessibility_controls_size),
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
            AccessibilityToggleRow(
                icon = Icons.Rounded.TextFields,
                title = stringResource(Res.string.auth_accessibility_bold_text),
                subtitle = "Усиленный вес шрифта для лучшей читаемости",
                checked = settings.boldText,
                onCheckedChange = onSetBoldText,
            )
        }
        item {
            AccessibilityToggleRow(
                icon = Icons.Rounded.Contrast,
                title = "Высокий контраст",
                subtitle = "Более четкие границы и цвета",
                checked = settings.highContrast,
                onCheckedChange = onSetHighContrast,
            )
        }
        item {
            AccessibilityToggleRow(
                icon = Icons.Rounded.RecordVoiceOver,
                title = "Голосовая поддержка",
                subtitle = "Озвучивание элементов экрана",
                checked = settings.voiceSupport,
                onCheckedChange = onSetVoiceSupport,
            )
        }
        item {
            AccessibilityToggleRow(
                icon = Icons.Rounded.Vibration,
                title = "Фильтр тремора",
                subtitle = "Игнорирование случайных нажатий",
                checked = settings.tremorFilter,
                onCheckedChange = onSetTremorFilter,
            )
        }
        item {
            Card(
                shape = AuthUiShapes.cardLg,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                modifier = Modifier.accessibilityFocusHighlight(shape = AuthUiShapes.cardLg, color = MaterialTheme.colorScheme.primary),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = resetLabel, role = Role.Button)
                        .clickable {
                            onResetAccessibility()
                            feedbackMessage = resetLabel
                        }
                        .padding(AuthUiSpacing.itemMd),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Text(
                        text = resetLabel,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun AccessibilityFontScaleRow(
    icon: ImageVector,
    title: String,
    value: Float,
    rangeStart: Float = 1.0f,
    rangeEnd: Float = 1.6f,
    steps: Int = 5,
    onValueChange: (Float) -> Unit,
) {
    Card(
        shape = AuthUiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier.accessibilityFocusHighlight(shape = AuthUiShapes.cardLg, color = MaterialTheme.colorScheme.primary),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AuthUiSpacing.itemMd),
            verticalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemSm),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemSm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh, AuthUiShapes.pill),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
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
private fun AccessibilityToggleRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Card(
        shape = AuthUiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AuthUiSpacing.itemMd),
            verticalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemSm),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemSm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh, AuthUiShapes.pill),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
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
                    )
                }
            }
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.CenterEnd,
            ) {
                AccessibilityScaledControlContainer {
                    Switch(
                        checked = checked,
                        onCheckedChange = onCheckedChange,
                        modifier = Modifier.accessibilitySemantics(label = title, state = if (checked) "включено" else "выключено", role = Role.Switch),
                    )
                }
            }
        }
    }
}
