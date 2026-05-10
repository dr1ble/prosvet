package com.digitaledu.feature.home.impl

import androidx.navigation.NavGraphBuilder
import com.digitaledu.core.data.groups.GroupQrRepository
import com.digitaledu.core.data.progress.ProgressRepository
import com.digitaledu.feature.catalog.api.CatalogFeatureHost
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.diagnostics.api.DiagnosticsFeatureHost
import com.digitaledu.feature.diagnostics.api.DiagnosticsUiEntry
import com.digitaledu.feature.home.api.HomeFeatureEntry
import com.digitaledu.feature.player.api.PlayerFeatureHost
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.profile.api.ProfileFeatureHost
import com.digitaledu.feature.profile.api.ProfileUiEntry

internal class HomeFeatureEntryImpl(
    private val catalogFeatureHostProvider: () -> CatalogFeatureHost,
    private val diagnosticsFeatureHostProvider: () -> DiagnosticsFeatureHost,
    private val playerFeatureHostProvider: () -> PlayerFeatureHost,
    private val profileFeatureHostProvider: () -> ProfileFeatureHost,
    private val catalogUiEntry: CatalogUiEntry,
    private val diagnosticsUiEntry: DiagnosticsUiEntry,
    private val playerUiEntry: PlayerUiEntry,
    private val profileUiEntry: ProfileUiEntry,
    private val groupQrRepository: GroupQrRepository,
    private val progressRepository: ProgressRepository,
) : HomeFeatureEntry {
    override fun register(
        navGraphBuilder: NavGraphBuilder,
        onLoggedOut: () -> Unit,
        initialGroupQrToken: String?,
        onGroupQrTokenConsumed: () -> Unit,
    ) {
        navGraphBuilder.homeScreen(
            onLoggedOut = onLoggedOut,
            initialGroupQrToken = initialGroupQrToken,
            onGroupQrTokenConsumed = onGroupQrTokenConsumed,
            catalogFeatureHostProvider = catalogFeatureHostProvider,
            diagnosticsFeatureHostProvider = diagnosticsFeatureHostProvider,
            playerFeatureHostProvider = playerFeatureHostProvider,
            profileFeatureHostProvider = profileFeatureHostProvider,
            catalogUiEntry = catalogUiEntry,
            diagnosticsUiEntry = diagnosticsUiEntry,
            playerUiEntry = playerUiEntry,
            profileUiEntry = profileUiEntry,
            groupQrRepository = groupQrRepository,
            progressRepository = progressRepository,
        )
    }
}
