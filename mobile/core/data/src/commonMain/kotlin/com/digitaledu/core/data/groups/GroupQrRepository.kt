package com.digitaledu.core.data.groups

import com.digitaledu.core.model.group.GroupQrResolution

interface GroupQrRepository {
    suspend fun resolveGroupQr(token: String): GroupQrResolution
}
