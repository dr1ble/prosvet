package com.digitaledu.shared.di

import com.digitaledu.core.common.di.BACKEND_BASE_URL_QUALIFIER
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.data.auth.AuthSessionStore
import com.digitaledu.core.data.auth.InMemoryAuthSessionStore
import com.digitaledu.core.data.auth.NetworkAuthRepository
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.data.catalog.NetworkCatalogRepository
import com.digitaledu.core.network.AuthNetworkDataSource
import com.digitaledu.core.network.CatalogNetworkDataSource
import com.digitaledu.core.network.provideHttpClient
import com.digitaledu.core.network.ktor.KtorAuthNetworkDataSource
import com.digitaledu.core.network.ktor.KtorCatalogNetworkDataSource
import com.digitaledu.feature.auth.impl.authFeatureModule
import com.digitaledu.feature.home.impl.homeFeatureModule
import org.koin.core.module.Module
import org.koin.core.qualifier.named
import org.koin.dsl.module

fun createMobileAppModule(
    backendBaseUrl: String,
    enableNetworkLogs: Boolean,
    authSessionStore: AuthSessionStore? = null,
): Module = module {
    includes(authFeatureModule(), homeFeatureModule())

    single(qualifier = named(BACKEND_BASE_URL_QUALIFIER)) { backendBaseUrl }

    single {
        provideHttpClient(
            baseUrl = backendBaseUrl,
            enableNetworkLogs = enableNetworkLogs,
        )
    }

    single<AuthNetworkDataSource> { KtorAuthNetworkDataSource(get()) }
    single<CatalogNetworkDataSource> { KtorCatalogNetworkDataSource(get()) }

    single<AuthSessionStore> { authSessionStore ?: InMemoryAuthSessionStore() }

    single<AuthRepository> { NetworkAuthRepository(get(), get()) }
    single<CatalogRepository> { NetworkCatalogRepository(get()) }
}
