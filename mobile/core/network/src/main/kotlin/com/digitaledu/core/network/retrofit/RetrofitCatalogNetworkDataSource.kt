package com.digitaledu.core.network.retrofit

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.model.CatalogRelease
import com.digitaledu.core.model.CatalogScreen
import com.digitaledu.core.network.CatalogNetworkDataSource
import com.digitaledu.core.network.NetworkException
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.io.IOException
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

class RetrofitCatalogNetworkDataSource private constructor(
    private val catalogApi: RetrofitCatalogApi,
) : CatalogNetworkDataSource {
    override suspend fun listCourses(
        includeDrafts: Boolean,
        includeArchived: Boolean,
    ): List<CatalogCourse> {
        return executeCall {
            catalogApi.listCourses(
                includeDrafts = includeDrafts,
                includeArchived = includeArchived,
            ).map { response ->
                CatalogCourse(
                    id = response.id,
                    slug = response.slug,
                    title = response.title,
                    description = response.description,
                )
            }
        }
    }

    override suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle {
        return executeCall {
            val response = catalogApi.getLatestCourseBundle(courseSlug = courseSlug)
            CatalogBundle(
                course = CatalogCourse(
                    id = response.course.id,
                    slug = response.course.slug,
                    title = response.course.title,
                    description = response.course.description,
                ),
                release = CatalogRelease(
                    id = response.release.id,
                    version = response.release.version,
                    changelog = response.release.changelog,
                    screenCount = response.release.screenCount,
                ),
                screens = response.screens
                    .map { screen ->
                        CatalogScreen(
                            id = screen.id,
                            screenKey = screen.screenKey,
                            title = screen.title,
                            orderIndex = screen.orderIndex,
                            payloadPreview = screen.payload.toPayloadPreview(),
                        )
                    }
                    .sortedBy { it.orderIndex },
            )
        }
    }

    private suspend fun <T> executeCall(block: suspend () -> T): T {
        return try {
            block()
        } catch (exception: HttpException) {
            throw NetworkException(
                message = parseHttpError(exception),
                statusCode = exception.code(),
                cause = exception,
            )
        } catch (exception: IOException) {
            throw NetworkException(
                message = "Не удалось подключиться к серверу",
                cause = exception,
            )
        } catch (exception: Exception) {
            throw NetworkException(
                message = "Неизвестная ошибка сети",
                cause = exception,
            )
        }
    }

    private fun parseHttpError(exception: HttpException): String {
        val statusCode = exception.code()
        val rawBody = exception.response()?.errorBody()?.string().orEmpty()
        val detailMatch = DETAIL_PATTERN.find(rawBody)?.groupValues?.getOrNull(1)
        val detail = detailMatch?.replace("\\\"", "\"")
        return detail ?: "Ошибка сервера ($statusCode)"
    }

    companion object {
        private const val PAYLOAD_PREVIEW_LIMIT = 140
        private val DETAIL_PATTERN = """"detail"\s*:\s*"([^"]+)"""".toRegex()

        @OptIn(ExperimentalSerializationApi::class)
        fun create(
            baseUrl: String,
            enableNetworkLogs: Boolean,
        ): RetrofitCatalogNetworkDataSource {
            val json = Json {
                ignoreUnknownKeys = true
                explicitNulls = false
            }
            val client = OkHttpClient.Builder()
                .addInterceptor(
                    HttpLoggingInterceptor().apply {
                        level = if (enableNetworkLogs) {
                            HttpLoggingInterceptor.Level.BODY
                        } else {
                            HttpLoggingInterceptor.Level.NONE
                        }
                    },
                )
                .build()
            val retrofit = Retrofit.Builder()
                .baseUrl(ensureTrailingSlash(baseUrl))
                .client(client)
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()
            return RetrofitCatalogNetworkDataSource(
                catalogApi = retrofit.create(RetrofitCatalogApi::class.java),
            )
        }

        private fun ensureTrailingSlash(baseUrl: String): String {
            return if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        }
    }

    private fun JsonObject.toPayloadPreview(): String {
        val title = primitiveString("title")
        val body = primitiveString("body")
        val assetKey = primitiveString("asset_key")
        val preferredPreview = listOfNotNull(
            title,
            body,
            assetKey?.let { "asset: $it" },
        ).joinToString(" • ")
        if (preferredPreview.isNotBlank()) {
            return preferredPreview
        }
        val fallback = toString()
        return if (fallback.length <= PAYLOAD_PREVIEW_LIMIT) {
            fallback
        } else {
            "${fallback.take(PAYLOAD_PREVIEW_LIMIT)}..."
        }
    }

    private fun JsonObject.primitiveString(key: String): String? {
        val primitive = this[key] as? JsonPrimitive ?: return null
        return primitive.contentOrNull?.trim()?.takeIf { it.isNotEmpty() }
    }
}

private interface RetrofitCatalogApi {
    @GET("/api/v1/catalog/courses")
    suspend fun listCourses(
        @Query("include_drafts") includeDrafts: Boolean,
        @Query("include_archived") includeArchived: Boolean,
    ): List<CourseResponse>

    @GET("/api/v1/catalog/courses/{course_slug}/releases/latest")
    suspend fun getLatestCourseBundle(
        @Path("course_slug") courseSlug: String,
    ): CourseBundleResponse
}

@Serializable
private data class CourseResponse(
    val id: String,
    val slug: String,
    val title: String,
    val description: String? = null,
)

@Serializable
private data class ReleaseResponse(
    val id: String,
    val version: String,
    val changelog: String? = null,
    @SerialName("screen_count") val screenCount: Int,
)

@Serializable
private data class ScreenResponse(
    val id: String,
    @SerialName("screen_key") val screenKey: String,
    val title: String,
    @SerialName("order_index") val orderIndex: Int,
    val payload: JsonObject,
)

@Serializable
private data class CourseBundleResponse(
    val course: CourseResponse,
    val release: ReleaseResponse,
    val screens: List<ScreenResponse>,
)
