package com.eduvault.wb.data.repository

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.eduvault.wb.BuildConfig
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FirebaseAuthRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val firebaseAuth: FirebaseAuth,
    private val firestore: FirebaseFirestore
) {
    private val credentialManager = CredentialManager.create(context)

    val currentUser: FirebaseUser?
        get() = firebaseAuth.currentUser

    suspend fun signInWithGoogleCredentialManager(
        activityContext: Context,
        webClientId: String = BuildConfig.GOOGLE_WEB_CLIENT_ID
    ): Result<FirebaseUser> = runCatching {
        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(webClientId)
            .setAutoSelectEnabled(true)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        val result = credentialManager.getCredential(
            request = request,
            context = activityContext
        )

        val credential = result.credential
        if (credential is CustomCredential &&
            credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
            val firebaseCredential = GoogleAuthProvider.getCredential(googleIdTokenCredential.idToken, null)
            val authResult = firebaseAuth.signInWithCredential(firebaseCredential).await()
            val user = authResult.user ?: error("Firebase authentication returned null user.")
            ensureStudentProfileExists(user)
            user
        } else {
            error("Unsupported credential type returned by Credential Manager.")
        }
    }

    suspend fun signInWithEmail(email: String, password: String): Result<FirebaseUser> = runCatching {
        val result = firebaseAuth.signInWithEmailAndPassword(email.trim(), password).await()
        val user = result.user ?: error("Login failed")
        ensureStudentProfileExists(user)
        user
    }

    suspend fun registerWithEmail(
        fullName: String,
        email: String,
        password: String,
        board: String,
        className: String
    ): Result<FirebaseUser> = runCatching {
        val result = firebaseAuth.createUserWithEmailAndPassword(email.trim(), password).await()
        val user = result.user ?: error("Registration failed")
        ensureStudentProfileExists(user, defaultName = fullName, board = board, className = className)
        user
    }

    suspend fun sendPasswordReset(email: String): Result<Unit> = runCatching {
        firebaseAuth.sendPasswordResetEmail(email.trim()).await()
    }

    /**
     * Initializes a new student profile in Firestore with 0 points, 0 books read, and 0 quizzes
     * (no fake hardcoded statistics).
     */
    private suspend fun ensureStudentProfileExists(
        user: FirebaseUser,
        defaultName: String? = null,
        board: String = "WBCHSE",
        className: String = "Class 12"
    ) {
        val docRef = firestore.collection("users").document(user.uid)
        val snapshot = docRef.get().await()
        val now = Timestamp.now()

        if (!snapshot.exists()) {
            val profileData = mapOf(
                "uid" to user.uid,
                "displayName" to (defaultName ?: user.displayName ?: "Student").take(100),
                "board" to board,
                "className" to className,
                "semester" to "Sem 3",
                "studyPoints" to 0,
                "level" to 1,
                "booksRead" to 0,
                "quizzesCompleted" to 0,
                "studyHours" to 0,
                "language" to "bn",
                "createdAt" to now,
                "updatedAt" to now
            )
            docRef.set(profileData, SetOptions.merge()).await()
        }
    }

    fun signOut() {
        firebaseAuth.signOut()
    }

    suspend fun deleteAccount(): Result<Unit> = runCatching {
        val user = firebaseAuth.currentUser ?: error("No signed-in user")
        firestore.collection("users").document(user.uid).delete().await()
        user.delete().await()
    }
}
