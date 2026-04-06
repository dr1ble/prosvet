package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.group.GroupQrResolution
import com.digitaledu.core.network.GroupsNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.headers
import io.ktor.client.request.url
import io.ktor.http.HttpHeaders

class KtorGroupsNetworkDataSource(
    private val client: HttpClient,
) : GroupsNetworkDataSource {
    override suspend fun resolveGroupQr(token: String, accessToken: String): GroupQrResolution {
        return executeCall {
            val response = client.get {
                url("api/v1/groups/qr/$token")
                headers {
                    append(HttpHeaders.Authorization, "Bearer $accessToken")
                }
            }.body<GroupQrResolveResponse>()

            GroupQrResolution(
                groupId = response.groupId,
                groupName = response.groupName,
                courseSlug = response.courseSlug,
            )
        }
    }
}
