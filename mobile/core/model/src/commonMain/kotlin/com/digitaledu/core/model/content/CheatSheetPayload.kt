package com.digitaledu.core.model.content

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("cheat_sheet")
data class CheatSheetPayload(
    val content: String = "",
) : ScreenPayload
