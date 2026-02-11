package com.digitaledu.feature.auth.impl

import com.digitaledu.feature.auth.api.AuthFeatureEntry
import org.koin.core.module.Module
import org.koin.dsl.module

fun authFeatureModule(): Module = module {
    single<AuthFeatureEntry> { AuthFeatureEntryImpl() }

    factory {
        AuthViewModel(
            authRepository = get(),
        )
    }
}
