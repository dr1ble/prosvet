package com.digitaledu.feature.player.impl.di

import com.digitaledu.core.common.di.BACKEND_BASE_URL_QUALIFIER
import com.digitaledu.feature.player.api.PlayerFeatureHost
import com.digitaledu.feature.player.impl.domain.SimulationUrlResolver
import com.digitaledu.feature.player.impl.presentation.PlayerViewModel
import org.koin.core.module.Module
import org.koin.core.qualifier.named
import org.koin.dsl.module

fun playerFeatureModule(): Module = module {
    single {
        SimulationUrlResolver(
            baseUrl = get(named(BACKEND_BASE_URL_QUALIFIER)),
        )
    }

    factory<PlayerFeatureHost> {
        PlayerViewModel(
            urlResolver = get(),
            catalogRepository = get(),
        )
    }
}
