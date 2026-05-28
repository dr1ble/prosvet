package com.digitaledu.feature.player.impl.ui

internal fun resolveCoursePreviewCoverUrl(
    simulationImageUrl: String?,
    courseCoverImageUrl: String?,
): String? {
    return courseCoverImageUrl?.trim()?.takeIf { it.isNotEmpty() }
        ?: simulationImageUrl?.trim()?.takeIf { it.isNotEmpty() }
}
