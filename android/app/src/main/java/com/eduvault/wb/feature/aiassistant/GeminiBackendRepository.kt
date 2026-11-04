package com.eduvault.wb.feature.aiassistant

import com.eduvault.wb.BuildConfig
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class AiPdfQueryRequest(
    val materialTitle: String,
    val subject: String,
    val board: String,
    val language: String, // "bn" (Bengali) or "en" (English)
    val taskType: String, // "explain", "summary", "mcq", "important_questions", "custom"
    val question: String,
    val documentExcerpt: String
)

@Serializable
data class AiPdfQueryResponse(
    val answer: String,
    val pageReferences: List<Int> = emptyList(),
    val modelUsed: String = "gemini-3.8-flash"
)

/**
 * Communicates with the secure Node/Express backend proxy (/api/ai/pdf-assistant)
 * so the Gemini API key is NEVER embedded inside the Android APK or client code.
 */
@Singleton
class GeminiBackendRepository @Inject constructor(
    private val firebaseAuth: FirebaseAuth
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .build()

    suspend fun askPdfAssistant(requestPayload: AiPdfQueryRequest): Result<AiPdfQueryResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val idToken = firebaseAuth.currentUser?.getIdToken(false)?.await()?.token.orEmpty()
                val bodyString = json.encodeToString(requestPayload)
                val request = Request.Builder()
                    .url("${BuildConfig.BACKEND_BASE_URL}/api/ai/pdf-assistant")
                    .addHeader("Authorization", "Bearer $idToken")
                    .addHeader("Content-Type", "application/json")
                    .post(bodyString.toRequestBody("application/json".toMediaType()))
                    .build()

                httpClient.newCall(request).execute().use { response ->
                    val responseBody = response.body?.string().orEmpty()
                    if (!response.isSuccessful) {
                        error("AI Assistant Error (${response.code}): $responseBody")
                    }
                    json.decodeFromString<AiPdfQueryResponse>(responseBody)
                }
            }
        }
}
