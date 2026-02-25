package com.digitaledu.feature.player.impl.domain

internal class SimulationUrlResolver(
    private val baseUrl: String,
) {
    fun resolve(rawUrl: String): String {
        val imageUrl = rawUrl.trim()
        if (imageUrl.isEmpty()) return ""

        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            if (isLoopbackUrl(imageUrl)) {
                val baseHost = extractHost(baseUrl)
                return imageUrl
                    .replace("://localhost", "://$baseHost")
                    .replace("://127.0.0.1", "://$baseHost")
                    .replace("://[::1]", "://$baseHost")
            }
            return imageUrl
        }

        val baseOrigin = extractOrigin(baseUrl)
        val normalizedPathAndQuery = normalizeSimulationPath(imageUrl)
        return "${baseOrigin.trimEnd('/')}/${normalizedPathAndQuery.trimStart('/')}"
    }

    private fun extractHost(url: String): String {
        val trimmed = url.trim()
        val schemeIndex = trimmed.indexOf("://")
        val start = if (schemeIndex >= 0) schemeIndex + 3 else 0

        val portIndex = trimmed.indexOf(':', startIndex = start)
        val pathIndex = trimmed.indexOf('/', startIndex = start)

        val end = when {
            portIndex >= 0 && pathIndex >= 0 -> minOf(portIndex, pathIndex)
            portIndex >= 0 -> portIndex
            pathIndex >= 0 -> pathIndex
            else -> trimmed.length
        }

        return trimmed.substring(start, end)
    }

    private fun isLoopbackUrl(url: String): Boolean {
        val lowered = url.lowercase()
        return lowered.contains("://localhost") ||
            lowered.contains("://127.0.0.1") ||
            lowered.contains("://[::1]")
    }

    private fun extractOrigin(url: String): String {
        val trimmed = url.trim().trimEnd('/')
        val schemeIndex = trimmed.indexOf("://")
        if (schemeIndex < 0) return trimmed

        val afterSchemeIndex = schemeIndex + 3
        val pathStart = trimmed.indexOf('/', startIndex = afterSchemeIndex)
        return if (pathStart >= 0) trimmed.substring(0, pathStart) else trimmed
    }

    private fun normalizeSimulationPath(rawPathOrUrlPart: String): String {
        val pathAndQuery = rawPathOrUrlPart.trim()
        val queryStart = pathAndQuery.indexOf('?')
        val pathPart = if (queryStart >= 0) {
            pathAndQuery.substring(0, queryStart)
        } else {
            pathAndQuery
        }
        val queryPart = if (queryStart >= 0) {
            pathAndQuery.substring(queryStart)
        } else {
            ""
        }

        val normalizedPath = pathPart.trimStart('/')
        val backendPath = when {
            normalizedPath.startsWith("api/admin/simulation/media/") ->
                normalizedPath.replaceFirst("api/admin/", "api/v1/")
            normalizedPath.startsWith("api/simulation/media/") ->
                normalizedPath.replaceFirst("api/", "api/v1/")
            normalizedPath.startsWith("simulation/media/") ->
                "api/v1/$normalizedPath"
            else -> normalizedPath
        }
        return "${backendPath.trimStart('/')}" + queryPart
    }
}
