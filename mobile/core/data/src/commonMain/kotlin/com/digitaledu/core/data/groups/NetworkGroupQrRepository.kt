package com.digitaledu.core.data.groups

import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.model.group.GroupQrResolution
import com.digitaledu.core.network.GroupsNetworkDataSource

class NetworkGroupQrRepository(
    private val authRepository: AuthRepository,
    private val groupsNetworkDataSource: GroupsNetworkDataSource,
) : GroupQrRepository {
    override suspend fun resolveGroupQr(token: String): GroupQrResolution {
        return authRepository.withFreshAccessToken { accessToken ->
            groupsNetworkDataSource.resolveGroupQr(token = token, accessToken = accessToken)
        }
    }
}
