package com.digitaledu.feature.player.impl.domain

import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.model.catalog.CatalogRelease
import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.ScreenPayload
import com.digitaledu.core.model.content.SimulationPayload
import kotlin.test.Test
import kotlin.test.assertEquals

class PlayerDomainUseCasesTest {
    private val progressTransition = ProgressTransitionUseCase()
    private val restoreCourseProgress = RestoreCourseProgressUseCase()
    private val resolveReferenceId = ResolveReferenceIdUseCase()

    @Test
    fun progressTransition_addsSourceIndex_whenMovedForward() {
        val result = progressTransition(
            sourceIndex = 1,
            targetIndex = 3,
            completedScreens = setOf(0),
        )

        assertEquals(setOf(0, 1), result)
    }

    @Test
    fun progressTransition_keepsSet_whenMovedBackwardOrSame() {
        val completed = setOf(0, 2)

        assertEquals(
            completed,
            progressTransition(sourceIndex = 2, targetIndex = 2, completedScreens = completed),
        )
        assertEquals(
            completed,
            progressTransition(sourceIndex = 2, targetIndex = 1, completedScreens = completed),
        )
    }

    @Test
    fun restoreCourseProgress_clampsIndex_and_filtersInvalidCompleted() {
        val bundle = bundleWithScreens(3)

        val restored = restoreCourseProgress(
            bundle = bundle,
            saved = SavedCourseProgress(
                currentScreenIndex = 10,
                completedScreens = setOf(-1, 0, 2, 4),
            ),
        )

        assertEquals(2, restored.currentScreenIndex)
        assertEquals(setOf(0, 2), restored.completedScreens)
    }

    @Test
    fun restoreCourseProgress_returnsDefaults_whenNoSavedProgress() {
        val bundle = bundleWithScreens(2)

        val restored = restoreCourseProgress(
            bundle = bundle,
            saved = null,
        )

        assertEquals(0, restored.currentScreenIndex)
        assertEquals(emptySet(), restored.completedScreens)
    }

    @Test
    fun resolveReferenceId_supportsSimulationAndCheatSheet() {
        val simulation = SimulationPayload(
            imageUrl = "img.png",
            contextRef = "sim-ref",
        )
        val cheatSheet = CheatSheetPayload(referenceId = "sheet-ref")

        assertEquals("sim-ref", resolveReferenceId(simulation))
        assertEquals("sheet-ref", resolveReferenceId(cheatSheet))
    }

    @Test
    fun resolveReferenceId_returnsNull_forUnsupportedPayload() {
        val article: ScreenPayload = ArticlePayload(markdownContent = "# lesson")

        assertEquals(null, resolveReferenceId(article))
    }

    private fun bundleWithScreens(count: Int): CatalogBundle {
        val screens = (0 until count).map { index ->
            CatalogScreen(
                id = "screen-$index",
                screenKey = "key-$index",
                title = "Screen $index",
                orderIndex = index,
                payload = ArticlePayload(markdownContent = "Screen $index"),
            )
        }

        return CatalogBundle(
            course = CatalogCourse(
                id = "course-1",
                slug = "course-1",
                title = "Course",
                description = null,
            ),
            release = CatalogRelease(
                id = "release-1",
                version = "1.0.0",
                changelog = null,
                screenCount = count,
            ),
            screens = screens,
        )
    }
}
