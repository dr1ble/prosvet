package com.digitaledu.feature.home.impl

import com.digitaledu.feature.home.api.HomeFeatureEntry
import org.koin.core.module.Module
import org.koin.dsl.module

fun homeFeatureModule(): Module = module {
    single<HomeFeatureEntry> {
        HomeFeatureEntryImpl(
            catalogFeatureHostProvider = { get() },
            playerFeatureHostProvider = { get() },
            profileFeatureHostProvider = { get() },
            catalogUiEntry = get(),
            playerUiEntry = get(),
            profileUiEntry = get(),
            groupQrRepository = get(),
            progressRepository = get(),
        )
    }
}
