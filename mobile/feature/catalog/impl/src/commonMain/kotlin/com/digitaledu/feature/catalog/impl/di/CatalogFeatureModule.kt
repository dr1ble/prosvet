package com.digitaledu.feature.catalog.impl.di

import com.digitaledu.feature.catalog.api.CatalogFeatureHost
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.catalog.impl.domain.LoadCoursesUseCase
import com.digitaledu.feature.catalog.impl.domain.OpenCourseBundleUseCase
import com.digitaledu.feature.catalog.impl.presentation.CatalogViewModel
import com.digitaledu.feature.catalog.impl.ui.CatalogUiEntryImpl
import org.koin.core.module.Module
import org.koin.dsl.module

fun catalogFeatureModule(): Module = module {
    factory { LoadCoursesUseCase(catalogRepository = get()) }
    factory { OpenCourseBundleUseCase(catalogRepository = get()) }

    factory<CatalogFeatureHost> {
        CatalogViewModel(
            loadCoursesUseCase = get(),
            openCourseBundleUseCase = get(),
            catalogRepository = get(),
        )
    }

    single<CatalogUiEntry> { CatalogUiEntryImpl() }
}
