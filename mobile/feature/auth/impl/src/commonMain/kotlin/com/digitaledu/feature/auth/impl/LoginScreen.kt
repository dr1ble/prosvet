package com.digitaledu.feature.auth.impl

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.digitaledu.core.ui.components.AuthUiOpacity
import com.digitaledu.core.ui.components.AuthUiShapes
import com.digitaledu.core.ui.components.AuthUiSize
import com.digitaledu.core.ui.components.AuthUiSpacing
import com.digitaledu.core.ui.components.AuthUiStroke
import com.digitaledu.core.ui.components.AuthUiTypography
import com.digitaledu.core.ui.components.GradientPrimaryButton
import com.digitaledu.core.ui.components.ProsvetTextField
import com.digitaledu.core.ui.components.SecurityInfoCard
import digital_education_mobile.feature.auth.`impl`.generated.resources.Res
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_forgot_password_link
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_label_login
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_label_password
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_login
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_login_in_progress
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_login_subtitle
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_no_account
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_open_registration
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_qr_button
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_security_info
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_show_password
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_welcome_back
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun LoginScreen(
    uiState: AuthUiState,
    onIntent: (AuthIntent) -> Unit,
    onOpenRegistration: () -> Unit,
    onOpenQrLogin: () -> Unit,
    onOpenRecovery: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var passwordVisible by remember { mutableStateOf(false) }

    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
    ) { innerPadding ->
        androidx.compose.foundation.layout.Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(
                    horizontal = AuthUiSpacing.screenHorizontal,
                    vertical = AuthUiSpacing.sectionMd,
                ),
        ) {
            Text(
                text = stringResource(Res.string.auth_welcome_back),
                fontWeight = FontWeight.Bold,
                style = AuthUiTypography.title,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))

            Text(
                text = stringResource(Res.string.auth_login_subtitle),
                style = AuthUiTypography.bodyLg,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(modifier = Modifier.height(AuthUiSpacing.sectionXl))

            Text(
                text = stringResource(Res.string.auth_label_login),
                fontWeight = FontWeight.Medium,
                style = AuthUiTypography.bodyLg,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = AuthUiSpacing.contentPadding, bottom = AuthUiSpacing.itemXs),
            )
            ProsvetTextField(
                value = uiState.login,
                onValueChange = { onIntent(AuthIntent.LoginChanged(it)) },
                placeholder = "example@mail.ru",
                enabled = !uiState.isSubmitting,
            )

            Spacer(modifier = Modifier.height(AuthUiSpacing.cardPadding))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        start = AuthUiSpacing.contentPadding,
                        end = AuthUiSpacing.item2xs,
                        bottom = AuthUiSpacing.itemXs,
                    ),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(Res.string.auth_label_password),
                    fontWeight = FontWeight.Medium,
                    style = AuthUiTypography.bodyLg,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                TextButton(
                    onClick = onOpenRecovery,
                    enabled = !uiState.isSubmitting,
                    contentPadding = PaddingValues(
                        horizontal = AuthUiSpacing.itemSm,
                        vertical = AuthUiSpacing.item2xs,
                    ),
                ) {
                    Text(
                        text = stringResource(Res.string.auth_forgot_password_link),
                        fontWeight = FontWeight.Medium,
                        style = AuthUiTypography.bodyLg,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            ProsvetTextField(
                value = uiState.password,
                onValueChange = { onIntent(AuthIntent.PasswordChanged(it)) },
                placeholder = "••••••••",
                isPassword = !passwordVisible,
                enabled = !uiState.isSubmitting,
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                            contentDescription = stringResource(Res.string.auth_show_password),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
            )

            Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))

            GradientPrimaryButton(
                text = if (uiState.isSubmitting) {
                    stringResource(Res.string.auth_login_in_progress)
                } else {
                    stringResource(Res.string.auth_login)
                },
                onClick = { onIntent(AuthIntent.LoginClicked) },
                enabled = uiState.isLoginEnabled,
                isLoading = uiState.isSubmitting,
            )

            Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))

            OutlinedButton(
                onClick = onOpenQrLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AuthUiSize.buttonHeight),
                shape = AuthUiShapes.pill,
                border = BorderStroke(
                    AuthUiStroke.thin,
                    MaterialTheme.colorScheme.primary.copy(alpha = AuthUiOpacity.border),
                ),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = Color.Transparent,
                    contentColor = MaterialTheme.colorScheme.primary,
                ),
                enabled = !uiState.isSubmitting,
            ) {
                Icon(
                    imageVector = Icons.Filled.QrCode2,
                    contentDescription = null,
                    modifier = Modifier.size(AuthUiSize.iconMd),
                )
                Spacer(modifier = Modifier.width(AuthUiSpacing.itemSm))
                Text(
                    text = stringResource(Res.string.auth_qr_button),
                    fontWeight = FontWeight.Bold,
                    style = AuthUiTypography.bodyLg,
                )
            }

            Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(Res.string.auth_no_account),
                    style = AuthUiTypography.bodyLg,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                TextButton(onClick = onOpenRegistration) {
                    Text(
                        text = stringResource(Res.string.auth_open_registration),
                        fontWeight = FontWeight.Bold,
                        style = AuthUiTypography.bodyLg,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))

            uiState.errorMessage?.let { message ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = AuthUiShapes.cardMd,
                    color = MaterialTheme.colorScheme.errorContainer,
                ) {
                    Text(
                        text = message,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = AuthUiTypography.bodyMd,
                        modifier = Modifier.padding(AuthUiSpacing.contentPadding),
                    )
                }
                Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))
            }

            SecurityInfoCard(
                text = stringResource(Res.string.auth_security_info),
                iconTint = MaterialTheme.colorScheme.secondary,
            )
        }
    }
}
