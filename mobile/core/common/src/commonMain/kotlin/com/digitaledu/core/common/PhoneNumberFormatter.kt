package com.digitaledu.core.common

object PhoneNumberFormatter {
    fun normalize(rawPhoneNumber: String): String = rawPhoneNumber.filter(Char::isDigit)
}
