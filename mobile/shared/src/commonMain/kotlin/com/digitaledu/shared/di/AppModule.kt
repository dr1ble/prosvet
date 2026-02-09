package com.digitaledu.shared.di

import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.data.auth.AuthSessionStore
import com.digitaledu.core.data.auth.createAuthRepository
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.data.catalog.createCatalogRepository
import com.digitaledu.core.common.di.BACKEND_BASE_URL_QUALIFIER
import org.koin.core.module.Module
import org.koin.core.qualifier.named
import org.koin.dsl.module

fun createMobileAppModule(
    backendBaseUrl: String,
    enableNetworkLogs: Boolean,
    authSessionStore: AuthSessionStore? = null,
): Module = module {
    single(qualifier = named(BACKEND_BASE_URL_QUALIFIER)) { backendBaseUrl }

    single<AuthRepository> {
        if (authSessionStore == null) {
            createAuthRepository(
                baseUrl = backendBaseUrl,
                enableNetworkLogs = enableNetworkLogs,
            )
        } else {
            createAuthRepository(
                baseUrl = backendBaseUrl,
                enableNetworkLogs = enableNetworkLogs,
                authSessionStore = authSessionStore,
            )
        }
    }

    single<CatalogRepository> {
        createCatalogRepository(
            baseUrl = backendBaseUrl,
            enableNetworkLogs = enableNetworkLogs,
        )
    }
}
