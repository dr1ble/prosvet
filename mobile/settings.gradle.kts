pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "digital-education-mobile"

enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

include(":androidApp")
include(":core:common")
include(":core:data")
include(":core:designsystem")
include(":core:model")
include(":core:network")
include(":core:ui")
include(":desktopApp")
include(":feature:auth:api")
include(":feature:auth:impl")
include(":feature:catalog:api")
include(":feature:catalog:impl")
include(":feature:home:api")
include(":feature:home:impl")
include(":feature:player:api")
include(":feature:player:impl")
include(":feature:profile:api")
include(":feature:profile:impl")
include(":feature:root:impl")
include(":iosApp")
include(":shared")
