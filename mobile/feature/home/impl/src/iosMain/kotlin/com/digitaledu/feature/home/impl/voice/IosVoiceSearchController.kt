package com.digitaledu.feature.home.impl.voice

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.ObjCAction
import kotlinx.cinterop.useContents
import platform.AVFAudio.AVAudioEngine
import platform.AVFAudio.AVAudioSession
import platform.AVFAudio.AVAudioSessionCategoryRecord
import platform.AVFAudio.AVAudioSessionModeMeasurement
import platform.AVFAudio.AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation
import platform.Foundation.NSLocale
import platform.Speech.SFSpeechAudioBufferRecognitionRequest
import platform.Speech.SFSpeechRecognitionTask
import platform.Speech.SFSpeechRecognizer
import platform.Speech.SFSpeechRecognizerAuthorizationStatus
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue

@Composable
internal actual fun rememberVoiceSearchController(
    unavailableMessage: String,
    recognitionErrorMessage: String,
    onResult: (VoiceSearchResult) -> Unit,
): VoiceSearchController {
    return remember(unavailableMessage, recognitionErrorMessage, onResult) {
        IosVoiceSearchController(
            unavailableMessage = unavailableMessage,
            recognitionErrorMessage = recognitionErrorMessage,
            onResult = onResult,
        )
    }
}

@OptIn(ExperimentalForeignApi::class)
private class IosVoiceSearchController(
    private val unavailableMessage: String,
    private val recognitionErrorMessage: String,
    private val onResult: (VoiceSearchResult) -> Unit,
) : VoiceSearchController {
    private val speechRecognizer = SFSpeechRecognizer(locale = NSLocale(localeIdentifier = "ru_RU"))
    private val audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest? = null
    private var recognitionTask: SFSpeechRecognitionTask? = null

    override fun startListening() {
        SFSpeechRecognizer.requestAuthorization { status ->
            dispatch_async(dispatch_get_main_queue()) {
                when (status) {
                    SFSpeechRecognizerAuthorizationStatus.SFSpeechRecognizerAuthorizationStatusAuthorized -> {
                        startAuthorizedRecognition()
                    }
                    SFSpeechRecognizerAuthorizationStatus.SFSpeechRecognizerAuthorizationStatusDenied,
                    SFSpeechRecognizerAuthorizationStatus.SFSpeechRecognizerAuthorizationStatusRestricted -> onResult(
                        VoiceSearchResult.Error(recognitionErrorMessage),
                    )
                    else -> onResult(VoiceSearchResult.Unavailable(unavailableMessage))
                }
            }
        }
    }

    private fun startAuthorizedRecognition() {
        val recognizer = speechRecognizer
        if (!recognizer.available) {
            onResult(VoiceSearchResult.Unavailable(unavailableMessage))
            return
        }

        recognitionTask?.cancel()
        recognitionTask = null

        val audioSession = AVAudioSession.sharedInstance()
        audioSession.setCategory(AVAudioSessionCategoryRecord, error = null)
        audioSession.setMode(AVAudioSessionModeMeasurement, error = null)

        val request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = false
        recognitionRequest = request

        val inputNode = audioEngine.inputNode
        val recordingFormat = inputNode.outputFormatForBus(0u)
        inputNode.removeTapOnBus(0u)
        inputNode.installTapOnBus(
            bus = 0u,
            bufferSize = 1024u,
            format = recordingFormat,
        ) { buffer, _ ->
            buffer?.let(request::appendAudioPCMBuffer)
        }

        audioEngine.prepare()
        if (!audioEngine.startAndReturnError(null)) {
            finishWithResult(VoiceSearchResult.Error(recognitionErrorMessage))
            return
        }

        recognitionTask = recognizer.recognitionTaskWithRequest(request) { result, error ->
            val transcript = result?.bestTranscription?.formattedString?.trim().orEmpty()
            val isFinal = result?.final ?: false
            if (isFinal && transcript.isNotBlank()) {
                finishWithResult(VoiceSearchResult.Recognized(transcript))
            } else if (error != null) {
                finishWithResult(VoiceSearchResult.Error(recognitionErrorMessage))
            }
        }
    }

    private fun finishWithResult(result: VoiceSearchResult) {
        audioEngine.stop()
        audioEngine.inputNode.removeTapOnBus(0u)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = null
        recognitionTask = null
        onResult(result)
    }

}
