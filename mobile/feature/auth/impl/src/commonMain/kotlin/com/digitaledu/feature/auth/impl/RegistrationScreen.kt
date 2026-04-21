package com.digitaledu.feature.auth.impl

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.digitaledu.core.ui.ObserveEffects
import com.digitaledu.core.ui.components.AuthHeader
import com.digitaledu.core.ui.components.AuthUiOpacity
import com.digitaledu.core.ui.components.AuthUiShapes
import com.digitaledu.core.ui.components.AuthUiSize
import com.digitaledu.core.ui.components.AuthUiSpacing
import com.digitaledu.core.ui.components.AuthUiTypography
import com.digitaledu.core.ui.components.FieldLabel
import com.digitaledu.core.ui.components.GradientPrimaryButton
import com.digitaledu.core.ui.components.PasswordToggle
import com.digitaledu.core.ui.components.ProsvetTextField
import com.digitaledu.core.ui.components.SecurityInfoCard
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import digital_education_mobile.feature.auth.`impl`.generated.resources.Res
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_create_account
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_create_account_button
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_create_account_subtitle
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_have_account
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_label_full_name
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_label_login
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_label_password
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_label_repeat_password
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_password_mismatch
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_security_info_register
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_sign_in_link
import org.jetbrains.compose.resources.stringResource
import org.koin.mp.KoinPlatform

@Composable
internal fun RegistrationScreen(
    onBack: () -> Unit,
    onRegistered: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel = remember { KoinPlatform.getKoin().get<RegistrationViewModel>() }
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var confirmVisible by rememberSaveable { mutableStateOf(false) }
    ObserveEffects(viewModel.effects) { effect ->
        if (effect is RegistrationEffect.Registered) onRegistered()
    }

    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState()),
        ) {
            AuthHeader(
                title = stringResource(Res.string.auth_create_account),
                onBackClick = onBack,
                centerTitle = true,
            )

            Column(
                modifier = Modifier.padding(horizontal = AuthUiSpacing.screenHorizontal),
            ) {
                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionLg))

                Text(
                    text = stringResource(Res.string.auth_create_account_subtitle),
                    style = AuthUiTypography.bodyLg,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))

                FieldLabel(stringResource(Res.string.auth_label_full_name))
                Spacer(modifier = Modifier.height(AuthUiSpacing.itemXs))
                ProsvetTextField(
                    value = uiState.fullName,
                    onValueChange = { viewModel.processIntent(RegistrationIntent.FullNameChanged(it)) },
                    placeholder = "Имя и фамилия",
                    enabled = !uiState.isSubmitting,
                )

                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionSm))

                FieldLabel(stringResource(Res.string.auth_label_login))
                Spacer(modifier = Modifier.height(AuthUiSpacing.itemXs))
                ProsvetTextField(
                    value = uiState.login,
                    onValueChange = { viewModel.processIntent(RegistrationIntent.LoginChanged(it)) },
                    placeholder = "Логин",
                    enabled = !uiState.isSubmitting,
                )

                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionSm))

                FieldLabel(stringResource(Res.string.auth_label_password))
                Spacer(modifier = Modifier.height(AuthUiSpacing.itemXs))
                ProsvetTextField(
                    value = uiState.password,
                    onValueChange = { viewModel.processIntent(RegistrationIntent.PasswordChanged(it)) },
                    placeholder = "Пароль",
                    isPassword = !passwordVisible,
                    enabled = !uiState.isSubmitting,
                    trailingIcon = {
                        PasswordToggle(
                            visible = passwordVisible,
                            onToggle = { passwordVisible = it },
                            contentDescription = stringResource(Res.string.auth_label_password),
                        )
                    },
                )

                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionSm))

                FieldLabel(stringResource(Res.string.auth_label_repeat_password))
                Spacer(modifier = Modifier.height(AuthUiSpacing.itemXs))
                ProsvetTextField(
                    value = uiState.confirmPassword,
                    onValueChange = { viewModel.processIntent(RegistrationIntent.ConfirmPasswordChanged(it)) },
                    placeholder = "Повторите пароль",
                    isPassword = !confirmVisible,
                    isError = uiState.confirmPassword.isNotEmpty() && !uiState.passwordsMatch,
                    enabled = !uiState.isSubmitting,
                    trailingIcon = {
                        PasswordToggle(
                            visible = confirmVisible,
                            onToggle = { confirmVisible = it },
                            contentDescription = stringResource(Res.string.auth_label_repeat_password),
                        )
                    },
                )
                if (uiState.confirmPassword.isNotEmpty() && !uiState.passwordsMatch) {
                    Text(
                        text = stringResource(Res.string.auth_password_mismatch),
                        style = AuthUiTypography.labelMd,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(
                            start = AuthUiSpacing.contentPadding,
                            top = AuthUiSpacing.item2xs,
                        ),
                    )
                }

                Spacer(modifier = Modifier.height(AuthUiSpacing.cardPadding))

                SecurityInfoCard(
                    text = stringResource(Res.string.auth_security_info_register),
                    iconTint = MaterialTheme.colorScheme.secondary,
                    textStyle = AuthUiTypography.bodyLg,
                )

                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))

                GradientPrimaryButton(
                    text = stringResource(Res.string.auth_create_account_button),
                    onClick = {
                        viewModel.processIntent(RegistrationIntent.SubmitClicked)
                    },
                    enabled = uiState.canSubmit,
                    isLoading = uiState.isSubmitting,
                )

                Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(Res.string.auth_have_account),
                        style = AuthUiTypography.bodyLg,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(modifier = Modifier.size(AuthUiSpacing.itemXs))
                    TextButton(
                        onClick = onBack,
                        modifier = Modifier
                            .accessibilityTouchTarget
                            .accessibilitySemantics(
                                label = stringResource(Res.string.auth_sign_in_link),
                                role = androidx.compose.ui.semantics.Role.Button,
                            ),
                    ) {
                        Text(
                            text = stringResource(Res.string.auth_sign_in_link),
                            fontWeight = FontWeight.Medium,
                            style = AuthUiTypography.bodyLg,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }

                uiState.infoMessage?.let { msg ->
                    Spacer(modifier = Modifier.height(AuthUiSpacing.sectionSm))
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = AuthUiShapes.cardMd,
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                    ) {
                        Text(
                            text = msg,
                            style = AuthUiTypography.bodyLg,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(AuthUiSpacing.contentPadding),
                        )
                    }
                }

                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionSm))
            }
        }
    }
}
