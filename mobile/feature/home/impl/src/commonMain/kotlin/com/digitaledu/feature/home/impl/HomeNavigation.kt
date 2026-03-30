package com.digitaledu.feature.home.impl

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.digitaledu.feature.catalog.api.CatalogFeatureHost
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.home.api.HOME_ROUTE
import com.digitaledu.feature.player.api.PlayerFeatureHost
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileUiEntry

internal fun NavGraphBuilder.homeScreen(
    onLoggedOut: () -> Unit,
    catalogFeatureHost: CatalogFeatureHost,
    playerFeatureHost: PlayerFeatureHost,
    profileFeatureHost: ProfileFeatureHost,
    catalogUiEntry: CatalogUiEntry,
    playerUiEntry: PlayerUiEntry,
    profileUiEntry: ProfileUiEntry,
) {
    composable(route = HOME_ROUTE) {
        HomeRoute(
            onLoggedOut = onLoggedOut,
            catalogFeatureHost = catalogFeatureHost,
            playerFeatureHost = playerFeatureHost,
            profileFeatureHost = profileFeatureHost,
            catalogUiEntry = catalogUiEntry,
            playerUiEntry = playerUiEntry,
            profileUiEntry = profileUiEntry,
        )
    }
}
