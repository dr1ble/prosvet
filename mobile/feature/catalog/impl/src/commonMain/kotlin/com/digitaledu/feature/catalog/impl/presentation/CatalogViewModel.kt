package com.digitaledu.feature.catalog.impl.presentation

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.feature.catalog.api.CatalogEffect
import com.digitaledu.feature.catalog.api.CatalogFeatureHost
import com.digitaledu.feature.catalog.api.CatalogIntent
import com.digitaledu.feature.catalog.api.CatalogUiState
import com.digitaledu.feature.catalog.impl.domain.LoadCoursesUseCase
import com.digitaledu.feature.catalog.impl.domain.OpenCourseBundleUseCase

internal class CatalogViewModel(
    private val loadCoursesUseCase: LoadCoursesUseCase,
    private val openCourseBundleUseCase: OpenCourseBundleUseCase,
) : BaseViewModel<CatalogUiState, CatalogIntent, CatalogEffect>(CatalogUiState()), CatalogFeatureHost {

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
            loadCoursesUseCase()
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
            openCourseBundleUseCase(courseSlug)
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
