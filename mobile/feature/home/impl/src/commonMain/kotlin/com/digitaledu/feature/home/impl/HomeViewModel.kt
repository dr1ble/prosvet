package com.digitaledu.feature.home.impl

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class HomeViewModel(
    private val catalogRepository: CatalogRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(HomeUiState(isLoading = true))
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadCourses()
    }

    fun loadCourses() {
        viewModelScope.launch {
            _uiState.update { currentState ->
                currentState.copy(
                    isLoading = true,
                    errorMessage = null,
                )
            }
            runCatching {
                catalogRepository.listCourses()
            }.onSuccess { courses ->
                _uiState.update { currentState ->
                    currentState.copy(
                        isLoading = false,
                        courses = courses,
                        selectedBundle = null,
                        currentScreenIndex = 0,
                        errorMessage = null,
                    )
                }
            }.onFailure { throwable ->
                _uiState.update { currentState ->
                    currentState.copy(
                        isLoading = false,
                        errorMessage = throwable.message ?: "Не удалось загрузить курсы",
                    )
                }
            }
        }
    }

    fun openCourse(courseSlug: String) {
        viewModelScope.launch {
            _uiState.update { currentState ->
                currentState.copy(
                    isLoading = true,
                    errorMessage = null,
                )
            }
            runCatching {
                catalogRepository.getLatestCourseBundle(courseSlug = courseSlug)
            }.onSuccess { bundle ->
                _uiState.update { currentState ->
                    currentState.copy(
                        isLoading = false,
                        selectedBundle = bundle,
                        currentScreenIndex = 0,
                        errorMessage = null,
                    )
                }
            }.onFailure { throwable ->
                _uiState.update { currentState ->
                    currentState.copy(
                        isLoading = false,
                        errorMessage = throwable.message ?: "Не удалось загрузить версию курса",
                    )
                }
            }
        }
    }

    fun goToPreviousScreen() {
        _uiState.update { currentState ->
            val nextIndex = (currentState.currentScreenIndex - 1).coerceAtLeast(0)
            currentState.copy(currentScreenIndex = nextIndex)
        }
    }

    fun goToNextScreen() {
        _uiState.update { currentState ->
            val bundle = currentState.selectedBundle ?: return@update currentState
            val nextIndex = (currentState.currentScreenIndex + 1)
                .coerceIn(0, bundle.screens.lastIndex)
            
            // Mark current screen as complete when moving to next
            val updatedCompleted = if (nextIndex > currentState.currentScreenIndex) {
                currentState.completedScreens + currentState.currentScreenIndex
            } else {
                currentState.completedScreens
            }
            
            currentState.copy(
                currentScreenIndex = nextIndex,
                completedScreens = updatedCompleted
            )
        }
    }

    fun closeCourse() {
        _uiState.update { currentState ->
            currentState.copy(
                selectedBundle = null,
                currentScreenIndex = 0,
                errorMessage = null,
            )
        }
    }

    fun dismissError() {
        _uiState.update { currentState ->
            currentState.copy(errorMessage = null)
        }
    }

    fun enterFullscreenPlayer() {
        _uiState.update { currentState ->
            currentState.copy(isFullscreenMode = true)
        }
    }

    fun exitFullscreenMode() {
        _uiState.update { currentState ->
            currentState.copy(isFullscreenMode = false)
        }
    }

    /**
     * Navigate to a screen by its screenKey.
     * Used by hotspot clicks in simulations.
     */
    fun navigateToScreenKey(screenKey: String) {
        _uiState.update { currentState ->
            val bundle = currentState.selectedBundle ?: return@update currentState
            val targetIndex = bundle.screens.indexOfFirst { it.screenKey == screenKey }
            if (targetIndex >= 0) {
                currentState.copy(currentScreenIndex = targetIndex)
            } else {
                currentState
            }
        }
    }
    
    /**
     * Mark the current screen as complete.
     * Called when user navigates to next screen, indicating they've viewed current one.
     */
    fun markCurrentScreenComplete() {
        _uiState.update { currentState ->
            currentState.copy(
                completedScreens = currentState.completedScreens + currentState.currentScreenIndex
            )
        }
    }
    
    /**
     * Reset progress for the current bundle.
     * Useful when starting a course over.
     */
    fun resetProgress() {
        _uiState.update { currentState ->
            currentState.copy(
                completedScreens = emptySet(),
                currentScreenIndex = 0
            )
        }
    }

    companion object {
        fun provideFactory(catalogRepository: CatalogRepository): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    HomeViewModel(catalogRepository = catalogRepository)
                }
            }
        }
    }
}

data class HomeUiState(
    val isLoading: Boolean = false,
    val courses: List<CatalogCourse> = emptyList(),
    val selectedBundle: CatalogBundle? = null,
    val currentScreenIndex: Int = 0,
    val errorMessage: String? = null,
    val isFullscreenMode: Boolean = false,
    val completedScreens: Set<Int> = emptySet(), // Tracks completed screens by index
) {
    val currentScreen = selectedBundle?.screens?.getOrNull(currentScreenIndex)

    val canOpenPreviousScreen: Boolean
        get() = selectedBundle != null && currentScreenIndex > 0

    val canOpenNextScreen: Boolean
        get() = selectedBundle != null && currentScreenIndex < (selectedBundle.screens.lastIndex)
}
