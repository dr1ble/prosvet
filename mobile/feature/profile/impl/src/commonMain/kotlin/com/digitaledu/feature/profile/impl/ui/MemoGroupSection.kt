package com.digitaledu.feature.profile.impl.ui

import com.digitaledu.core.model.memo.SavedMemo
import kotlin.time.Clock
import kotlin.time.ExperimentalTime
import kotlin.time.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

enum class MemoGroup {
    Today,
    Yesterday,
    ThisWeek,
    Earlier,
}

data class MemoGroupSection(
    val group: MemoGroup,
    val memos: List<SavedMemo>,
)

@OptIn(ExperimentalTime::class)
fun buildMemoGroupSections(
    memos: List<SavedMemo>,
    now: Instant = Clock.System.now(),
    timeZone: TimeZone = TimeZone.currentSystemDefault(),
): List<MemoGroupSection> {
    if (memos.isEmpty()) return emptyList()

    val nowDate = now.toLocalDateTime(timeZone).date
    val nowEpochDay = nowDate.toEpochDaysCompat()
    val grouped = LinkedHashMap<MemoGroup, MutableList<SavedMemo>>()

    memos
        .sortedByDescending { it.savedAtEpochMs }
        .forEach { memo ->
            val savedDate = Instant.fromEpochMilliseconds(memo.savedAtEpochMs)
                .toLocalDateTime(timeZone).date
            val savedEpochDay = savedDate.toEpochDaysCompat()
            val diff = nowEpochDay - savedEpochDay
            val group = when {
                diff <= 0L -> MemoGroup.Today
                diff == 1L -> MemoGroup.Yesterday
                diff in 2L..6L -> MemoGroup.ThisWeek
                else -> MemoGroup.Earlier
            }
            grouped.getOrPut(group) { mutableListOf() } += memo
        }

    return MemoGroup.entries.mapNotNull { group ->
        val list = grouped[group] ?: return@mapNotNull null
        MemoGroupSection(group = group, memos = list)
    }
}

private fun kotlinx.datetime.LocalDate.toEpochDaysCompat(): Long {
    return this.toEpochDays()
}
