package com.digitaledu.core.network.ktor

import com.digitaledu.core.network.NetworkException
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.RedirectResponseException
import io.ktor.client.plugins.ServerResponseException
import io.ktor.client.statement.bodyAsText
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

internal suspend fun <T> executeCall(block: suspend () -> T): T {
    return try {
        block()
    } catch (e: ClientRequestException) {
        val detail = extractErrorDetail(e.response.bodyAsText())
        throw NetworkException(
            message = detail ?: "Ошибка клиента: ${e.response.status.value}",
            statusCode = e.response.status.value,
            cause = e,
        )
    } catch (e: ServerResponseException) {
        val detail = extractErrorDetail(e.response.bodyAsText())
        throw NetworkException(
            message = detail ?: "Ошибка сервера: ${e.response.status.value}",
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
        val cause = e.message?.takeIf { it.isNotBlank() }?.let { " (${it.take(160)})" }.orEmpty()
        throw NetworkException(
            message = "Ошибка сети. Проверьте подключение к интернету.$cause",
            cause = e,
        )
    }
}

internal fun extractErrorDetail(body: String): String? {
    return runCatching {
        val json = Json.parseToJsonElement(body) as? JsonObject ?: return null
        json["detail"]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotBlank() }
    }.getOrNull()
}
