package com.digitaledu.feature.player.impl.domain

import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.model.catalog.CatalogRelease
import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.ScreenPayload
import com.digitaledu.core.model.content.SimulationPayload
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class PlayerNavigationUseCasesTest {
    private val resolveNavigation = ResolveNavigationUseCase()
    private val resolveHotspotAction = ResolveHotspotActionUseCase()

    @Test
    fun resolveNavigation_nextMovesForward_andMarksCompletedSource() {
        val bundle = bundleWithScreens(3)

        val outcome = assertNotNull(resolveNavigation(
            bundle = bundle,
            currentIndex = 0,
            completedScreens = emptySet(),
            command = NavigationCommand.Next,
        ))

        assertEquals(1, outcome.targetIndex)
        assertEquals(setOf(0), outcome.completedScreens)
    }

    @Test
    fun resolveNavigation_previousStaysInBounds_withoutChangingCompleted() {
        val bundle = bundleWithScreens(3)

        val outcome = assertNotNull(resolveNavigation(
            bundle = bundle,
            currentIndex = 0,
            completedScreens = setOf(1),
            command = NavigationCommand.Previous,
        ))

        assertEquals(0, outcome.targetIndex)
        assertEquals(setOf(1), outcome.completedScreens)
    }

    @Test
    fun resolveNavigation_toScreenKey_returnsNull_whenMissing() {
        val bundle = bundleWithScreens(2)

        val outcome = resolveNavigation(
            bundle = bundle,
            currentIndex = 0,
            completedScreens = emptySet(),
            command = NavigationCommand.ToScreenKey("missing"),
        )

        assertEquals(null, outcome)
    }

    @Test
    fun resolveHotspotAction_returnsMoveNext_forStartSimulationWithoutTarget() {
        val hotspot = Hotspot(
            x = 0f,
            y = 0f,
            width = 10f,
            height = 10f,
            label = "start",
            hint = "",
            targetScreenKey = null,
        )

        val action = resolveHotspotAction(
            currentPayload = SimulationPayload(
                imageUrl = "img.png",
                isStart = true,
            ),
            hotspot = hotspot,
        )

        assertEquals(HotspotAction.MoveNext, action)
    }

    @Test
    fun resolveHotspotAction_returnsShowHint_whenHintExists() {
        val hotspot = Hotspot(
            x = 0f,
            y = 0f,
            width = 10f,
            height = 10f,
            label = "hint",
            hint = "show me",
            targetScreenKey = "screen-2",
        )

        val action = resolveHotspotAction(
            currentPayload = ArticlePayload(markdownContent = "article"),
            hotspot = hotspot,
        )

        assertEquals(HotspotAction.ShowHint(hotspot), action)
    }

    @Test
    fun resolveHotspotAction_returnsNavigate_whenNoHintAndTargetExists() {
        val hotspot = Hotspot(
            x = 0f,
            y = 0f,
            width = 10f,
            height = 10f,
            label = "goto",
            hint = "",
            targetScreenKey = "screen-2",
        )

        val action = resolveHotspotAction(
            currentPayload = ArticlePayload(markdownContent = "article"),
            hotspot = hotspot,
        )

        assertEquals(HotspotAction.NavigateToScreen("screen-2"), action)
    }

    @Test
    fun resolveHotspotAction_returnsNone_whenNoHintAndNoTarget() {
        val hotspot = Hotspot(
            x = 0f,
            y = 0f,
            width = 10f,
            height = 10f,
            label = "noop",
            hint = "",
            targetScreenKey = null,
        )

        val action = resolveHotspotAction(
            currentPayload = ArticlePayload(markdownContent = "article"),
            hotspot = hotspot,
        )

        assertEquals(HotspotAction.None, action)
    }

    private fun bundleWithScreens(count: Int): CatalogBundle {
        val screens = (0 until count).map { index ->
            CatalogScreen(
                id = "screen-$index",
                screenKey = "screen-$index",
                title = "Screen $index",
                orderIndex = index,
                payload = payloadFor(index),
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

    private fun payloadFor(index: Int): ScreenPayload {
        return ArticlePayload(markdownContent = "screen-$index")
    }
}
