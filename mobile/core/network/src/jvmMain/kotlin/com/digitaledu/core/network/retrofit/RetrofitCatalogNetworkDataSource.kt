package com.digitaledu.core.network.retrofit

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.model.CatalogRelease
import com.digitaledu.core.model.CatalogScreen
import com.digitaledu.core.model.Hotspot
import com.digitaledu.core.model.ScreenPayload
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
                            payload = screen.payload.toScreenPayload(),
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

    private fun JsonObject.toScreenPayload(): ScreenPayload {
        val type = primitiveString("type")
        return when (type) {
            "simulation" -> {
                val imageUrl = primitiveString("image_url") ?: ""
                val hotspotsArray = this["hotspots"] as? kotlinx.serialization.json.JsonArray
                val hotspots = hotspotsArray?.mapNotNull { element ->
                    (element as? JsonObject)?.toHotspot()
                } ?: emptyList()
                val isStart = primitiveBool("is_start")
                val isCompletion = primitiveBool("is_completion")
                
                ScreenPayload.Simulation(
                    imageUrl = imageUrl,
                    hotspots = hotspots,
                    isStart = isStart,
                    isCompletion = isCompletion,
                )
            }
            else -> ScreenPayload.Unknown(toString())
        }
    }
    
    private fun JsonObject.toHotspot(): Hotspot? {
        return try {
            Hotspot(
                x = primitiveFloat("x") ?: return null,
                y = primitiveFloat("y") ?: return null,
                width = primitiveFloat("width") ?: return null,
                height = primitiveFloat("height") ?: return null,
                label = primitiveString("label") ?: "",
                hint = primitiveString("hint") ?: "",
                targetScreenKey = primitiveString("target_screen_key"),
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun JsonObject.primitiveString(key: String): String? {
        val primitive = this[key] as? JsonPrimitive ?: return null
        return primitive.contentOrNull?.trim()?.takeIf { it.isNotEmpty() }
    }
    
    private fun JsonObject.primitiveFloat(key: String): Float? {
        val primitive = this[key] as? JsonPrimitive ?: return null
        return primitive.contentOrNull?.toFloatOrNull()
    }
    
    private fun JsonObject.primitiveBool(key: String): Boolean {
        val primitive = this[key] as? JsonPrimitive ?: return false
        return primitive.contentOrNull?.toBoolean() ?: false
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
