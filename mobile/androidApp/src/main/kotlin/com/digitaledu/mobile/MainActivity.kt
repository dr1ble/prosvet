package com.digitaledu.mobile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import com.digitaledu.core.model.auth.DebugQuickLoginPreset
import com.digitaledu.mobile.accessibility.provideAccessibilityPreferencesRepository
import com.digitaledu.mobile.auth.SecureAuthSessionStore
import com.digitaledu.shared.DigitalEduApp
import com.digitaledu.shared.di.createMobileAppModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.koin.core.context.GlobalContext
import org.koin.core.context.startKoin

class MainActivity : ComponentActivity() {
    private var initialGroupQrToken by mutableStateOf<String?>(null)
    private var isAppReady by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        initialGroupQrToken = extractGroupQrToken(intent?.data)

        setContent {
            if (isAppReady) {
                DigitalEduApp(
                    initialGroupQrToken = initialGroupQrToken,
                    onGroupQrTokenConsumed = { initialGroupQrToken = null },
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
        }

        lifecycleScope.launch {
            withContext(Dispatchers.Default) {
                ensureKoinStarted()
            }
            isAppReady = true
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        initialGroupQrToken = extractGroupQrToken(intent.data)
    }

    private fun ensureKoinStarted() {
        if (GlobalContext.getOrNull() != null) return

        startKoin {
            modules(
                createMobileAppModule(
                    backendBaseUrl = BuildConfig.BACKEND_BASE_URL,
                    enableNetworkLogs = BuildConfig.DEBUG,
                    enableDebugQuickLogin = false,
                    debugQuickLoginPresets = debugQuickLoginPresets(),
                    authSessionStore = SecureAuthSessionStore(this@MainActivity),
                    accessibilityPreferencesRepository = provideAccessibilityPreferencesRepository(this@MainActivity),
                ),
            )
        }
    }

    private fun extractGroupQrToken(uri: Uri?): String? {
        if (uri == null) return null

        val pathSegments = uri.pathSegments
        if (uri.scheme == DEEP_LINK_SCHEME && uri.host == DEEP_LINK_HOST) {
            val joinIndex = pathSegments.indexOf("join")
            if (joinIndex >= 0 && joinIndex + 1 < pathSegments.size) {
                return pathSegments[joinIndex + 1].takeIf { it.isNotBlank() }
            }
        }

        return uri.getQueryParameter(DEEP_LINK_TOKEN_QUERY)?.takeIf { it.isNotBlank() }
    }

    private fun debugQuickLoginPresets(): List<DebugQuickLoginPreset> {
        if (!BuildConfig.DEBUG) return emptyList()
        return listOf(
            DebugQuickLoginPreset(
                label = "Methodologist demo",
                login = "mobile_demo_method",
                password = "mobile12345",
            ),
            DebugQuickLoginPreset(
                label = "Admin demo",
                login = "mobile_demo_admin",
                password = "mobile12345",
            ),
        )
    }

    private companion object {
        const val DEEP_LINK_SCHEME = "digitaledu"
        const val DEEP_LINK_HOST = "group"
        const val DEEP_LINK_TOKEN_QUERY = "token"
    }
}
