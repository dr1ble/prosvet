package com.digitaledu.core.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import digital_education_mobile.core.ui.generated.resources.Res
import digital_education_mobile.core.ui.generated.resources.error_dialog_confirm
import digital_education_mobile.core.ui.generated.resources.error_dialog_title
import org.jetbrains.compose.resources.stringResource

@Composable
fun ErrorDialog(
    message: String?,
    onDismiss: () -> Unit,
) {
    val text = message?.takeIf { it.isNotBlank() } ?: return

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(text = stringResource(Res.string.error_dialog_title))
        },
        text = {
            Text(text = text)
        },
        confirmButton = {
            TextButton(onClick = rememberTremorFilteredOnClick(onClick = onDismiss)) {
                Text(
                    text = stringResource(Res.string.error_dialog_confirm),
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        },
    )
}
