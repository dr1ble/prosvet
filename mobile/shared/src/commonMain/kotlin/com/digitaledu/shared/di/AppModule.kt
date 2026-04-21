package com.digitaledu.shared.di

import com.digitaledu.core.common.di.BACKEND_BASE_URL_QUALIFIER
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.model.auth.DebugQuickLoginPreset
import com.digitaledu.core.data.auth.AuthSessionStore
import com.digitaledu.core.data.auth.InMemoryAuthSessionStore
import com.digitaledu.core.data.auth.NetworkAuthRepository
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.data.catalog.NetworkCatalogRepository
import com.digitaledu.core.data.groups.GroupQrRepository
import com.digitaledu.core.data.groups.NetworkGroupQrRepository
import com.digitaledu.core.data.preferences.AccessibilityPreferencesRepository
import com.digitaledu.core.data.preferences.InMemoryAccessibilityPreferencesRepository
import com.digitaledu.shared.accessibility.AccessibilitySettingsHost
import com.digitaledu.shared.accessibility.AccessibilitySettingsHostImpl
import com.digitaledu.core.network.AuthNetworkDataSource
import com.digitaledu.core.network.CatalogNetworkDataSource
import com.digitaledu.core.network.GroupsNetworkDataSource
import com.digitaledu.core.network.provideHttpClient
import com.digitaledu.core.network.ktor.KtorAuthNetworkDataSource
import com.digitaledu.core.network.ktor.KtorCatalogNetworkDataSource
import com.digitaledu.core.network.ktor.KtorGroupsNetworkDataSource
import com.digitaledu.feature.auth.impl.DebugQuickLoginConfig
import com.digitaledu.feature.auth.impl.authFeatureModule
import com.digitaledu.feature.catalog.impl.di.catalogFeatureModule
import com.digitaledu.feature.home.impl.homeFeatureModule
import com.digitaledu.feature.player.impl.di.playerFeatureModule
import com.digitaledu.feature.profile.impl.di.profileFeatureModule
import org.koin.core.module.Module
import org.koin.core.qualifier.named
import org.koin.dsl.module

fun createMobileAppModule(
    backendBaseUrl: String,
    enableNetworkLogs: Boolean,
    enableDebugQuickLogin: Boolean = false,
    debugQuickLoginPresets: List<DebugQuickLoginPreset> = emptyList(),
    authSessionStore: AuthSessionStore? = null,
    accessibilityPreferencesRepository: AccessibilityPreferencesRepository? = null,
): Module = module {
    includes(
        authFeatureModule(),
        catalogFeatureModule(),
        playerFeatureModule(),
        profileFeatureModule(),
        homeFeatureModule(),
    )

    single(qualifier = named(BACKEND_BASE_URL_QUALIFIER)) { backendBaseUrl }

    single {
        provideHttpClient(
            baseUrl = backendBaseUrl,
            enableNetworkLogs = enableNetworkLogs,
        )
    }

    single<AuthNetworkDataSource> { KtorAuthNetworkDataSource(get()) }
    single<CatalogNetworkDataSource> { KtorCatalogNetworkDataSource(get()) }
    single<GroupsNetworkDataSource> { KtorGroupsNetworkDataSource(get()) }

    single<AuthSessionStore> { authSessionStore ?: InMemoryAuthSessionStore() }
    single<AccessibilityPreferencesRepository> {
        accessibilityPreferencesRepository ?: InMemoryAccessibilityPreferencesRepository()
    }
    single {
        DebugQuickLoginConfig(
            enabled = enableDebugQuickLogin,
            presets = debugQuickLoginPresets,
        )
    }
    single<AccessibilitySettingsHost> { AccessibilitySettingsHostImpl(get()) }

    single<AuthRepository> { NetworkAuthRepository(get(), get()) }
    single<CatalogRepository> { NetworkCatalogRepository(get(), get()) }
    single<GroupQrRepository> { NetworkGroupQrRepository(get(), get()) }
}
