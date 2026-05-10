package com.digitaledu.feature.player.api

sealed interface PlayerEffect {
    data object Closed : PlayerEffect
    data object FavoriteChanged : PlayerEffect
    data object NoteCreated : PlayerEffect
    data object MemoSaved : PlayerEffect
    data object MemoRemoved : PlayerEffect
}
