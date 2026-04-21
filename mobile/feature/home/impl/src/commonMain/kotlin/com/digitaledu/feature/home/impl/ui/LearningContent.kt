package com.digitaledu.feature.home.impl.ui

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.feature.home.impl.catalog.CatalogCategories
import com.digitaledu.feature.home.impl.catalog.CatalogCategory
import com.digitaledu.feature.home.impl.catalog.CatalogIntent
import com.digitaledu.feature.home.impl.catalog.CatalogUiState
import com.digitaledu.feature.home.impl.catalog.CourseProgress

private val SurfaceBg = Color(0xFFF7F9FB)
private val SurfaceContainerLowest = Color(0xFFFFFFFF)
private val SurfaceContainerHigh = Color(0xFFE6E8EA)
private val OnSurface = Color(0xFF191C1E)
private val OnSurfaceVariant = Color(0xFF424754)
private val Primary = Color(0xFF0058BE)
private val Secondary = Color(0xFF006B5F)
private val SecondaryContainer = Color(0xFF6DF5E1)
private val OnSecondaryContainer = Color(0xFF006F64)

@Composable
fun LearningContent(
    catalogUiState: CatalogUiState,
    onIntent: (CatalogIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (catalogUiState.isLoading && catalogUiState.courses.isEmpty()) {
        CenteredLoadingIndicator(modifier = modifier)
        return
    }

    val filtered = catalogUiState.filteredCourses

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(SurfaceBg),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = 24.dp,
                end = 24.dp,
                top = 8.dp,
                bottom = 32.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            item {
                SearchField(
                    query = catalogUiState.searchQuery,
                    onQueryChange = { onIntent(CatalogIntent.SetSearchQuery(it)) },
                    onClear = { onIntent(CatalogIntent.SetSearchQuery("")) },
                )
            }
            item {
                CategoryRow(
                    categories = CatalogCategories.all,
                    selectedId = catalogUiState.selectedCategoryId,
                    onSelect = { onIntent(CatalogIntent.SetCategory(it)) },
                )
            }
            items(items = filtered, key = { it.id }) { course ->
                CourseCard(
                    course = course,
                    categoryLabel = CatalogCategories.detectLabel(course),
                    progress = catalogUiState.progressByCourseId[course.id],
                    onClick = { onIntent(CatalogIntent.OpenCourse(course.slug)) },
                )
            }
            if (filtered.isEmpty() && !catalogUiState.isLoading) {
                item { EmptyState() }
            }
        }
    }
}

@Composable
private fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    onClear: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(CircleShape)
            .background(SurfaceContainerHigh)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Rounded.Search,
                contentDescription = null,
                tint = OnSurfaceVariant,
                modifier = Modifier.size(24.dp),
            )
            Spacer(modifier = Modifier.size(12.dp))
            Box(modifier = Modifier.weight(1f)) {
                if (query.isEmpty()) {
                    Text(
                        text = "Поиск курсов...",
                        color = OnSurfaceVariant,
                        fontSize = 18.sp,
                    )
                }
                BasicTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    singleLine = true,
                    textStyle = TextStyle(color = OnSurface, fontSize = 18.sp),
                    cursorBrush = SolidColor(Primary),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (query.isNotEmpty()) {
                Spacer(modifier = Modifier.size(8.dp))
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .clickable(
                            onClick = onClear,
                            role = Role.Button,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Close,
                        contentDescription = "Очистить",
                        tint = OnSurfaceVariant,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryRow(
    categories: List<CatalogCategory>,
    selectedId: String,
    onSelect: (String) -> Unit,
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(horizontal = 0.dp),
    ) {
        items(items = categories, key = { it.id }) { cat ->
            val isSelected = cat.id == selectedId
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(if (isSelected) Primary else SurfaceContainerHigh)
                    .clickable(
                        role = Role.Button,
                        onClick = { onSelect(cat.id) },
                    )
                    .padding(horizontal = 24.dp, vertical = 12.dp),
            ) {
                Text(
                    text = cat.label,
                    color = if (isSelected) Color.White else OnSurfaceVariant,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

@Composable
private fun CourseCard(
    course: CatalogCourse,
    categoryLabel: String,
    progress: CourseProgress?,
    onClick: () -> Unit,
) {
    val total = progress?.totalLessons ?: course.lessonCount ?: 0
    val completed = progress?.completedLessons ?: 0
    val fraction = if (total > 0) completed.toFloat() / total else 0f

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(SurfaceContainerLowest)
            .clickable(
                role = Role.Button,
                onClick = onClick,
            ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(192.dp),
        ) {
            AsyncImage(
                model = course.photoUrl(),
                contentDescription = course.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            Box(
                modifier = Modifier
                    .padding(16.dp)
                    .clip(CircleShape)
                    .background(SecondaryContainer)
                    .padding(horizontal = 16.dp, vertical = 6.dp),
            ) {
                Text(
                    text = categoryLabel.uppercase(),
                    color = OnSecondaryContainer,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Column(
            modifier = Modifier.padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(
                text = course.title,
                color = OnSurface,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 30.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            course.description?.takeIf { it.isNotBlank() }?.let { description ->
                Text(
                    text = description,
                    color = OnSurfaceVariant,
                    fontSize = 16.sp,
                    lineHeight = 24.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                course.durationLabel()?.let { duration ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Rounded.Schedule,
                            contentDescription = null,
                            tint = Primary,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(modifier = Modifier.size(8.dp))
                        Text(
                            text = duration,
                            color = OnSurfaceVariant,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                } ?: Spacer(modifier = Modifier.size(1.dp))

                if (total > 0) {
                    Text(
                        text = "$completed из $total уроков",
                        color = Secondary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            if (total > 0) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(12.dp)
                        .clip(CircleShape)
                        .background(SurfaceContainerHigh),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction.coerceIn(0f, 1f))
                            .height(12.dp)
                            .clip(CircleShape)
                            .background(Secondary),
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = "Курсы не найдены",
            color = OnSurface,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = "Попробуйте изменить запрос или категорию.",
            color = OnSurfaceVariant,
            fontSize = 16.sp,
        )
    }
}

private fun CatalogCourse.durationLabel(): String? {
    val minutes = durationMinutes ?: return null
    if (minutes <= 0) return null
    return when {
        minutes < 60 -> "$minutes мин"
        minutes % 60 == 0 -> "${minutes / 60} ч"
        else -> "${minutes / 60} ч ${minutes % 60} мин"
    }
}

private fun CatalogCourse.photoUrl(): String {
    val remoteUrl = coverImageUrl?.trim().orEmpty()
    if (remoteUrl.isNotEmpty()) return remoteUrl
    val seed = if (id.isNotBlank()) id else "course"
    return "https://picsum.photos/seed/$seed/720/480"
}
