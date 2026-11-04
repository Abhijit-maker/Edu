/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are rejected with PERMISSION_DENIED by firestore.rules.
 */

export interface SecurityAssertionCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED' | 'ALLOWED';
  ruleGateVerified: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityAssertionCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on User Profile (isAdmin: true)',
    collection: '/users/{userId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'isValidUser(data) -> data.keys().hasOnly([...])'
  },
  {
    id: 2,
    name: 'Cross-User Profile Read (PII / Progress Leak)',
    collection: '/users/{userId}',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'request.auth.uid == userId || isAdmin()'
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof on Material Upload',
    collection: '/materials/{materialId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'isVerifiedUser() -> request.auth.token.email_verified == true'
  },
  {
    id: 4,
    name: 'Student Uploading Official Study Material',
    collection: '/materials/{materialId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'allow create: if isAdmin() && ...'
  },
  {
    id: 5,
    name: 'Identity Spoofing on Quiz Attempt (userId != request.auth.uid)',
    collection: '/quiz_attempts/{attemptId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'isValidQuizAttempt(data) -> data.userId == request.auth.uid'
  },
  {
    id: 6,
    name: 'ID Poisoning Attack on Document Path',
    collection: '/bookmarks/{bookmarkId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'isValidId(bookmarkId) -> id.matches("^[a-zA-Z0-9_\\\\-]+$")'
  },
  {
    id: 7,
    name: 'Denial-of-Wallet String Overflow on Community Post',
    collection: '/community_posts/{postId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'data.content.size() <= 2000'
  },
  {
    id: 8,
    name: 'Client Timestamp Forgery on Reading Progress',
    collection: '/reading_progress/{progressId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'incoming().createdAt == request.time'
  },
  {
    id: 9,
    name: 'Immutable Owner Mutation on Update',
    collection: '/reading_progress/{progressId}',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'incoming().userId == existing().userId && incoming().createdAt == existing().createdAt'
  },
  {
    id: 10,
    name: 'Unconstrained Partial Update (Update-Gap)',
    collection: '/community_posts/{postId}',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'incoming().diff(existing()).affectedKeys().hasOnly([...])'
  },
  {
    id: 11,
    name: 'Unfiltered List Query on Bookmarks',
    collection: '/bookmarks',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'allow list: if isSignedIn() && (existing().userId == request.auth.uid || isAdmin())'
  },
  {
    id: 12,
    name: 'Self-Promotion to Admin Collection',
    collection: '/admins/{adminId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGateVerified: 'allow create: if isAdmin() && ...'
  }
];
