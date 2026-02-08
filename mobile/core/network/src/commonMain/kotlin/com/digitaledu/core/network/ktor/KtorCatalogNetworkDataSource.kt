package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.model.CatalogRelease
import com.digitaledu.core.model.CatalogScreen
import com.digitaledu.core.network.CatalogNetworkDataSource
import com.digitaledu.core.network.NetworkException
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.RedirectResponseException
import io.ktor.client.plugins.ServerResponseException
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.url
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

class KtorCatalogNetworkDataSource(
    private val client: HttpClient,
    private val baseUrl: String,
) : CatalogNetworkDataSource {

    override suspend fun listCourses(
        includeDrafts: Boolean,
        includeArchived: Boolean,
    ): List<CatalogCourse> {
        return executeCall {
            client.get {
                url("$baseUrl/api/v1/catalog/courses")
                parameter("include_drafts", includeDrafts)
                parameter("include_archived", includeArchived)
            }.body<List<CourseResponse>>().map { response ->
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
            val response = client.get {
                url("$baseUrl/api/v1/catalog/courses/$courseSlug/releases/latest")
            }.body<CourseBundleResponse>()
            
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
        } catch (e: ClientRequestException) {
            throw NetworkException(
                message = "Client error: ${e.response.status.value}",
                statusCode = e.response.status.value,
                cause = e
            )
        } catch (e: ServerResponseException) {
            throw NetworkException(
                message = "Server error: ${e.response.status.value}",
                statusCode = e.response.status.value,
                cause = e
            )
        } catch (e: RedirectResponseException) {
            throw NetworkException(
                message = "Redirect error: ${e.response.status.value}",
                statusCode = e.response.status.value,
                cause = e
            )
        } catch (e: Exception) {
            throw NetworkException(
                message = "Unknown network error",
                cause = e
            )
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

    companion object {
        private const val PAYLOAD_PREVIEW_LIMIT = 140
    }
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
