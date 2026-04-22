package com.digitaledu.feature.catalog.api

import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.ScreenPayload
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
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

    @Test
    fun catalogScreen_keepsOptionalLessonId() {
        val screen = CatalogScreen(
            id = "screen-1",
            screenKey = "screen.key",
            title = "Screen",
            orderIndex = 1,
            lessonId = "lesson-1",
            payload = ArticlePayload(markdownContent = "# lesson"),
        )

        assertEquals("lesson-1", screen.lessonId)
        assertNull(screen.copy(lessonId = null).lessonId)
    }
}
