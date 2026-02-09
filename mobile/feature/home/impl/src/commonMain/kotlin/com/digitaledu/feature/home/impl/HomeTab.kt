package com.digitaledu.feature.home.impl

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Person
import androidx.compose.ui.graphics.vector.ImageVector

enum class HomeTab(
    val label: String,
    val icon: ImageVector,
) {
    Courses(
        label = "Курсы",
        icon = Icons.Rounded.Home,
    ),
    Lesson(
        label = "Обучение",
        icon = Icons.AutoMirrored.Rounded.MenuBook,
    ),
    Profile(
        label = "Профиль",
        icon = Icons.Rounded.Person,
    ),
}
