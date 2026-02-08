
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import com.digitaledu.core.data.auth.createAuthRepository
import com.digitaledu.core.data.catalog.createCatalogRepository
import com.digitaledu.core.designsystem.theme.DigitalEduTheme
import com.digitaledu.shared.DigitalEduApp

fun main() = application {
    val authRepository = createAuthRepository(
        baseUrl = "http://localhost:8000",
        enableNetworkLogs = true,
    )
    val catalogRepository = createCatalogRepository(
        baseUrl = "http://localhost:8000",
        enableNetworkLogs = true,
    )

    Window(onCloseRequest = ::exitApplication, title = "Digital Education") {
        DigitalEduTheme {
            DigitalEduApp(
                authRepository = authRepository,
                catalogRepository = catalogRepository,
            )
        }
    }
}
