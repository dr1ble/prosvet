package com.digitaledu.feature.home.impl

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Person
import androidx.compose.ui.graphics.vector.ImageVector

enum class HomeTab(
    val icon: ImageVector,
) {
    Home(
        icon = Icons.Rounded.Home,
    ),
    Learning(
        icon = Icons.AutoMirrored.Rounded.MenuBook,
    ),
    Profile(
        icon = Icons.Rounded.Person,
    ),
}
