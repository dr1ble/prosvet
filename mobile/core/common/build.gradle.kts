plugins {
    alias(libs.plugins.kotlin.jvm)
}

kotlin {
    // Using manual compatibility instead of toolchain to avoid network issues with toolchain resolvers
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}
