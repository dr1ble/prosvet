package com.digitaledu.core.data.memo

import com.digitaledu.core.model.memo.SavedMemo
import kotlinx.cinterop.BetaInteropApi
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import platform.Foundation.NSFileManager
import platform.Foundation.NSString
import platform.Foundation.NSUTF8StringEncoding
import platform.Foundation.create
import platform.Foundation.stringWithContentsOfFile
import platform.Foundation.writeToFile

actual fun createFileMemoLocalStorage(storageDirPath: String): MemoLocalStorage =
    IosFileMemoLocalStorage(storageDirPath)

@OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
internal class IosFileMemoLocalStorage(private val storageDirPath: String) : MemoLocalStorage {
    private val filePath: String = "$storageDirPath/memos.json"
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

    private fun readAll(): List<SavedMemo> {
        ensureDirectoryExists()
        val fileManager = NSFileManager.defaultManager
        if (!fileManager.fileExistsAtPath(filePath)) return emptyList()
        val text = NSString.stringWithContentsOfFile(
            path = filePath,
            encoding = NSUTF8StringEncoding,
            error = null,
        ) ?: return emptyList()
        if (text.isBlank()) return emptyList()
        return runCatching { json.decodeFromString<List<SavedMemo>>(text) }.getOrElse { emptyList() }
    }

    private fun writeAll(memos: List<SavedMemo>) {
        ensureDirectoryExists()
        val payload = json.encodeToString(memos)
        val nsString: NSString = NSString.create(string = payload) as NSString
        nsString.writeToFile(
            path = filePath,
            atomically = true,
            encoding = NSUTF8StringEncoding,
            error = null,
        )
    }

    private fun ensureDirectoryExists() {
        val fileManager = NSFileManager.defaultManager
        if (!fileManager.fileExistsAtPath(storageDirPath)) {
            fileManager.createDirectoryAtPath(
                path = storageDirPath,
                withIntermediateDirectories = true,
                attributes = null,
                error = null,
            )
        }
    }
}
