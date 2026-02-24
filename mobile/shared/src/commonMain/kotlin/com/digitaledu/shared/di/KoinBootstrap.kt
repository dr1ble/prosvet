package com.digitaledu.shared.di

import org.koin.core.context.startKoin
import org.koin.mp.KoinPlatform

fun ensureKoinStarted(
    backendBaseUrl: String,
    enableNetworkLogs: Boolean = false,
) {
    if (KoinPlatform.getKoinOrNull() != null) return

    startKoin {
        modules(
            createMobileAppModule(
                backendBaseUrl = backendBaseUrl,
                enableNetworkLogs = enableNetworkLogs,
            ),
        )
    }
}
