package com.digitaledu.feature.auth.impl

sealed interface AuthIntent {
    data class LoginChanged(val value: String) : AuthIntent
    data class PasswordChanged(val value: String) : AuthIntent
    data object LoginClicked : AuthIntent
}
