package com.digitaledu.feature.auth.impl

import com.digitaledu.core.model.auth.DebugQuickLoginPreset

sealed interface AuthIntent {
    data class LoginChanged(val value: String) : AuthIntent
    data class PasswordChanged(val value: String) : AuthIntent
    data class DebugQuickLoginClicked(val preset: DebugQuickLoginPreset) : AuthIntent
    data object LoginClicked : AuthIntent
}
