package com.eduvault.wb.core.sound

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.SoundPool
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin

enum class EduSoundEffect(val baseFreqHz: Double, val durationMs: Int, val isChord: Boolean = false) {
    BUTTON_TAP(580.0, 35),
    NAV_TAP(480.0, 40),
    PDF_OPEN(660.0, 95, isChord = true),
    LOGIN_SUCCESS(740.0, 160, isChord = true),
    QUIZ_SELECT(520.0, 45),
    QUIZ_SUCCESS(880.0, 180, isChord = true),
    DOWNLOAD_COMPLETE(784.0, 140, isChord = true),
    NOTIFICATION(698.0, 110),
    ACHIEVEMENT_UNLOCK(987.0, 210, isChord = true),
    ERROR_FEEDBACK(240.0, 130)
}

/**
 * Manages lightweight UI sound effects (SoundPool + synthesized PCM chimes)
 * and haptic feedback while respecting Android silent/ringer mode and user settings.
 */
@Singleton
class SoundAndHapticManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private val soundPool: SoundPool = SoundPool.Builder()
        .setMaxStreams(4)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        )
        .build()

    var soundEnabled: Boolean = true
    var soundVolume: Float = 0.65f
    var hapticEnabled: Boolean = true

    fun playEffect(effect: EduSoundEffect, triggerHaptic: Boolean = true) {
        if (triggerHaptic && hapticEnabled) {
            performSubtleHaptic(effect)
        }

        if (!soundEnabled) return
        // Respect Android Silent / Vibrate ringer mode
        if (audioManager.ringerMode != AudioManager.RINGER_MODE_NORMAL) return

        scope.launch {
            playSynthesizedTone(effect, soundVolume.coerceIn(0.05f, 1.0f))
        }
    }

    private fun playSynthesizedTone(effect: EduSoundEffect, volume: Float) {
        val sampleRate = 24000
        val numSamples = (sampleRate * (effect.durationMs / 1000.0)).toInt().coerceAtLeast(240)
        val pcmBuffer = ShortArray(numSamples)

        for (i in 0 until numSamples) {
            val t = i.toDouble() / sampleRate
            val envelope = exp(-6.0 * i.toDouble() / numSamples)
            val primaryWave = sin(2.0 * PI * effect.baseFreqHz * t)
            val fifthWave = if (effect.isChord) 0.45 * sin(2.0 * PI * (effect.baseFreqHz * 1.25) * t) else 0.0
            val sampleValue = ((primaryWave + fifthWave) * envelope * volume * 0.35 * Short.MAX_VALUE).toInt()
            pcmBuffer[i] = sampleValue.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
        }

        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(pcmBuffer.size * 2)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()

        track.write(pcmBuffer, 0, pcmBuffer.size)
        track.play()
    }

    private fun performSubtleHaptic(effect: EduSoundEffect) {
        val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

        if (vibrator?.hasVibrator() == true) {
            val duration = when (effect) {
                EduSoundEffect.QUIZ_SUCCESS, EduSoundEffect.ACHIEVEMENT_UNLOCK -> 35L
                EduSoundEffect.ERROR_FEEDBACK -> 45L
                else -> 14L
            }
            vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
        }
    }

    fun release() {
        soundPool.release()
    }
}
