package com.digitaledu.feature.player.impl.domain

import com.digitaledu.core.model.catalog.CatalogBundle

internal class ResolveNavigationUseCase(
    private val progressTransition: ProgressTransitionUseCase = ProgressTransitionUseCase(),
) {
    operator fun invoke(
        bundle: CatalogBundle,
        currentIndex: Int,
        completedScreens: Set<Int>,
        command: NavigationCommand,
    ): NavigationOutcome? {
        val targetIndex = when (command) {
            NavigationCommand.Next -> (currentIndex + 1).coerceIn(0, bundle.screens.lastIndex)
            NavigationCommand.Previous -> (currentIndex - 1).coerceAtLeast(0)
            is NavigationCommand.ToScreenKey -> bundle.screens.indexOfFirst { it.screenKey == command.screenKey }
        }

        if (targetIndex < 0) return null

        return NavigationOutcome(
            targetIndex = targetIndex,
            completedScreens = progressTransition(
                sourceIndex = currentIndex,
                targetIndex = targetIndex,
                completedScreens = completedScreens,
            ),
        )
    }
}
