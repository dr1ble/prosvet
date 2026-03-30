package com.digitaledu.feature.home.impl

import androidx.navigation.NavGraphBuilder
import com.digitaledu.feature.catalog.api.CatalogFeatureHost
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.home.api.HomeFeatureEntry
import com.digitaledu.feature.player.api.PlayerFeatureHost
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileUiEntry

internal class HomeFeatureEntryImpl(
    private val catalogFeatureHost: CatalogFeatureHost,
    private val playerFeatureHost: PlayerFeatureHost,
    private val profileFeatureHost: ProfileFeatureHost,
    private val catalogUiEntry: CatalogUiEntry,
    private val playerUiEntry: PlayerUiEntry,
    private val profileUiEntry: ProfileUiEntry,
) : HomeFeatureEntry {
    override fun register(
        navGraphBuilder: NavGraphBuilder,
        onLoggedOut: () -> Unit,
    ) {
        navGraphBuilder.homeScreen(
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
