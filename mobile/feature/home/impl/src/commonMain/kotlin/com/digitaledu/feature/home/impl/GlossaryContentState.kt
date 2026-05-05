package com.digitaledu.feature.home.impl

import com.digitaledu.core.model.progress.GlossaryTermEntry

internal data class GlossaryGroup(
    val letter: String,
    val terms: List<GlossaryTermEntry>,
)

internal fun buildGlossaryGroups(terms: List<GlossaryTermEntry>, query: String): List<GlossaryGroup> {
    val normalizedQuery = query.trim().lowercase()
    return terms
        .asSequence()
        .filter { term -> term.term.isNotBlank() }
        .filter { term ->
            normalizedQuery.isEmpty() ||
                term.term.lowercase().contains(normalizedQuery) ||
                term.definition.lowercase().contains(normalizedQuery) ||
                term.courseTitle.lowercase().contains(normalizedQuery)
        }
        .sortedBy { it.term.lowercase() }
        .groupBy { term -> term.term.first().uppercase() }
        .map { (letter, terms) -> GlossaryGroup(letter = letter, terms = terms) }
}
