package com.digitaledu.feature.profile.impl.di

import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.impl.domain.LogoutUseCase
import com.digitaledu.feature.profile.impl.presentation.ProfileViewModel
import org.koin.core.module.Module
import org.koin.dsl.module

fun profileFeatureModule(): Module = module {
    factory { LogoutUseCase(authRepository = get()) }

    factory<ProfileFeatureHost> {
        ProfileViewModel(logoutUseCase = get())
    }
}
