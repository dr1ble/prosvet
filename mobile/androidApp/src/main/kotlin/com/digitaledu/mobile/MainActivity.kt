package com.digitaledu.mobile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import com.digitaledu.core.data.memo.createFileMemoLocalStorage
import com.digitaledu.core.model.auth.DebugQuickLoginPreset
import com.digitaledu.mobile.accessibility.provideAccessibilityPreferencesRepository
import com.digitaledu.mobile.auth.SecureAuthSessionStore
import com.digitaledu.shared.DigitalEduApp
import com.digitaledu.shared.di.createMobileAppModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.koin.core.context.GlobalContext
import org.koin.core.context.startKoin

class MainActivity : ComponentActivity() {
    private var initialGroupQrToken by mutableStateOf<String?>(null)
    private var isAppReady by mutableStateOf(false)
    private var isSplashVisible by mutableStateOf(true)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        initialGroupQrToken = extractGroupQrToken(intent?.data)

        setContent {
            Box(modifier = Modifier.fillMaxSize()) {
                if (isAppReady) {
                    DigitalEduApp(
                        initialGroupQrToken = initialGroupQrToken,
                        onGroupQrTokenConsumed = { initialGroupQrToken = null },
                    )
                }
                if (isSplashVisible) {
                    ProsvetAnimatedSplash(
                        onFinished = { isSplashVisible = false },
                    )
                }
            }
        }

        lifecycleScope.launch {
            val startupStartedAt = System.currentTimeMillis()
            withContext(Dispatchers.Default) {
                ensureKoinStarted()
            }
            val remainingSplashTime = MIN_SPLASH_DURATION_MS - (System.currentTimeMillis() - startupStartedAt)
            if (remainingSplashTime > 0) {
                delay(remainingSplashTime)
            }
            isAppReady = true
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        initialGroupQrToken = extractGroupQrToken(intent.data)
    }

    @Composable
    private fun ProsvetAnimatedSplash(
        onFinished: () -> Unit,
    ) {
        val gradientShift = androidx.compose.runtime.remember { Animatable(0f) }
        val fadeOut = androidx.compose.runtime.remember { Animatable(1f) }
        val surfaceFade = androidx.compose.runtime.remember { Animatable(0f) }
        val logoScale = androidx.compose.runtime.remember { Animatable(1.55f) }
        val logoAlpha = androidx.compose.runtime.remember { Animatable(0f) }
        LaunchedEffect(Unit) {
            launch {
                logoAlpha.animateTo(
                    targetValue = 1f,
                    animationSpec = tween(durationMillis = 420, easing = FastOutSlowInEasing),
                )
            }
            launch {
                gradientShift.animateTo(
                    targetValue = 1f,
                    animationSpec = tween(durationMillis = 1400, easing = FastOutSlowInEasing),
                )
            }
            logoScale.animateTo(
                targetValue = 1.08f,
                animationSpec = tween(durationMillis = 760, easing = FastOutSlowInEasing),
            )
            delay(90)
            launch {
                logoScale.animateTo(
                    targetValue = 1f,
                    animationSpec = tween(durationMillis = 520, easing = FastOutSlowInEasing),
                )
            }
            surfaceFade.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 260, easing = FastOutSlowInEasing),
            )
            fadeOut.animateTo(
                targetValue = 0f,
                animationSpec = tween(durationMillis = 260, easing = FastOutSlowInEasing),
            )
            onFinished()
        }

        val brush = Brush.linearGradient(
            colors = listOf(
                Color(0xFFCCF6FF),
                Color(0xFFD6EAFF),
                Color(0xFFD8F8E8),
                Color(0xFFF3F8FF),
            ),
            start = androidx.compose.ui.geometry.Offset(
                x = -520f + 760f * gradientShift.value,
                y = -120f,
            ),
            end = androidx.compose.ui.geometry.Offset(
                x = 520f + 760f * gradientShift.value,
                y = 1480f,
            ),
        )

        val glowBrush = Brush.radialGradient(
            colors = listOf(
                Color(0x88AEE8FF),
                Color(0x44B9FFF1),
                Color(0x00FFFFFF),
            ),
            center = androidx.compose.ui.geometry.Offset(
                x = 220f + 420f * gradientShift.value,
                y = 260f,
            ),
            radius = 820f,
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(brush)
                .alpha(fadeOut.value),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(glowBrush),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFF7F9FB).copy(alpha = 0.18f * surfaceFade.value)),
            )
            Image(
                painter = painterResource(id = R.drawable.splash_app_logo),
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(104.dp)
                    .scale(logoScale.value)
                    .alpha(logoAlpha.value),
            )
        }
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
                    memoLocalStorage = createFileMemoLocalStorage(this@MainActivity.filesDir.absolutePath),
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
        const val MIN_SPLASH_DURATION_MS = 1200L
        const val DEEP_LINK_SCHEME = "digitaledu"
        const val DEEP_LINK_HOST = "group"
        const val DEEP_LINK_TOKEN_QUERY = "token"
    }
}
