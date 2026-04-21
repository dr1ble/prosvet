package com.digitaledu.core.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import digital_education_mobile.core.ui.generated.resources.Res
import digital_education_mobile.core.ui.generated.resources.prosvet_brand
import org.jetbrains.compose.resources.stringResource

@Composable
fun ProsvetLogo(
    modifier: Modifier = Modifier,
    iconSize: Dp = 48.dp,
    textSize: Int = 32,
    textColor: Color = MaterialTheme.colorScheme.onSurface,
    showText: Boolean = true,
) {
    val colorPrimary = MaterialTheme.colorScheme.primary
    val colorAccent = MaterialTheme.colorScheme.secondary

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Logo Icon
        Box(modifier = Modifier.size(iconSize)) {
            Canvas(modifier = Modifier.matchParentSize()) {
                // Draw "P" shape using two blocks
                // 1. Vertical bar (Digital block)
                drawRect(
                    color = colorPrimary,
                    topLeft = Offset(0f, 0f),
                    size = Size(size.width * 0.35f, size.height),
                )
                
                // 2. Top curve (Book page metaphor)
                val path = Path().apply {
                    moveTo(size.width * 0.45f, 0f)
                    lineTo(size.width, 0f)
                    lineTo(size.width, size.height * 0.5f)
                    lineTo(size.width * 0.45f, size.height * 0.5f)
                    close()
                }
                drawPath(path = path, color = colorAccent, style = Fill)
                
                 // 3. Small pixel dot
                drawRect(
                    color = colorAccent.copy(alpha = UiOpacity.strong),
                    topLeft = Offset(size.width * 0.5f, size.height * 0.65f),
                    size = Size(size.width * 0.2f, size.width * 0.2f)
                )
            }
        }

        if (showText) {
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = stringResource(Res.string.prosvet_brand),
                style = when {
                    textSize >= 36 -> MaterialTheme.typography.displaySmall
                    textSize >= 30 -> MaterialTheme.typography.headlineMedium
                    else -> MaterialTheme.typography.titleLarge
                }.copy(fontWeight = FontWeight.Bold, letterSpacing = (-1).sp),
                color = textColor
            )
        }
    }
}
