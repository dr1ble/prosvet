package com.digitaledu.core.network.ktor

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class CourseResponse(
    val id: String,
    val slug: String,
    val title: String,
    val description: String? = null,
    @SerialName("cover_url") val coverUrl: String? = null,
    @SerialName("is_favorite") val isFavorite: Boolean = false,
    @SerialName("photo_url") val photoUrl: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
)
