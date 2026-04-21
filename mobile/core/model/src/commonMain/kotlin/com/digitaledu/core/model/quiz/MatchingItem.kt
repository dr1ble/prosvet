package com.digitaledu.core.model.quiz

import kotlinx.serialization.Serializable

@Serializable
data class MatchingItem(
    val id: String,
    val left: String,
    val right: String,
)
