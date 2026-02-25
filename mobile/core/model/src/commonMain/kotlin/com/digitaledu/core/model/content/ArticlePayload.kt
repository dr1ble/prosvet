package com.digitaledu.core.model.content

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("article")
data class ArticlePayload(
    @SerialName("markdown_content") val markdownContent: String,
    val assets: List<String> = emptyList(),
) : ScreenPayload
