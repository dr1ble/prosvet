package com.digitaledu.feature.catalog.impl.ui

internal fun resolveCourseCoverUrl(rawCoverUrl: String?): String? {
    return rawCoverUrl?.trim()?.takeIf { it.isNotEmpty() }
}
