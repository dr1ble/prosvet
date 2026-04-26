package com.digitaledu.core.common

import com.digitaledu.core.network.NetworkException

fun Throwable.toUserMessage(): String = when (this) {
    is NetworkException -> explicitMessage ?: when (statusCode) {
            400 -> "Проверьте корректность введённых данных"
            401 -> "Сессия истекла"
            403 -> "Нет доступа"
            404 -> "Не найдено"
            409 -> "Конфликт данных"
            422 -> "Проверьте заполнение полей"
            in 500..599 -> "Ошибка сервера"
            else -> "Неизвестная ошибка"
        }
    else -> message ?: "Что-то пошло не так"
}

private val NetworkException.explicitMessage: String?
    get() = message
        ?.takeIf { it.isNotBlank() }
        ?.takeUnless { it.startsWith("Ошибка клиента:") }
        ?.takeUnless { it.startsWith("Ошибка сервера:") }
        ?.takeUnless { it.startsWith("Ошибка перенаправления:") }
