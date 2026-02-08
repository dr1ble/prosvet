plugins {
    alias(libs.plugins.kotlin.jvm)
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(projects.core.model)
    implementation(projects.core.network)
    implementation(libs.kotlinx.coroutines.core)

    testImplementation(libs.junit4)
}
