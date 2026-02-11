
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import com.digitaledu.core.designsystem.theme.DigitalEduTheme
import com.digitaledu.shared.DigitalEduApp
import com.digitaledu.shared.di.createMobileAppModule
import org.koin.core.context.GlobalContext
import org.koin.core.context.startKoin

fun main() = application {
    val baseUrl = "http://localhost:8000"

    if (GlobalContext.getOrNull() == null) {
        startKoin {
            modules(
                createMobileAppModule(
                    backendBaseUrl = baseUrl,
                    enableNetworkLogs = true,
                ),
            )
        }
    }

    Window(onCloseRequest = ::exitApplication, title = "Digital Education") {
        DigitalEduTheme {
            DigitalEduApp()
        }
    }
}
