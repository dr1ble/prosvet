package com.digitaledu.feature.home.impl.profile

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.auth.AuthRepository

class ProfileViewModel(
    private val authRepository: AuthRepository,
) : BaseViewModel<ProfileUiState, ProfileIntent, ProfileEffect>(ProfileUiState()) {

    override suspend fun handleIntent(intent: ProfileIntent) {
        when (intent) {
            ProfileIntent.Logout -> logout()
            ProfileIntent.DismissError -> dismissError()
        }
    }

    private suspend fun logout() {
        val success = runSubmittingAction {
            authRepository.logout()
        }
        if (!success) return

        updateState { copy(isLoggingOut = false) }
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
            copy(
                isLoggingOut = true,
                errorMessage = null,
            )
        }
    }

    private fun setError(throwable: Throwable) {
        updateState {
            copy(
                isLoggingOut = false,
                errorMessage = throwable.toUserMessage(),
            )
        }
    }

    private fun dismissError() {
        updateState { copy(errorMessage = null) }
    }
}
