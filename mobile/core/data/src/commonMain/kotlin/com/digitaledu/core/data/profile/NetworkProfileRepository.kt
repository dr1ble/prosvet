package com.digitaledu.core.data.profile

import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.model.auth.AuthMe

class NetworkProfileRepository(
    private val authRepository: AuthRepository,
) : ProfileRepository {
    override suspend fun getCurrentProfile(): AuthMe {
        return authRepository.getCurrentUser()
    }

    override suspend fun bindEmail(email: String): AuthMe {
        return authRepository.bindEmail(email = email)
    }
}
