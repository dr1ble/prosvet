package com.digitaledu.core.data.memo

import com.digitaledu.core.model.memo.SavedMemo

interface MemoLocalStorage {
    suspend fun list(): List<SavedMemo>
    suspend fun get(id: String): SavedMemo?
    suspend fun save(memo: SavedMemo): SavedMemo
    suspend fun delete(id: String)
    suspend fun findForScreen(releaseId: String, screenId: String): SavedMemo?
}
