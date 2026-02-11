package com.digitaledu.feature.auth.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import org.jetbrains.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.digitaledu.core.designsystem.theme.DigitalEduTheme
import com.digitaledu.core.ui.ObserveEffects
import org.koin.mp.KoinPlatform

@Composable
internal fun AuthRoute(
    onAuthenticated: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel = remember {
        KoinPlatform.getKoin().get<AuthViewModel>()
    }
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ObserveEffects(viewModel.effects) { effect ->
        if (effect is AuthEffect.Authenticated) {
            onAuthenticated()
        }
    }

    AuthScreen(
        uiState = uiState,
        onIntent = viewModel::processIntent,
        modifier = modifier,
    )
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
internal fun AuthScreen(
    uiState: AuthUiState,
    onIntent: (AuthIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    val isOtpStep = uiState.isOtpRequested
    val title = if (isOtpStep) "Подтверждение номера" else "Вход в приложение"
    val subtitle = if (isOtpStep) {
        "Мы отправили код на ${uiState.phoneNumber}. Введите его для продолжения обучения."
    } else {
        "Введите номер телефона, чтобы получить SMS-код и открыть курсы."
    }

    Scaffold(
        modifier = modifier,
        containerColor = Color.Transparent,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(text = "Digital Education")
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = Color.Transparent,
                ),
            )
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f),
                            MaterialTheme.colorScheme.surface,
                        ),
                    ),
                ),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .verticalScroll(rememberScrollState())
                    .padding(innerPadding)
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                ElevatedCard(
                    shape = RoundedCornerShape(28.dp),
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.75f),
                    ),
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.headlineSmall,
                        )
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                ElevatedCard(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        OutlinedTextField(
                            value = uiState.phoneNumber,
                            onValueChange = { value -> onIntent(AuthIntent.PhoneChanged(value)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            enabled = !isOtpStep,
                            label = { Text(text = "Телефон") },
                            placeholder = { Text(text = "+7 999 123-45-67") },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Phone,
                                imeAction = ImeAction.Done,
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = {
                                    if (!isOtpStep) {
                                        onIntent(AuthIntent.RequestOtpClicked)
                                    }
                                },
                            ),
                        )

                        if (isOtpStep) {
                            OutlinedTextField(
                                value = uiState.otpCode,
                                onValueChange = { value -> onIntent(AuthIntent.OtpCodeChanged(value)) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                label = { Text(text = "Код из SMS") },
                                placeholder = { Text(text = "123456") },
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.NumberPassword,
                                    imeAction = ImeAction.Done,
                                ),
                                keyboardActions = KeyboardActions(
                                    onDone = { onIntent(AuthIntent.VerifyOtpClicked) },
                                ),
                            )
                        }

                        Button(
                            onClick = {
                                if (isOtpStep) {
                                    onIntent(AuthIntent.VerifyOtpClicked)
                                } else {
                                    onIntent(AuthIntent.RequestOtpClicked)
                                }
                            },
                            enabled = if (isOtpStep) uiState.isVerifyEnabled else uiState.isRequestEnabled,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(16.dp),
                        ) {
                            Text(
                                text = when {
                                    uiState.isSubmitting && isOtpStep -> "Проверяем код"
                                    uiState.isSubmitting && !isOtpStep -> "Отправляем код"
                                    isOtpStep -> "Подтвердить вход"
                                    else -> "Получить код"
                                },
                            )
                        }

                        if (isOtpStep) {
                            TextButton(
                                onClick = { onIntent(AuthIntent.ChangePhoneClicked) },
                                enabled = !uiState.isSubmitting,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(text = "Изменить номер")
                            }
                        }

                        if (uiState.isSubmitting) {
                            LinearProgressIndicator(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(100)),
                            )
                        }
                    }
                }

                uiState.devCode?.let { devCode ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.tertiaryContainer,
                        ),
                        shape = RoundedCornerShape(18.dp),
                    ) {
                        Text(
                            text = "Dev-код для локальной среды: $devCode",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                            color = MaterialTheme.colorScheme.onTertiaryContainer,
                        )
                    }
                }

                uiState.errorMessage?.let { message ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                        shape = RoundedCornerShape(18.dp),
                    ) {
                        Text(
                            text = message,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                        )
                    }
                }
            }
        }
    }
}

@Preview
@Composable
private fun AuthScreenPreview() {
    DigitalEduTheme {
        AuthScreen(
            uiState = AuthUiState(phoneNumber = "+7 999 123-45-67"),
            onIntent = {},
        )
    }
}
