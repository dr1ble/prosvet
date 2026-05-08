plugins {
    alias(libs.plugins.android.kotlin.multiplatform.library)
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.jetbrains.compose)
    alias(libs.plugins.kotlin.compose)
}

kotlin {
    jvmToolchain(17)
    androidLibrary {
        namespace = "com.digitaledu.feature.player.impl"
        compileSdk = libs.versions.compileSdk.get().toInt()
        minSdk = libs.versions.minSdk.get().toInt()
    }

    jvm()
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        commonMain.dependencies {
            implementation(projects.feature.player.api)
            implementation(projects.core.common)
            implementation(projects.core.data)
            implementation(projects.core.model)
            implementation(projects.core.ui)
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.ui)
            implementation(compose.components.resources)
            implementation(compose.materialIconsExtended)
            implementation(libs.coil3.compose)
            implementation(libs.coil3.network.ktor)
            implementation(libs.jetbrains.lifecycle.viewmodel)
            implementation(libs.koin.core)
        }

        androidMain.dependencies {
            implementation(libs.androidx.media3.exoplayer)
            implementation(libs.androidx.media3.ui)
        }

        jvmTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.kotlinx.coroutines.test)
        }
    }
}
