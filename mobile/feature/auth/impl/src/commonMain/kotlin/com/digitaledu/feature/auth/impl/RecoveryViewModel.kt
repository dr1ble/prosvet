package com.digitaledu.feature.auth.impl

import com.digitaledu.core.common.BaseViewModel

class RecoveryViewModel :
    BaseViewModel<RecoveryUiState, RecoveryIntent, RecoveryEffect>(RecoveryUiState()) {

    override suspend fun handleIntent(intent: RecoveryIntent) {
        when (intent) {
            is RecoveryIntent.LoginOrEmailChanged -> updateState {
                copy(loginOrEmail = intent.value, infoMessage = null)
            }

            is RecoveryIntent.SubmitClicked -> submit(intent.infoMessage)
        }
    }

    private fun submit(infoMessage: String) {
        if (!currentState.canSubmit) return

        updateState { copy(isSubmitting = true, infoMessage = null) }
        updateState { copy(isSubmitting = false, infoMessage = infoMessage) }
        emitEffect(RecoveryEffect.Sent)
    }
}
