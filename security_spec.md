# EduVault — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Isolation (`users/{userId}`)**: A student profile document's ID (`userId`) and internal `uid` field MUST strictly equal `request.auth.uid`. Non-owners cannot read or write another student's profile unless they are a verified admin (`isAdmin()`).
2. **Privilege Escalation Prevention (`admins/{adminId}`)**: Clients can never self-assign admin status. Only the bootstrapped verified administrator (`jnictabhi9632@gmail.com` with `email_verified == true`) or existing admins in `/admins/$(request.auth.uid)` can manage official `/materials` or `/admins`.
3. **Official Study Material Integrity (`materials/{materialId}`)**: Only verified admins (`isAdmin()`) can create, update, or delete documents in `/materials`. Students can only read/list official materials where `resource.data.isOfficial == true`.
4. **Private Study Records (`reading_progress`, `bookmarks`, `annotations`, `quiz_attempts`)**: Every document MUST carry `userId == request.auth.uid` on creation, `userId` is immutable on update, and `read`/`list` queries MUST enforce `resource.data.userId == request.auth.uid` (no blanket `isSignedIn()` reads).
5. **Community Post Integrity (`community_posts/{postId}`)**: `authorUid` MUST match `request.auth.uid` on creation and remain immutable. Temporal integrity requires `createdAt == request.time` on create and `updatedAt == request.time` on update.

## 2. The "Dirty Dozen" Payloads (All Must Return `PERMISSION_DENIED`)
1. **Shadow Field Injection on User Profile**: Creating `/users/{uid}` with an undeclared field `"isAdmin": true`.
2. **Cross-User Profile Read (PII / Progress Leak)**: User `student_A` attempting `get` on `/users/student_B`.
3. **Unverified Admin Email Spoof**: User with `email == "jnictabhi9632@gmail.com"` but `email_verified == false` attempting to upload a PDF to `/materials/mat_1`.
4. **Student Uploading Official PDF Material**: Regular student (`student_A`) attempting `create` on `/materials/mat_1`.
5. **Identity Spoofing on Quiz Attempt**: User `student_A` creating `/quiz_attempts/att_1` with `userId: "student_B"`.
6. **ID Poisoning Attack**: Creating a bookmark at `/bookmarks/invalid$id!with*spaces` that violates `^[a-zA-Z0-9_\-]+$`.
7. **Denial-of-Wallet String Overflow**: Creating a community post with a 10,000-character `content` string (exceeding `maxLength: 2000`).
8. **Client Timestamp Forgery**: Creating a `reading_progress` document with a past or future client-supplied timestamp instead of `request.time`.
9. **Immutable Owner Mutation on Update**: Updating `reading_progress/{id}` and mutating `userId` or `createdAt`.
10. **Unconstrained Partial Update (Update-Gap)**: Updating `community_posts/{postId}` by changing `authorName` or `board` which are not in `affectedKeys().hasOnly(...)`.
11. **Unfiltered List Query on Bookmarks**: Listing `/bookmarks` without constraining `resource.data.userId == request.auth.uid`.
12. **Self-Promotion to Admin Collection**: User `student_A` attempting `create` on `/admins/student_A`.
