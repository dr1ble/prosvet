package com.digitaledu.feature.home.impl

enum class SosHelpRequestType(val backendValue: String) {
    LessonHelp("lesson_help"),
    MentorQuestion("mentor_question"),
    TechnicalIssue("technical_issue"),
}

internal data class SosHelpRequestOption(
    val type: SosHelpRequestType,
    val title: String,
    val description: String,
)

internal data class SosHelpState(
    val title: String,
    val subtitle: String,
    val options: List<SosHelpRequestOption>,
)

internal data class SosHelpFormState(
    val selectedType: SosHelpRequestType?,
    val message: String,
) {
    val trimmedMessage: String = message.trim()
    val canSubmit: Boolean = selectedType != null && trimmedMessage.length >= 8
}

internal fun buildSosHelpState(): SosHelpState {
    return SosHelpState(
        title = "Помощь с курсом",
        subtitle = "Быстрые действия, если задание непонятно или что-то не работает в уроке.",
        options = listOf(
            SosHelpRequestOption(
                type = SosHelpRequestType.LessonHelp,
                title = "Попросить объяснить шаг",
                description = "Отправить запрос, если текущий шаг курса сложный или непонятный.",
            ),
            SosHelpRequestOption(
                type = SosHelpRequestType.MentorQuestion,
                title = "Задать вопрос куратору",
                description = "Получить подсказку по теме курса или учебному заданию.",
            ),
            SosHelpRequestOption(
                type = SosHelpRequestType.TechnicalIssue,
                title = "Сообщить о проблеме в курсе",
                description = "Написать, если не открывается экран, видео, тест или тренажер.",
            ),
        ),
    )
}

internal fun buildSosHelpFormState(
    selectedType: SosHelpRequestType?,
    message: String,
): SosHelpFormState = SosHelpFormState(
    selectedType = selectedType,
    message = message,
)
