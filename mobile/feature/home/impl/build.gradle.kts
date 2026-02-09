plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.jetbrains.compose)
    alias(libs.plugins.kotlin.compose)
}

kotlin {
    jvmToolchain(17)
    androidTarget()
    
    jvm()
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        val commonMain by getting
        commonMain.dependencies {
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
            implementation(libs.androidx.lifecycle.viewmodel.compose)
            implementation(libs.androidx.lifecycle.runtime.compose)
            implementation(libs.androidx.lifecycle.runtime.compose)
            implementation(libs.androidx.navigation.compose)
            
            implementation(libs.coil3.compose)
            // Network components are platform-specific
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
        androidMain.dependencies {
            implementation(compose.preview)
            implementation(libs.androidx.activity.compose)
            implementation(libs.kotlinx.coroutines.android)
            implementation(libs.coil3.network.okhttp)
        }
        
        val jvmMain by getting
        jvmMain.dependencies {
            implementation(libs.coil3.network.okhttp)
        }
    }
}

android {
    namespace = "com.digitaledu.feature.home.impl"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        minSdk = libs.versions.minSdk.get().toInt()
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
