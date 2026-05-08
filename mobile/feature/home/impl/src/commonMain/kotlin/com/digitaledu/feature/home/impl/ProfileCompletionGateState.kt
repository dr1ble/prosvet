package com.digitaledu.feature.home.impl

internal data class ProfileCompletionGateState(
    val requiresCompletion: Boolean,
)

internal data class ProfileCompletionFormState(
    val normalizedName: String,
    val normalizedEmail: String?,
    val nameError: String?,
    val emailError: String?,
) {
    val canSubmit: Boolean
        get() = nameError == null && emailError == null
}

internal fun buildProfileCompletionGateState(
    displayName: String?,
    isProfileLoaded: Boolean,
    isSkipped: Boolean = false,
): ProfileCompletionGateState {
    return ProfileCompletionGateState(
        requiresCompletion = isProfileLoaded && !isSkipped && displayName?.trim().isNullOrEmpty(),
    )
}

internal fun buildProfileCompletionFormState(
    displayName: String,
    email: String,
): ProfileCompletionFormState {
    val normalizedName = displayName.trim()
    val normalizedEmail = email.trim().takeIf { it.isNotEmpty() }
    val nameError = when {
        normalizedName.length < 2 -> "Введите имя минимум из 2 символов"
        normalizedName.length > 80 -> "Имя должно быть не длиннее 80 символов"
        else -> null
    }
    val emailError = when {
        normalizedEmail == null -> null
        !isValidProfileEmail(normalizedEmail) -> "Введите корректную почту или оставьте поле пустым"
        else -> null
    }

    return ProfileCompletionFormState(
        normalizedName = normalizedName,
        normalizedEmail = normalizedEmail,
        nameError = nameError,
        emailError = emailError,
    )
}

private fun isValidProfileEmail(email: String): Boolean {
    val atIndex = email.indexOf('@')
    val lastDotIndex = email.lastIndexOf('.')
    return atIndex > 0 && lastDotIndex > atIndex + 1 && lastDotIndex < email.lastIndex
}
