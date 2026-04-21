package com.digitaledu.feature.player.api

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PlayerContractsTest {
    @Test
    fun uiState_withoutBundle_hasDisabledNavigation() {
        val state = PlayerUiState()

        assertFalse(state.hasBundle)
        assertFalse(state.canGoPrevious)
        assertFalse(state.canGoNext)
        assertEquals(null, state.currentScreen)
    }

    @Test
    fun navigateToScreenIntent_keepsScreenKey() {
        val intent = PlayerIntent.NavigateToScreen(screenKey = "screen-2")

        assertEquals("screen-2", intent.screenKey)
    }

    @Test
    fun closeEffect_isSingletonObject() {
        assertTrue(PlayerEffect.Closed === PlayerEffect.Closed)
    }
}
