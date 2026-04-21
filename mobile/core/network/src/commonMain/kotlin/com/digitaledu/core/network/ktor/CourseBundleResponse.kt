package com.digitaledu.core.network.ktor

import kotlinx.serialization.Serializable

@Serializable
internal data class CourseBundleResponse(
    val course: CourseResponse,
    val release: ReleaseResponse,
    val screens: List<ScreenResponse>,
)
