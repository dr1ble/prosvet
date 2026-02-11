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
        updateState {
            copy(
                isLoggingOut = true,
                errorMessage = null,
            )
        }

        runCatching {
            authRepository.logout()
        }.onSuccess {
            updateState { copy(isLoggingOut = false) }
            emitEffect(ProfileEffect.LoggedOut)
        }.onFailure { throwable ->
            updateState {
                copy(
                    isLoggingOut = false,
                    errorMessage = throwable.toUserMessage(),
                )
            }
        }
    }

    private fun dismissError() {
        updateState { copy(errorMessage = null) }
    }
}
