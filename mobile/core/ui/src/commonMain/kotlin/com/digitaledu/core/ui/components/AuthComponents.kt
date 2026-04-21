package com.digitaledu.core.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun GradientPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    icon: @Composable (() -> Unit)? = null,
) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(AuthUiSize.buttonHeight)
            .clip(AuthUiShapes.pill)
            .graphicsLayer { alpha = if (enabled) 1f else AuthUiOpacity.disabled }
            .background(
                color = colors.primary,
                shape = AuthUiShapes.pill,
            )
            .accessibilityControlScale
            .accessibilityTouchTarget
            .accessibilitySemantics(label = text, role = Role.Button, enabled = enabled)
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemSm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(AuthUiSize.iconMd),
                    color = colors.onPrimary,
                    strokeWidth = AuthUiStroke.thin,
                )
            }
            Text(
                text = text,
                color = colors.onPrimary,
                style = AuthUiTypography.bodyLg,
            )
            icon?.invoke()
        }
    }
}

@Composable
fun ProsvetTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    isPassword: Boolean = false,
    isError: Boolean = false,
    enabled: Boolean = true,
    trailingIcon: @Composable (() -> Unit)? = null,
) {
    val colors = MaterialTheme.colorScheme
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        shape = AuthUiShapes.pill,
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = Color.Transparent,
            focusedBorderColor = Color.Transparent,
            unfocusedContainerColor = colors.surfaceContainerHighest,
            focusedContainerColor = colors.surfaceContainerHighest,
            unfocusedPlaceholderColor = colors.outline,
            focusedPlaceholderColor = colors.outline,
            unfocusedTextColor = colors.onSurface,
            focusedTextColor = colors.onSurface,
            errorBorderColor = Color.Transparent,
            errorContainerColor = colors.surfaceContainerHighest,
        ),
        placeholder = { Text(placeholder) },
        singleLine = true,
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = trailingIcon,
        isError = isError,
        enabled = enabled,
        textStyle = MaterialTheme.typography.bodyLarge,
    )
}

@Composable
fun SecurityInfoCard(
    text: String,
    iconTint: Color,
    modifier: Modifier = Modifier,
    textStyle: TextStyle = AuthUiTypography.bodyMd,
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = AuthUiShapes.cardMd,
        color = colors.surfaceContainerLow,
    ) {
        Row(
            modifier = Modifier.padding(AuthUiSpacing.cardPadding),
            horizontalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemMd),
            verticalAlignment = Alignment.Top,
        ) {
            Icon(
                imageVector = Icons.Filled.VerifiedUser,
                contentDescription = null,
                modifier = Modifier.size(AuthUiSize.iconLg),
                tint = iconTint,
            )
            Text(
                text = text,
                style = textStyle,
                color = colors.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun AuthHeader(
    title: String,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
    titleColor: Color = MaterialTheme.colorScheme.onSurface,
    iconTint: Color = MaterialTheme.colorScheme.primary,
    centerTitle: Boolean = false,
) {
    if (centerTitle) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = AuthUiSpacing.itemSm, vertical = AuthUiSpacing.itemSm),
        ) {
            IconButton(
                onClick = onBackClick,
                modifier = Modifier.align(Alignment.CenterStart),
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = null,
                    tint = iconTint,
                )
            }
            Text(
                text = title,
                style = AuthUiTypography.header,
                color = titleColor,
                modifier = Modifier.align(Alignment.Center),
            )
        }
        return
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AuthUiSpacing.itemSm, vertical = AuthUiSpacing.itemSm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBackClick) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = null,
                tint = iconTint,
            )
        }
        Text(
            text = title,
            style = AuthUiTypography.header,
            color = titleColor,
        )
    }
}

@Composable
fun FieldLabel(text: String) {
    Text(
        text = text,
        style = AuthUiTypography.bodyLg,
        color = MaterialTheme.colorScheme.onSurface,
        modifier = Modifier.padding(start = AuthUiSpacing.contentPadding),
    )
}

@Composable
fun PasswordToggle(
    visible: Boolean,
    onToggle: (Boolean) -> Unit,
    contentDescription: String?,
) {
    IconButton(
        onClick = { onToggle(!visible) },
        modifier = Modifier
            .accessibilityControlScale
            .accessibilityTouchTarget
            .accessibilitySemantics(
                label = contentDescription ?: "Переключить видимость пароля",
                role = Role.Button,
            ),
    ) {
        Icon(
            imageVector = if (visible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
            contentDescription = contentDescription,
            tint = MaterialTheme.colorScheme.outline,
        )
    }
}
