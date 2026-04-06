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
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.SubcomposeAsyncImage
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.feature.catalog.api.CatalogIntent
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
            uiState.errorMessage?.takeIf { it.isNotBlank() }?.let { error ->
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
            Button(onClick = { onIntent(CatalogIntent.RefreshCourses) }) {
                Text(text = stringResource(Res.string.catalog_refresh))
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
                onClick = { onIntent(CatalogIntent.OpenCourse(course.slug)) },
            )
        }
    }

}

@Composable
private fun CourseTile(
    course: CatalogCourse,
    onClick: () -> Unit,
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
    val remote = coverImageUrl?.trim().orEmpty()
    if (remote.isNotEmpty()) return remote

    return when (slug) {
        "gosuslugi-basic" ->
            "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1280&q=80"

        "sberbank-online-security" ->
            "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1280&q=80"

        "zhkh-payments-online" ->
            "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1280&q=80"

        "telemedicine-appointments" ->
            "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1280&q=80"

        else -> null
    }
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
