package com.digitaledu.feature.home.impl

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.List
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.SubcomposeAsyncImage
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.ui.components.AccessibilityScaledControlContainer
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.accessibilityFocusHighlight
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.feature.catalog.api.CourseProgress

@Composable
internal fun LearningCoursePreviewContent(
    course: CatalogCourse,
    progress: CourseProgress?,
    onBack: () -> Unit,
    onStart: () -> Unit,
    onContents: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = UiSpacing.xxl + UiSpacing.xxl),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.lg),
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(320.dp),
            ) {
                CoursePreviewHero(
                    course = course,
                    modifier = Modifier.fillMaxSize(),
                )
                Box(
                    modifier = Modifier
                        .padding(UiSpacing.md)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .accessibilityFocusHighlight(shape = UiShapes.pill, color = MaterialTheme.colorScheme.primary)
                        .clickable(onClick = onBack)
                        .background(
                            color = MaterialTheme.colorScheme.surface.copy(alpha = UiOpacity.textSecondaryOnScrim),
                            shape = UiShapes.pill,
                        )
                        .padding(UiSpacing.xs),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }

        item {
            Column(
                modifier = Modifier.padding(horizontal = UiSpacing.md),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
            ) {
                Text(
                    text = course.title,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
                course.description?.takeIf { it.isNotBlank() }?.let { description ->
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                OutlinedButton(
                    onClick = onContents,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    AccessibilityScaledControlContainer {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Rounded.List,
                                contentDescription = null,
                            )
                            Spacer(modifier = Modifier.width(UiSpacing.xs))
                            Text(text = "Содержание")
                        }
                    }
                }
                Button(
                    onClick = onStart,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    AccessibilityScaledControlContainer {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.PlayArrow,
                                contentDescription = null,
                            )
                            Spacer(modifier = Modifier.width(UiSpacing.xs))
                            Text(text = "Начать курс")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CoursePreviewHero(
    course: CatalogCourse,
    modifier: Modifier = Modifier,
) {
    val imageUrl = resolvePreviewCoverUrl(course.coverImageUrl)
    if (imageUrl == null) {
        PreviewPlaceholder(course = course, modifier = modifier)
        return
    }

    SubcomposeAsyncImage(
        model = imageUrl,
        contentDescription = course.title,
        contentScale = ContentScale.Crop,
        modifier = modifier,
        loading = { PreviewPlaceholder(course = course, modifier = Modifier.fillMaxSize()) },
        error = { PreviewPlaceholder(course = course, modifier = Modifier.fillMaxSize()) },
    )
}

@Composable
private fun PreviewPlaceholder(
    course: CatalogCourse,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.background(
            brush = Brush.linearGradient(previewPlaceholderPalette(course)),
        ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.scrim.copy(alpha = UiOpacity.scrimOverlay)),
        )
        Text(
            text = course.title,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onPrimary,
            fontWeight = FontWeight.Bold,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(UiSpacing.lg),
        )
    }
}

private fun resolvePreviewCoverUrl(rawUrl: String?): String? {
    val trimmed = rawUrl?.trim().orEmpty()
    return trimmed.takeIf { it.isNotEmpty() }
}

@Composable
private fun previewPlaceholderPalette(course: CatalogCourse): List<Color> {
    val colorScheme = MaterialTheme.colorScheme
    val variants = listOf(
        listOf(colorScheme.primaryContainer, colorScheme.primary),
        listOf(colorScheme.secondaryContainer, colorScheme.secondary),
        listOf(colorScheme.tertiaryContainer, colorScheme.tertiary),
        listOf(colorScheme.surfaceContainerHighest, colorScheme.surfaceContainerLow),
        listOf(colorScheme.inversePrimary, colorScheme.primaryContainer),
    )
    val key = if (course.slug.isNotBlank()) course.slug else course.id
    return variants[kotlin.math.abs(key.hashCode()) % variants.size]
}
