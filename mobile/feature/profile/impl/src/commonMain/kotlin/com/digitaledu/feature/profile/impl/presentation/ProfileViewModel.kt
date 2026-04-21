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
import com.digitaledu.core.model.preferences.AccessibilitySettings
import com.digitaledu.feature.profile.impl.domain.LogoutUseCase
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

internal class ProfileViewModel(
    private val logoutUseCase: LogoutUseCase,
    private val accessibilityPreferencesRepository: AccessibilityPreferencesRepository,
) : BaseViewModel<ProfileUiState, ProfileIntent, ProfileEffect>(ProfileUiState()), ProfileFeatureHost {

    init {
        viewModelScope.launch {
            accessibilityPreferencesRepository.settings.collect { settings ->
                updateState { copy(accessibilitySettings = settings) }
            }
        }
    }

    override suspend fun handleIntent(intent: ProfileIntent) {
        when (intent) {
            ProfileIntent.Logout -> logout()
            ProfileIntent.DismissError -> dismissError()
            ProfileIntent.ResetAccessibility -> resetAccessibility()
            is ProfileIntent.SetFontScale -> updateAccessibility { copy(fontScale = intent.value.coerceIn(0.9f, 1.6f)) }
            is ProfileIntent.SetControlScale -> updateAccessibility { copy(controlScale = intent.value.coerceIn(1.0f, 1.6f)) }
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

        updateState { copy(status = ProfileStatus.Idle) }
        emitEffect(ProfileEffect.LoggedOut)
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
}
