package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSize
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.AccessibilityScaledControlContainer
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.core.model.reference.CodeSnippet
import com.digitaledu.core.model.reference.LessonReference
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.cheat_sheet_commands_code
import digital_education_mobile.feature.player.`impl`.generated.resources.cheat_sheet_copy_code
import digital_education_mobile.feature.player.`impl`.generated.resources.cheat_sheet_key_points
import digital_education_mobile.feature.player.`impl`.generated.resources.list_bullet
import org.jetbrains.compose.resources.stringResource

/**
 * Displays a structured "Cheat Sheet" or Lesson Reference.
 * content includes summary, key points, and code snippets.
 */
@Composable
fun LessonCheatSheetView(
    reference: LessonReference,
    modifier: Modifier = Modifier
) {
    @Suppress("DEPRECATION")
    val clipboardManager = LocalClipboardManager.current

    LazyColumn(
        modifier = modifier.padding(UiSpacing.md),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
    ) {
        // Title and Summary
        item {
            Column {
                Text(
                    text = reference.title,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(UiSpacing.xs))
                Text(
                    text = reference.summaryText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        item { HorizontalDivider() }

        // Key Points
        if (reference.keyPoints.isNotEmpty()) {
            item {
                Text(
                    text = stringResource(Res.string.cheat_sheet_key_points),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(UiSpacing.xs))
            }
            items(reference.keyPoints) { point ->
                Row(
                    modifier = Modifier.padding(bottom = UiSpacing.xs),
                    horizontalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                ) {
                    Text(
                        text = stringResource(Res.string.list_bullet),
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    Text(
                        text = point,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

        // Code Snippets
        if (reference.codeSnippets.isNotEmpty()) {
            item {
                HorizontalDivider()
                Spacer(modifier = Modifier.height(UiSpacing.md))
                Text(
                    text = stringResource(Res.string.cheat_sheet_commands_code),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            items(reference.codeSnippets) { snippet ->
                CodeSnippetCard(
                    snippet = snippet,
                    onCopy = {
                        clipboardManager.setText(AnnotatedString(snippet.code))
                    }
                )
            }
        }
    }
}

@Composable
fun CodeSnippetCard(
    snippet: CodeSnippet,
    onCopy: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = UiShapes.cardSm,
    ) {
        Column(modifier = Modifier.padding(UiSpacing.sm)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = snippet.label,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                IconButton(
                    onClick = onCopy,
                    modifier = Modifier
                        .size(UiSize.iconLg)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(
                            label = stringResource(Res.string.cheat_sheet_copy_code),
                            role = Role.Button,
                        ),
                ) {
                    AccessibilityScaledControlContainer {
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = stringResource(Res.string.cheat_sheet_copy_code),
                            modifier = Modifier.size(UiSpacing.md),
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(UiSpacing.xxs))
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        MaterialTheme.colorScheme.onSurface.copy(alpha = UiOpacity.subtle),
                        UiShapes.chip,
                    )
                    .padding(UiSpacing.xs),
            ) {
                Text(
                    text = snippet.code,
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontFamily = FontFamily.Monospace
                    ),
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}
