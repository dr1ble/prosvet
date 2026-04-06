package com.digitaledu.core.network.ktor

import com.digitaledu.core.network.NetworkException
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.RedirectResponseException
import io.ktor.client.plugins.ServerResponseException

internal suspend fun <T> executeCall(block: suspend () -> T): T {
    return try {
        block()
    } catch (e: ClientRequestException) {
        throw NetworkException(
            message = "Ошибка клиента: ${e.response.status.value}",
            statusCode = e.response.status.value,
            cause = e,
        )
    } catch (e: ServerResponseException) {
        throw NetworkException(
            message = "Ошибка сервера: ${e.response.status.value}",
            statusCode = e.response.status.value,
            cause = e,
        )
    } catch (e: RedirectResponseException) {
        throw NetworkException(
            message = "Ошибка перенаправления: ${e.response.status.value}",
            statusCode = e.response.status.value,
            cause = e,
        )
    } catch (e: Exception) {
        throw NetworkException(
            message = "Ошибка сети. Проверьте подключение к интернету.",
            cause = e,
        )
    }
}
