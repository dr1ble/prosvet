package com.digitaledu.feature.profile.impl.presentation

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.data.memo.MemoLocalStorage
import com.digitaledu.core.data.preferences.AccessibilityPreferencesRepository
import com.digitaledu.core.data.profile.ProfileRepository
import com.digitaledu.core.data.progress.ProgressRepository
import com.digitaledu.core.model.preferences.AccessibilitySettings
import com.digitaledu.feature.profile.api.ProfileEffect
import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileStatus
import com.digitaledu.feature.profile.api.ProfileUiState
import com.digitaledu.feature.profile.impl.domain.LogoutUseCase
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

internal class ProfileViewModel(
    private val logoutUseCase: LogoutUseCase,
    private val accessibilityPreferencesRepository: AccessibilityPreferencesRepository,
    private val profileRepository: ProfileRepository,
    private val progressRepository: ProgressRepository,
    private val catalogRepository: CatalogRepository,
    private val memoLocalStorage: MemoLocalStorage,
) : BaseViewModel<ProfileUiState, ProfileIntent, ProfileEffect>(ProfileUiState()), ProfileFeatureHost {

    init {
        viewModelScope.launch {
            accessibilityPreferencesRepository.settings.collect { settings ->
                updateState { copy(accessibilitySettings = settings) }
            }
        }
        viewModelScope.launch {
            loadProfile()
        }
        viewModelScope.launch {
            loadProgress()
        }
        viewModelScope.launch {
            loadFavoriteCount()
        }
        viewModelScope.launch {
            loadGlossary()
        }
        viewModelScope.launch {
            loadNotes()
        }
        viewModelScope.launch {
            loadMemos()
        }
    }

    override suspend fun handleIntent(intent: ProfileIntent) {
        when (intent) {
            ProfileIntent.Logout -> logout()
            ProfileIntent.DismissError -> dismissError()
            ProfileIntent.DismissSuccess -> dismissSuccess()
            ProfileIntent.RefreshFavoriteCount -> loadFavoriteCount()
            ProfileIntent.RefreshGlossary -> loadGlossary()
            ProfileIntent.RefreshNotes -> loadNotes()
            ProfileIntent.RefreshMemos -> loadMemos()
            is ProfileIntent.ToggleGlossaryBookmark -> toggleGlossaryBookmark(intent.termId)
            is ProfileIntent.DeleteNote -> deleteNote(intent.noteId)
            is ProfileIntent.DeleteMemo -> deleteMemo(intent.memoId)
            is ProfileIntent.UpdateDisplayName -> updateDisplayName(intent.displayName)
            is ProfileIntent.CompleteProfile -> completeProfile(
                displayName = intent.displayName,
                email = intent.email,
            )
            is ProfileIntent.UpdateAvatar -> updateAvatar(intent.avatarKey)
            is ProfileIntent.UploadAvatar -> uploadAvatar(
                filename = intent.filename,
                contentType = intent.contentType,
                content = intent.content,
            )
            is ProfileIntent.BindEmail -> bindEmail(intent.email)
            is ProfileIntent.ChangePassword -> changePassword(intent.currentPassword, intent.newPassword)
            is ProfileIntent.SetLearningReminders -> updateAccountSettings(learningRemindersEnabled = intent.enabled)
            is ProfileIntent.SetSecurityAlerts -> updateAccountSettings(securityAlertsEnabled = intent.enabled)
            is ProfileIntent.SetProfileVisible -> updateAccountSettings(profileVisible = intent.enabled)
            ProfileIntent.ResetAccessibility -> resetAccessibility()
            is ProfileIntent.SetFontScale -> updateAccessibility { copy(fontScale = intent.value.coerceIn(1.0f, 1.6f)) }
            is ProfileIntent.SetBoldText -> updateAccessibility { copy(boldText = intent.enabled) }
            is ProfileIntent.SetHighContrast -> updateAccessibility { copy(highContrast = intent.enabled) }
            is ProfileIntent.SetVoiceSupport -> updateAccessibility { copy(voiceSupport = intent.enabled) }
            is ProfileIntent.SetTremorFilter -> updateAccessibility { copy(tremorFilter = intent.enabled) }
        }
    }

    private suspend fun logout() {
        val success = runSubmittingAction {
            logoutUseCase()
        }
        if (!success) return

        updateState {
            copy(
                status = ProfileStatus.Idle,
                isProfileLoaded = false,
                displayName = null,
                email = null,
                avatarKey = null,
                avatarUrl = null,
                role = null,
                accountStatus = null,
                permissions = emptyList(),
                learningRemindersEnabled = true,
                securityAlertsEnabled = true,
                profileVisible = false,
                favoriteCourseCount = 0,
                courseProgress = emptyList(),
                glossaryTerms = emptyList(),
                notes = emptyList(),
                memos = emptyList(),
            )
        }
        emitEffect(ProfileEffect.LoggedOut)
    }

    private suspend fun loadProfile() {
        runCatching {
            profileRepository.getCurrentProfile()
        }.onSuccess { profile ->
            updateState {
                copy(
                    displayName = profile.displayName,
                    isProfileLoaded = true,
                    email = profile.email,
                    avatarKey = profile.avatarKey,
                    avatarUrl = profile.avatarUrl,
                    role = profile.role,
                    accountStatus = profile.status,
                    permissions = profile.permissions,
                    learningRemindersEnabled = profile.learningRemindersEnabled,
                    securityAlertsEnabled = profile.securityAlertsEnabled,
                    profileVisible = profile.profileVisible,
                )
            }
        }.onFailure { throwable ->
            setError(throwable)
        }
    }

    private suspend fun loadProgress() {
        updateState { copy(isLoadingProgress = true) }
        runCatching {
            progressRepository.getMyProgress()
        }.onSuccess { courses ->
            updateState {
                copy(
                    courseProgress = courses,
                    isLoadingProgress = false,
                )
            }
        }.onFailure {
            updateState { copy(isLoadingProgress = false) }
        }
    }

    private suspend fun loadFavoriteCount() {
        runCatching {
            catalogRepository.listFavoriteCourses().size
        }.onSuccess { count ->
            updateState { copy(favoriteCourseCount = count) }
        }
    }

    private suspend fun loadGlossary() {
        runCatching {
            progressRepository.getMyGlossary()
        }.onSuccess { terms ->
            updateState { copy(glossaryTerms = terms) }
        }
    }

    private suspend fun toggleGlossaryBookmark(termId: String) {
        val currentTerm = currentState.glossaryTerms.firstOrNull { it.id == termId } ?: return
        val targetBookmarked = !currentTerm.isBookmarked
        runCatching {
            progressRepository.setGlossaryTermBookmark(termId, targetBookmarked)
        }.onSuccess {
            updateState {
                copy(
                    glossaryTerms = glossaryTerms.map { term ->
                        if (term.id == termId) {
                            term.copy(isBookmarked = targetBookmarked)
                        } else {
                            term
                        }
                    },
                )
            }
        }.onFailure { throwable ->
            setError(throwable)
        }
    }

    private suspend fun loadNotes() {
        runCatching {
            progressRepository.getMyNotes()
        }.onSuccess { notes ->
            updateState { copy(notes = notes) }
        }
    }

    private suspend fun deleteNote(noteId: String) {
        runCatching {
            progressRepository.deleteNote(noteId)
        }.onSuccess {
            updateState { copy(notes = notes.filterNot { note -> note.id == noteId }) }
        }.onFailure { throwable ->
            setError(throwable)
        }
    }

    private suspend fun loadMemos() {
        runCatching {
            memoLocalStorage.list()
        }.onSuccess { memos ->
            updateState { copy(memos = memos) }
        }
    }

    private suspend fun deleteMemo(memoId: String) {
        runCatching {
            memoLocalStorage.delete(memoId)
        }.onSuccess {
            updateState { copy(memos = memos.filterNot { it.id == memoId }) }
        }.onFailure { throwable ->
            setError(throwable)
        }
    }

    private suspend fun bindEmail(email: String) {
        val normalizedEmail = email.trim()
        if (normalizedEmail.isEmpty() || currentState.isBindingEmail) return

        updateState { copy(isBindingEmail = true, successMessage = null) }
        runCatching {
            profileRepository.bindEmail(normalizedEmail)
        }.onSuccess { profile ->
            updateState {
                copy(
                    email = profile.email,
                    isBindingEmail = false,
                    status = ProfileStatus.Idle,
                    successMessage = "Почта успешно привязана.",
                )
            }
        }.onFailure { throwable ->
            updateState { copy(isBindingEmail = false) }
            setError(throwable)
        }
    }

    private suspend fun updateDisplayName(displayName: String) {
        val normalizedName = displayName.trim()
        if (normalizedName.length < 2 || currentState.isUpdatingDisplayName) return

        updateState { copy(isUpdatingDisplayName = true, successMessage = null) }
        runCatching {
            profileRepository.updateDisplayName(
                displayName = normalizedName,
                avatarKey = currentState.avatarKey,
            )
        }.onSuccess { profile ->
            updateState {
                copy(
                    displayName = profile.displayName,
                    avatarKey = profile.avatarKey,
                    avatarUrl = profile.avatarUrl,
                    isUpdatingDisplayName = false,
                    status = ProfileStatus.Idle,
                    successMessage = "Имя успешно обновлено.",
                )
            }
        }.onFailure { throwable ->
            updateState { copy(isUpdatingDisplayName = false) }
            setError(throwable)
        }
    }

    private suspend fun completeProfile(displayName: String, email: String?) {
        val normalizedName = displayName.trim()
        val normalizedEmail = email?.trim()?.takeIf { it.isNotEmpty() }
        if (normalizedName.length < 2 || currentState.isUpdatingDisplayName || currentState.isBindingEmail) return

        updateState {
            copy(
                isUpdatingDisplayName = true,
                isBindingEmail = normalizedEmail != null,
                successMessage = null,
            )
        }
        runCatching {
            var profile = profileRepository.updateDisplayName(
                displayName = normalizedName,
                avatarKey = currentState.avatarKey,
            )
            if (normalizedEmail != null) {
                profile = profileRepository.bindEmail(normalizedEmail)
            }
            profile
        }.onSuccess { profile ->
            updateState {
                copy(
                    displayName = profile.displayName,
                    email = profile.email,
                    avatarKey = profile.avatarKey,
                    avatarUrl = profile.avatarUrl,
                    role = profile.role,
                    accountStatus = profile.status,
                    permissions = profile.permissions,
                    learningRemindersEnabled = profile.learningRemindersEnabled,
                    securityAlertsEnabled = profile.securityAlertsEnabled,
                    profileVisible = profile.profileVisible,
                    isUpdatingDisplayName = false,
                    isBindingEmail = false,
                    status = ProfileStatus.Idle,
                )
            }
        }.onFailure { throwable ->
            updateState {
                copy(
                    isUpdatingDisplayName = false,
                    isBindingEmail = false,
                )
            }
            setError(throwable)
        }
    }

    private suspend fun updateAvatar(avatarKey: String) {
        val normalizedAvatarKey = avatarKey.trim()
        if (normalizedAvatarKey.isEmpty() || currentState.isUpdatingAvatar) return
        if (normalizedAvatarKey == currentState.avatarKey) return

        updateState { copy(isUpdatingAvatar = true, successMessage = null) }
        runCatching {
            profileRepository.updateAvatar(
                displayName = currentState.displayName,
                avatarKey = normalizedAvatarKey,
            )
        }.onSuccess { profile ->
            updateState {
                copy(
                    displayName = profile.displayName,
                    avatarKey = profile.avatarKey,
                    avatarUrl = profile.avatarUrl,
                    isUpdatingAvatar = false,
                    status = ProfileStatus.Idle,
                    successMessage = "Аватар обновлён.",
                )
            }
        }.onFailure { throwable ->
            updateState { copy(isUpdatingAvatar = false) }
            setError(throwable)
        }
    }

    private suspend fun uploadAvatar(filename: String, contentType: String, content: ByteArray) {
        if (currentState.isUpdatingAvatar) return
        if (content.isEmpty()) {
            updateState { copy(status = ProfileStatus.Error("Файл аватарки пустой.")) }
            return
        }

        updateState { copy(isUpdatingAvatar = true, successMessage = null) }
        runCatching {
            profileRepository.uploadAvatar(
                filename = filename,
                contentType = contentType,
                content = content,
            )
        }.onSuccess { profile ->
            updateState {
                copy(
                    displayName = profile.displayName,
                    avatarKey = profile.avatarKey,
                    avatarUrl = profile.avatarUrl,
                    isUpdatingAvatar = false,
                    status = ProfileStatus.Idle,
                    successMessage = "Аватар обновлён.",
                )
            }
        }.onFailure { throwable ->
            updateState { copy(isUpdatingAvatar = false) }
            setError(throwable)
        }
    }

    private suspend fun changePassword(currentPassword: String, newPassword: String) {
        if (currentState.isChangingPassword) return
        if (currentPassword.length < 8 || newPassword.length < 8) {
            updateState { copy(status = ProfileStatus.Error("Пароль должен быть не короче 8 символов.")) }
            return
        }

        updateState { copy(isChangingPassword = true, successMessage = null) }
        runCatching {
            profileRepository.changePassword(
                currentPassword = currentPassword,
                newPassword = newPassword,
            )
        }.onSuccess {
            updateState {
                copy(
                    isChangingPassword = false,
                    status = ProfileStatus.Idle,
                    successMessage = "Пароль успешно изменён.",
                )
            }
        }.onFailure { throwable ->
            updateState { copy(isChangingPassword = false) }
            setError(throwable)
        }
    }

    private suspend fun updateAccountSettings(
        learningRemindersEnabled: Boolean? = null,
        securityAlertsEnabled: Boolean? = null,
        profileVisible: Boolean? = null,
    ) {
        if (currentState.isUpdatingAccountSettings) return
        updateState { copy(isUpdatingAccountSettings = true, successMessage = null) }
        runCatching {
            profileRepository.updateAccountSettings(
                learningRemindersEnabled = learningRemindersEnabled,
                securityAlertsEnabled = securityAlertsEnabled,
                profileVisible = profileVisible,
            )
        }.onSuccess { profile ->
            updateState {
                copy(
                    learningRemindersEnabled = profile.learningRemindersEnabled,
                    securityAlertsEnabled = profile.securityAlertsEnabled,
                    profileVisible = profile.profileVisible,
                    isUpdatingAccountSettings = false,
                    status = ProfileStatus.Idle,
                    successMessage = "Настройки аккаунта сохранены.",
                )
            }
        }.onFailure { throwable ->
            updateState { copy(isUpdatingAccountSettings = false) }
            setError(throwable)
        }
    }

    private suspend fun runSubmittingAction(block: suspend () -> Unit): Boolean {
        setSubmitting()
        return try {
            block()
            true
        } catch (throwable: Throwable) {
            setError(throwable)
            false
        }
    }

    private fun setSubmitting() {
        updateState {
            copy(status = ProfileStatus.LoggingOut)
        }
    }

    private fun setError(throwable: Throwable) {
        updateState {
            copy(status = ProfileStatus.Error(throwable.toUserMessage()))
        }
    }

    private suspend fun updateAccessibility(transform: AccessibilitySettings.() -> AccessibilitySettings) {
        accessibilityPreferencesRepository.update(transform)
    }

    private suspend fun resetAccessibility() {
        accessibilityPreferencesRepository.update { AccessibilitySettings() }
    }

    private fun dismissError() {
        if (currentState.status is ProfileStatus.Error) {
            updateState { copy(status = ProfileStatus.Idle) }
        }
    }

    private fun dismissSuccess() {
        if (!currentState.successMessage.isNullOrBlank()) {
            updateState { copy(successMessage = null) }
        }
    }
}
