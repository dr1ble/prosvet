package com.digitaledu.core.common

import com.digitaledu.core.network.NetworkException

fun Throwable.toUserMessage(): String = when (this) {
    is NetworkException -> when (statusCode) {
        400 -> "Проверьте корректность введённых данных"
        401 -> "Сессия истекла"
        403 -> "Нет доступа"
        404 -> "Не найдено"
        409 -> "Логин уже занят"
        422 -> "Проверьте заполнение полей"
        in 500..599 -> "Ошибка сервера"
        else -> message ?: "Неизвестная ошибка"
    }
    else -> message ?: "Что-то пошло не так"
}
