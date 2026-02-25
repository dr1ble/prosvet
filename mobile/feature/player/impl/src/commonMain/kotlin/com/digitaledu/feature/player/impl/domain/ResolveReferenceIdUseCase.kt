package com.digitaledu.feature.player.impl.domain

import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.ScreenPayload
import com.digitaledu.core.model.content.SimulationPayload

internal class ResolveReferenceIdUseCase {
    operator fun invoke(screenPayload: ScreenPayload): String? {
        return when (screenPayload) {
            is SimulationPayload -> screenPayload.contextRef
            is CheatSheetPayload -> screenPayload.referenceId
            else -> null
        }
    }
}
