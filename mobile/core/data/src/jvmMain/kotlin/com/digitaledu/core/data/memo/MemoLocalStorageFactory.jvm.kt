package com.digitaledu.core.data.memo

import com.digitaledu.core.model.memo.SavedMemo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

actual fun createFileMemoLocalStorage(storageDirPath: String): MemoLocalStorage =
    JvmFileMemoLocalStorage(storageDirPath)

internal class JvmFileMemoLocalStorage(storageDirPath: String) : MemoLocalStorage {
    private val file = File(storageDirPath, "memos.json")
    private val mutex = Mutex()
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    override suspend fun list(): List<SavedMemo> = mutex.withLock { readAll() }
        .sortedByDescending { it.savedAtEpochMs }

    override suspend fun get(id: String): SavedMemo? = mutex.withLock {
        readAll().firstOrNull { it.id == id }
    }

    override suspend fun save(memo: SavedMemo): SavedMemo = mutex.withLock {
        val current = readAll().toMutableList()
        val existingIndex = current.indexOfFirst { it.id == memo.id }
        if (existingIndex >= 0) {
            current[existingIndex] = memo
        } else {
            current += memo
        }
        writeAll(current)
        memo
    }

    override suspend fun delete(id: String) {
        mutex.withLock {
            val current = readAll().toMutableList()
            val removed = current.removeAll { it.id == id }
            if (removed) {
                writeAll(current)
            }
        }
    }

    override suspend fun findForScreen(releaseId: String, screenId: String): SavedMemo? = mutex.withLock {
        readAll().firstOrNull { it.releaseId == releaseId && it.screenId == screenId }
    }

    private suspend fun readAll(): List<SavedMemo> = withContext(Dispatchers.IO) {
        if (!file.exists()) return@withContext emptyList()
        val text = runCatching { file.readText(Charsets.UTF_8) }.getOrNull()
        if (text.isNullOrBlank()) return@withContext emptyList()
        runCatching { json.decodeFromString<List<SavedMemo>>(text) }.getOrElse { emptyList() }
    }

    private suspend fun writeAll(memos: List<SavedMemo>) = withContext(Dispatchers.IO) {
        val parent = file.parentFile
        if (parent != null && !parent.exists()) {
            parent.mkdirs()
        }
        val tmp = File(file.parentFile ?: File("."), "${file.name}.tmp")
        tmp.writeText(json.encodeToString(memos), Charsets.UTF_8)
        Files.move(
            tmp.toPath(),
            file.toPath(),
            StandardCopyOption.ATOMIC_MOVE,
            StandardCopyOption.REPLACE_EXISTING,
        )
    }
}
