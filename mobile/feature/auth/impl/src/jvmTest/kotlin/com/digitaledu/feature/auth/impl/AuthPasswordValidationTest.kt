package com.digitaledu.feature.auth.impl

import kotlin.test.Test
import kotlin.test.assertEquals

class AuthPasswordValidationTest {
    @Test
    fun loginShowsPasswordValidationMessageWhenPasswordIsTooShort() {
        val state = AuthUiState(password = "12345")

        assertEquals("Минимум 8 символов", state.passwordValidationMessage)
    }

    @Test
    fun registrationShowsPasswordValidationMessageWhenPasswordIsTooShort() {
        val state = RegistrationUiState(password = "1234567")

        assertEquals("Минимум 8 символов", state.passwordValidationMessage)
    }
}
