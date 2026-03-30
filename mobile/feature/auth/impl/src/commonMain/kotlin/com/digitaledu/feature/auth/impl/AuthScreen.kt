package com.digitaledu.feature.auth.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import digital_education_mobile.feature.auth.`impl`.generated.resources.*
import com.digitaledu.core.ui.ObserveEffects
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import org.jetbrains.compose.resources.Font
import org.jetbrains.compose.resources.stringResource
import org.koin.mp.KoinPlatform

private const val AUTH_LOGIN_INTERNAL_ROUTE = "auth/login"
private const val AUTH_REGISTER_INTERNAL_ROUTE = "auth/register"

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

    val authNavController = rememberNavController()

    NavHost(
        navController = authNavController,
        startDestination = AUTH_LOGIN_INTERNAL_ROUTE,
        modifier = modifier,
    ) {
        composable(route = AUTH_LOGIN_INTERNAL_ROUTE) {
            AuthScreen(
                uiState = uiState,
                onIntent = viewModel::processIntent,
                onOpenRegistration = {
                    authNavController.navigate(AUTH_REGISTER_INTERNAL_ROUTE)
                },
            )
        }

        composable(route = AUTH_REGISTER_INTERNAL_ROUTE) {
            RegistrationScreen(
                onBackToLogin = { authNavController.popBackStack() },
            )
        }
    }
}

@Composable
internal fun AuthScreen(
    uiState: AuthUiState,
    onIntent: (AuthIntent) -> Unit,
    onOpenRegistration: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var passwordVisible by remember { mutableStateOf(false) }
    val colorScheme = MaterialTheme.colorScheme
    val scrollState = rememberScrollState()

    Scaffold(
        modifier = modifier,
        containerColor = Color.Transparent,
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            colorScheme.background,
                            colorScheme.primary.copy(alpha = 0.08f),
                            colorScheme.secondary.copy(alpha = 0.06f),
                            colorScheme.background,
                        ),
                    ),
                )
                .padding(innerPadding),
        ) {
            AuthDecorativeShapes()

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 20.dp, vertical = 24.dp)
                    .verticalScroll(scrollState),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                AuthBrandTitle(
                    modifier = Modifier.padding(bottom = 28.dp),
                )

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 440.dp),
                    shape = RoundedCornerShape(28.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Text(
                            text = stringResource(Res.string.auth_welcome_back),
                            style = MaterialTheme.typography.titleLarge,
                            color = colorScheme.onSurface,
                        )
                        Text(
                            text = stringResource(Res.string.auth_login_subtitle),
                            style = MaterialTheme.typography.bodyMedium,
                            color = colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(bottom = 4.dp),
                        )

                        OutlinedTextField(
                            value = uiState.login,
                            onValueChange = { onIntent(AuthIntent.LoginChanged(it)) },
                            label = { Text(stringResource(Res.string.auth_label_login)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Filled.Person,
                                    contentDescription = null,
                                )
                            },
                            enabled = !uiState.isSubmitting,
                        )

                        OutlinedTextField(
                            value = uiState.password,
                            onValueChange = { onIntent(AuthIntent.PasswordChanged(it)) },
                            label = { Text(stringResource(Res.string.auth_label_password)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = { if (uiState.isLoginEnabled) onIntent(AuthIntent.LoginClicked) }
                            ),
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Filled.Lock,
                                    contentDescription = null,
                                )
                            },
                            trailingIcon = {
                                val image = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff

                                val description = if (passwordVisible) {
                                    stringResource(Res.string.auth_hide_password)
                                } else {
                                    stringResource(Res.string.auth_show_password)
                                }

                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(imageVector = image, contentDescription = description)
                                }
                            },
                            supportingText = {
                                Text(
                                    text = stringResource(Res.string.auth_password_min_length),
                                    color = colorScheme.onSurfaceVariant,
                                )
                            },
                            isError = uiState.errorMessage != null,
                            enabled = !uiState.isSubmitting,
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Button(
                            onClick = { onIntent(AuthIntent.LoginClicked) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            enabled = uiState.isLoginEnabled,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colorScheme.primary,
                                contentColor = colorScheme.onPrimary,
                            ),
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (uiState.isSubmitting) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        color = colorScheme.onPrimary,
                                        strokeWidth = 2.dp,
                                    )
                                }
                                Text(
                                    text = if (uiState.isSubmitting) {
                                        stringResource(Res.string.auth_login_in_progress)
                                    } else {
                                        stringResource(Res.string.auth_login)
                                    },
                                    style = MaterialTheme.typography.titleMedium,
                                )
                            }
                        }

                        OutlinedButton(
                            onClick = onOpenRegistration,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            enabled = !uiState.isSubmitting,
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Text(
                                text = stringResource(Res.string.auth_registration),
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }

                        uiState.errorMessage?.let { message ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 2.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = colorScheme.errorContainer,
                            ) {
                                Text(
                                    text = message,
                                    color = colorScheme.onErrorContainer,
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.padding(12.dp),
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = stringResource(Res.string.auth_forgot_password_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .widthIn(max = 440.dp)
                        .padding(horizontal = 12.dp),
                )
            }
        }
    }
}

@Composable
private fun RegistrationScreen(
    onBackToLogin: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colorScheme = MaterialTheme.colorScheme
    var fullName by rememberSaveable { mutableStateOf("") }
    var login by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var confirmPasswordVisible by rememberSaveable { mutableStateOf(false) }
    var infoMessage by rememberSaveable { mutableStateOf<String?>(null) }
    val passwordsMatch = password == confirmPassword
    val canSubmit =
        fullName.isNotBlank() && login.isNotBlank() && password.length >= 6 && passwordsMatch
    val registrationInfoMessage = stringResource(Res.string.auth_registration_info)

    Scaffold(
        modifier = modifier,
        containerColor = Color.Transparent,
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            colorScheme.background,
                            colorScheme.primary.copy(alpha = 0.08f),
                            colorScheme.secondary.copy(alpha = 0.06f),
                            colorScheme.background,
                        ),
                    ),
                )
                .padding(innerPadding),
        ) {
            AuthDecorativeShapes()

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 20.dp, vertical = 24.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                AuthBrandTitle(
                    modifier = Modifier.padding(bottom = 20.dp),
                )

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 440.dp),
                    shape = RoundedCornerShape(28.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        TextButton(
                            onClick = onBackToLogin,
                            modifier = Modifier.align(Alignment.Start),
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = null,
                            )
                            Text(text = stringResource(Res.string.auth_back_to_login))
                        }

                        Text(
                            text = stringResource(Res.string.auth_registration),
                            style = MaterialTheme.typography.titleLarge,
                            color = colorScheme.onSurface,
                        )
                        Text(
                            text = stringResource(Res.string.auth_registration_subtitle),
                            style = MaterialTheme.typography.bodyMedium,
                            color = colorScheme.onSurfaceVariant,
                        )

                        OutlinedTextField(
                            value = fullName,
                            onValueChange = {
                                fullName = it
                                infoMessage = null
                            },
                            label = { Text(stringResource(Res.string.auth_label_full_name)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                        )

                        OutlinedTextField(
                            value = login,
                            onValueChange = {
                                login = it
                                infoMessage = null
                            },
                            label = { Text(stringResource(Res.string.auth_label_login)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                        )

                        OutlinedTextField(
                            value = password,
                            onValueChange = {
                                password = it
                                infoMessage = null
                            },
                            label = { Text(stringResource(Res.string.auth_label_password)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            visualTransformation =
                                if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            shape = RoundedCornerShape(12.dp),
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                        contentDescription = if (passwordVisible) {
                                            stringResource(Res.string.auth_hide_password)
                                        } else {
                                            stringResource(Res.string.auth_show_password)
                                        },
                                    )
                                }
                            },
                            supportingText = {
                                Text(
                                    text = stringResource(Res.string.auth_password_min_length),
                                    color = colorScheme.onSurfaceVariant,
                                )
                            },
                        )

                        OutlinedTextField(
                            value = confirmPassword,
                            onValueChange = {
                                confirmPassword = it
                                infoMessage = null
                            },
                            label = { Text(stringResource(Res.string.auth_label_repeat_password)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            visualTransformation =
                                if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            shape = RoundedCornerShape(12.dp),
                            trailingIcon = {
                                IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                                    Icon(
                                        imageVector =
                                            if (confirmPasswordVisible) {
                                                Icons.Filled.Visibility
                                            } else {
                                                Icons.Filled.VisibilityOff
                                            },
                                        contentDescription =
                                            if (confirmPasswordVisible) {
                                                stringResource(Res.string.auth_hide_password)
                                            } else {
                                                stringResource(Res.string.auth_show_password)
                                            },
                                    )
                                }
                            },
                            isError = confirmPassword.isNotEmpty() && !passwordsMatch,
                            supportingText = {
                                if (confirmPassword.isNotEmpty() && !passwordsMatch) {
                                    Text(
                                        text = stringResource(Res.string.auth_password_mismatch),
                                        color = colorScheme.error,
                                    )
                                }
                            },
                        )

                        Button(
                            onClick = {
                                infoMessage = registrationInfoMessage
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            enabled = canSubmit,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colorScheme.primary,
                                contentColor = colorScheme.onPrimary,
                            ),
                        ) {
                            Text(
                                text = stringResource(Res.string.auth_create_account),
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }

                        infoMessage?.let { message ->
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                color = colorScheme.secondaryContainer,
                            ) {
                                Text(
                                    text = message,
                                    color = colorScheme.onSecondaryContainer,
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.padding(12.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AuthBrandTitle(
    modifier: Modifier = Modifier,
) {
    val colorScheme = MaterialTheme.colorScheme
    val brandFont = FontFamily(Font(Res.font.russo_one_regular))

    Text(
        text = stringResource(Res.string.auth_brand_title),
        modifier = modifier,
        style = MaterialTheme.typography.displayMedium.copy(
            fontFamily = brandFont,
            fontWeight = FontWeight.Normal,
            fontSize = 56.sp,
            lineHeight = 56.sp,
            letterSpacing = 0.sp,
        ),
        color = colorScheme.onSurface,
    )
}

@Composable
private fun AuthDecorativeShapes() {
    val colorScheme = MaterialTheme.colorScheme

    Box(
        modifier = Modifier
            .fillMaxSize(),
    )
    {
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(x = 96.dp, y = (-76).dp)
                .size(220.dp)
                .background(
                    color = colorScheme.primary.copy(alpha = 0.12f),
                    shape = CircleShape,
                ),
        )
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .offset(x = (-64).dp, y = 54.dp)
                .size(170.dp)
                .background(
                    color = colorScheme.secondary.copy(alpha = 0.14f),
                    shape = CircleShape,
                ),
        )
    }
}
