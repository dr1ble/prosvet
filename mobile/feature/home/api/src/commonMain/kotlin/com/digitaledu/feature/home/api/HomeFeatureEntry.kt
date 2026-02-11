package com.digitaledu.feature.home.api

import androidx.navigation.NavGraphBuilder

interface HomeFeatureEntry {
    fun register(
        navGraphBuilder: NavGraphBuilder,
        onLoggedOut: () -> Unit,
    )
}
