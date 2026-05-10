package com.digitaledu.feature.profile.impl.di

import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileUiEntry
import com.digitaledu.feature.profile.impl.domain.LogoutUseCase
import com.digitaledu.feature.profile.impl.presentation.ProfileViewModel
import com.digitaledu.feature.profile.impl.ui.ProfileUiEntryImpl
import org.koin.core.module.Module
import org.koin.dsl.module

fun profileFeatureModule(): Module = module {
    factory { LogoutUseCase(authRepository = get()) }

    factory<ProfileFeatureHost> {
        ProfileViewModel(
            logoutUseCase = get(),
            accessibilityPreferencesRepository = get(),
            profileRepository = get(),
            progressRepository = get(),
            catalogRepository = get(),
            memoLocalStorage = get(),
        )
    }

    single<ProfileUiEntry> { ProfileUiEntryImpl() }
}
