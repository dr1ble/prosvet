
plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.jetbrains.compose)
    alias(libs.plugins.kotlin.compose)
}

kotlin {
    jvmToolchain(17)
    jvm {
        withJava()
    }
    
    sourceSets {
        jvmMain.dependencies {
            implementation(compose.desktop.currentOs)
            implementation(projects.shared) {
                exclude(group = "androidx.lifecycle", module = "lifecycle-runtime-ktx")
                exclude(group = "androidx.lifecycle", module = "lifecycle-viewmodel-ktx")
            }
            implementation(projects.core.data) // Need for strict mode causing issues
            // Add Core data for repository creation on Desktop
            implementation(projects.core.network)
            implementation(projects.core.designsystem)
            implementation(projects.core.ui)
            implementation(libs.kotlinx.coroutines.swing)
            implementation(libs.koin.core)
        }
    }
}

configurations.all {
    exclude(group = "androidx.lifecycle", module = "lifecycle-runtime-ktx")
    exclude(group = "androidx.lifecycle", module = "lifecycle-viewmodel-ktx")
}

compose.desktop {
    application {
        mainClass = "MainKt"
        nativeDistributions {
            targetFormats(org.jetbrains.compose.desktop.application.dsl.TargetFormat.Dmg, org.jetbrains.compose.desktop.application.dsl.TargetFormat.Msi, org.jetbrains.compose.desktop.application.dsl.TargetFormat.Deb)
            packageName = "DigitalEduDesktop"
            packageVersion = "1.0.0"
        }
    }
}
