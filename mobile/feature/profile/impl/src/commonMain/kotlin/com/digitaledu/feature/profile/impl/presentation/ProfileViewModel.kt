package com.digitaledu.feature.profile.impl.presentation

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.feature.profile.api.ProfileEffect
import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileStatus
import com.digitaledu.feature.profile.api.ProfileUiState
import androidx.lifecycle.viewModelScope
import com.digitaledu.core.data.preferences.AccessibilityPreferencesRepository
import com.digitaledu.core.data.profile.ProfileRepository
import com.digitaledu.core.data.progress.ProgressRepository
import com.digitaledu.core.model.preferences.AccessibilitySettings
import com.digitaledu.feature.profile.impl.domain.LogoutUseCase
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

internal class ProfileViewModel(
    private val logoutUseCase: LogoutUseCase,
    private val accessibilityPreferencesRepository: AccessibilityPreferencesRepository,
    private val profileRepository: ProfileRepository,
    private val progressRepository: ProgressRepository,
) : BaseViewModel<ProfileUiState, ProfileIntent, ProfileEffect>(ProfileUiState()), ProfileFeatureHost {

    init {
        viewModelScope.launch {
            accessibilityPreferencesRepository.settings.collect { settings ->
                updateState { copy(accessibilitySettings = settings) }
            }
        }
        viewModelScope.launch {
            loadProfile()
        }
        viewModelScope.launch {
            loadProgress()
        }
    }

    override suspend fun handleIntent(intent: ProfileIntent) {
        when (intent) {
            ProfileIntent.Logout -> logout()
            ProfileIntent.DismissError -> dismissError()
            ProfileIntent.DismissSuccess -> dismissSuccess()
            is ProfileIntent.BindEmail -> bindEmail(intent.email)
            ProfileIntent.ResetAccessibility -> resetAccessibility()
            is ProfileIntent.SetFontScale -> updateAccessibility { copy(fontScale = intent.value.coerceIn(1.0f, 1.6f)) }
            is ProfileIntent.SetControlScale -> updateAccessibility { copy(controlScale = intent.value.coerceIn(1.0f, 1.3f)) }
            is ProfileIntent.SetBoldText -> updateAccessibility { copy(boldText = intent.enabled) }
            is ProfileIntent.SetHighContrast -> updateAccessibility { copy(highContrast = intent.enabled) }
            is ProfileIntent.SetVoiceSupport -> updateAccessibility { copy(voiceSupport = intent.enabled) }
            is ProfileIntent.SetTremorFilter -> updateAccessibility { copy(tremorFilter = intent.enabled) }
        }
    }

    private suspend fun logout() {
        val success = runSubmittingAction {
            logoutUseCase()
        }
        if (!success) return

        updateState {
            copy(
                status = ProfileStatus.Idle,
                displayName = null,
                email = null,
                role = null,
                accountStatus = null,
                permissions = emptyList(),
                courseProgress = emptyList(),
            )
        }
        emitEffect(ProfileEffect.LoggedOut)
    }

    private suspend fun loadProfile() {
        runCatching {
            profileRepository.getCurrentProfile()
        }.onSuccess { profile ->
            updateState {
                copy(
                    displayName = profile.displayName,
                    email = profile.email,
                    role = profile.role,
                    accountStatus = profile.status,
                    permissions = profile.permissions,
                )
            }
        }.onFailure { throwable ->
            setError(throwable)
        }
    }

    private suspend fun loadProgress() {
        updateState { copy(isLoadingProgress = true) }
        runCatching {
            progressRepository.getMyProgress()
        }.onSuccess { courses ->
            updateState {
                copy(
                    courseProgress = courses,
                    isLoadingProgress = false,
                )
            }
        }.onFailure {
            updateState { copy(isLoadingProgress = false) }
        }
    }

    private suspend fun bindEmail(email: String) {
        val normalizedEmail = email.trim()
        if (normalizedEmail.isEmpty() || currentState.isBindingEmail) return

        updateState { copy(isBindingEmail = true, successMessage = null) }
        runCatching {
            profileRepository.bindEmail(normalizedEmail)
        }.onSuccess { profile ->
            updateState {
                copy(
                    email = profile.email,
                    isBindingEmail = false,
                    status = ProfileStatus.Idle,
                    successMessage = "Почта успешно привязана.",
                )
            }
        }.onFailure { throwable ->
            updateState { copy(isBindingEmail = false) }
            setError(throwable)
        }
    }

    private suspend fun runSubmittingAction(block: suspend () -> Unit): Boolean {
        setSubmitting()
        return try {
            block()
            true
        } catch (throwable: Throwable) {
            setError(throwable)
            false
        }
    }

    private fun setSubmitting() {
        updateState {
            copy(status = ProfileStatus.LoggingOut)
        }
    }

    private fun setError(throwable: Throwable) {
        updateState {
            copy(status = ProfileStatus.Error(throwable.toUserMessage()))
        }
    }

    private suspend fun updateAccessibility(transform: AccessibilitySettings.() -> AccessibilitySettings) {
        accessibilityPreferencesRepository.update(transform)
    }

    private suspend fun resetAccessibility() {
        accessibilityPreferencesRepository.update { AccessibilitySettings() }
    }

    private fun dismissError() {
        if (currentState.status is ProfileStatus.Error) {
            updateState { copy(status = ProfileStatus.Idle) }
        }
    }

    private fun dismissSuccess() {
        if (!currentState.successMessage.isNullOrBlank()) {
            updateState { copy(successMessage = null) }
        }
    }
}
