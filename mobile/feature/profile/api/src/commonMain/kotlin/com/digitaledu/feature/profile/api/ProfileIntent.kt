package com.digitaledu.feature.profile.api

sealed interface ProfileIntent {
    data object Logout : ProfileIntent
    data object DismissError : ProfileIntent
    data object DismissSuccess : ProfileIntent
    data object RefreshFavoriteCount : ProfileIntent
    data object RefreshGlossary : ProfileIntent
    data object RefreshNotes : ProfileIntent
    data class ToggleGlossaryBookmark(val termId: String) : ProfileIntent
    data class DeleteNote(val noteId: String) : ProfileIntent
    data class UpdateDisplayName(val displayName: String) : ProfileIntent
    data class CompleteProfile(val displayName: String, val email: String?) : ProfileIntent
    data class UpdateAvatar(val avatarKey: String) : ProfileIntent
    data class UploadAvatar(val filename: String, val contentType: String, val content: ByteArray) : ProfileIntent
    data class BindEmail(val email: String) : ProfileIntent
    data class ChangePassword(val currentPassword: String, val newPassword: String) : ProfileIntent
    data class SetLearningReminders(val enabled: Boolean) : ProfileIntent
    data class SetSecurityAlerts(val enabled: Boolean) : ProfileIntent
    data class SetProfileVisible(val enabled: Boolean) : ProfileIntent
    data object ResetAccessibility : ProfileIntent
    data class SetFontScale(val value: Float) : ProfileIntent
    data class SetControlScale(val value: Float) : ProfileIntent
    data class SetBoldText(val enabled: Boolean) : ProfileIntent
    data class SetHighContrast(val enabled: Boolean) : ProfileIntent
    data class SetVoiceSupport(val enabled: Boolean) : ProfileIntent
    data class SetTremorFilter(val enabled: Boolean) : ProfileIntent
}
