package com.digitaledu.feature.player.impl.domain

import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.model.catalog.CatalogRelease
import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.content.ArticlePayload
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class PlayerDomainUseCasesTest {
    private val progressTransition = ProgressTransitionUseCase()
    private val restoreCourseProgress = RestoreCourseProgressUseCase()
    private val resolveCompletedLessonId = ResolveCompletedLessonIdUseCase()

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
    fun resolveCompletedLessonId_returnsSourceLesson_whenMovingToAnotherLesson() {
        val bundle = bundleWithLessons(listOf("lesson-1", "lesson-1", "lesson-2"))

        val result = resolveCompletedLessonId(
            bundle = bundle,
            sourceIndex = 1,
            targetIndex = 2,
        )

        assertEquals("lesson-1", result)
    }

    @Test
    fun resolveCompletedLessonId_returnsNull_withinSameLessonOrBackward() {
        val bundle = bundleWithLessons(listOf("lesson-1", "lesson-1", "lesson-2"))

        assertEquals(
            null,
            resolveCompletedLessonId(bundle = bundle, sourceIndex = 0, targetIndex = 1),
        )
        assertEquals(
            null,
            resolveCompletedLessonId(bundle = bundle, sourceIndex = 2, targetIndex = 1),
        )
    }

    @Test
    fun resolveCompletedLessonId_returnsLastLesson_whenClosingOnLastScreen() {
        val bundle = bundleWithLessons(listOf("lesson-1", "lesson-2"))

        val result = resolveCompletedLessonId.resolveOnClose(
            bundle = bundle,
            currentIndex = 1,
        )

        assertEquals("lesson-2", result)
    }

    @Test
    fun resolveVideoPlaybackSource_mapsRutubeWatchUrlToEmbed() {
        val result = assertIs<VideoPlaybackSource.WebEmbed>(
            resolveVideoPlaybackSource("https://rutube.ru/video/0123456789abcdef0123456789abcdef/"),
        )

        assertEquals(
            "https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef",
            result.url,
        )
    }

    @Test
    fun resolveVideoPlaybackSource_keepsDirectMediaUrl() {
        val result = assertIs<VideoPlaybackSource.Direct>(
            resolveVideoPlaybackSource("https://cdn.example.com/video.mp4"),
        )

        assertEquals("https://cdn.example.com/video.mp4", result.url)
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

    private fun bundleWithLessons(lessonIds: List<String>): CatalogBundle {
        val screens = lessonIds.mapIndexed { index, lessonId ->
            CatalogScreen(
                id = "screen-$index",
                screenKey = "key-$index",
                title = "Screen $index",
                orderIndex = index,
                lessonId = lessonId,
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
                screenCount = screens.size,
            ),
            screens = screens,
        )
    }
}
