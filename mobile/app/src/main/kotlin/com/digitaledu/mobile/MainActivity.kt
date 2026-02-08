package com.digitaledu.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.digitaledu.core.designsystem.theme.DigitalEduTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DigitalEduTheme {
                DigitalEduApp()
            }
        }
    }
}
