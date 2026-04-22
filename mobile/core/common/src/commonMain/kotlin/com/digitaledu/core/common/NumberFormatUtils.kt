package com.digitaledu.core.common

import kotlin.math.abs
import kotlin.math.roundToInt

fun formatOneDecimal(value: Float): String {
    val scaled = (value * 10).roundToInt()
    val sign = if (scaled < 0) "-" else ""
    val absScaled = abs(scaled)
    val integerPart = absScaled / 10
    val fractionPart = absScaled % 10
    return "$sign$integerPart.$fractionPart"
}
