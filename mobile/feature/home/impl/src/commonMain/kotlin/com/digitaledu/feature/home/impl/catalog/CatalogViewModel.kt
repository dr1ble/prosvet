package com.digitaledu.feature.home.impl.catalog

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.catalog.CatalogRepository

class CatalogViewModel(
    private val catalogRepository: CatalogRepository,
) : BaseViewModel<CatalogUiState, CatalogIntent, CatalogEffect>(CatalogUiState()) {

    init {
        processIntent(CatalogIntent.RefreshCourses)
    }

    override suspend fun handleIntent(intent: CatalogIntent) {
        when (intent) {
            CatalogIntent.RefreshCourses -> loadCourses()
            is CatalogIntent.OpenCourse -> openCourse(intent.slug)
            CatalogIntent.DismissError -> dismissError()
            is CatalogIntent.SetSearchQuery -> updateState { copy(searchQuery = intent.query) }
            is CatalogIntent.SetCategory -> updateState { copy(selectedCategoryId = intent.categoryId) }
            is CatalogIntent.UpdateProgress -> updateState {
                copy(
                    progressByCourseId = progressByCourseId + (
                        intent.courseId to CourseProgress(
                            completedLessons = intent.completedLessons,
                            totalLessons = intent.totalLessons,
                        )
                    ),
                )
            }
        }
    }

    private suspend fun loadCourses() {
        updateState {
            copy(
                isLoading = true,
                errorMessage = null,
            )
        }

        runCatching {
            catalogRepository.listCourses()
        }.onSuccess { courses ->
            updateState {
                copy(
                    isLoading = false,
                    courses = courses,
                    errorMessage = null,
                )
            }
        }.onFailure { throwable ->
            updateState {
                copy(
                    isLoading = false,
                    errorMessage = throwable.toUserMessage(),
                )
            }
        }
    }

    private suspend fun openCourse(courseSlug: String) {
        updateState {
            copy(
                isLoading = true,
                errorMessage = null,
            )
        }

        runCatching {
            catalogRepository.getLatestCourseBundle(courseSlug = courseSlug)
        }.onSuccess { bundle ->
            updateState {
                copy(
                    isLoading = false,
                    errorMessage = null,
                )
            }
            emitEffect(CatalogEffect.CourseOpened(bundle))
        }.onFailure { throwable ->
            updateState {
                copy(
                    isLoading = false,
                    errorMessage = throwable.toUserMessage(),
                )
            }
        }
    }

    private fun dismissError() {
        updateState { copy(errorMessage = null) }
    }
}
