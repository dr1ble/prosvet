package com.digitaledu.core.network.ktor

import kotlin.test.Test
import kotlin.test.assertEquals

class FastApiErrorParserTest {
    @Test
    fun extractErrorDetail_readsFastApiStringDetail() {
        val detail = extractErrorDetail("""{"detail":"Эта почта уже привязана к другому аккаунту."}""")

        assertEquals("Эта почта уже привязана к другому аккаунту.", detail)
    }
}
