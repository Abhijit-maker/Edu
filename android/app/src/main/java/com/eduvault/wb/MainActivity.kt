package com.eduvault.wb

import android.app.Application
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.eduvault.wb.core.designsystem.EduVaultTheme
import com.eduvault.wb.core.sound.EduSoundEffect
import com.eduvault.wb.core.sound.SoundAndHapticManager
import com.eduvault.wb.navigation.EduVaultNavGraph
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import dagger.hilt.android.AndroidEntryPoint
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class EduVaultApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
            PlayIntegrityAppCheckProviderFactory.getInstance()
        )
    }
}

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var soundManager: SoundAndHapticManager

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        var isReady by mutableStateOf(true)
        splashScreen.setKeepOnScreenCondition { !isReady }

        setContent {
            var isDarkMode by remember { mutableStateOf(false) }

            EduVaultTheme(darkTheme = isDarkMode) {
                EduVaultNavGraph(
                    onNavSound = { soundManager.playEffect(EduSoundEffect.NAV_TAP) },
                    homeContent = {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("EduVault Student Home Dashboard")
                        }
                    },
                    libraryContent = {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("WBCHSE & WBBSE Digital PDF Library")
                        }
                    },
                    aiContent = {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Gemini AI PDF Study Assistant")
                        }
                    },
                    communityContent = {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Student Doubt & Discussion Community")
                        }
                    },
                    profileContent = {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Student Profile & Offline Downloads")
                        }
                    }
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::soundManager.isInitialized) {
            soundManager.release()
        }
    }
}
