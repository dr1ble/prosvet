package com.digitaledu.core.common

import com.digitaledu.core.network.NetworkException

fun Throwable.toUserMessage(): String = when (this) {
    is NetworkException -> when (statusCode) {
        401 -> "Сессия истекла"
        403 -> "Нет доступа"
        404 -> "Не найдено"
        in 500..599 -> "Ошибка сервера"
        else -> message ?: "Неизвестная ошибка"
    }
    else -> message ?: "Что-то пошло не так"
}
