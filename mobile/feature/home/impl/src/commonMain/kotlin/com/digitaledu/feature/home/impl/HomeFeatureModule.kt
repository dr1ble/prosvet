package com.digitaledu.feature.home.impl

import com.digitaledu.feature.home.api.HomeFeatureEntry
import com.digitaledu.feature.home.impl.catalog.CatalogViewModel
import com.digitaledu.feature.home.impl.player.PlayerViewModel
import com.digitaledu.feature.home.impl.profile.ProfileViewModel
import com.digitaledu.feature.home.impl.utils.SimulationUrlResolver
import org.koin.core.module.Module
import org.koin.core.qualifier.named
import org.koin.dsl.module
import com.digitaledu.core.common.di.BACKEND_BASE_URL_QUALIFIER

fun homeFeatureModule(): Module = module {
    single<HomeFeatureEntry> { HomeFeatureEntryImpl() }

    single {
        SimulationUrlResolver(
            baseUrl = get(named(BACKEND_BASE_URL_QUALIFIER)),
        )
    }

    factory { CatalogViewModel(catalogRepository = get()) }
    factory { PlayerViewModel(urlResolver = get(), catalogRepository = get()) }
    factory { ProfileViewModel(authRepository = get()) }
}
