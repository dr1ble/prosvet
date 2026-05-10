package com.digitaledu.feature.diagnostics.impl.di

import com.digitaledu.feature.diagnostics.api.DiagnosticsFeatureHost
import com.digitaledu.feature.diagnostics.api.DiagnosticsUiEntry
import com.digitaledu.feature.diagnostics.impl.presentation.DiagnosticsViewModel
import com.digitaledu.feature.diagnostics.impl.ui.DiagnosticsUiEntryImpl
import org.koin.core.module.Module
import org.koin.dsl.module

fun diagnosticsFeatureModule(): Module = module {
    factory<DiagnosticsFeatureHost> { DiagnosticsViewModel(diagnosticsRepository = get()) }
    single<DiagnosticsUiEntry> { DiagnosticsUiEntryImpl() }
}
