plugins {
    alias(libs.plugins.android.kotlin.multiplatform.library)
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.jetbrains.compose)
    alias(libs.plugins.kotlin.compose)
}

kotlin {
    jvmToolchain(17)
    androidLibrary {
        namespace = "com.digitaledu.feature.home.impl"
        compileSdk = libs.versions.compileSdk.get().toInt()
        minSdk = libs.versions.minSdk.get().toInt()
    }
    
    jvm()
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        val commonMain by getting
        commonMain.dependencies {
            implementation(projects.feature.catalog.api)
            implementation(projects.feature.diagnostics.api)
            implementation(projects.feature.player.api)
            implementation(projects.feature.profile.api)
            implementation(projects.feature.home.api)
            implementation(projects.core.common)
            implementation(projects.core.data)
            implementation(projects.core.model)
            implementation(projects.core.designsystem)
            implementation(projects.core.ui)

            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.ui)
            implementation(compose.materialIconsExtended)
            implementation(compose.components.resources)
            implementation(compose.components.uiToolingPreview)
            implementation(libs.androidx.navigation.runtime)
            implementation(libs.androidx.navigation.compose)
            
            implementation(libs.coil3.compose)
            implementation(libs.koin.core)
        }
        
        val iosX64Main by getting
        iosX64Main.dependencies {
            implementation(libs.coil3.network.ktor)
        }
        
        val iosArm64Main by getting
        iosArm64Main.dependencies {
            implementation(libs.coil3.network.ktor)
        }
        
        val iosSimulatorArm64Main by getting
        iosSimulatorArm64Main.dependencies {
            implementation(libs.coil3.network.ktor)
        }
        
        val androidMain by getting
        androidMain.apply {
            dependencies {
                implementation(compose.preview)
                implementation(libs.androidx.activity.compose)
                implementation(libs.kotlinx.coroutines.android)
                implementation(libs.coil3.network.okhttp)
                // Lifecycle dependencies (Android/JVM only)
                implementation(libs.androidx.lifecycle.viewmodel.compose)
                implementation(libs.androidx.lifecycle.runtime.compose)
            }
        }
        
        val jvmMain by getting
        jvmMain.apply {
            dependencies {
                implementation(libs.coil3.network.okhttp)
                // Lifecycle dependencies (Android/JVM only)
                implementation(libs.androidx.lifecycle.viewmodel.compose)
                implementation(libs.androidx.lifecycle.runtime.compose)
            }
        }

        jvmTest.dependencies {
            implementation(kotlin("test"))
        }
    }
}
