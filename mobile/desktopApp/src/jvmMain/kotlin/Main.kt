
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import com.digitaledu.core.data.memo.createFileMemoLocalStorage
import com.digitaledu.core.designsystem.theme.DigitalEduTheme
import com.digitaledu.shared.DigitalEduApp
import com.digitaledu.shared.di.createMobileAppModule
import org.koin.core.context.GlobalContext
import org.koin.core.context.startKoin
import java.io.File

fun main() = application {
    val baseUrl = "http://localhost:8000"

    val storageDir = File(System.getProperty("user.home"), ".digitaledu").apply { mkdirs() }

    if (GlobalContext.getOrNull() == null) {
        startKoin {
            modules(
                createMobileAppModule(
                    backendBaseUrl = baseUrl,
                    enableNetworkLogs = true,
                    memoLocalStorage = createFileMemoLocalStorage(storageDir.absolutePath),
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
