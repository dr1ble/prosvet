package com.digitaledu.feature.auth.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.SettingsAccessibility
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.digitaledu.core.ui.components.AuthUiOpacity
import com.digitaledu.core.ui.components.AuthUiShapes
import com.digitaledu.core.ui.components.AuthUiSize
import com.digitaledu.core.ui.components.AuthUiSpacing
import com.digitaledu.core.ui.components.AuthUiStroke
import com.digitaledu.core.ui.components.AuthUiTypography
import com.digitaledu.core.ui.components.GradientPrimaryButton
import digital_education_mobile.feature.auth.`impl`.generated.resources.Res
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_start_accessibility
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_start_learning
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_start_subtitle
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_start_title
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_terms_hint
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun OnboardingScreen(
    onStartLearning: () -> Unit,
    onOpenAccessibility: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = AuthUiSpacing.screenHorizontal)
                .padding(top = AuthUiSpacing.sectionMd, bottom = AuthUiSpacing.sectionSm),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AuthUiSize.badgeContainer),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "ПРОСВЕТ",
                    fontWeight = FontWeight.ExtraBold,
                    style = AuthUiTypography.hero,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))

            Text(
                text = stringResource(Res.string.auth_start_title),
                fontWeight = FontWeight.ExtraBold,
                style = AuthUiTypography.hero,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(modifier = Modifier.height(AuthUiSpacing.sectionSm))

            Text(
                text = stringResource(Res.string.auth_start_subtitle),
                style = AuthUiTypography.bodyLg,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(modifier = Modifier.height(AuthUiSpacing.sectionMd))

            Column(verticalArrangement = Arrangement.spacedBy(AuthUiSpacing.itemMd)) {
                BenefitCard(
                    icon = Icons.Filled.Book,
                    title = "Интерактивные курсы",
                    description = "Видео, симуляции и квизы для эффективного обучения",
                    iconTintColor = MaterialTheme.colorScheme.primary,
                    iconBackgroundColor = MaterialTheme.colorScheme.primary.copy(alpha = AuthUiOpacity.subtle),
                )
                BenefitCard(
                    icon = Icons.Filled.Schedule,
                    title = "Удобное обучение",
                    description = "Учись в своём ритме, в любое время и в любом месте",
                    iconTintColor = MaterialTheme.colorScheme.secondary,
                    iconBackgroundColor = MaterialTheme.colorScheme.secondary.copy(alpha = AuthUiOpacity.subtle),
                )
                BenefitCard(
                    icon = Icons.Filled.SmartToy,
                    title = "Практика навыков",
                    description = "Симуляторы и интерактивные сценарии для закрепления знаний",
                    iconTintColor = MaterialTheme.colorScheme.tertiary,
                    iconBackgroundColor = MaterialTheme.colorScheme.tertiary.copy(alpha = AuthUiOpacity.subtle),
                )
            }

            Spacer(modifier = Modifier.height(AuthUiSpacing.sectionLg))

            GradientPrimaryButton(
                text = stringResource(Res.string.auth_start_learning),
                onClick = onStartLearning,
            )

            Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))

            Surface(
                onClick = onOpenAccessibility,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AuthUiSize.buttonHeight),
                shape = AuthUiShapes.pill,
                color = MaterialTheme.colorScheme.surfaceContainerHigh,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.SettingsAccessibility,
                        contentDescription = null,
                        modifier = Modifier.size(AuthUiSize.iconMd),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Spacer(modifier = Modifier.width(AuthUiSpacing.itemSm))
                    Text(
                        text = stringResource(Res.string.auth_start_accessibility),
                        fontWeight = FontWeight.Medium,
                        style = AuthUiTypography.bodyLg,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            Spacer(modifier = Modifier.height(AuthUiSpacing.sectionSm))

            Text(
                text = stringResource(Res.string.auth_terms_hint),
                style = AuthUiTypography.labelSm,
                color = MaterialTheme.colorScheme.outline,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun BenefitCard(
    icon: ImageVector,
    title: String,
    description: String,
    iconTintColor: Color,
    iconBackgroundColor: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = AuthUiShapes.cardLg,
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        shadowElevation = AuthUiStroke.thin,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AuthUiSpacing.cardPadding),
            horizontalArrangement = Arrangement.spacedBy(AuthUiSpacing.contentPadding),
            verticalAlignment = Alignment.Top,
        ) {
            Box(
                modifier = Modifier
                    .size(AuthUiSize.iconContainer)
                    .background(iconBackgroundColor, AuthUiShapes.pill),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(AuthUiSize.iconLg),
                    tint = iconTintColor,
                )
            }
            Column {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    style = AuthUiTypography.bodyLg,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(modifier = Modifier.height(AuthUiSpacing.item2xs))
                Text(
                    text = description,
                    style = AuthUiTypography.bodyMd,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
