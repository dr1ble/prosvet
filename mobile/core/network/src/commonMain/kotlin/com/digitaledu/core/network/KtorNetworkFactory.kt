package com.digitaledu.core.network

import io.ktor.client.HttpClient
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.url
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

fun provideHttpClient(
    baseUrl: String,
    enableNetworkLogs: Boolean,
): HttpClient {
    return HttpClient {
        expectSuccess = true
        install(ContentNegotiation) {
            json(
                Json {
                    ignoreUnknownKeys = true
                    explicitNulls = false
                },
            )
        }
        if (enableNetworkLogs) {
            install(Logging) {
                level = LogLevel.BODY
            }
        }
        defaultRequest {
            url(baseUrl)
        }
    }
}
