import SwiftUI
import Shared

@main
struct DigitalEduiOSApp: App {
    init() {
        KoinBootstrapKt.ensureKoinStarted(
            backendBaseUrl: "http://127.0.0.1:8000",
            enableNetworkLogs: true
        )
    }

    var body: some Scene {
        WindowGroup {
            ComposeContainerView()
                .ignoresSafeArea()
        }
    }
}
