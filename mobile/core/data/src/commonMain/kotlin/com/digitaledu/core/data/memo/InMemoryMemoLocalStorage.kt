package com.digitaledu.core.data.memo

import com.digitaledu.core.model.memo.SavedMemo
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class InMemoryMemoLocalStorage : MemoLocalStorage {
    private val mutex = Mutex()
    private val memos = mutableListOf<SavedMemo>()

    override suspend fun list(): List<SavedMemo> = mutex.withLock {
        memos.sortedByDescending { it.savedAtEpochMs }
    }

    override suspend fun get(id: String): SavedMemo? = mutex.withLock {
        memos.firstOrNull { it.id == id }
    }

    override suspend fun save(memo: SavedMemo): SavedMemo = mutex.withLock {
        val existingIndex = memos.indexOfFirst { it.id == memo.id }
        if (existingIndex >= 0) {
            memos[existingIndex] = memo
        } else {
            memos += memo
        }
        memo
    }

    override suspend fun delete(id: String) {
        mutex.withLock {
            memos.removeAll { it.id == id }
        }
    }

    override suspend fun findForScreen(releaseId: String, screenId: String): SavedMemo? = mutex.withLock {
        memos.firstOrNull { it.releaseId == releaseId && it.screenId == screenId }
    }
}
