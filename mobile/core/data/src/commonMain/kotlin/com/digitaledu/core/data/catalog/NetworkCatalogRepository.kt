package com.digitaledu.core.data.catalog

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.network.CatalogNetworkDataSource
import com.digitaledu.core.network.createKtorCatalogNetworkDataSource

class NetworkCatalogRepository internal constructor(
    private val networkDataSource: CatalogNetworkDataSource,
) : CatalogRepository {
    override suspend fun listCourses(): List<CatalogCourse> {
        return networkDataSource.listCourses(
            includeDrafts = false,
            includeArchived = false,
        )
    }

    override suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle {
        return networkDataSource.getLatestCourseBundle(courseSlug = courseSlug)
    }
}

fun createCatalogRepository(
    baseUrl: String,
    enableNetworkLogs: Boolean,
): CatalogRepository {
    return NetworkCatalogRepository(
        networkDataSource = createKtorCatalogNetworkDataSource(
            baseUrl = baseUrl,
            enableNetworkLogs = enableNetworkLogs,
        ),
    )
}
