export interface StudyMaterialItem {
  id: string;
  title: string;
  titleBn: string;
  board: 'WBCHSE' | 'WBBSE';
  className: string;
  semester: string;
  subject: string;
  chapter: string;
  fileSize: string;
  pageCount: number;
  contentSummary: string;
  pdfDataUrl?: string;
  authorUid: string;
  dateAdded: string;
  isOfficial: boolean;
}

export interface QuizQuestionItem {
  id: string;
  board: 'WBCHSE' | 'WBBSE';
  className: string;
  subject: string;
  chapter: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctKey: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface BroadcastNotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'new_pdf' | 'new_quiz' | 'announcement' | 'admin_update';
  targetBoard: 'ALL' | 'WBCHSE' | 'WBBSE';
  materialId?: string;
  senderUid: string;
  senderName: string;
  createdAtText: string;
}

export interface KotlinSourceFileEntry {
  path: string;
  module: string;
  title: string;
  description: string;
  code: string;
}

export const SUBJECT_CATEGORIES = [
  { id: 'Physics', name: 'Physics', nameBn: 'পদার্থবিদ্যা', tint: '#7564D8', bg: '#F0EEFF' },
  { id: 'Chemistry', name: 'Chemistry', nameBn: 'রসায়ন', tint: '#F59E0B', bg: '#FEF3C7' },
  { id: 'Mathematics', name: 'Mathematics', nameBn: 'গণিত', tint: '#3B82F6', bg: '#DBEAFE' },
  { id: 'Bengali', name: 'Bengali', nameBn: 'বাংলা', tint: '#EA580C', bg: '#FFEDD5' },
  { id: 'English', name: 'English', nameBn: 'ইংরেজি', tint: '#4F46E5', bg: '#E0E7FF' },
  { id: 'Computer', name: 'Computer', nameBn: 'কম্পিউটার', tint: '#0284C7', bg: '#E0F2FE' }
] as const;

export const NATIVE_ANDROID_FILES_SHOWCASE: KotlinSourceFileEntry[] = [
  {
    path: 'android/app/build.gradle.kts',
    module: 'Play Protect V2/V3 Signing & eduvault.apk',
    title: 'app/build.gradle.kts',
    description: 'Configures SDK 35, Kotlin 2.1, V1+V2+V3 APK Signature Scheme (Google Play Protect compliant), and outputs eduvault.apk.',
    code: `signingConfigs {
    create("release") {
        val keystoreFile = file("eduvault-release-key.jks")
        if (keystoreFile.exists()) {
            storeFile = keystoreFile
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "eduvault2026"
            keyAlias = System.getenv("KEY_ALIAS") ?: "eduvault_key"
            keyPassword = System.getenv("KEY_PASSWORD") ?: "eduvault2026"
        }
        enableV1Signing = true
        enableV2Signing = true
        enableV3Signing = true
    }
}
applicationVariants.all {
    outputs.all {
        val outputImpl = this as? com.android.build.gradle.internal.api.BaseVariantOutputImpl
        outputImpl?.outputFileName = "eduvault.apk"
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/eduvault/wb/data/repository/EduVaultCloudRepository.kt',
    module: 'Real-Time PDF & Notification Sync',
    title: 'EduVaultCloudRepository.kt',
    description: 'Uploads Admin PDFs to Firebase Storage + Firestore and immediately broadcasts a push notification to all students.',
    code: `suspend fun uploadOfficialPdfAndNotifyAllUsers(
    pdfUri: Uri?,
    title: String,
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
    firestore.collection("materials").document(materialId).set(materialPayload).await()
    sendAdminBroadcastNotification(
        title = "New PDF Uploaded: \$title",
        body = "\$board \$className (\$subject - \$chapter) is now available in your Digital Library.",
        type = "new_pdf",
        targetBoard = board,
        materialId = materialId
    )
    materialId
}`
  },
  {
    path: 'android/app/src/main/java/com/eduvault/wb/feature/notifications/EduVaultMessagingService.kt',
    module: 'Firebase Cloud Messaging',
    title: 'EduVaultMessagingService.kt',
    description: 'Subscribes all student Android devices to all_students topic and displays high-priority system notifications when Admin sends an alert.',
    code: `class EduVaultMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        FirebaseMessaging.getInstance().subscribeToTopic("all_students")
    }
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val title = remoteMessage.notification?.title ?: remoteMessage.data["title"] ?: "EduVault Update"
        val body = remoteMessage.notification?.body ?: remoteMessage.data["body"] ?: ""
        showSystemNotification(title, body)
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/eduvault/wb/data/repository/FirebaseAuthRepository.kt',
    module: 'Credential Manager Google Sign-In',
    title: 'FirebaseAuthRepository.kt',
    description: 'Modern Android Credential Manager Google Sign-In + Email Auth with real zero-stat Firestore profile initialization.',
    code: `suspend fun signInWithGoogleCredentialManager(
    activityContext: Context,
    webClientId: String = BuildConfig.GOOGLE_WEB_CLIENT_ID
): Result<FirebaseUser> = runCatching {
    val googleIdOption = GetGoogleIdOption.Builder()
        .setFilterByAuthorizedAccounts(false)
        .setServerClientId(webClientId)
        .setAutoSelectEnabled(true)
        .build()
    val request = GetCredentialRequest.Builder().addCredentialOption(googleIdOption).build()
    val result = credentialManager.getCredential(request = request, context = activityContext)
    // Authenticates with FirebaseAuth & initializes /users/{uid} with 0 hardcoded stats
}`
  },
  {
    path: '.github/workflows/build-eduvault-apk.yml',
    module: 'CI/CD Automated APK Builder',
    title: 'build-eduvault-apk.yml',
    description: 'GitHub Actions workflow that compiles and signs eduvault.apk with JDK 17 and V2/V3 signatures.',
    code: `- name: Build Signed Release APK (eduvault.apk)
  working-directory: ./android
  run: |
    gradle assembleRelease --no-daemon
    cp app/build/outputs/apk/release/*.apk ../eduvault.apk`
  }
];
