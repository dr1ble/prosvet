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
        }
    }

    private suspend fun loadCourses() {
        val courses = runLoadingAction {
            catalogRepository.listCourses()
        } ?: return

        updateState {
            copy(
                isLoading = false,
                courses = courses,
                errorMessage = null,
            )
        }
    }

    private suspend fun openCourse(courseSlug: String) {
        val bundle = runLoadingAction {
            catalogRepository.getLatestCourseBundle(courseSlug = courseSlug)
        } ?: return

        updateState {
            copy(
                isLoading = false,
                errorMessage = null,
            )
        }
        emitEffect(CatalogEffect.CourseOpened(bundle))
    }

    private suspend fun <T> runLoadingAction(block: suspend () -> T): T? {
        setLoading()
        return try {
            block()
        } catch (throwable: Throwable) {
            setError(throwable)
            null
        }
    }

    private fun setLoading() {
        updateState {
            copy(
                isLoading = true,
                errorMessage = null,
            )
        }
    }

    private fun setError(throwable: Throwable) {
        updateState {
            copy(
                isLoading = false,
                errorMessage = throwable.toUserMessage(),
            )
        }
    }

    private fun dismissError() {
        updateState { copy(errorMessage = null) }
    }
}
