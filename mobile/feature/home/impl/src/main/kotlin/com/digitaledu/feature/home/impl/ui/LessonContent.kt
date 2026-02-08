package com.digitaledu.feature.home.impl.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.feature.home.impl.HomeUiState

@Composable
fun LessonContent(
    uiState: HomeUiState,
    onBackToCatalog: () -> Unit,
    onOpenCatalog: () -> Unit,
    onPreviousScreen: () -> Unit,
    onNextScreen: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bundle = uiState.selectedBundle

    if (uiState.isLoading && bundle == null) {
        CenteredLoadingIndicator(modifier = modifier)
        return
    }

    if (bundle == null) {
        Column(
            modifier = modifier
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Выберите курс",
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = "Откройте курс в каталоге, и урок появится здесь.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(onClick = onOpenCatalog) {
                Text(text = "Перейти к курсам")
            }
        }
        return
    }

    val currentScreen = uiState.currentScreen
    val totalScreens = bundle.screens.size.coerceAtLeast(1)
    val progress = (uiState.currentScreenIndex + 1).toFloat() / totalScreens.toFloat()

    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ElevatedCard(
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.elevatedCardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.65f),
            ),
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = bundle.course.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = "Версия ${bundle.release.version}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(100)),
                )
                Text(
                    text = "Экран ${uiState.currentScreenIndex + 1} из ${bundle.screens.size}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Card(
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
            ),
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = currentScreen?.title ?: "Содержимое временно недоступно",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = currentScreen?.payloadPreview ?: "Открой другой курс или обнови релиз.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedButton(
                onClick = onPreviousScreen,
                enabled = uiState.canOpenPreviousScreen,
                modifier = Modifier.weight(1f),
            ) {
                Text(text = "Назад")
            }
            Button(
                onClick = onNextScreen,
                enabled = uiState.canOpenNextScreen,
                modifier = Modifier.weight(1f),
            ) {
                Text(text = "Дальше")
            }
        }

        OutlinedButton(
            onClick = onBackToCatalog,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(text = "Выбрать другой курс")
        }
    }
}
