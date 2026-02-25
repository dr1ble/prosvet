package com.digitaledu.feature.catalog.api

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CatalogContractsTest {
    @Test
    fun uiState_hasExpectedDefaults() {
        val state = CatalogUiState()

        assertEquals(false, state.isLoading)
        assertTrue(state.courses.isEmpty())
        assertEquals(null, state.errorMessage)
    }

    @Test
    fun intentOpenCourse_keepsSlugValue() {
        val intent = CatalogIntent.OpenCourse(slug = "networking-101")

        assertEquals("networking-101", intent.slug)
    }
}
