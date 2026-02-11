package com.digitaledu.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.digitaledu.core.designsystem.theme.DigitalEduTheme
import com.digitaledu.mobile.auth.SecureAuthSessionStore
import com.digitaledu.shared.DigitalEduApp
import com.digitaledu.shared.di.createMobileAppModule
import org.koin.core.context.GlobalContext
import org.koin.core.context.startKoin

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ensureKoinStarted()

        setContent {
            DigitalEduTheme {
                DigitalEduApp()
            }
        }
    }

    private fun ensureKoinStarted() {
        if (GlobalContext.getOrNull() != null) return

        startKoin {
            modules(
                createMobileAppModule(
                    backendBaseUrl = BuildConfig.BACKEND_BASE_URL,
                    enableNetworkLogs = BuildConfig.DEBUG,
                    authSessionStore = SecureAuthSessionStore(this@MainActivity),
                ),
            )
        }
    }
}
