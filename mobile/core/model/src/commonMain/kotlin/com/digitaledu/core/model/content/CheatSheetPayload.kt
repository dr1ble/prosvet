package com.digitaledu.core.model.content

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("cheat_sheet")
data class CheatSheetPayload(
    @SerialName("reference_id") val referenceId: String,
) : ScreenPayload
