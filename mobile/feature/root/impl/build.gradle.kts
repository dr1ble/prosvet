plugins {
    alias(libs.plugins.android.kotlin.multiplatform.library)
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.jetbrains.compose)
    alias(libs.plugins.kotlin.compose)
}

kotlin {
    jvmToolchain(17)
    androidLibrary {
        namespace = "com.digitaledu.feature.root.impl"
        compileSdk = libs.versions.compileSdk.get().toInt()
        minSdk = libs.versions.minSdk.get().toInt()
    }

    jvm()
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        commonMain.dependencies {
            implementation(projects.feature.auth.api)
            implementation(projects.feature.home.api)
            implementation(projects.core.data)
            implementation(projects.core.model)
            implementation(projects.core.designsystem)
            implementation(projects.core.ui)

            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.ui)
            implementation(libs.androidx.navigation.runtime)
            implementation(libs.androidx.navigation.compose)
            implementation(libs.koin.core)
        }

        androidMain.dependencies {
            implementation(libs.androidx.activity.compose)
        }
    }
}
