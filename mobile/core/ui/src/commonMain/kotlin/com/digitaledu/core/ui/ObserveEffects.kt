package com.digitaledu.core.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import kotlinx.coroutines.flow.Flow

@Composable
fun <E> ObserveEffects(
    effects: Flow<E>,
    onEffect: (E) -> Unit,
) {
    LaunchedEffect(Unit) {
        effects.collect { onEffect(it) }
    }
}
