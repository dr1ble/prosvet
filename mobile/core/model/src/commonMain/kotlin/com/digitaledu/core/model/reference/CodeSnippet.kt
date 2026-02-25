package com.digitaledu.core.model.reference

import kotlinx.serialization.Serializable

@Serializable
data class CodeSnippet(
    val label: String,
    val code: String,
    val language: String = "bash",
)
