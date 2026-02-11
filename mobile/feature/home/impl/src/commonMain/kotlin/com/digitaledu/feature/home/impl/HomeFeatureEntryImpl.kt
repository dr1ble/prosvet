package com.digitaledu.feature.home.impl

import androidx.navigation.NavGraphBuilder
import com.digitaledu.feature.home.api.HomeFeatureEntry

internal class HomeFeatureEntryImpl : HomeFeatureEntry {
    override fun register(
        navGraphBuilder: NavGraphBuilder,
        onLoggedOut: () -> Unit,
    ) {
        navGraphBuilder.homeScreen(onLoggedOut = onLoggedOut)
    }
}
