package com.digitaledu.mobile.accessibility

import android.content.Context
import com.digitaledu.core.data.preferences.AccessibilityPreferencesRepository

fun provideAccessibilityPreferencesRepository(context: Context): AccessibilityPreferencesRepository {
    return AndroidAccessibilityPreferencesRepository(context.applicationContext)
}
