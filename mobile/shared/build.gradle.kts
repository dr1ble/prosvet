plugins {
    alias(libs.plugins.android.kotlin.multiplatform.library)
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.jetbrains.compose)
    alias(libs.plugins.kotlin.compose)
}

kotlin {
    jvmToolchain(17)
    androidLibrary {
        namespace = "com.digitaledu.shared"
        compileSdk = libs.versions.compileSdk.get().toInt()
        minSdk = libs.versions.minSdk.get().toInt()
    }
    
    jvm()
    
    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64()
    ).forEach {
        it.binaries.framework {
            baseName = "Shared"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation(projects.feature.catalog.impl)
            implementation(projects.feature.player.impl)
            implementation(projects.feature.profile.impl)
            implementation(projects.feature.root.impl)
            implementation(projects.feature.auth.impl)
            implementation(projects.feature.home.impl)
            implementation(projects.core.common)
            implementation(projects.core.data)
            implementation(projects.core.designsystem)
            implementation(projects.core.model)
            implementation(projects.core.network)
            implementation(projects.core.ui)

            implementation(compose.runtime)
            implementation(compose.ui)
            implementation(libs.androidx.navigation.runtime)
            implementation(libs.androidx.navigation.compose)
            implementation(libs.ktor.client.core)
            implementation(libs.koin.core)
        }
        
        androidMain.dependencies {
            implementation(libs.androidx.activity.compose)
        }
    }
}
