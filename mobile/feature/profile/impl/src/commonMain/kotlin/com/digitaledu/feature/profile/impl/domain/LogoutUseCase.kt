package com.digitaledu.feature.profile.impl.domain

import com.digitaledu.core.data.auth.AuthRepository

internal class LogoutUseCase(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke() {
        authRepository.logout()
    }
}
