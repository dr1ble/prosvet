package com.digitaledu.feature.profile.impl.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.memo.SavedMemo
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.accessibilityFocusHighlight
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.mikepenz.markdown.m3.Markdown
import kotlin.time.ExperimentalTime
import kotlin.time.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

@Composable
fun MemosListContent(
    memos: List<SavedMemo>,
    onOpenMemo: (String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val sections = remember(memos) { buildMemoGroupSections(memos) }

    LazyColumn(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = UiSpacing.md,
            end = UiSpacing.md,
            top = UiSpacing.md,
            bottom = UiSpacing.xxl,
        ),
    ) {
        item {
            Box(modifier = Modifier.fillMaxWidth()) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .clip(UiShapes.pill)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = "Назад", role = Role.Button)
                        .clickable(onClick = onBack)
                        .padding(UiSpacing.xs),
                )
                Text(
                    text = "Мои памятки",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
        }

        if (memos.isEmpty()) {
            item {
                EmptyMemosCard(modifier = Modifier.padding(top = UiSpacing.lg))
            }
            return@LazyColumn
        }

        sections.forEach { section ->
            item {
                Text(
                    text = memoGroupLabel(section.group),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = UiSpacing.md, start = UiSpacing.xs),
                )
            }
            items(section.memos.size) { index ->
                val memo = section.memos[index]
                MemoRow(
                    memo = memo,
                    onClick = { onOpenMemo(memo.id) },
                )
            }
        }
    }
}

@Composable
private fun EmptyMemosCard(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = UiShapes.cardLg,
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Text(
                text = "Пока нет сохранённых памяток",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "Откройте памятку в уроке и нажмите «Сохранить» — она появится здесь.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun MemoRow(
    memo: SavedMemo,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .accessibilityTouchTarget
            .accessibilitySemantics(label = memo.title, role = Role.Button)
            .accessibilityFocusHighlight(shape = UiShapes.cardLg, color = MaterialTheme.colorScheme.primary)
            .clickable(onClick = onClick),
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Bookmark,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = memo.title.ifBlank { "Памятка" },
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                val subtitle = buildString {
                    if (memo.courseTitle.isNotBlank()) append(memo.courseTitle)
                    if (memo.lessonTitle.isNotBlank()) {
                        if (isNotEmpty()) append(" • ")
                        append(memo.lessonTitle)
                    }
                }
                if (subtitle.isNotBlank()) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Text(
                    text = formatMemoTimestamp(memo.savedAtEpochMs),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                )
            }
            Icon(
                imageVector = Icons.Rounded.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.outline,
            )
        }
    }
}

@Composable
fun MemoDetailContent(
    memo: SavedMemo,
    onBack: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showConfirmDelete by remember { mutableStateOf(false) }

    Column(modifier = modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = UiSpacing.md, vertical = UiSpacing.sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .clip(UiShapes.pill)
                    .accessibilityTouchTarget
                    .accessibilitySemantics(label = "Назад", role = Role.Button)
                    .clickable(onClick = onBack)
                    .padding(UiSpacing.xs),
            )
            IconButton(
                onClick = { showConfirmDelete = true },
                modifier = Modifier
                    .accessibilityTouchTarget
                    .accessibilitySemantics(label = "Удалить памятку", role = Role.Button),
            ) {
                Icon(
                    imageVector = Icons.Rounded.Delete,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                )
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                horizontal = UiSpacing.xl,
                vertical = UiSpacing.md,
            ),
        ) {
            item {
                Text(
                    text = memo.title.ifBlank { "Памятка" },
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
            val subtitle = buildString {
                if (memo.courseTitle.isNotBlank()) append(memo.courseTitle)
                if (memo.lessonTitle.isNotBlank()) {
                    if (isNotEmpty()) append(" • ")
                    append(memo.lessonTitle)
                }
            }
            if (subtitle.isNotBlank()) {
                item {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            item {
                Text(
                    text = formatMemoTimestamp(memo.savedAtEpochMs),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                )
            }
            item {
                Spacer(modifier = Modifier.height(UiSpacing.sm))
                Markdown(content = memo.contentHtml)
            }
        }
    }

    if (showConfirmDelete) {
        AlertDialog(
            onDismissRequest = { showConfirmDelete = false },
            title = { Text("Удалить памятку?") },
            text = { Text("Памятка будет удалена с устройства. Это действие нельзя отменить.") },
            confirmButton = {
                TextButton(onClick = {
                    showConfirmDelete = false
                    onDelete()
                }) {
                    Text("Удалить")
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDelete = false }) {
                    Text("Отмена")
                }
            },
        )
    }
}

private fun memoGroupLabel(group: MemoGroup): String = when (group) {
    MemoGroup.Today -> "Сегодня"
    MemoGroup.Yesterday -> "Вчера"
    MemoGroup.ThisWeek -> "На этой неделе"
    MemoGroup.Earlier -> "Раньше"
}

@OptIn(ExperimentalTime::class)
private fun formatMemoTimestamp(epochMs: Long): String {
    val instant = Instant.fromEpochMilliseconds(epochMs)
    val local = instant.toLocalDateTime(TimeZone.currentSystemDefault())
    val day = local.day.toString().padStart(2, '0')
    @Suppress("DEPRECATION")
    val month = local.monthNumber.toString().padStart(2, '0')
    val year = local.year.toString()
    val hour = local.hour.toString().padStart(2, '0')
    val minute = local.minute.toString().padStart(2, '0')
    return "$day.$month.$year $hour:$minute"
}
