plugins {
    base
}

val iosDestination = providers
    .gradleProperty("iosDestination")
    .orElse("generic/platform=iOS Simulator")

tasks.register("prepareSharedFrameworkDebug") {
    group = "ios"
    description = "Builds Shared.framework for iOS simulator."
    dependsOn(":shared:linkDebugFrameworkIosSimulatorArm64")
}

tasks.register<Exec>("buildIosSimulatorDebug") {
    group = "application"
    description = "Builds iOS host app (DigitalEduiOS) for simulator using xcodebuild."
    dependsOn("prepareSharedFrameworkDebug")
    workingDir = projectDir
    doFirst {
        commandLine(
            "xcodebuild",
            "-project", "DigitalEduiOS.xcodeproj",
            "-scheme", "DigitalEduiOS",
            "-configuration", "Debug",
            "-destination", iosDestination.get(),
            "build",
        )
    }
}

tasks.register<Exec>("openXcode") {
    group = "application"
    description = "Opens iOS host project in Xcode."
    workingDir = projectDir
    commandLine("open", "DigitalEduiOS.xcodeproj")
}
