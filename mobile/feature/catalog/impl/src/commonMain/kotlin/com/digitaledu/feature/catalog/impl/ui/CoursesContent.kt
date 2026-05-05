package com.digitaledu.feature.catalog.impl.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.SubcomposeAsyncImage
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.core.ui.components.AccessibilityScaledControlContainer
import com.digitaledu.core.ui.components.ErrorDialog
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.feature.catalog.api.CatalogIntent
import com.digitaledu.feature.catalog.api.CourseProgress
import com.digitaledu.feature.catalog.api.CatalogUiState
import digital_education_mobile.feature.catalog.impl.generated.resources.Res
import digital_education_mobile.feature.catalog.impl.generated.resources.catalog_cover_description
import digital_education_mobile.feature.catalog.impl.generated.resources.catalog_empty_subtitle
import digital_education_mobile.feature.catalog.impl.generated.resources.catalog_empty_title
import digital_education_mobile.feature.catalog.impl.generated.resources.catalog_refresh
import kotlin.math.abs
import org.jetbrains.compose.resources.stringResource

@Composable
fun CoursesContent(
    uiState: CatalogUiState,
    onIntent: (CatalogIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    ErrorDialog(
        message = uiState.errorMessage,
        onDismiss = { onIntent(CatalogIntent.DismissError) },
    )

    if (uiState.isLoading && uiState.courses.isEmpty()) {
        CenteredLoadingIndicator(modifier = modifier)
        return
    }

    if (uiState.courses.isEmpty()) {
        Column(
            modifier = modifier
                .padding(horizontal = UiSpacing.lg, vertical = UiSpacing.xl),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Text(
                text = stringResource(Res.string.catalog_empty_title),
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = stringResource(Res.string.catalog_empty_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(
                onClick = { onIntent(CatalogIntent.RefreshCourses) },
                modifier = Modifier
                    .accessibilityTouchTarget
                    .accessibilitySemantics(
                        label = stringResource(Res.string.catalog_refresh),
                        role = Role.Button,
                    ),
            ) {
                AccessibilityScaledControlContainer {
                    Text(text = stringResource(Res.string.catalog_refresh))
                }
            }
        }
        return
    }

    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 160.dp),
        contentPadding = PaddingValues(UiSpacing.md),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        modifier = modifier,
    ) {
        items(
            items = uiState.courses,
            key = { course -> course.id },
        ) { course ->
            CourseTile(
                course = course,
                progress = uiState.progressByCourseId[course.id],
                onClick = { onIntent(CatalogIntent.OpenCourse(course.slug)) },
                onToggleFavorite = { onIntent(CatalogIntent.ToggleFavorite(course.id)) },
            )
        }
    }

}

@Composable
private fun CourseTile(
    course: CatalogCourse,
    progress: CourseProgress?,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit,
    modifier: Modifier = Modifier,
) {
    ElevatedCard(
        shape = UiShapes.cardXl,
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = UiOpacity.strong),
        ),
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .accessibilityTouchTarget
            .accessibilitySemantics(label = course.title, role = Role.Button)
            .clickable(onClick = onClick),
    ) {
        val imageUrl = course.coverUrlOrNull()

        Box(modifier = Modifier.fillMaxSize()) {
            if (imageUrl == null) {
                CoursePreviewPlaceholder(
                    course = course,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                SubcomposeAsyncImage(
                    model = imageUrl,
                    contentDescription = stringResource(
                        Res.string.catalog_cover_description,
                        course.title
                    ),
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                    loading = {
                        CoursePreviewPlaceholder(
                            course = course,
                            modifier = Modifier.fillMaxSize(),
                        )
                    },
                    error = {
                        CoursePreviewPlaceholder(
                            course = course,
                            modifier = Modifier.fillMaxSize(),
                        )
                    },
                )
            }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                MaterialTheme.colorScheme.scrim.copy(alpha = UiOpacity.scrimOverlay),
                            ),
                        ),
                    ),
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(UiSpacing.sm),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
            ) {
                progress?.let {
                    Text(
                        text = "${it.completedLessons}/${it.totalLessons}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                Text(
                    text = course.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                course.description?.takeIf { it.isNotBlank() }?.let { description ->
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = UiOpacity.textSecondaryOnScrim),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            IconButton(
                onClick = onToggleFavorite,
                modifier = Modifier.align(Alignment.TopEnd),
            ) {
                Icon(
                    imageVector = if (course.isFavorite) {
                        Icons.Rounded.Favorite
                    } else {
                        Icons.Rounded.FavoriteBorder
                    },
                    contentDescription = null,
                    tint = if (course.isFavorite) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onPrimary
                    },
                )
            }
        }
    }
}

@Composable
private fun CoursePreviewPlaceholder(
    course: CatalogCourse,
    modifier: Modifier = Modifier,
) {
    val colors = course.placeholderPalette(MaterialTheme.colorScheme)

    Box(
        modifier = modifier
            .background(
                brush = Brush.linearGradient(colors),
            ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(UiSpacing.md)
                .background(
                    color = MaterialTheme.colorScheme.surface.copy(alpha = UiOpacity.subtle),
                    shape = UiShapes.cardLg,
                ),
        )
    }
}

private fun CatalogCourse.coverUrlOrNull(): String? {
    return resolveCourseCoverUrl(coverImageUrl)
}

private fun CatalogCourse.placeholderPalette(colorScheme: ColorScheme): List<Color> {
    val variants = listOf(
        listOf(colorScheme.primaryContainer, colorScheme.primary),
        listOf(colorScheme.secondaryContainer, colorScheme.secondary),
        listOf(colorScheme.tertiaryContainer, colorScheme.tertiary),
        listOf(colorScheme.surfaceContainerHighest, colorScheme.surfaceContainerLow),
        listOf(colorScheme.inversePrimary, colorScheme.primaryContainer),
    )
    val key = if (slug.isNotBlank()) slug else id
    val index = abs(key.hashCode()) % variants.size
    return variants[index]
}
