package com.digitaledu.core.data.profile

import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.model.auth.AuthMe

class NetworkProfileRepository(
    private val authRepository: AuthRepository,
) : ProfileRepository {
    override suspend fun getCurrentProfile(): AuthMe {
        return authRepository.getCurrentUser()
    }

    override suspend fun updateDisplayName(displayName: String?, avatarKey: String?): AuthMe {
        return authRepository.updateCurrentUser(displayName = displayName, avatarKey = avatarKey)
    }

    override suspend fun updateAvatar(displayName: String?, avatarKey: String?): AuthMe {
        return authRepository.updateCurrentUser(displayName = displayName, avatarKey = avatarKey)
    }

    override suspend fun uploadAvatar(filename: String, contentType: String, content: ByteArray): AuthMe {
        return authRepository.uploadAvatar(
            filename = filename,
            contentType = contentType,
            content = content,
        )
    }

    override suspend fun bindEmail(email: String): AuthMe {
        return authRepository.bindEmail(email = email)
    }

    override suspend fun changePassword(currentPassword: String, newPassword: String): AuthMe {
        return authRepository.changePassword(
            currentPassword = currentPassword,
            newPassword = newPassword,
        )
    }

    override suspend fun updateAccountSettings(
        learningRemindersEnabled: Boolean?,
        securityAlertsEnabled: Boolean?,
        profileVisible: Boolean?,
    ): AuthMe {
        return authRepository.updateAccountSettings(
            learningRemindersEnabled = learningRemindersEnabled,
            securityAlertsEnabled = securityAlertsEnabled,
            profileVisible = profileVisible,
        )
    }
}
