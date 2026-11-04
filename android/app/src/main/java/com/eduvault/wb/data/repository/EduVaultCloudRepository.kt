package com.eduvault.wb.data.repository

import android.net.Uri
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

data class CloudMaterial(
    val id: String = "",
    val title: String = "",
    val titleBn: String = "",
    val board: String = "WBCHSE",
    val className: String = "Class 12",
    val semester: String = "Sem 3",
    val subject: String = "Physics",
    val chapter: String = "",
    val fileSize: String = "",
    val pageCount: Int = 1,
    val contentSummary: String = "",
    val pdfDataUrl: String = "",
    val authorUid: String = "",
    val isOfficial: Boolean = true
)

data class CloudNotification(
    val id: String = "",
    val title: String = "",
    val body: String = "",
    val type: String = "announcement",
    val targetBoard: String = "ALL",
    val materialId: String = "",
    val senderUid: String = "",
    val senderName: String = "Admin"
)

/**
 * Pure real-time Cloud Firestore & Firebase Storage repository with ZERO hardcoded dummy PDFs.
 * Every PDF uploaded by the Admin or notification broadcast by the Admin is delivered in real time
 * to all connected WBCHSE & WBBSE student devices.
 */
@Singleton
class EduVaultCloudRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val storage: FirebaseStorage,
    private val auth: FirebaseAuth
) {
    /**
     * Real-time stream of official PDF materials uploaded by Admin.
     */
    fun observeOfficialMaterials(): Flow<List<CloudMaterial>> = callbackFlow {
        val listener = firestore.collection("materials")
            .whereEqualTo("isOfficial", true)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    CloudMaterial(
                        id = doc.id,
                        title = doc.getString("title").orEmpty(),
                        titleBn = doc.getString("titleBn").orEmpty(),
                        board = doc.getString("board") ?: "WBCHSE",
                        className = doc.getString("className") ?: "Class 12",
                        semester = doc.getString("semester") ?: "Sem 3",
                        subject = doc.getString("subject") ?: "Physics",
                        chapter = doc.getString("chapter").orEmpty(),
                        fileSize = doc.getString("fileSize") ?: "1.0 MB",
                        pageCount = (doc.getLong("pageCount") ?: 1L).toInt(),
                        contentSummary = doc.getString("contentSummary").orEmpty(),
                        pdfDataUrl = doc.getString("pdfDataUrl").orEmpty(),
                        authorUid = doc.getString("authorUid").orEmpty(),
                        isOfficial = doc.getBoolean("isOfficial") ?: true
                    )
                }.orEmpty()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    /**
     * Real-time stream of Admin Broadcast Notifications for all students.
     */
    fun observeBroadcastNotifications(): Flow<List<CloudNotification>> = callbackFlow {
        val listener = firestore.collection("notifications")
            .whereEqualTo("isBroadcast", true)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.map { doc ->
                    CloudNotification(
                        id = doc.id,
                        title = doc.getString("title").orEmpty(),
                        body = doc.getString("body").orEmpty(),
                        type = doc.getString("type") ?: "announcement",
                        targetBoard = doc.getString("targetBoard") ?: "ALL",
                        materialId = doc.getString("materialId").orEmpty(),
                        senderUid = doc.getString("senderUid").orEmpty(),
                        senderName = doc.getString("senderName") ?: "Admin"
                    )
                }.orEmpty()
                trySend(list)
            }
        awaitClose { listener.remove() }
    }

    /**
     * Admin-only: Uploads a PDF to Firebase Storage, writes metadata to /materials/{id},
     * and broadcasts a real-time notification to /notifications/{notifId} for all users.
     */
    suspend fun uploadOfficialPdfAndNotifyAllUsers(
        pdfUri: Uri?,
        title: String,
        titleBn: String,
        board: String,
        className: String,
        semester: String,
        subject: String,
        chapter: String,
        fileSize: String,
        pageCount: Int,
        contentSummary: String,
        onProgress: (Int) -> Unit
    ): Result<String> = runCatching {
        val adminUser = auth.currentUser ?: error("Admin must be signed in.")
        val materialId = "mat_${System.currentTimeMillis()}"
        var downloadUrl = ""

        if (pdfUri != null) {
            val storagePath = "eduvault/materials/${board.lowercase()}/${className.lowercase().replace(" ", "")}/${semester.lowercase().replace(" ", "")}/${subject.lowercase()}/$materialId.pdf"
            val storageRef = storage.reference.child(storagePath)
            val uploadTask = storageRef.putFile(pdfUri)
            uploadTask.addOnProgressListener { snap ->
                if (snap.totalByteCount > 0) {
                    val pct = ((100.0 * snap.bytesTransferred) / snap.totalByteCount).toInt()
                    onProgress(pct)
                }
            }.await()
            downloadUrl = storageRef.downloadUrl.await().toString()
        }

        val now = Timestamp.now()
        val materialPayload = mapOf(
            "id" to materialId,
            "title" to title.trim().take(160),
            "titleBn" to titleBn.trim().take(200),
            "board" to board,
            "className" to className,
            "semester" to semester,
            "subject" to subject,
            "chapter" to chapter.trim().take(120),
            "fileSize" to fileSize,
            "pageCount" to pageCount,
            "contentSummary" to contentSummary.trim().take(8000),
            "pdfDataUrl" to downloadUrl,
            "authorUid" to adminUser.uid,
            "isOfficial" to true,
            "createdAt" to now,
            "updatedAt" to now
        )

        firestore.collection("materials").document(materialId).set(materialPayload).await()

        // Automatically broadcast real-time notification to all users
        sendAdminBroadcastNotification(
            title = "New PDF Uploaded: $title",
            body = "$board $className ($subject - $chapter) is now available in your Digital Library.",
            type = "new_pdf",
            targetBoard = board,
            materialId = materialId
        )

        materialId
    }

    /**
     * Admin-only: Sends an instant broadcast notification to all students.
     */
    suspend fun sendAdminBroadcastNotification(
        title: String,
        body: String,
        type: String = "announcement",
        targetBoard: String = "ALL",
        materialId: String = ""
    ): Result<String> = runCatching {
        val adminUser = auth.currentUser ?: error("Admin authentication required.")
        val notifId = "notif_${System.currentTimeMillis()}"
        val now = Timestamp.now()

        val payload = mutableMapOf<String, Any>(
            "id" to notifId,
            "title" to title.trim().take(140),
            "body" to body.trim().take(1000),
            "type" to type,
            "targetBoard" to targetBoard,
            "senderUid" to adminUser.uid,
            "senderName" to (adminUser.displayName ?: "EduVault Admin").take(100),
            "isBroadcast" to true,
            "createdAt" to now
        )
        if (materialId.isNotBlank()) {
            payload["materialId"] = materialId
        }

        firestore.collection("notifications").document(notifId).set(payload).await()
        notifId
    }
}
