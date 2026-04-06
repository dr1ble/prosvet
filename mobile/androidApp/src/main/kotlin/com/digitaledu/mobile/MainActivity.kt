package com.digitaledu.mobile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.digitaledu.core.designsystem.theme.DigitalEduTheme
import com.digitaledu.mobile.auth.SecureAuthSessionStore
import com.digitaledu.shared.DigitalEduApp
import com.digitaledu.shared.di.createMobileAppModule
import org.koin.core.context.GlobalContext
import org.koin.core.context.startKoin

class MainActivity : ComponentActivity() {
    private var initialGroupQrToken by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ensureKoinStarted()
        initialGroupQrToken = extractGroupQrToken(intent?.data)

        setContent {
            DigitalEduTheme {
                DigitalEduApp(
                    initialGroupQrToken = initialGroupQrToken,
                    onGroupQrTokenConsumed = { initialGroupQrToken = null },
                )
            }
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
                    authSessionStore = SecureAuthSessionStore(this@MainActivity),
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

    private companion object {
        const val DEEP_LINK_SCHEME = "digitaledu"
        const val DEEP_LINK_HOST = "group"
        const val DEEP_LINK_TOKEN_QUERY = "token"
    }
}
