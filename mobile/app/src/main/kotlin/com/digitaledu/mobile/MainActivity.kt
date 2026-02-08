package com.digitaledu.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.digitaledu.core.data.auth.createAuthRepository
import com.digitaledu.core.data.catalog.createCatalogRepository
import com.digitaledu.core.designsystem.theme.DigitalEduTheme
import com.digitaledu.mobile.auth.SecureAuthSessionStore
import com.digitaledu.shared.DigitalEduApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val context = LocalContext.current
            val authRepository = remember(context) {
                createAuthRepository(
                    baseUrl = BuildConfig.BACKEND_BASE_URL,
                    enableNetworkLogs = BuildConfig.DEBUG,
                    authSessionStore = SecureAuthSessionStore(context),
                )
            }
            val catalogRepository = remember(context) {
                createCatalogRepository(
                    baseUrl = BuildConfig.BACKEND_BASE_URL,
                    enableNetworkLogs = BuildConfig.DEBUG,
                )
            }

            DigitalEduTheme {
                DigitalEduApp(
                    authRepository = authRepository,
                    catalogRepository = catalogRepository,
                )
            }
        }
    }
}
