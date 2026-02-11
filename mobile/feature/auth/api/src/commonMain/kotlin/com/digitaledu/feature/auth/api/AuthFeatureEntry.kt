package com.digitaledu.feature.auth.api

import androidx.navigation.NavGraphBuilder

interface AuthFeatureEntry {
    fun register(
        navGraphBuilder: NavGraphBuilder,
        onAuthenticated: () -> Unit,
    )
}
