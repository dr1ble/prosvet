package com.digitaledu.core.network

import com.digitaledu.core.network.ktor.KtorAuthNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

fun createKtorAuthNetworkDataSource(
    baseUrl: String,
    enableNetworkLogs: Boolean,
): KtorAuthNetworkDataSource {
    val client = HttpClient(OkHttp.create()) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                explicitNulls = false
            })
        }
        if (enableNetworkLogs) {
            install(Logging) {
                level = LogLevel.BODY
            }
        }
    }
    return KtorAuthNetworkDataSource(
        client = client,
        baseUrl = baseUrl,
    )
}

fun createKtorCatalogNetworkDataSource(
    baseUrl: String,
    enableNetworkLogs: Boolean,
): com.digitaledu.core.network.ktor.KtorCatalogNetworkDataSource {
    val client = HttpClient(OkHttp.create()) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                explicitNulls = false
            })
        }
        if (enableNetworkLogs) {
            install(Logging) {
                level = LogLevel.BODY
            }
        }
    }
    return com.digitaledu.core.network.ktor.KtorCatalogNetworkDataSource(
        client = client,
        baseUrl = baseUrl,
    )
}
