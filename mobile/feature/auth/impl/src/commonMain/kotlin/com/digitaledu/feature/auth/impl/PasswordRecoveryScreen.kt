package com.digitaledu.feature.auth.impl

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.digitaledu.core.ui.components.AuthHeader
import com.digitaledu.core.ui.components.AuthUiOpacity
import com.digitaledu.core.ui.components.AuthUiShapes
import com.digitaledu.core.ui.components.AuthUiSize
import com.digitaledu.core.ui.components.AuthUiSpacing
import com.digitaledu.core.ui.components.AuthUiStroke
import com.digitaledu.core.ui.components.AuthUiTypography
import com.digitaledu.core.ui.components.ErrorDialog
import com.digitaledu.core.ui.components.GradientPrimaryButton
import com.digitaledu.core.ui.components.ProsvetTextField
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import digital_education_mobile.feature.auth.`impl`.generated.resources.Res
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_back_to_login_full
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_forgot_password
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_forgot_password_input
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_forgot_password_send
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_forgot_password_sent
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_label_password
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_label_repeat_password
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_password_mismatch
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_recovery_info
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_recovery_support
import org.jetbrains.compose.resources.stringResource
import org.koin.mp.KoinPlatform

@Composable
internal fun PasswordRecoveryScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel = remember { KoinPlatform.getKoin().get<RecoveryViewModel>() }
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val sentMessage = stringResource(Res.string.auth_forgot_password_sent)
    val resetDoneMessage = "Пароль изменён. Теперь можно войти с новым паролем."

    ErrorDialog(
        message = uiState.errorMessage,
        onDismiss = { viewModel.processIntent(RecoveryIntent.DismissError) },
    )

    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            AuthHeader(
                title = stringResource(Res.string.auth_forgot_password),
                onBackClick = onBack,
                centerTitle = true,
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = AuthUiSpacing.screenHorizontal)
                    .verticalScroll(rememberScrollState()),
            ) {
                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))

                Text(
                    text = stringResource(Res.string.auth_forgot_password_input),
                    fontWeight = FontWeight.Medium,
                    style = AuthUiTypography.bodyLg,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = AuthUiSpacing.itemSm),
                )

                ProsvetTextField(
                    value = uiState.loginOrEmail,
                    onValueChange = { viewModel.processIntent(RecoveryIntent.LoginOrEmailChanged(it)) },
                    placeholder = "Введите логин или e-mail",
                    enabled = !uiState.isSubmitting,
                    trailingIcon = {
                        Icon(
                            imageVector = Icons.Filled.Mail,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.outline,
                        )
                    },
                )

                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionLg))

                GradientPrimaryButton(
                    text = stringResource(Res.string.auth_forgot_password_send),
                    onClick = {
                        viewModel.processIntent(RecoveryIntent.SubmitClicked(sentMessage))
                    },
                    enabled = uiState.canSubmit,
                    isLoading = uiState.isSubmitting,
                    icon = {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Send,
                            contentDescription = null,
                            modifier = Modifier.size(AuthUiSize.iconMd),
                            tint = MaterialTheme.colorScheme.onPrimary,
                        )
                    },
                )

                uiState.infoMessage?.let { msg ->
                    Spacer(modifier = Modifier.height(AuthUiSpacing.sectionSm))
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = AuthUiShapes.cardMd,
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                    ) {
                        Text(
                            text = msg,
                            style = AuthUiTypography.bodyMd,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AuthUiSpacing.contentPadding),
                        )
                    }
                }

                if (uiState.isResetRequested) {
                    Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))

                    Text(
                        text = "Введите код восстановления и новый пароль",
                        style = AuthUiTypography.bodyLg,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    Spacer(modifier = Modifier.height(AuthUiSpacing.itemSm))
                    ProsvetTextField(
                        value = uiState.resetToken,
                        onValueChange = { viewModel.processIntent(RecoveryIntent.ResetTokenChanged(it)) },
                        placeholder = "Код восстановления",
                        enabled = !uiState.isSubmitting,
                    )

                    Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))
                    ProsvetTextField(
                        value = uiState.newPassword,
                        onValueChange = { viewModel.processIntent(RecoveryIntent.NewPasswordChanged(it)) },
                        placeholder = stringResource(Res.string.auth_label_password),
                        isPassword = true,
                        enabled = !uiState.isSubmitting,
                    )

                    Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))
                    ProsvetTextField(
                        value = uiState.confirmPassword,
                        onValueChange = { viewModel.processIntent(RecoveryIntent.ConfirmPasswordChanged(it)) },
                        placeholder = stringResource(Res.string.auth_label_repeat_password),
                        isPassword = true,
                        isError = uiState.confirmPassword.isNotEmpty() && !uiState.passwordsMatch,
                        enabled = !uiState.isSubmitting,
                    )
                    if (uiState.confirmPassword.isNotEmpty() && !uiState.passwordsMatch) {
                        Text(
                            text = stringResource(Res.string.auth_password_mismatch),
                            style = AuthUiTypography.labelMd,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(top = AuthUiSpacing.item2xs),
                        )
                    }

                    Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))
                    GradientPrimaryButton(
                        text = "Сменить пароль",
                        onClick = {
                            viewModel.processIntent(RecoveryIntent.ConfirmClicked(resetDoneMessage))
                        },
                        enabled = uiState.canConfirm,
                        isLoading = uiState.isSubmitting,
                    )
                }

                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionXl))

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = AuthUiShapes.cardMd,
                    color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = AuthUiOpacity.subtle),
                    border = BorderStroke(
                        AuthUiStroke.hairline,
                        MaterialTheme.colorScheme.secondaryContainer.copy(alpha = AuthUiOpacity.border),
                    ),
                ) {
                    Row(
                        modifier = Modifier.padding(AuthUiSpacing.cardPadding),
                        horizontalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemMd),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Info,
                            contentDescription = null,
                            modifier = Modifier.size(AuthUiSize.iconLg),
                            tint = MaterialTheme.colorScheme.secondary,
                        )
                        Text(
                            text = buildAnnotatedString {
                                append(stringResource(Res.string.auth_recovery_info))
                                append(" ")
                                withStyle(
                                    SpanStyle(
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold,
                                        textDecoration = TextDecoration.Underline,
                                    ),
                                ) {
                                    append(stringResource(Res.string.auth_recovery_support))
                                }
                            },
                            style = AuthUiTypography.bodySm,
                            color = MaterialTheme.colorScheme.onSurface,
                            textAlign = TextAlign.Center,
                        )
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = AuthUiSpacing.sectionLg)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(
                            label = stringResource(Res.string.auth_back_to_login_full),
                            role = androidx.compose.ui.semantics.Role.Button,
                        )
                        .clickable(onClick = onBack),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Login,
                        contentDescription = null,
                        modifier = Modifier.size(AuthUiSize.iconMd),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Spacer(modifier = Modifier.width(AuthUiSpacing.itemSm))
                    Text(
                        text = stringResource(Res.string.auth_back_to_login_full),
                        fontWeight = FontWeight.Bold,
                        style = AuthUiTypography.bodyLg,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}
