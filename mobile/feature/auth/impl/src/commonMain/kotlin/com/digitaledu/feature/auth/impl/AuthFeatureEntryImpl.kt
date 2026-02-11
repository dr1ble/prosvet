package com.digitaledu.feature.auth.impl

import androidx.navigation.NavGraphBuilder
import com.digitaledu.feature.auth.api.AuthFeatureEntry

internal class AuthFeatureEntryImpl : AuthFeatureEntry {
    override fun register(
        navGraphBuilder: NavGraphBuilder,
        onAuthenticated: () -> Unit,
    ) {
        navGraphBuilder.authScreen(onAuthenticated = onAuthenticated)
    }
}
