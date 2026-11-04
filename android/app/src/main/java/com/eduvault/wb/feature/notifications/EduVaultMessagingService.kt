package com.eduvault.wb.feature.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.eduvault.wb.MainActivity
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlin.random.Random

/**
 * Handles real-time push notifications sent by the Admin (New PDF Upload,
 * New Quiz, Important Announcement, and Admin Broadcasts) via Firebase Cloud Messaging.
 */
class EduVaultMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Subscribe every student device to the all_students broadcast topic
        FirebaseMessaging.getInstance().subscribeToTopic("all_students")
        FirebaseMessaging.getInstance().subscribeToTopic("wbchse_updates")
        FirebaseMessaging.getInstance().subscribeToTopic("wbbse_updates")
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        val title = remoteMessage.notification?.title
            ?: remoteMessage.data["title"]
            ?: "EduVault Official Update"
        val body = remoteMessage.notification?.body
            ?: remoteMessage.data["body"]
            ?: "Open EduVault to view the latest study material."

        showSystemNotification(title, body)
    }

    private fun showSystemNotification(title: String, body: String) {
        val channelId = "eduvault_admin_broadcasts"
        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "EduVault Admin & Study Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Instant notifications when Admin uploads a new PDF or broadcasts an announcement."
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(Random.nextInt(1000, 9999), notification)
    }
}
