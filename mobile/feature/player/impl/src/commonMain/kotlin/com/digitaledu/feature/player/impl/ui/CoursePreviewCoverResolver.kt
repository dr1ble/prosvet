package com.digitaledu.feature.player.impl.ui

internal fun resolveCoursePreviewCoverUrl(
    simulationImageUrl: String?,
    courseCoverImageUrl: String?,
): String? {
    return simulationImageUrl?.trim()?.takeIf { it.isNotEmpty() }
        ?: courseCoverImageUrl?.trim()?.takeIf { it.isNotEmpty() }
}
