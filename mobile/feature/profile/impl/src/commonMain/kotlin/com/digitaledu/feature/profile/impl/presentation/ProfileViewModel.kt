package com.digitaledu.feature.profile.impl.presentation

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.feature.profile.api.ProfileEffect
import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileStatus
import com.digitaledu.feature.profile.api.ProfileUiState
import com.digitaledu.feature.profile.impl.domain.LogoutUseCase

internal class ProfileViewModel(
    private val logoutUseCase: LogoutUseCase,
) : BaseViewModel<ProfileUiState, ProfileIntent, ProfileEffect>(ProfileUiState()), ProfileFeatureHost {

    override suspend fun handleIntent(intent: ProfileIntent) {
        when (intent) {
            ProfileIntent.Logout -> logout()
            ProfileIntent.DismissError -> dismissError()
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

    private fun dismissError() {
        if (currentState.status is ProfileStatus.Error) {
            updateState { copy(status = ProfileStatus.Idle) }
        }
    }
}
