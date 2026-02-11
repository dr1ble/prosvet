package com.digitaledu.core.model

/**
 * A "Cheat Sheet" or summary reference for a completed lesson.
 * Saved to the user's profile for quick access.
 */
data class LessonReference(
    val id: String,
    val lessonId: String,
    val title: String,
    val summaryText: String,
    val keyPoints: List<String>,
    val codeSnippets: List<CodeSnippet>
)

/**
 * Represents a block of code or command.
 */
data class CodeSnippet(
    val label: String, // e.g. "Configure Interface"
    val code: String,  // e.g. "interface gigabitEthernet 0/0"
    val language: String = "bash"
)
