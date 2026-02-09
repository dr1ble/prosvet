plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    jvmToolchain(17)
    
    jvm()
    iosX64()
    iosArm64()
    iosSimulatorArm64()
    // androidTarget() // Enable when ready to move to android-specific client testing

    sourceSets {
        val commonMain by getting
        commonMain.dependencies {
            implementation(projects.core.model)
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.coroutines.core)
            
            implementation(libs.ktor.client.core)
            implementation(libs.ktor.client.content.negotiation)
            implementation(libs.ktor.client.logging)
            implementation(libs.ktor.serialization.kotlinx.json)
        }
        
        val iosX64Main by getting
        iosX64Main.dependencies {
            implementation(libs.ktor.client.darwin)
        }
        
        val iosArm64Main by getting
        iosArm64Main.dependencies {
            implementation(libs.ktor.client.darwin)
        }
        
        val iosSimulatorArm64Main by getting
        iosSimulatorArm64Main.dependencies {
            implementation(libs.ktor.client.darwin)
        }
        
        val jvmMain by getting
        jvmMain.dependencies {
             implementation(libs.ktor.client.okhttp)
             // Keep Retrofit for now to avoid breaking existing code during transition,
             // but strictly it should be removed or moved to jvmMain only if needed.
             // We will move existing Retrofit code to jvmMain to keep it compiling for now.
             implementation(libs.retrofit.core)
             implementation(libs.retrofit.kotlin.serialization)
             implementation(libs.okhttp.logging)
        }
    }
}
