package com.digitaledu.core.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

abstract class BaseViewModel<State, Intent, Effect>(
    initialState: State,
) : ViewModel() {

    private val _uiState = MutableStateFlow(initialState)
    val uiState: StateFlow<State> = _uiState.asStateFlow()

    private val _effects = Channel<Effect>(Channel.BUFFERED)
    val effects: Flow<Effect> = _effects.receiveAsFlow()

    private val intents = MutableSharedFlow<Intent>(extraBufferCapacity = 64)

    init {
        viewModelScope.launch {
            intents.collect { intent -> handleIntent(intent) }
        }
    }

    fun processIntent(intent: Intent) {
        intents.tryEmit(intent)
    }

    protected abstract suspend fun handleIntent(intent: Intent)

    protected fun updateState(reducer: State.() -> State) {
        _uiState.update(reducer)
    }

    protected fun emitEffect(effect: Effect) {
        viewModelScope.launch { _effects.send(effect) }
    }

    protected val currentState: State
        get() = _uiState.value
}
