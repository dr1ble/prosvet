package com.digitaledu.core.network

import com.digitaledu.core.model.group.GroupQrResolution

interface GroupsNetworkDataSource {
    suspend fun resolveGroupQr(token: String, accessToken: String): GroupQrResolution
}
