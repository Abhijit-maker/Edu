# EduVault R8 / ProGuard Rules (Play Protect Safe & Crash-Free)
-keepattributes Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations

# Keep Firebase & Firestore Data Models
-keep class com.eduvault.wb.data.** { *; }
-keep class com.eduvault.wb.feature.** { *; }
-keepnames class com.google.firebase.** { *; }

# Keep Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep Credential Manager & Google ID Token classes for Google Sign-In
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
