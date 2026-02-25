package com.digitaledu.feature.player.impl.domain

internal sealed interface NavigationCommand {
    data object Next : NavigationCommand
    data object Previous : NavigationCommand
    data class ToScreenKey(val screenKey: String) : NavigationCommand
}
