package com.digitaledu.core.data.profile

import com.digitaledu.core.model.auth.AuthMe

interface ProfileRepository {
    suspend fun getCurrentProfile(): AuthMe
    suspend fun bindEmail(email: String): AuthMe
}
