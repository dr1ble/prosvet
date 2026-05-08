package com.digitaledu.feature.auth.impl

import kotlin.test.Test
import kotlin.test.assertEquals

class AuthPasswordValidationTest {
    @Test
    fun loginShowsPasswordValidationMessageWhenPasswordIsTooShort() {
        val state = AuthUiState(password = "12345")

        assertEquals("Введите 6 цифр", state.passwordValidationMessage)
    }

    @Test
    fun registrationShowsPasswordValidationMessageWhenPasswordIsNotSixDigits() {
        val state = RegistrationUiState(password = "12345")

        assertEquals("Введите 6 цифр", state.passwordValidationMessage)
    }

    @Test
    fun registrationAcceptsSixDigitPassword() {
        val state = RegistrationUiState(
            fullName = "Иван Иванов",
            login = "ivan",
            password = "123456",
            confirmPassword = "123456",
        )

        assertEquals(null, state.passwordValidationMessage)
        assertEquals(true, state.canSubmit)
    }
}
