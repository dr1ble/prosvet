package com.digitaledu.feature.home.impl

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import androidx.compose.runtime.remember
import com.digitaledu.core.data.groups.GroupQrRepository
import com.digitaledu.core.data.progress.ProgressRepository
import com.digitaledu.feature.catalog.api.CatalogFeatureHost
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.home.api.HOME_ROUTE
import com.digitaledu.feature.player.api.PlayerFeatureHost
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileUiEntry

internal fun NavGraphBuilder.homeScreen(
    onLoggedOut: () -> Unit,
    initialGroupQrToken: String?,
    onGroupQrTokenConsumed: () -> Unit,
    catalogFeatureHostProvider: () -> CatalogFeatureHost,
    playerFeatureHostProvider: () -> PlayerFeatureHost,
    profileFeatureHostProvider: () -> ProfileFeatureHost,
    catalogUiEntry: CatalogUiEntry,
    playerUiEntry: PlayerUiEntry,
    profileUiEntry: ProfileUiEntry,
    groupQrRepository: GroupQrRepository,
    progressRepository: ProgressRepository,
) {
    composable(route = HOME_ROUTE) {
        val catalogFeatureHost = remember { catalogFeatureHostProvider() }
        val playerFeatureHost = remember { playerFeatureHostProvider() }
        val profileFeatureHost = remember { profileFeatureHostProvider() }

        HomeRoute(
            onLoggedOut = onLoggedOut,
            initialGroupQrToken = initialGroupQrToken,
            onGroupQrTokenConsumed = onGroupQrTokenConsumed,
            catalogFeatureHost = catalogFeatureHost,
            playerFeatureHost = playerFeatureHost,
            profileFeatureHost = profileFeatureHost,
            catalogUiEntry = catalogUiEntry,
            playerUiEntry = playerUiEntry,
            profileUiEntry = profileUiEntry,
            groupQrRepository = groupQrRepository,
            progressRepository = progressRepository,
        )
    }
}
