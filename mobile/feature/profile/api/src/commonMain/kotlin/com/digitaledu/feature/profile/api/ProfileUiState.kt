package com.digitaledu.feature.profile.api

import com.digitaledu.core.model.preferences.AccessibilitySettings
import com.digitaledu.core.model.progress.CourseProgressInfo
import com.digitaledu.core.model.progress.GlossaryTermEntry
import com.digitaledu.core.model.progress.LessonNoteEntry

data class ProfileUiState(
    val status: ProfileStatus = ProfileStatus.Idle,
    val isProfileLoaded: Boolean = false,
    val accessibilitySettings: AccessibilitySettings = AccessibilitySettings(),
    val displayName: String? = null,
    val email: String? = null,
    val avatarKey: String? = null,
    val avatarUrl: String? = null,
    val role: String? = null,
    val accountStatus: String? = null,
    val permissions: List<String> = emptyList(),
    val learningRemindersEnabled: Boolean = true,
    val securityAlertsEnabled: Boolean = true,
    val profileVisible: Boolean = false,
    val favoriteCourseCount: Int = 0,
    val courseProgress: List<CourseProgressInfo> = emptyList(),
    val glossaryTerms: List<GlossaryTermEntry> = emptyList(),
    val notes: List<LessonNoteEntry> = emptyList(),
    val isLoadingProgress: Boolean = false,
    val isUpdatingDisplayName: Boolean = false,
    val isUpdatingAvatar: Boolean = false,
    val isBindingEmail: Boolean = false,
    val isChangingPassword: Boolean = false,
    val isUpdatingAccountSettings: Boolean = false,
    val successMessage: String? = null,
)
