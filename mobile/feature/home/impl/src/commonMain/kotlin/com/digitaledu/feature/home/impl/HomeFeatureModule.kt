package com.digitaledu.feature.home.impl

import com.digitaledu.feature.home.api.HomeFeatureEntry
import org.koin.core.module.Module
import org.koin.dsl.module

fun homeFeatureModule(): Module = module {
    single<HomeFeatureEntry> {
        HomeFeatureEntryImpl(
            catalogFeatureHost = get(),
            playerFeatureHost = get(),
            profileFeatureHost = get(),
            catalogUiEntry = get(),
            playerUiEntry = get(),
            profileUiEntry = get(),
            authRepository = get(),
            groupQrRepository = get(),
        )
    }
}
