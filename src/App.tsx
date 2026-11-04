import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Search,
  Bell,
  Home,
  Sparkles,
  Users,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  Download,
  CheckCircle2,
  Clock,
  Trophy,
  Settings,
  LogOut,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Upload,
  FolderKanban,
  BarChart3,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Send,
  Mic,
  Highlighter,
  StickyNote,
  Code2,
  FileText,
  Heart,
  MessageSquare,
  RefreshCw,
  Crown,
  Languages,
  ArrowUpRight,
  Trash2,
  ShieldCheck,
  Smartphone,
  Plus,
  BellRing,
  X
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { soundEngine } from './soundEngine';
import {
  SUBJECT_CATEGORIES,
  NATIVE_ANDROID_FILES_SHOWCASE,
  StudyMaterialItem,
  QuizQuestionItem,
  BroadcastNotificationItem
} from './data/eduvaultData';

// Generated Visual Assets
const WELCOME_ILLUSTRATION = '/src/assets/images/welcome_student_reading_3d_1793805095229.jpg';
const AI_ROBOT_MASCOT = '/src/assets/images/ai_robot_mascot_3d_1793805097780.jpg';
const STUDENT_AVATAR = '/src/assets/images/student_avatar_portrait_1793805102234.jpg';
const PHYSICS_BOOK_COVER = '/src/assets/images/physics_book_cover_1793805098790.jpg';

const BOOTSTRAPPED_ADMIN_EMAIL = 'jnictabhi9632@gmail.com';

type ScreenId =
  | 'welcome'
  | 'home'
  | 'notifications'
  | 'activity'
  | 'library'
  | 'pdf_reader'
  | 'ai_assistant'
  | 'quiz'
  | 'community'
  | 'profile'
  | 'admin';

interface StudentProfileData {
  uid: string;
  displayName: string;
  board: 'WBCHSE' | 'WBBSE';
  className: string;
  semester: string;
  studyPoints: number;
  level: number;
  booksRead: number;
  quizzesCompleted: number;
  studyHours: number;
  language: 'bn' | 'en';
}

interface CommunityPostRecord {
  id: string;
  authorUid: string;
  authorName: string;
  board: 'WBCHSE' | 'WBBSE';
  subject: string;
  title: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAtText: string;
}

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<'companion' | 'showcase' | 'kotlin_code'>('companion');
  const [activeScreen, setActiveScreen] = useState<ScreenId>('welcome');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [language, setLanguage] = useState<'en' | 'bn'>('bn');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.65);

  // Firebase Auth State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [registerBoard, setRegisterBoard] = useState<'WBCHSE' | 'WBBSE'>('WBCHSE');
  const [registerClass, setRegisterClass] = useState<string>('Class 12');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Real Student Profile State (0 hardcoded stats for new users)
  const [profile, setProfile] = useState<StudentProfileData>({
    uid: '',
    displayName: 'Student',
    board: 'WBCHSE',
    className: 'Class 12',
    semester: 'Sem 3',
    studyPoints: 0,
    level: 1,
    booksRead: 0,
    quizzesCompleted: 0,
    studyHours: 0,
    language: 'bn'
  });

  // Real-Time Firestore Collections (Zero Hardcoded Dummy Items)
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizQuestionItem[]>([]);
  const [notifications, setNotifications] = useState<BroadcastNotificationItem[]>([]);
  const [liveToastNotification, setLiveToastNotification] = useState<BroadcastNotificationItem | null>(null);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());

  const [selectedBoard, setSelectedBoard] = useState<'WBCHSE' | 'WBBSE'>('WBCHSE');
  const [selectedClass, setSelectedClass] = useState<string>('Class 12');
  const [selectedSemester, setSelectedSemester] = useState<string>('Sem 3');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [libraryTab, setLibraryTab] = useState<'Subjects' | 'Chapters'>('Subjects');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [readingProgressMap, setReadingProgressMap] = useState<Record<string, number>>({});

  // Active PDF Reader State
  const [activeMaterialId, setActiveMaterialId] = useState<string>('');
  const [pdfPageIndex, setPdfPageIndex] = useState<number>(0);
  const [pdfDarkMode, setPdfDarkMode] = useState<boolean>(false);
  const [pdfHighlights, setPdfHighlights] = useState<Record<string, boolean>>({});
  const [pdfNotes, setPdfNotes] = useState<{ id: string; page: number; text: string }[]>([]);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [showNoteDrawer, setShowNoteDrawer] = useState<boolean>(false);

  // AI PDF Assistant State
  const [aiMessages, setAiMessages] = useState<
    { id: string; role: 'assistant' | 'user'; text: string; pages?: number[] }[]
  >([]);
  const [aiInput, setAiInput] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiLoadingStep, setAiLoadingStep] = useState<string>('Reading your document...');

  // Quiz Engine State
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number>(15 * 60);

  // Community State (Real-time from Firestore)
  const [communityPosts, setCommunityPosts] = useState<CommunityPostRecord[]>([]);
  const [newPostTitle, setNewPostTitle] = useState<string>('');
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostSubject, setNewPostSubject] = useState<string>('Physics');

  // Admin Panel Forms (PDF Upload, Broadcast Notification, Quiz Creation)
  const [adminTab, setAdminTab] = useState<'pdf' | 'notify' | 'quiz'>('pdf');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadTitleBn, setUploadTitleBn] = useState<string>('');
  const [uploadBoard, setUploadBoard] = useState<'WBCHSE' | 'WBBSE'>('WBCHSE');
  const [uploadClass, setUploadClass] = useState<string>('Class 12');
  const [uploadSem, setUploadSem] = useState<string>('Sem 3');
  const [uploadSubject, setUploadSubject] = useState<string>('Physics');
  const [uploadChapter, setUploadChapter] = useState<string>('');
  const [uploadContentSummary, setUploadContentSummary] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadFileSize, setUploadFileSize] = useState<string>('1.2 MB');
  const [uploadPdfDataUrl, setUploadPdfDataUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [adminStatusMsg, setAdminStatusMsg] = useState<string | null>(null);

  // Admin Notification Broadcast Form
  const [notifTitle, setNotifTitle] = useState<string>('');
  const [notifBody, setNotifBody] = useState<string>('');
  const [notifType, setNotifType] = useState<'announcement' | 'new_pdf' | 'new_quiz' | 'admin_update'>('announcement');
  const [notifBoard, setNotifBoard] = useState<'ALL' | 'WBCHSE' | 'WBBSE'>('ALL');

  // Admin Quiz Creation Form
  const [quizQuestionText, setQuizQuestionText] = useState<string>('');
  const [quizSubject, setQuizSubject] = useState<string>('Physics');
  const [quizChapter, setQuizChapter] = useState<string>('');
  const [quizOptA, setQuizOptA] = useState<string>('');
  const [quizOptB, setQuizOptB] = useState<string>('');
  const [quizOptC, setQuizOptC] = useState<string>('');
  const [quizOptD, setQuizOptD] = useState<string>('');
  const [quizCorrectKey, setQuizCorrectKey] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [quizExplanation, setQuizExplanation] = useState<string>('');

  // Native Code Inspector State
  const [selectedKotlinFile, setSelectedKotlinFile] = useState(NATIVE_ANDROID_FILES_SHOWCASE[0]);

  const isAdminUser = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );

  const activeMaterial = useMemo(
    () => materials.find((m) => m.id === activeMaterialId) || materials[0] || null,
    [materials, activeMaterialId]
  );

  // Sync Dark Mode class on <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Quiz countdown timer
  useEffect(() => {
    if (activeScreen !== 'quiz' || quizSubmitted || quizzes.length === 0) return;
    const timer = setInterval(() => {
      setQuizSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeScreen, quizSubmitted, quizzes.length]);

  // 1. Firebase Auth Listener & Real Profile Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (user) {
        setActiveScreen((prev) => (prev === 'welcome' ? 'home' : prev));
        const userPath = `users/${user.uid}`;
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const initialDoc = {
              uid: user.uid,
              displayName: (user.displayName || nameInput || user.email?.split('@')[0] || 'Student').slice(0, 100),
              board: registerBoard,
              className: registerClass,
              semester: 'Sem 3',
              studyPoints: 0,
              level: 1,
              booksRead: 0,
              quizzesCompleted: 0,
              studyHours: 0,
              language: 'bn',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            if (user.emailVerified) {
              await setDoc(userRef, initialDoc);
            }
            setProfile({
              uid: user.uid,
              displayName: initialDoc.displayName,
              board: registerBoard,
              className: registerClass,
              semester: 'Sem 3',
              studyPoints: 0,
              level: 1,
              booksRead: 0,
              quizzesCompleted: 0,
              studyHours: 0,
              language: 'bn'
            });
          } else {
            const data = snap.data();
            setProfile({
              uid: user.uid,
              displayName: data.displayName || user.displayName || 'Student',
              board: data.board === 'WBBSE' ? 'WBBSE' : 'WBCHSE',
              className: data.className || 'Class 12',
              semester: data.semester || 'Sem 3',
              studyPoints: typeof data.studyPoints === 'number' ? data.studyPoints : 0,
              level: typeof data.level === 'number' ? data.level : 1,
              booksRead: typeof data.booksRead === 'number' ? data.booksRead : 0,
              quizzesCompleted: typeof data.quizzesCompleted === 'number' ? data.quizzesCompleted : 0,
              studyHours: typeof data.studyHours === 'number' ? data.studyHours : 0,
              language: data.language === 'en' ? 'en' : 'bn'
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, userPath);
        }
      } else {
        setActiveScreen('welcome');
      }
    });
    return () => unsubscribe();
  }, [nameInput, registerBoard, registerClass]);

  // 2. Real-time Firestore Listener: Official PDF Materials (/materials)
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setMaterials([]);
      return;
    }
    const path = 'materials';
    const q = query(collection(db, path), where('isOfficial', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: StudyMaterialItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || 'Untitled Material',
            titleBn: data.titleBn || data.title || '',
            board: data.board === 'WBBSE' ? 'WBBSE' : 'WBCHSE',
            className: data.className || 'Class 12',
            semester: data.semester || 'Sem 3',
            subject: data.subject || 'Physics',
            chapter: data.chapter || 'Chapter 1',
            fileSize: data.fileSize || '1.2 MB',
            pageCount: typeof data.pageCount === 'number' ? data.pageCount : 1,
            contentSummary: data.contentSummary || '',
            pdfDataUrl: data.pdfDataUrl || '',
            authorUid: data.authorUid || '',
            dateAdded: 'Official Upload',
            isOfficial: true
          };
        });
        setMaterials(list);
        if (list.length > 0 && !activeMaterialId) {
          setActiveMaterialId(list[0].id);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
    return () => unsubscribe();
  }, [authReady, firebaseUser, activeMaterialId]);

  // 3. Real-time Firestore Listener: Admin Broadcast Notifications (/notifications)
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setNotifications([]);
      return;
    }
    const path = 'notifications';
    const q = query(collection(db, path), where('isBroadcast', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: BroadcastNotificationItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || 'EduVault Notice',
            body: data.body || '',
            type: data.type || 'announcement',
            targetBoard: data.targetBoard || 'ALL',
            materialId: data.materialId || '',
            senderUid: data.senderUid || '',
            senderName: data.senderName || 'Admin',
            createdAtText: 'Live Broadcast'
          };
        });
        // Trigger real-time banner + sound if a brand-new notification arrives
        list.forEach((item) => {
          if (!knownNotifIdsRef.current.has(item.id)) {
            if (knownNotifIdsRef.current.size > 0) {
              soundEngine.play('notification');
              setLiveToastNotification(item);
            }
            knownNotifIdsRef.current.add(item.id);
          }
        });
        setNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
    return () => unsubscribe();
  }, [authReady, firebaseUser]);

  // 4. Real-time Firestore Listener: Published Quizzes (/quizzes)
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setQuizzes([]);
      return;
    }
    const path = 'quizzes';
    const q = query(collection(db, path), where('isPublished', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: QuizQuestionItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            board: data.board === 'WBBSE' ? 'WBBSE' : 'WBCHSE',
            className: data.className || 'Class 12',
            subject: data.subject || 'Physics',
            chapter: data.chapter || 'Chapter 1',
            question: data.question || '',
            optionA: data.optionA || '',
            optionB: data.optionB || '',
            optionC: data.optionC || '',
            optionD: data.optionD || '',
            correctKey: data.correctKey || 'B',
            explanation: data.explanation || ''
          };
        });
        setQuizzes(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
    return () => unsubscribe();
  }, [authReady, firebaseUser]);

  // 5. Real-time Firestore Listener: Community Doubts (/community_posts)
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setCommunityPosts([]);
      return;
    }
    const postsPath = 'community_posts';
    const q = query(collection(db, postsPath), where('isPublic', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: CommunityPostRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorUid: data.authorUid,
            authorName: data.authorName,
            board: data.board || 'WBCHSE',
            subject: data.subject || 'Physics',
            title: data.title,
            content: data.content,
            likesCount: data.likesCount ?? 0,
            commentsCount: data.commentsCount ?? 0,
            createdAtText: 'Live Post'
          };
        });
        setCommunityPosts(loaded);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, postsPath)
    );
    return () => unsubscribe();
  }, [authReady, firebaseUser]);

  // 6. Real-time Firestore Listener: Student Bookmarks & Reading Progress
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setBookmarkedIds([]);
      setReadingProgressMap({});
      return;
    }
    const bQuery = query(collection(db, 'bookmarks'), where('userId', '==', firebaseUser.uid));
    const unsubBookmarks = onSnapshot(
      bQuery,
      (snap) => {
        setBookmarkedIds(snap.docs.map((d) => d.data().materialId));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookmarks')
    );

    const pQuery = query(collection(db, 'reading_progress'), where('userId', '==', firebaseUser.uid));
    const unsubProgress = onSnapshot(
      pQuery,
      (snap) => {
        const map: Record<string, number> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          map[data.materialId] = data.progressPercent ?? 100;
        });
        setReadingProgressMap(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reading_progress')
    );

    return () => {
      unsubBookmarks();
      unsubProgress();
    };
  }, [authReady, firebaseUser]);

  const navigateToScreen = (screen: ScreenId) => {
    soundEngine.play('nav');
    setActiveScreen(screen);
  };

  // Real Google Sign-In
  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthLoading(true);
    soundEngine.play('tap');
    try {
      await signInWithPopup(auth, googleProvider);
      soundEngine.play('login_success');
      setActiveScreen('home');
    } catch (err: unknown) {
      soundEngine.play('error');
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Real Email Login / Registration
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) {
      setAuthError('অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড দিন (Please enter email and password).');
      soundEngine.play('error');
      return;
    }
    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthLoading(true);
    try {
      if (isRegisterMode) {
        await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      } else {
        await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      }
      soundEngine.play('login_success');
      setActiveScreen('home');
    } catch (err: unknown) {
      soundEngine.play('error');
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Real Password Reset Email
  const handleForgotPassword = async () => {
    if (!emailInput.trim()) {
      setAuthError('পাসওয়ার্ড রিসেট করতে উপরে আপনার ইমেইল লিখুন (Enter your email first to reset password).');
      soundEngine.play('error');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, emailInput.trim());
      soundEngine.play('notification');
      setAuthSuccessMsg(`পাসওয়ার্ড রিসেট লিংক ${emailInput.trim()}-এ পাঠানো হয়েছে।`);
    } catch (err: unknown) {
      soundEngine.play('error');
      setAuthError(err instanceof Error ? err.message : 'Failed to send reset email.');
    }
  };

  // Open PDF in Reader & sync real Reading Progress + increment booksRead
  const openPdfMaterial = async (materialId: string) => {
    soundEngine.play('pdf_open');
    setActiveMaterialId(materialId);
    setPdfPageIndex(0);
    setActiveScreen('pdf_reader');

    const mat = materials.find((m) => m.id === materialId);
    if (firebaseUser && firebaseUser.emailVerified && mat) {
      const progressId = `${firebaseUser.uid}_${materialId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const isFirstRead = readingProgressMap[materialId] === undefined;
      try {
        await setDoc(doc(db, 'reading_progress', progressId), {
          userId: firebaseUser.uid,
          materialId: mat.id,
          materialTitle: mat.title.slice(0, 160),
          subject: mat.subject.slice(0, 60),
          currentPage: 1,
          totalPages: mat.pageCount,
          progressPercent: 100,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        if (isFirstRead) {
          const nextBooks = profile.booksRead + 1;
          const nextPoints = profile.studyPoints + 25;
          const nextLevel = Math.max(1, Math.floor(nextPoints / 200) + 1);
          setProfile((p) => ({
            ...p,
            booksRead: nextBooks,
            studyPoints: nextPoints,
            level: nextLevel
          }));
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            booksRead: nextBooks,
            studyPoints: nextPoints,
            level: nextLevel,
            updatedAt: serverTimestamp()
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `reading_progress/${progressId}`);
      }
    }
  };

  // Toggle Bookmark with real Firestore create/delete
  const toggleBookmark = async (materialId: string) => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    soundEngine.play('tap');
    const exists = bookmarkedIds.includes(materialId);
    const bookmarkId = `${firebaseUser.uid}_${materialId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const mat = materials.find((m) => m.id === materialId);

    try {
      if (exists) {
        await deleteDoc(doc(db, 'bookmarks', bookmarkId));
      } else if (mat) {
        await setDoc(doc(db, 'bookmarks', bookmarkId), {
          userId: firebaseUser.uid,
          materialId: mat.id,
          materialTitle: mat.title.slice(0, 160),
          subject: mat.subject.slice(0, 60),
          pageNumber: 1,
          note: 'Saved from Library',
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `bookmarks/${bookmarkId}`);
    }
  };

  // Handle PDF File Picker in Admin Panel
  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    setUploadFileSize(`${mb} MB`);
    if (!uploadTitle.trim()) {
      setUploadTitle(file.name.replace(/\.pdf$/i, ''));
    }

    // If file is under 500KB, also encode Data URL for instant preview across all devices
    if (file.size <= 500 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setUploadPdfDataUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setUploadPdfDataUrl('');
    }
  };

  // Admin: Upload Official PDF to Firestore AND Automatically Broadcast Notification to ALL Users
  const handleAdminPdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUser || !firebaseUser) {
      setAdminStatusMsg('শুধুমাত্র ভেরিফায়েড অ্যাডমিন পিডিএফ আপলোড করতে পারবেন।');
      soundEngine.play('error');
      return;
    }
    if (!uploadTitle.trim() || !uploadChapter.trim() || !uploadContentSummary.trim()) {
      setAdminStatusMsg('অনুগ্রহ করে পিডিএফ শিরোনাম, অধ্যায় এবং বিষয়বস্তু/নোটস লিখুন।');
      soundEngine.play('error');
      return;
    }

    soundEngine.play('tap');
    setAdminStatusMsg(null);
    setUploadProgress(25);

    const newMatId = `mat_${Date.now()}`;
    const notifId = `notif_${Date.now()}`;

    try {
      setUploadProgress(65);
      const matPayload: Record<string, unknown> = {
        id: newMatId,
        title: uploadTitle.trim().slice(0, 160),
        titleBn: (uploadTitleBn.trim() || uploadTitle.trim()).slice(0, 200),
        board: uploadBoard,
        className: uploadClass,
        semester: uploadSem,
        subject: uploadSubject,
        chapter: uploadChapter.trim().slice(0, 120),
        fileSize: uploadFileSize || '1.5 MB',
        pageCount: 1,
        contentSummary: uploadContentSummary.trim().slice(0, 8000),
        authorUid: firebaseUser.uid,
        isOfficial: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      if (uploadPdfDataUrl) {
        matPayload.pdfDataUrl = uploadPdfDataUrl;
      }

      await setDoc(doc(db, 'materials', newMatId), matPayload);

      // Automatically Broadcast Notification to ALL Users in /notifications
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        title: `নতুন পিডিএফ আপলোড: ${uploadTitle.trim()}`.slice(0, 140),
        body: `${uploadBoard} ${uploadClass} (${uploadSubject} - ${uploadChapter.trim()}) এখন ডিজিটাল লাইব্রেরিতে উপলব্ধ!`.slice(0, 1000),
        type: 'new_pdf',
        targetBoard: uploadBoard,
        materialId: newMatId,
        senderUid: firebaseUser.uid,
        senderName: (firebaseUser.displayName || 'EduVault Admin').slice(0, 100),
        isBroadcast: true,
        createdAt: serverTimestamp()
      });

      setUploadProgress(100);
      soundEngine.play('download_complete');
      setUploadTitle('');
      setUploadTitleBn('');
      setUploadChapter('');
      setUploadContentSummary('');
      setUploadFileName('');
      setUploadPdfDataUrl('');
      setAdminStatusMsg('পিডিএফ সফলভাবে আপলোড হয়েছে এবং সমস্ত স্টুডেন্টের কাছে নোটিফিকেশন চলে গেছে!');
      setTimeout(() => setUploadProgress(null), 1200);
    } catch (err) {
      setUploadProgress(null);
      handleFirestoreError(err, OperationType.CREATE, `materials/${newMatId}`);
    }
  };

  // Admin: Send Custom Broadcast Notification Anytime to All Users
  const handleSendBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUser || !firebaseUser) {
      setAdminStatusMsg('শুধুমাত্র অ্যাডমিন নোটিফিকেশন পাঠাতে পারবেন।');
      soundEngine.play('error');
      return;
    }
    if (notifTitle.trim().length < 2 || notifBody.trim().length < 2) {
      setAdminStatusMsg('নোটিফিকেশনের শিরোনাম এবং বার্তা লিখুন।');
      soundEngine.play('error');
      return;
    }

    const notifId = `notif_${Date.now()}`;
    try {
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        title: notifTitle.trim().slice(0, 140),
        body: notifBody.trim().slice(0, 1000),
        type: notifType,
        targetBoard: notifBoard,
        senderUid: firebaseUser.uid,
        senderName: (firebaseUser.displayName || 'EduVault Admin').slice(0, 100),
        isBroadcast: true,
        createdAt: serverTimestamp()
      });
      soundEngine.play('notification');
      setNotifTitle('');
      setNotifBody('');
      setAdminStatusMsg('নোটিফিকেশন সফলভাবে সমস্ত ইউজারের কাছে পাঠানো হয়েছে!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`);
    }
  };

  // Admin: Create Official MCQ Quiz & Broadcast Notification
  const handleAdminCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUser || !firebaseUser) return;
    if (!quizQuestionText.trim() || !quizOptA.trim() || !quizOptB.trim() || !quizOptC.trim() || !quizOptD.trim()) {
      setAdminStatusMsg('প্রশ্ন এবং ৪টি অপশন পূরণ করুন।');
      return;
    }

    const quizId = `quiz_${Date.now()}`;
    const notifId = `notif_q_${Date.now()}`;
    try {
      await setDoc(doc(db, 'quizzes', quizId), {
        id: quizId,
        board: uploadBoard,
        className: uploadClass,
        subject: quizSubject,
        chapter: (quizChapter.trim() || 'Chapter 1').slice(0, 120),
        question: quizQuestionText.trim().slice(0, 500),
        optionA: quizOptA.trim().slice(0, 200),
        optionB: quizOptB.trim().slice(0, 200),
        optionC: quizOptC.trim().slice(0, 200),
        optionD: quizOptD.trim().slice(0, 200),
        correctKey: quizCorrectKey,
        explanation: (quizExplanation.trim() || `Correct option is ${quizCorrectKey}`).slice(0, 600),
        authorUid: firebaseUser.uid,
        isPublished: true,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        title: `নতুন কুইজ যুক্ত হয়েছে: ${quizSubject}`,
        body: `${uploadBoard} ${uploadClass} (${quizSubject}) এর নতুন MCQ কুইজে অংশগ্রহণ করো!`,
        type: 'new_quiz',
        targetBoard: uploadBoard,
        senderUid: firebaseUser.uid,
        senderName: (firebaseUser.displayName || 'EduVault Admin').slice(0, 100),
        isBroadcast: true,
        createdAt: serverTimestamp()
      });

      soundEngine.play('quiz_success');
      setQuizQuestionText('');
      setQuizOptA('');
      setQuizOptB('');
      setQuizOptC('');
      setQuizOptD('');
      setQuizExplanation('');
      setAdminStatusMsg('নতুন MCQ কুইজ প্রকাশিত হয়েছে এবং সব স্টুডেন্টকে নোটিফিকেশন পাঠানো হয়েছে!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `quizzes/${quizId}`);
    }
  };

  // Ask Server-side Gemini AI PDF Assistant
  const askGeminiAssistant = async (promptText: string, taskType = 'custom') => {
    if (!promptText.trim() && taskType === 'custom') return;
    soundEngine.play('tap');

    const displayQuestion =
      taskType === 'summary'
        ? 'এই অধ্যায়টির সারসংক্ষেপ দাও (Summarize this chapter)'
        : taskType === 'important_points'
        ? 'বোর্ড পরীক্ষার গুরুত্বপূর্ণ প্রশ্ন ও পয়েন্টস (Important points)'
        : taskType === 'explain_bn'
        ? 'সহজ বাংলায় ব্যাখ্যা করো (Explain in simple Bengali)'
        : taskType === 'mcq'
        ? 'এই অধ্যায় থেকে MCQ তৈরি করো (Generate MCQs)'
        : promptText.trim();

    const userMsgId = `u_${Date.now()}`;
    setAiMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: displayQuestion }]);
    setAiInput('');
    setAiLoading(true);
    setAiLoadingStep('Reading your document...');

    const stepTimer1 = setTimeout(() => setAiLoadingStep('Finding relevant concepts & equations...'), 900);
    const stepTimer2 = setTimeout(() => setAiLoadingStep('Preparing your explanation...'), 1900);

    try {
      const response = await fetch('/api/ai/pdf-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialTitle: activeMaterial ? `${activeMaterial.title} — ${activeMaterial.chapter}` : 'WBCHSE / WBBSE Syllabus',
          subject: activeMaterial?.subject || 'Science & Arts',
          board: activeMaterial?.board || profile.board,
          language: taskType === 'explain_bn' ? 'bn' : language,
          taskType,
          question: displayQuestion,
          documentExcerpt: activeMaterial?.contentSummary || ''
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to query Gemini AI');
      }

      soundEngine.play('notification');
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          text: data.answer,
          pages: data.pageReferences || [1]
        }
      ]);
    } catch (err: unknown) {
      soundEngine.play('error');
      const errText = err instanceof Error ? err.message : 'Unable to reach AI service.';
      setAiMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: `ত্রুটি: ${errText}`
        }
      ]);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAiLoading(false);
    }
  };

  // Submit Quiz & award real Study Points in Firestore
  const handleSubmitQuiz = async () => {
    if (quizzes.length === 0) return;
    let correctCount = 0;
    quizzes.forEach((q) => {
      if (selectedOptions[q.id] === q.correctKey) {
        correctCount += 1;
      }
    });

    setQuizSubmitted(true);
    soundEngine.play('quiz_success');

    const pointsEarned = correctCount * 30;
    const updatedPoints = profile.studyPoints + pointsEarned;
    const updatedQuizzes = profile.quizzesCompleted + 1;
    const updatedLevel = Math.max(1, Math.floor(updatedPoints / 200) + 1);

    setProfile((prev) => ({
      ...prev,
      studyPoints: updatedPoints,
      quizzesCompleted: updatedQuizzes,
      level: updatedLevel
    }));

    if (firebaseUser && firebaseUser.emailVerified) {
      const attemptId = `att_${firebaseUser.uid}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      try {
        await setDoc(doc(db, 'quiz_attempts', attemptId), {
          userId: firebaseUser.uid,
          quizId: quizzes[0].id,
          quizTitle: `${quizzes[0].subject} Quiz`,
          subject: quizzes[0].subject,
          score: correctCount,
          totalQuestions: quizzes.length,
          timeSpentSeconds: Math.max(1, 900 - quizSecondsLeft),
          createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          studyPoints: updatedPoints,
          quizzesCompleted: updatedQuizzes,
          level: updatedLevel,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `quiz_attempts/${attemptId}`);
      }
    }
  };

  // Create Real Community Doubt Post in Firestore
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    if (newPostTitle.trim().length < 3 || newPostContent.trim().length < 5) return;
    soundEngine.play('tap');

    const postId = `post_${Date.now()}`;
    try {
      await setDoc(doc(db, 'community_posts', postId), {
        authorUid: firebaseUser.uid,
        authorName: profile.displayName.slice(0, 100),
        board: profile.board,
        subject: newPostSubject,
        title: newPostTitle.trim().slice(0, 180),
        content: newPostContent.trim().slice(0, 2000),
        likesCount: 0,
        commentsCount: 0,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewPostTitle('');
      setNewPostContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `community_posts/${postId}`);
    }
  };

  // Like a Community Post in Real Time
  const handleLikePost = async (post: CommunityPostRecord) => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    soundEngine.play('tap');
    try {
      await updateDoc(doc(db, 'community_posts', post.id), {
        likesCount: post.likesCount + 1,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `community_posts/${post.id}`);
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesBoard = m.board === selectedBoard;
      const matchesSubject = selectedSubjectFilter === 'All' || m.subject === selectedSubjectFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.titleBn.includes(searchQuery);
      return matchesBoard && matchesSubject && matchesSearch;
    });
  }, [materials, selectedBoard, selectedSubjectFilter, searchQuery]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `00:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // ============================================================================
  // NATIVE ANDROID SCREENS (Premium UI, Zero Hardcoded Dummy Data)
  // ============================================================================

  // Screen 1: Redesigned Premium Login & Registration Screen
  const renderWelcomeScreen = () => (
    <div className="flex flex-col h-full bg-white dark:bg-[#13121A] px-5 pt-4 pb-5 overflow-y-auto">
      {/* Brand Lockup */}
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-[#7564D8] to-[#5E4EC2] flex items-center justify-center shadow-lg shadow-[#7564D8]/30">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-[#24232E] dark:text-white">
          Edu<span className="text-[#7564D8]">Vault</span>
        </h1>
        <p className="text-[11px] font-medium text-[#858593] font-bengali">
          WBCHSE & WBBSE স্টুডেন্টদের ডিজিটাল স্টাডি লাইব্রেরি
        </p>
      </div>

      {/* 3D Educational Illustration Card */}
      <div className="relative my-3 rounded-[22px] overflow-hidden bg-[#F0EEFF] dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] h-36 flex items-center justify-center shadow-inner">
        <img
          src={WELCOME_ILLUSTRATION}
          alt="EduVault 3D Library Illustration"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover animate-float-slow"
        />
      </div>

      {/* Mode Switch Tabs (Login vs Register) */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F0EEFF] dark:bg-[#1D1B27] mb-3">
        <button
          type="button"
          onClick={() => {
            soundEngine.play('tap');
            setIsRegisterMode(false);
            setAuthError(null);
          }}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            !isRegisterMode
              ? 'bg-white dark:bg-[#2B254A] text-[#7564D8] shadow-sm'
              : 'text-[#858593]'
          }`}
        >
          লগইন (Login)
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.play('tap');
            setIsRegisterMode(true);
            setAuthError(null);
          }}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            isRegisterMode
              ? 'bg-white dark:bg-[#2B254A] text-[#7564D8] shadow-sm'
              : 'text-[#858593]'
          }`}
        >
          রেজিস্টার (Sign Up)
        </button>
      </div>

      {authError && (
        <div className="mb-2.5 px-3 py-2 rounded-xl bg-[#E65C65]/12 border border-[#E65C65]/30 text-[11px] font-medium text-[#E65C65]">
          {authError}
        </div>
      )}

      {authSuccessMsg && (
        <div className="mb-2.5 px-3 py-2 rounded-xl bg-[#25A878]/12 border border-[#25A878]/30 text-[11px] font-medium text-[#25A878]">
          {authSuccessMsg}
        </div>
      )}

      {/* Primary Google Sign-In Button (Works seamlessly with Firebase Auth & Credential Manager) */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={authLoading}
        className="w-full py-3 rounded-2xl bg-white dark:bg-[#1D1B27] border-2 border-[#7564D8]/30 hover:border-[#7564D8] text-[#24232E] dark:text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.98]"
      >
        <span className="w-5 h-5 rounded-full bg-[#7564D8] text-white font-extrabold flex items-center justify-center text-[11px]">
          G
        </span>
        <span>Continue with Google (গুগল সাইন-ইন)</span>
      </button>

      <div className="flex items-center gap-3 my-2.5">
        <div className="h-px bg-[#ECEBF2] dark:bg-[#2E2B3D] flex-1" />
        <span className="text-[10px] font-medium text-[#858593]">অথবা ইমেইল দিয়ে</span>
        <div className="h-px bg-[#ECEBF2] dark:bg-[#2E2B3D] flex-1" />
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-2">
        {isRegisterMode && (
          <>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#FAFAFD] dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]">
              <UserIcon className="w-4 h-4 text-[#7564D8] shrink-0" />
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="তোমার পুরো নাম (Full Name)"
                className="w-full bg-transparent text-xs text-[#24232E] dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={registerBoard}
                onChange={(e) => setRegisterBoard(e.target.value as 'WBCHSE' | 'WBBSE')}
                className="px-3 py-2 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] font-bold text-xs focus:outline-none"
              >
                <option value="WBCHSE">WBCHSE (HS)</option>
                <option value="WBBSE">WBBSE (Madhyamik)</option>
              </select>
              <select
                value={registerClass}
                onChange={(e) => setRegisterClass(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] font-bold text-xs focus:outline-none"
              >
                <option value="Class 12">Class 12</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 10">Class 10</option>
                <option value="Class 9">Class 9</option>
              </select>
            </div>
          </>
        )}

        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#FAFAFD] dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]">
          <Mail className="w-4 h-4 text-[#7564D8] shrink-0" />
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="ইমেইল অ্যাড্রেস (Email Address)"
            className="w-full bg-transparent text-xs text-[#24232E] dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#FAFAFD] dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]">
          <Lock className="w-4 h-4 text-[#7564D8] shrink-0" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="পাসওয়ার্ড (Password)"
            className="w-full bg-transparent text-xs text-[#24232E] dark:text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-[#858593] hover:text-[#7564D8]"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {!isRegisterMode && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[11px] font-semibold text-[#7564D8] hover:underline"
            >
              Forgot Password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={authLoading}
          className="w-full py-3 rounded-2xl bg-[#7564D8] hover:bg-[#6453C7] text-white font-bold text-xs shadow-md shadow-[#7564D8]/25 flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
        >
          <span>
            {authLoading
              ? 'অপেক্ষা করুন...'
              : isRegisterMode
              ? 'অ্যাকাউন্ট তৈরি করুন (Sign Up)'
              : 'লগইন করুন (Login)'}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  // Screen 2: Student Home Dashboard (100% Real Backend Data)
  const renderHomeScreen = () => {
    const latestMaterial = materials[0] || null;
    return (
      <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] overflow-y-auto px-4 pt-3 pb-20 space-y-4">
        {/* Greeting + Notification Bell */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={firebaseUser?.photoURL || STUDENT_AVATAR}
              alt="Student Avatar"
              referrerPolicy="no-referrer"
              onClick={() => navigateToScreen('profile')}
              className="w-10 h-10 rounded-full object-cover border-2 border-[#7564D8]/40 cursor-pointer"
            />
            <div>
              <h2 className="text-sm font-bold text-[#24232E] dark:text-white leading-tight font-bengali">
                {language === 'bn'
                  ? `নমস্কার, ${profile.displayName.split(' ')[0]} 👋`
                  : `Hello, ${profile.displayName.split(' ')[0]} 👋`}
              </h2>
              <p className="text-[11px] text-[#858593]">
                {profile.board} · {profile.className} · {isAdminUser ? 'Verified Admin' : 'Student'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdminUser && (
              <button
                type="button"
                onClick={() => navigateToScreen('admin')}
                className="px-2.5 py-1.5 rounded-xl bg-[#7564D8] text-white text-[10px] font-bold flex items-center gap-1"
              >
                <Crown className="w-3 h-3 text-amber-300" />
                <span>Admin</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateToScreen('notifications')}
              className="relative w-9 h-9 rounded-full bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] flex items-center justify-center text-[#24232E] dark:text-white"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#E65C65] text-white text-[9px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Real-time Admin Broadcast Banner (if any notification exists) */}
        {notifications.length > 0 && (
          <div
            onClick={() => navigateToScreen('notifications')}
            className="p-3 rounded-2xl bg-[#F0EEFF] dark:bg-[#2B254A] border border-[#7564D8]/30 flex items-start gap-2.5 cursor-pointer"
          >
            <BellRing className="w-4 h-4 text-[#7564D8] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-[#7564D8] truncate">
                {notifications[0].title}
              </div>
              <p className="text-[11px] text-[#24232E] dark:text-slate-200 line-clamp-2 font-bengali">
                {notifications[0].body}
              </p>
            </div>
          </div>
        )}

        {/* Real Study Points Card */}
        <div
          onClick={() => navigateToScreen('activity')}
          className="p-4 rounded-[22px] bg-gradient-to-br from-[#7564D8] to-[#5E4EC2] text-white shadow-lg shadow-[#7564D8]/20 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/90">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{language === 'bn' ? 'স্টাডি পয়েন্টস (Real XP)' : 'Study Points'}</span>
            </div>
            <span className="text-[11px] font-semibold text-white/90">Level {profile.level}</span>
          </div>

          <div className="flex items-end justify-between mt-1.5">
            <div>
              <div className="text-3xl font-extrabold tabular-nums tracking-tight">
                {profile.studyPoints}
              </div>
              <div className="mt-2.5 w-40 h-2 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((profile.studyPoints % 200) / 200) * 100))}%` }}
                />
              </div>
              <div className="text-[10px] text-white/85 mt-1 tabular-nums">
                {profile.studyPoints} XP Earned from Reading & Quizzes
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-amber-300" />
            </div>
          </div>
        </div>

        {/* 3 Real Stat Tiles: Read, Quiz, Materials Available */}
        <div className="grid grid-cols-3 gap-2.5">
          <div
            onClick={() => navigateToScreen('library')}
            className="p-3 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] flex flex-col items-center text-center cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] flex items-center justify-center text-[#7564D8]">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="mt-1.5 text-sm font-bold text-[#24232E] dark:text-white tabular-nums">
              {profile.booksRead}
            </span>
            <span className="text-[10px] text-[#858593]">{language === 'bn' ? 'পঠিত পিডিএফ' : 'Read'}</span>
          </div>

          <div
            onClick={() => navigateToScreen('quiz')}
            className="p-3 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] flex flex-col items-center text-center cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#25A878]/10 flex items-center justify-center text-[#25A878]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="mt-1.5 text-sm font-bold text-[#24232E] dark:text-white tabular-nums">
              {profile.quizzesCompleted}
            </span>
            <span className="text-[10px] text-[#858593]">{language === 'bn' ? 'কুইজ সম্পন্ন' : 'Quizzes'}</span>
          </div>

          <div
            onClick={() => navigateToScreen('library')}
            className="p-3 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] flex flex-col items-center text-center cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <FileText className="w-4 h-4" />
            </div>
            <span className="mt-1.5 text-sm font-bold text-[#24232E] dark:text-white tabular-nums">
              {materials.length}
            </span>
            <span className="text-[10px] text-[#858593]">{language === 'bn' ? 'মোট পিডিএফ' : 'Cloud PDFs'}</span>
          </div>
        </div>

        {/* Continue Reading OR Real Empty State */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#24232E] dark:text-white font-bengali">
              {language === 'bn' ? 'সর্বশেষ আপলোড করা পিডিএফ' : 'Latest Study Material'}
            </h3>
            <button
              type="button"
              onClick={() => navigateToScreen('library')}
              className="text-[11px] font-medium text-[#7564D8] flex items-center gap-0.5"
            >
              <span>Library</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {latestMaterial ? (
            <div
              onClick={() => openPdfMaterial(latestMaterial.id)}
              className="p-3 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] flex items-center gap-3 cursor-pointer hover:border-[#7564D8]"
            >
              <img
                src={PHYSICS_BOOK_COVER}
                alt="Study Book Cover"
                referrerPolicy="no-referrer"
                className="w-12 h-16 rounded-xl object-cover shrink-0 border border-[#ECEBF2]"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-[#24232E] dark:text-white truncate font-bengali">
                  {language === 'bn' ? latestMaterial.titleBn : latestMaterial.title}
                </h4>
                <p className="text-[11px] text-[#858593] truncate">
                  {latestMaterial.board} · {latestMaterial.subject} · {latestMaterial.chapter}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[#F0EEFF] dark:bg-[#2B254A] overflow-hidden">
                    <div
                      className="h-full bg-[#7564D8] rounded-full"
                      style={{ width: `${readingProgressMap[latestMaterial.id] || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-[#858593] tabular-nums">
                    {readingProgressMap[latestMaterial.id] || 0}%
                  </span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-[#7564D8] text-white flex items-center justify-center shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1D1B27] border border-dashed border-[#7564D8]/40 text-center space-y-2">
              <p className="text-xs font-semibold text-[#24232E] dark:text-white font-bengali">
                এখনো কোনো প্রি-লোডেড পিডিএফ নেই (No Hardcoded PDFs)
              </p>
              <p className="text-[11px] text-[#858593] font-bengali">
                অ্যাডমিন প্যানেল থেকে পিডিএফ আপলোড করলে সাথে সাথে সব স্টুডেন্টের ফোনে চলে আসবে।
              </p>
              {isAdminUser && (
                <button
                  type="button"
                  onClick={() => navigateToScreen('admin')}
                  className="px-3.5 py-2 rounded-xl bg-[#7564D8] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>অ্যাডমিন প্যানেল থেকে প্রথম PDF আপলোড করুন</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Subject Categories with Live PDF Counts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#24232E] dark:text-white font-bengali">
              {language === 'bn' ? 'বিষয়সমূহ (Subjects)' : 'Subject Categories'}
            </h3>
            <button
              type="button"
              onClick={() => navigateToScreen('library')}
              className="text-[11px] font-medium text-[#7564D8] flex items-center gap-0.5"
            >
              <span>See all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {SUBJECT_CATEGORIES.slice(0, 4).map((subj) => {
              const count = materials.filter((m) => m.subject === subj.id).length;
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubjectFilter(subj.id);
                    navigateToScreen('library');
                  }}
                  className="p-2.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] flex flex-col items-center text-center hover:border-[#7564D8]"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: subj.bg, color: subj.tint }}
                  >
                    {subj.name.slice(0, 1)}
                  </div>
                  <span className="mt-1.5 text-[11px] font-semibold text-[#24232E] dark:text-white truncate w-full font-bengali">
                    {language === 'bn' ? subj.nameBn : subj.name === 'Mathematics' ? 'Math' : subj.name}
                  </span>
                  <span className="text-[9px] text-[#858593] tabular-nums">{count} PDF</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Screen: Real-Time Broadcast Notifications Center
  const renderNotificationsScreen = () => (
    <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] overflow-y-auto px-4 pt-3 pb-20 space-y-3.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateToScreen('home')}
          className="flex items-center gap-1.5 text-sm font-bold text-[#24232E] dark:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-bengali">
            {language === 'bn' ? 'নোটিফিকেশন সেন্টার' : 'Notifications'}
          </span>
        </button>
        {isAdminUser && (
          <button
            type="button"
            onClick={() => {
              setAdminTab('notify');
              navigateToScreen('admin');
            }}
            className="text-[11px] font-bold text-[#7564D8]"
          >
            + Send Broadcast
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] text-center space-y-2 mt-6">
          <Bell className="w-8 h-8 text-[#7564D8] mx-auto opacity-60" />
          <h4 className="text-xs font-bold text-[#24232E] dark:text-white font-bengali">
            এখনো কোনো নোটিফিকেশন নেই
          </h4>
          <p className="text-[11px] text-[#858593] font-bengali">
            অ্যাডমিন যখন নতুন পিডিএফ আপলোড করবেন বা নোটিফিকেশন পাঠাবেন, সেটি রিয়েল-টাইমে এখানে দেখা যাবে।
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.materialId) {
                  openPdfMaterial(n.materialId);
                }
              }}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] space-y-1 cursor-pointer hover:border-[#7564D8]"
            >
              <div className="flex items-center justify-between text-[10px] text-[#7564D8] font-bold">
                <span>
                  {n.type === 'new_pdf'
                    ? '📄 NEW PDF UPLOAD'
                    : n.type === 'new_quiz'
                    ? '🏆 NEW QUIZ'
                    : '📢 ADMIN ANNOUNCEMENT'}
                </span>
                <span>{n.targetBoard}</span>
              </div>
              <h4 className="text-xs font-bold text-[#24232E] dark:text-white font-bengali">
                {n.title}
              </h4>
              <p className="text-xs text-[#858593] font-bengali leading-relaxed">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Screen 3: My Activity & Real Stats Summary
  const renderActivityScreen = () => (
    <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] overflow-y-auto px-4 pt-3 pb-20 space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateToScreen('home')}
          className="flex items-center gap-2 text-sm font-bold text-[#24232E] dark:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>My Activity (Real Progress)</span>
        </button>
        <div className="w-8 h-8 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] flex items-center justify-center">
          <BarChart3 className="w-4 h-4" />
        </div>
      </div>

      <div className="p-4 rounded-[22px] bg-gradient-to-br from-[#7564D8] to-[#5E4EC2] text-white shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full border-4 border-white/90 flex items-center justify-center font-bold text-xs tabular-nums shrink-0">
            Lv.{profile.level}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Activity Points</span>
              <span className="text-[10px] font-medium text-white/85">{profile.studyPoints} XP</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${Math.min(100, Math.round(((profile.studyPoints % 200) / 200) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]">
          <span className="text-[11px] font-semibold text-[#858593] block">PDFs Read</span>
          <span className="mt-2 text-lg font-extrabold text-[#7564D8] block tabular-nums">
            {profile.booksRead} / {materials.length || 0}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]">
          <span className="text-[11px] font-semibold text-[#858593] block">Quizzes Completed</span>
          <span className="mt-2 text-lg font-extrabold text-[#25A878] block tabular-nums">
            {profile.quizzesCompleted}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]">
          <span className="text-[11px] font-semibold text-[#858593] block">Saved Bookmarks</span>
          <span className="mt-2 text-lg font-extrabold text-[#7564D8] block tabular-nums">
            {bookmarkedIds.length}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]">
          <span className="text-[11px] font-semibold text-[#858593] block">Community Doubts</span>
          <span className="mt-2 text-lg font-extrabold text-[#7564D8] block tabular-nums">
            {communityPosts.length}
          </span>
        </div>
      </div>
    </div>
  );

  // Screen 4: Digital PDF Library (100% Real Firestore Materials)
  const renderLibraryScreen = () => (
    <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] overflow-y-auto px-4 pt-3 pb-20 space-y-3.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateToScreen('home')}
          className="flex items-center gap-1.5 text-sm font-bold text-[#24232E] dark:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-bengali">
            {language === 'bn' ? 'ডিজিটাল লাইব্রেরি' : 'Digital Library'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedSubjectFilter('All')}
          className="text-[11px] font-semibold text-[#7564D8]"
        >
          All Subjects
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]">
        <Search className="w-4 h-4 text-[#858593] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'bn' ? 'পিডিএফ বা অধ্যায় খুঁজুন...' : 'Search uploaded PDFs...'}
          className="w-full bg-transparent text-xs text-[#24232E] dark:text-white focus:outline-none"
        />
      </div>

      {/* Board / Class / Semester Hierarchy Selectors */}
      <div className="grid grid-cols-3 gap-2">
        <select
          value={selectedBoard}
          onChange={(e) => setSelectedBoard(e.target.value as 'WBCHSE' | 'WBBSE')}
          className="px-2.5 py-2 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] font-semibold text-[11px] focus:outline-none"
        >
          <option value="WBCHSE">WBCHSE</option>
          <option value="WBBSE">WBBSE</option>
        </select>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-2.5 py-2 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] font-semibold text-[11px] focus:outline-none"
        >
          <option value="Class 12">Class 12</option>
          <option value="Class 11">Class 11</option>
          <option value="Class 10">Class 10</option>
          <option value="Class 9">Class 9</option>
        </select>

        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="px-2.5 py-2 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] font-semibold text-[11px] focus:outline-none"
        >
          <option value="Sem 3">Sem 3</option>
          <option value="Sem 2">Sem 2</option>
          <option value="Sem 1">Sem 1</option>
        </select>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-3 gap-2">
        {SUBJECT_CATEGORIES.map((subj) => {
          const active = selectedSubjectFilter === subj.id;
          const count = materials.filter((m) => m.board === selectedBoard && m.subject === subj.id).length;
          return (
            <button
              key={subj.id}
              type="button"
              onClick={() => {
                soundEngine.play('tap');
                setSelectedSubjectFilter(active ? 'All' : subj.id);
              }}
              className={`p-2.5 rounded-2xl bg-white dark:bg-[#1D1B27] border text-center flex flex-col items-center transition-all ${
                active
                  ? 'border-[#7564D8] ring-2 ring-[#7564D8]/20'
                  : 'border-[#ECEBF2] dark:border-[#2E2B3D]'
              }`}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: subj.bg, color: subj.tint }}
              >
                {subj.name.slice(0, 1)}
              </div>
              <span className="mt-1.5 text-[11px] font-bold text-[#24232E] dark:text-white font-bengali">
                {language === 'bn' ? subj.nameBn : subj.name}
              </span>
              <span className="text-[9px] text-[#858593] tabular-nums">({count} PDFs)</span>
            </button>
          );
        })}
      </div>

      {/* Uploaded Materials List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-[#24232E] dark:text-white">
            {selectedSubjectFilter === 'All' ? 'All Uploaded PDFs' : `${selectedSubjectFilter} PDFs`}
          </h3>
          <span className="text-[10px] text-[#858593] tabular-nums">
            {filteredMaterials.length} PDFs
          </span>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] text-center space-y-2">
            <p className="text-xs font-bold text-[#24232E] dark:text-white font-bengali">
              এই বিভাগে এখনো কোনো পিডিএফ আপলোড করা হয়নি
            </p>
            {isAdminUser && (
              <button
                type="button"
                onClick={() => {
                  setAdminTab('pdf');
                  navigateToScreen('admin');
                }}
                className="px-3.5 py-2 rounded-xl bg-[#7564D8] text-white text-xs font-bold"
              >
                + Upload Official PDF Now
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMaterials.map((mat) => {
              const isBookmarked = bookmarkedIds.includes(mat.id);
              return (
                <div
                  key={mat.id}
                  className="p-3 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] flex items-center justify-between gap-2 hover:border-[#7564D8]"
                >
                  <div
                    onClick={() => openPdfMaterial(mat.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#E65C65]/15 text-[#E65C65] font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#24232E] dark:text-white truncate font-bengali">
                        {language === 'bn' ? mat.titleBn : mat.title}
                      </h4>
                      <p className="text-[10px] text-[#858593] truncate">
                        {mat.board} · {mat.subject} · {mat.chapter} · {mat.fileSize}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(mat.id)}
                    className={`p-2 rounded-xl ${
                      isBookmarked ? 'text-[#7564D8] bg-[#F0EEFF]' : 'text-[#858593]'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Screen 5: Native PDF Reader Screen (Reads Real Uploaded PDF Content)
  const renderPdfReaderScreen = () => {
    if (!activeMaterial) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
          <FileText className="w-10 h-10 text-[#7564D8]" />
          <h3 className="text-sm font-bold font-bengali">কোনো পিডিএফ নির্বাচন করা হয়নি</h3>
          <button
            type="button"
            onClick={() => navigateToScreen('library')}
            className="px-4 py-2 rounded-xl bg-[#7564D8] text-white text-xs font-bold"
          >
            ডিজিটাল লাইব্রেরিতে যান
          </button>
        </div>
      );
    }

    const highlightKey = `${activeMaterial.id}_p1`;
    const isHighlighted = !!pdfHighlights[highlightKey];
    const isBookmarked = bookmarkedIds.includes(activeMaterial.id);

    return (
      <div
        className={`flex flex-col h-full transition-colors ${
          pdfDarkMode ? 'bg-[#13121A] text-white' : 'bg-white text-[#24232E]'
        }`}
      >
        <div className="bg-[#181724] text-white px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateToScreen('library')}
            className="flex items-center gap-2 text-xs font-bold truncate"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="truncate font-bengali">{activeMaterial.title}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleBookmark(activeMaterial.id)}
              className={`p-1.5 rounded-lg ${isBookmarked ? 'text-[#A7A0ED]' : 'text-white/75'}`}
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPdfDarkMode(!pdfDarkMode)}
              className="p-1.5 rounded-lg text-white/75 hover:text-white"
            >
              {pdfDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A]">
            <h2 className="text-sm font-extrabold text-[#7564D8] dark:text-[#A7A0ED] font-bengali">
              {activeMaterial.subject} — {activeMaterial.chapter}
            </h2>
            <p className="text-[10px] text-[#858593]">
              {activeMaterial.board} · {activeMaterial.className} · {activeMaterial.semester}
            </p>
          </div>

          {activeMaterial.pdfDataUrl && (
            <iframe
              src={activeMaterial.pdfDataUrl}
              title={activeMaterial.title}
              className="w-full h-56 rounded-xl border border-[#ECEBF2]"
            />
          )}

          <div
            className={`text-xs leading-relaxed whitespace-pre-line font-bengali rounded-xl p-3 border ${
              isHighlighted
                ? 'bg-amber-200/70 dark:bg-amber-500/30 border-amber-400'
                : pdfDarkMode
                ? 'bg-[#1D1B27] border-[#2E2B3D] text-slate-200'
                : 'bg-[#FAFAFD] border-[#ECEBF2] text-[#24232E]'
            }`}
          >
            {activeMaterial.contentSummary}
          </div>

          {showNoteDrawer && (
            <div className="p-3 rounded-2xl bg-[#F0EEFF] dark:bg-[#2B254A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7564D8]">Personal Study Notes</span>
                <button
                  type="button"
                  onClick={() => setShowNoteDrawer(false)}
                  className="text-[10px] text-[#858593]"
                >
                  Close
                </button>
              </div>
              {pdfNotes.map((n) => (
                <div key={n.id} className="text-[11px] bg-white dark:bg-[#1D1B27] p-2 rounded-xl font-bengali">
                  {n.text}
                </div>
              ))}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="এই পাতায় নোট লিখুন..."
                  className="flex-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1D1B27] text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newNoteText.trim()) return;
                    soundEngine.play('tap');
                    setPdfNotes((prev) => [
                      ...prev,
                      { id: `n_${Date.now()}`, page: 1, text: newNoteText.trim() }
                    ]);
                    setNewNoteText('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#7564D8] text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className={`px-4 py-2.5 border-t ${
            pdfDarkMode ? 'bg-[#1D1B27] border-[#2E2B3D]' : 'bg-[#FAFAFD] border-[#ECEBF2]'
          }`}
        >
          <div className="grid grid-cols-4 gap-2 text-center">
            <button
              type="button"
              onClick={() => {
                soundEngine.play('tap');
                setPdfHighlights((prev) => ({ ...prev, [highlightKey]: !prev[highlightKey] }));
              }}
              className={`flex flex-col items-center py-1 rounded-xl text-[10px] font-medium ${
                isHighlighted ? 'text-[#7564D8] font-bold' : 'text-[#858593]'
              }`}
            >
              <Highlighter className="w-4 h-4 mb-0.5" />
              <span>Highlight</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.play('tap');
                setShowNoteDrawer(!showNoteDrawer);
              }}
              className="flex flex-col items-center py-1 rounded-xl text-[10px] font-medium text-[#858593] hover:text-[#7564D8]"
            >
              <StickyNote className="w-4 h-4 mb-0.5" />
              <span>Note</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToScreen('ai_assistant')}
              className="flex flex-col items-center py-1 rounded-xl text-[10px] font-semibold text-[#7564D8]"
            >
              <Sparkles className="w-4 h-4 mb-0.5" />
              <span>AI Ask</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.play('download_complete');
                if (!downloadedIds.includes(activeMaterial.id)) {
                  setDownloadedIds((prev) => [...prev, activeMaterial.id]);
                }
              }}
              className="flex flex-col items-center py-1 rounded-xl text-[10px] font-medium text-[#25A878]"
            >
              <Download className="w-4 h-4 mb-0.5" />
              <span>{downloadedIds.includes(activeMaterial.id) ? 'Saved Offline' : 'Download'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Screen 6: Gemini AI PDF Assistant Screen (Real Gemini 3.8 Flash)
  const renderAiAssistantScreen = () => (
    <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] px-4 pt-3 pb-20">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => navigateToScreen('home')}
          className="flex items-center gap-1.5 text-sm font-bold text-[#24232E] dark:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>AI PDF Assistant</span>
        </button>
        <span className="text-[10px] font-semibold text-[#7564D8] truncate max-w-[140px]">
          {activeMaterial ? activeMaterial.title : `${profile.board} Study AI`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        <div className="flex flex-col items-center text-center pt-1">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#A7A0ED]/40 shadow-md bg-[#F0EEFF]">
            <img
              src={AI_ROBOT_MASCOT}
              alt="EduVault 3D AI Mascot"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover animate-float-slow"
            />
          </div>
          <div className="mt-2 px-4 py-2 rounded-2xl bg-[#F0EEFF] dark:bg-[#2B254A] text-xs font-medium text-[#24232E] dark:text-white font-bengali">
            তোমার আপলোড করা পিডিএফ বা যেকোনো অধ্যায় থেকে প্রশ্ন করো!
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Summarize this chapter', task: 'summary' },
            { label: 'Important points', task: 'important_points' },
            { label: 'Explain in simple Bengali', task: 'explain_bn' },
            { label: 'Generate MCQs', task: 'mcq' }
          ].map((btn) => (
            <button
              key={btn.task}
              type="button"
              disabled={aiLoading}
              onClick={() => askGeminiAssistant(btn.label, btn.task)}
              className="px-3 py-1.5 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] hover:bg-[#7564D8] hover:text-white text-[#24232E] dark:text-white text-[11px] font-semibold transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 pt-1">
          {aiMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-[#7564D8] text-white ml-8'
                  : 'bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] text-[#24232E] dark:text-white mr-4'
              }`}
            >
              <p className="font-bengali">{msg.text}</p>
            </div>
          ))}

          {aiLoading && (
            <div className="p-3 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-[#7564D8] animate-spin shrink-0" />
              <span className="text-xs font-medium text-[#7564D8]">{aiLoadingStep}</span>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          askGeminiAssistant(aiInput, 'custom');
        }}
        className="mt-2 flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]"
      >
        <input
          type="text"
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          placeholder="বাংলা বা ইংরেজিতে যেকোনো প্রশ্ন লেখো..."
          className="flex-1 bg-transparent text-xs text-[#24232E] dark:text-white focus:outline-none font-bengali"
        />
        <button
          type="submit"
          disabled={aiLoading}
          className="w-7 h-7 rounded-full bg-[#7564D8] text-white flex items-center justify-center shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );

  // Screen 7: Real Firestore Quiz Screen
  const renderQuizScreen = () => {
    if (quizzes.length === 0) {
      return (
        <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] px-4 pt-3 pb-20">
          <button
            type="button"
            onClick={() => navigateToScreen('home')}
            className="flex items-center gap-1.5 text-sm font-bold text-[#24232E] dark:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quiz</span>
          </button>
          <div className="my-auto p-6 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] text-center space-y-2">
            <Trophy className="w-9 h-9 text-[#7564D8] mx-auto" />
            <h3 className="text-xs font-bold font-bengali">এখনো কোনো কুইজ যুক্ত করা হয়নি</h3>
            <p className="text-[11px] text-[#858593] font-bengali">
              অ্যাডমিন প্যানেল থেকে নতুন MCQ কুইজ তৈরি করলে স্টুডেন্টরা সাথে সাথে এখানে পরীক্ষা দিতে পারবে।
            </p>
            {isAdminUser && (
              <button
                type="button"
                onClick={() => {
                  setAdminTab('quiz');
                  navigateToScreen('admin');
                }}
                className="px-4 py-2 rounded-xl bg-[#7564D8] text-white text-xs font-bold"
              >
                + নতুন কুইজ তৈরি করুন
              </button>
            )}
          </div>
        </div>
      );
    }

    const currentQ = quizzes[quizIndex] || quizzes[0];
    const chosenKey = selectedOptions[currentQ.id];
    const progressPct = ((quizIndex + 1) / quizzes.length) * 100;
    const optionsList: { key: 'A' | 'B' | 'C' | 'D'; text: string }[] = [
      { key: 'A', text: currentQ.optionA },
      { key: 'B', text: currentQ.optionB },
      { key: 'C', text: currentQ.optionC },
      { key: 'D', text: currentQ.optionD }
    ];

    return (
      <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] px-4 pt-3 pb-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateToScreen('home')}
            className="flex items-center gap-1.5 text-sm font-bold text-[#24232E] dark:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quiz</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(quizSecondsLeft)}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-[#24232E] dark:text-white">
            <span>
              Q. {quizIndex + 1} / {quizzes.length}
            </span>
            <span className="text-[#7564D8]">{currentQ.subject}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-[#F0EEFF] dark:bg-[#2B254A] overflow-hidden">
            <div
              className="h-full bg-[#7564D8] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <h3 className="mt-5 text-base font-extrabold text-[#24232E] dark:text-white leading-snug font-bengali">
          {currentQ.question}
        </h3>

        <div className="mt-4 space-y-2.5">
          {optionsList.map((opt) => {
            const isSelected = chosenKey === opt.key;
            const isCorrect = quizSubmitted && opt.key === currentQ.correctKey;
            const isWrong = quizSubmitted && isSelected && opt.key !== currentQ.correctKey;

            return (
              <button
                key={opt.key}
                type="button"
                disabled={quizSubmitted}
                onClick={() => {
                  soundEngine.play('quiz_select');
                  setSelectedOptions((prev) => ({ ...prev, [currentQ.id]: opt.key }));
                }}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                  isCorrect
                    ? 'bg-[#25A878]/15 border-[#25A878] text-[#25A878]'
                    : isWrong
                    ? 'bg-[#E65C65]/15 border-[#E65C65] text-[#E65C65]'
                    : isSelected
                    ? 'bg-[#F0EEFF] dark:bg-[#2B254A] border-[#7564D8] text-[#7564D8]'
                    : 'bg-white dark:bg-[#1D1B27] border-[#ECEBF2] dark:border-[#2E2B3D] text-[#24232E] dark:text-white'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isSelected
                      ? 'bg-[#7564D8] text-white'
                      : 'border border-[#858593]/50 text-[#24232E] dark:text-white'
                  }`}
                >
                  {isSelected ? '✓' : opt.key}
                </div>
                <span className="text-xs font-bold font-bengali">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {quizSubmitted && (
          <div className="mt-4 p-3.5 rounded-2xl bg-[#25A878]/10 border border-[#25A878]/30 text-xs">
            <div className="font-bold text-[#25A878] mb-1">
              সঠিক উত্তর: Option {currentQ.correctKey}
            </div>
            <p className="text-[#24232E] dark:text-slate-200 font-bengali">{currentQ.explanation}</p>
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={quizIndex === 0}
            onClick={() => {
              soundEngine.play('tap');
              setQuizIndex((i) => Math.max(0, i - 1));
            }}
            className="flex-1 py-3 rounded-2xl border-2 border-[#7564D8] text-[#7564D8] font-bold text-xs disabled:opacity-40"
          >
            Previous
          </button>

          {quizIndex < quizzes.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.play('tap');
                setQuizIndex((i) => i + 1);
              }}
              className="flex-1 py-3 rounded-2xl bg-[#7564D8] text-white font-bold text-xs flex items-center justify-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : !quizSubmitted ? (
            <button
              type="button"
              onClick={handleSubmitQuiz}
              className="flex-1 py-3 rounded-2xl bg-[#25A878] text-white font-bold text-xs"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuizSubmitted(false);
                setQuizIndex(0);
              }}
              className="flex-1 py-3 rounded-2xl bg-[#7564D8] text-white font-bold text-xs"
            >
              Retake Quiz
            </button>
          )}
        </div>
      </div>
    );
  };

  // Screen: Real-Time Student Community & Doubts
  const renderCommunityScreen = () => (
    <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] px-4 pt-3 pb-20 overflow-y-auto space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#24232E] dark:text-white font-bengali">
          স্টুডেন্ট কমিউনিটি ও প্রশ্নোত্তর
        </h2>
        <span className="text-[11px] text-[#7564D8] font-semibold">Live Firestore</span>
      </div>

      <form
        onSubmit={handleCreatePost}
        className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] space-y-2"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            placeholder="তোমার প্রশ্নের শিরোনাম (কমপক্ষে ৩ অক্ষর)..."
            className="flex-1 text-xs font-semibold bg-transparent text-[#24232E] dark:text-white focus:outline-none font-bengali"
          />
          <select
            value={newPostSubject}
            onChange={(e) => setNewPostSubject(e.target.value)}
            className="px-2 py-1 rounded-lg bg-[#F0EEFF] text-[#7564D8] text-[10px] font-bold"
          >
            {SUBJECT_CATEGORIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <textarea
          rows={2}
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="তোমার ডাউট বা প্রশ্ন বিস্তারিত লেখো..."
          className="w-full text-xs bg-transparent text-[#858593] focus:outline-none resize-none font-bengali"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-[#7564D8] text-white text-[11px] font-semibold"
          >
            পোস্ট করুন (Post Doubt)
          </button>
        </div>
      </form>

      {communityPosts.length === 0 ? (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] text-center">
          <p className="text-xs text-[#858593] font-bengali">
            এখনো কোনো প্রশ্ন পোস্ট করা হয়নি। প্রথম প্রশ্নটি তুমিই করো!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {communityPosts.map((post) => (
            <div
              key={post.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] space-y-2"
            >
              <div className="flex items-center justify-between text-[10px] text-[#858593]">
                <span className="font-semibold text-[#24232E] dark:text-white">
                  {post.authorName} · {post.board} · {post.subject}
                </span>
                <span>{post.createdAtText}</span>
              </div>
              <h4 className="text-xs font-bold text-[#24232E] dark:text-white font-bengali">
                {post.title}
              </h4>
              <p className="text-xs text-[#858593] font-bengali leading-relaxed">{post.content}</p>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-[#858593]">
                <button
                  type="button"
                  onClick={() => handleLikePost(post)}
                  className="flex items-center gap-1 hover:text-[#7564D8]"
                >
                  <Heart className="w-3.5 h-3.5 text-[#E65C65]" />
                  <span className="tabular-nums font-bold">{post.likesCount}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Screen 8: My Profile & Settings Screen
  const renderProfileScreen = () => (
    <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] px-4 pt-3 pb-20 overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateToScreen('home')}
          className="flex items-center gap-1.5 text-sm font-bold text-[#24232E] dark:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>My Profile</span>
        </button>
        {isAdminUser && (
          <button
            type="button"
            onClick={() => navigateToScreen('admin')}
            className="px-2.5 py-1 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] text-xs font-bold"
          >
            Admin Panel
          </button>
        )}
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#7564D8] to-[#A7A0ED]">
          <img
            src={firebaseUser?.photoURL || STUDENT_AVATAR}
            alt="Student Profile"
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover border-2 border-white"
          />
        </div>
        <h3 className="mt-2 text-base font-extrabold text-[#24232E] dark:text-white">
          {profile.displayName}
        </h3>
        <p className="text-xs text-[#858593]">
          {firebaseUser?.email} · {profile.board} {profile.className}
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] grid grid-cols-3 divide-x divide-[#ECEBF2] dark:divide-[#2E2B3D] text-center">
        <div>
          <span className="text-sm font-extrabold text-[#24232E] dark:text-white block tabular-nums">
            {profile.studyPoints}
          </span>
          <span className="text-[10px] text-[#858593]">Points</span>
        </div>
        <div>
          <span className="text-sm font-extrabold text-[#24232E] dark:text-white block tabular-nums">
            {profile.booksRead}
          </span>
          <span className="text-[10px] text-[#858593]">Read</span>
        </div>
        <div>
          <span className="text-sm font-extrabold text-[#24232E] dark:text-white block tabular-nums">
            {profile.quizzesCompleted}
          </span>
          <span className="text-[10px] text-[#858593]">Quiz</span>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] divide-y divide-[#ECEBF2] dark:divide-[#2E2B3D]">
        <button
          type="button"
          onClick={() => navigateToScreen('notifications')}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#24232E] dark:text-white"
        >
          <span className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#7564D8]" />
            <span>Notifications ({notifications.length})</span>
          </span>
          <ChevronRight className="w-4 h-4 text-[#858593]" />
        </button>

        <button
          type="button"
          onClick={() => navigateToScreen('library')}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#24232E] dark:text-white"
        >
          <span className="flex items-center gap-2.5">
            <Bookmark className="w-4 h-4 text-[#7564D8]" />
            <span>My Bookmarks ({bookmarkedIds.length})</span>
          </span>
          <ChevronRight className="w-4 h-4 text-[#858593]" />
        </button>

        <button
          type="button"
          onClick={() => {
            const nextSound = !soundEnabled;
            setSoundEnabled(nextSound);
            soundEngine.enabled = nextSound;
            if (nextSound) soundEngine.play('tap');
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#24232E] dark:text-white"
        >
          <span className="flex items-center gap-2.5">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#7564D8]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#858593]" />
            )}
            <span>Sound Effects & Haptics</span>
          </span>
          <span className="text-[11px] font-bold text-[#7564D8]">
            {soundEnabled ? 'Enabled' : 'Muted'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.play('tap');
            setLanguage((l) => (l === 'bn' ? 'en' : 'bn'));
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#24232E] dark:text-white"
        >
          <span className="flex items-center gap-2.5">
            <Languages className="w-4 h-4 text-[#7564D8]" />
            <span>Language</span>
          </span>
          <span className="text-xs font-bold text-[#7564D8] font-bengali">
            {language === 'bn' ? 'বাংলা ▾' : 'English ▾'}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={async () => {
          soundEngine.play('tap');
          await signOut(auth);
          setActiveScreen('welcome');
        }}
        className="w-full py-3 rounded-2xl bg-[#E65C65]/12 hover:bg-[#E65C65]/20 text-[#E65C65] font-bold text-xs flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </div>
  );

  // Screen 9: Admin Panel (Upload PDF to All Users, Broadcast Notifications Anytime, Create Quiz)
  const renderAdminScreen = () => (
    <div className="flex flex-col h-full bg-[#FAFAFD] dark:bg-[#13121A] px-4 pt-3 pb-20 overflow-y-auto space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-[#24232E] dark:text-white">Admin Panel</h2>
        <span className="px-3 py-1 rounded-full bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] text-[11px] font-bold flex items-center gap-1">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>{isAdminUser ? 'Verified Admin' : 'Read-Only'}</span>
        </span>
      </div>

      {/* Live Cloud Totals Banner */}
      <div className="p-4 rounded-[22px] bg-gradient-to-r from-[#A7A0ED] via-[#7564D8] to-[#6352C7] text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xs text-white/90 font-medium">Total Live PDFs</span>
            <div className="text-2xl font-extrabold tabular-nums">{materials.length}</div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-white/90 block">Broadcasts Sent</span>
          <span className="text-xl font-extrabold tabular-nums">{notifications.length}</span>
        </div>
      </div>

      {/* 3 Admin Mode Tabs: Upload PDF | Send Notification | Create Quiz */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F0EEFF] dark:bg-[#1D1B27]">
        <button
          type="button"
          onClick={() => {
            soundEngine.play('tap');
            setAdminTab('pdf');
            setAdminStatusMsg(null);
          }}
          className={`py-2 rounded-xl text-[11px] font-bold transition-all ${
            adminTab === 'pdf' ? 'bg-[#7564D8] text-white shadow-sm' : 'text-[#858593]'
          }`}
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.play('tap');
            setAdminTab('notify');
            setAdminStatusMsg(null);
          }}
          className={`py-2 rounded-xl text-[11px] font-bold transition-all ${
            adminTab === 'notify' ? 'bg-[#7564D8] text-white shadow-sm' : 'text-[#858593]'
          }`}
        >
          Send Notice
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.play('tap');
            setAdminTab('quiz');
            setAdminStatusMsg(null);
          }}
          className={`py-2 rounded-xl text-[11px] font-bold transition-all ${
            adminTab === 'quiz' ? 'bg-[#7564D8] text-white shadow-sm' : 'text-[#858593]'
          }`}
        >
          Create Quiz
        </button>
      </div>

      {adminStatusMsg && (
        <div className="p-3 rounded-xl bg-[#25A878]/15 border border-[#25A878]/30 text-xs font-bold text-[#25A878] font-bengali">
          {adminStatusMsg}
        </div>
      )}

      {/* Tab 1: Upload Official PDF (Syncs to All Users + Sends Push Notification) */}
      {adminTab === 'pdf' && (
        <form
          onSubmit={handleAdminPdfUpload}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] space-y-2.5"
        >
          <div className="text-xs font-bold text-[#24232E] dark:text-white font-bengali">
            নতুন পিডিএফ আপলোড করুন (সকল স্টুডেন্টের কাছে চলে যাবে)
          </div>

          <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#7564D8]/40 bg-[#F0EEFF]/40 cursor-pointer text-xs font-semibold text-[#7564D8]">
            <Upload className="w-4 h-4" />
            <span className="truncate">
              {uploadFileName ? `${uploadFileName} (${uploadFileSize})` : 'Select PDF File (.pdf)'}
            </span>
            <input type="file" accept="application/pdf" onChange={handlePdfFileSelect} className="hidden" />
          </label>

          <input
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="PDF Title (e.g., Physics Chapter 1 Notes)"
            className="w-full px-3 py-2 rounded-xl bg-[#FAFAFD] dark:bg-[#13121A] border border-[#ECEBF2] dark:border-[#2E2B3D] text-xs focus:outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={uploadBoard}
              onChange={(e) => setUploadBoard(e.target.value as 'WBCHSE' | 'WBBSE')}
              className="px-2.5 py-2 rounded-xl bg-[#F0EEFF] text-[#7564D8] font-bold text-xs"
            >
              <option value="WBCHSE">WBCHSE</option>
              <option value="WBBSE">WBBSE</option>
            </select>
            <select
              value={uploadSubject}
              onChange={(e) => setUploadSubject(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-[#F0EEFF] text-[#7564D8] font-bold text-xs"
            >
              {SUBJECT_CATEGORIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={uploadChapter}
            onChange={(e) => setUploadChapter(e.target.value)}
            placeholder="অধ্যায়ের নাম (e.g., অধ্যায় ১: একমাত্রিক গতি)"
            className="w-full px-3 py-2 rounded-xl bg-[#FAFAFD] dark:bg-[#13121A] border border-[#ECEBF2] dark:border-[#2E2B3D] text-xs focus:outline-none font-bengali"
          />

          <textarea
            rows={3}
            value={uploadContentSummary}
            onChange={(e) => setUploadContentSummary(e.target.value)}
            placeholder="পিডিএফ-এর মূল নোটস, সূত্র বা বিষয়বস্তু এখানে পেস্ট করুন (যাতে স্টুডেন্টরা পড়তে পারে এবং Gemini AI উত্তর দিতে পারে)..."
            className="w-full px-3 py-2 rounded-xl bg-[#FAFAFD] dark:bg-[#13121A] border border-[#ECEBF2] dark:border-[#2E2B3D] text-xs focus:outline-none font-bengali resize-none"
          />

          {uploadProgress !== null && (
            <div className="h-1.5 rounded-full bg-[#F0EEFF] overflow-hidden">
              <div
                className="h-full bg-[#7564D8] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#7564D8] text-white font-bold text-xs"
          >
            Publish PDF & Notify All Students
          </button>
        </form>
      )}

      {/* Tab 2: Admin Broadcast Notification Sender */}
      {adminTab === 'notify' && (
        <form
          onSubmit={handleSendBroadcastNotification}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] space-y-2.5"
        >
          <div className="text-xs font-bold text-[#24232E] dark:text-white font-bengali">
            সমস্ত ইউজারের কাছে নোটিফিকেশন পাঠান (Instant Broadcast)
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={notifType}
              onChange={(e) => setNotifType(e.target.value as 'announcement' | 'new_pdf' | 'new_quiz' | 'admin_update')}
              className="px-2.5 py-2 rounded-xl bg-[#F0EEFF] text-[#7564D8] font-bold text-xs"
            >
              <option value="announcement">Announcement</option>
              <option value="new_pdf">New PDF Alert</option>
              <option value="new_quiz">Quiz Alert</option>
              <option value="admin_update">Important Update</option>
            </select>
            <select
              value={notifBoard}
              onChange={(e) => setNotifBoard(e.target.value as 'ALL' | 'WBCHSE' | 'WBBSE')}
              className="px-2.5 py-2 rounded-xl bg-[#F0EEFF] text-[#7564D8] font-bold text-xs"
            >
              <option value="ALL">All Students</option>
              <option value="WBCHSE">WBCHSE Only</option>
              <option value="WBBSE">WBBSE Only</option>
            </select>
          </div>

          <input
            type="text"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            placeholder="নোটিফিকেশন শিরোনাম (Title)..."
            className="w-full px-3 py-2 rounded-xl bg-[#FAFAFD] dark:bg-[#13121A] border border-[#ECEBF2] dark:border-[#2E2B3D] text-xs focus:outline-none font-bengali"
          />

          <textarea
            rows={3}
            value={notifBody}
            onChange={(e) => setNotifBody(e.target.value)}
            placeholder="নোটিফিকেশনের বিস্তারিত বার্তা লেখো..."
            className="w-full px-3 py-2 rounded-xl bg-[#FAFAFD] dark:bg-[#13121A] border border-[#ECEBF2] dark:border-[#2E2B3D] text-xs focus:outline-none font-bengali resize-none"
          />

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#7564D8] text-white font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <BellRing className="w-4 h-4" />
            <span>Send Notification to All Users Now</span>
          </button>
        </form>
      )}

      {/* Tab 3: Admin Create Quiz Question */}
      {adminTab === 'quiz' && (
        <form
          onSubmit={handleAdminCreateQuiz}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] space-y-2"
        >
          <div className="text-xs font-bold text-[#24232E] dark:text-white font-bengali">
            নতুন MCQ প্রশ্ন যুক্ত করুন
          </div>
          <input
            type="text"
            value={quizQuestionText}
            onChange={(e) => setQuizQuestionText(e.target.value)}
            placeholder="প্রশ্নটি লিখুন (e.g., বলের SI একক কোনটি?)"
            className="w-full px-3 py-2 rounded-xl bg-[#FAFAFD] dark:bg-[#13121A] border border-[#ECEBF2] text-xs font-bengali"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="text"
              value={quizOptA}
              onChange={(e) => setQuizOptA(e.target.value)}
              placeholder="Option A"
              className="px-2.5 py-1.5 rounded-xl bg-[#FAFAFD] border border-[#ECEBF2] text-xs"
            />
            <input
              type="text"
              value={quizOptB}
              onChange={(e) => setQuizOptB(e.target.value)}
              placeholder="Option B"
              className="px-2.5 py-1.5 rounded-xl bg-[#FAFAFD] border border-[#ECEBF2] text-xs"
            />
            <input
              type="text"
              value={quizOptC}
              onChange={(e) => setQuizOptC(e.target.value)}
              placeholder="Option C"
              className="px-2.5 py-1.5 rounded-xl bg-[#FAFAFD] border border-[#ECEBF2] text-xs"
            />
            <input
              type="text"
              value={quizOptD}
              onChange={(e) => setQuizOptD(e.target.value)}
              placeholder="Option D"
              className="px-2.5 py-1.5 rounded-xl bg-[#FAFAFD] border border-[#ECEBF2] text-xs"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Correct Answer:</span>
            <select
              value={quizCorrectKey}
              onChange={(e) => setQuizCorrectKey(e.target.value as 'A' | 'B' | 'C' | 'D')}
              className="px-3 py-1.5 rounded-xl bg-[#F0EEFF] text-[#7564D8] font-bold text-xs"
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#25A878] text-white font-bold text-xs"
          >
            Publish MCQ & Notify Students
          </button>
        </form>
      )}
    </div>
  );

  // Student Bottom Navigation Bar
  const renderBottomNav = () => {
    if (activeScreen === 'welcome' || activeScreen === 'pdf_reader' || activeScreen === 'quiz') {
      return null;
    }

    const navItems: { id: ScreenId; label: string; labelBn: string; icon: React.FC<{ className?: string }> }[] = [
      { id: 'home', label: 'Home', labelBn: 'হোম', icon: Home },
      { id: 'library', label: 'Library', labelBn: 'লাইব্রেরি', icon: BookOpen },
      { id: 'ai_assistant', label: 'AI', labelBn: 'এআই', icon: Sparkles },
      { id: 'community', label: 'Community', labelBn: 'কমিউনিটি', icon: Users },
      { id: 'profile', label: 'Profile', labelBn: 'প্রোফাইল', icon: UserIcon }
    ];

    return (
      <div className="absolute bottom-0 left-0 right-0 h-14 bg-white/95 dark:bg-[#1D1B27]/95 backdrop-blur-md border-t border-[#ECEBF2] dark:border-[#2E2B3D] grid grid-cols-5 items-center px-2 z-20">
        {navItems.map((item) => {
          const active = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateToScreen(item.id)}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                active ? 'text-[#7564D8] font-bold' : 'text-[#858593] hover:text-[#24232E]'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 font-bengali">
                {language === 'bn' ? item.labelBn : item.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2EFFC] dark:bg-[#0D0C14] text-[#24232E] dark:text-white flex flex-col">
      {/* Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#13121A]/90 backdrop-blur-md border-b border-[#ECEBF2] dark:border-[#2E2B3D] px-6 py-3.5 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setWorkspaceMode('companion');
          }}
          className="text-lg font-extrabold tracking-tight text-[#24232E] dark:text-white whitespace-nowrap shrink-0"
        >
          Edu<span className="text-[#7564D8]">Vault</span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#858593]">
          <button
            type="button"
            onClick={() => {
              soundEngine.play('tap');
              setWorkspaceMode('companion');
            }}
            className={`hover:text-[#7564D8] transition-colors whitespace-nowrap shrink-0 ${
              workspaceMode === 'companion' ? 'text-[#7564D8] font-semibold' : ''
            }`}
          >
            Android Simulator
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.play('tap');
              setWorkspaceMode('showcase');
            }}
            className={`hover:text-[#7564D8] transition-colors whitespace-nowrap shrink-0 ${
              workspaceMode === 'showcase' ? 'text-[#7564D8] font-semibold' : ''
            }`}
          >
            9-Screen Gallery
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.play('tap');
              setWorkspaceMode('kotlin_code');
            }}
            className={`hover:text-[#7564D8] transition-colors whitespace-nowrap shrink-0 ${
              workspaceMode === 'kotlin_code' ? 'text-[#7564D8] font-semibold' : ''
            }`}
          >
            Kotlin APK Source
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.play('tap');
              setWorkspaceMode('companion');
              navigateToScreen('admin');
            }}
            className="hover:text-[#7564D8] transition-colors whitespace-nowrap shrink-0"
          >
            Admin & Push Notice
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/api/android/download-project"
            className="px-4 py-2 text-xs font-bold text-white bg-[#7564D8] rounded-xl hover:bg-[#6251C6] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Android Studio Project (.zip)</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {workspaceMode === 'companion' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Native Android Device Frame */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[385px] h-[760px] rounded-[42px] bg-[#1E1C2A] p-3 shadow-2xl border-4 border-[#353247] relative flex flex-col">
                <div className="h-7 px-5 flex items-center justify-between text-[11px] font-bold text-[#24232E] dark:text-white bg-white dark:bg-[#13121A] rounded-t-[32px]">
                  <span>9:41</span>
                  <div className="w-16 h-3.5 rounded-full bg-black/10 dark:bg-white/10" />
                  <span>5G · 100%</span>
                </div>

                {/* Live Admin Broadcast Push Notification Banner Inside Phone */}
                {liveToastNotification && (
                  <div className="absolute top-11 left-5 right-5 z-50 p-3 rounded-2xl bg-[#24232E] text-white shadow-xl border border-[#7564D8] flex items-start justify-between gap-2">
                    <div
                      onClick={() => {
                        setLiveToastNotification(null);
                        navigateToScreen('notifications');
                      }}
                      className="cursor-pointer flex-1 min-w-0"
                    >
                      <div className="text-[10px] font-bold text-[#A7A0ED]">
                        🔔 LIVE PUSH NOTIFICATION
                      </div>
                      <div className="text-xs font-bold truncate font-bengali">
                        {liveToastNotification.title}
                      </div>
                      <div className="text-[11px] text-white/80 line-clamp-2 font-bengali">
                        {liveToastNotification.body}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLiveToastNotification(null)}
                      className="text-white/70 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex-1 relative overflow-hidden rounded-b-[32px] bg-white dark:bg-[#13121A]">
                  {activeScreen === 'welcome' && renderWelcomeScreen()}
                  {activeScreen === 'home' && renderHomeScreen()}
                  {activeScreen === 'notifications' && renderNotificationsScreen()}
                  {activeScreen === 'activity' && renderActivityScreen()}
                  {activeScreen === 'library' && renderLibraryScreen()}
                  {activeScreen === 'pdf_reader' && renderPdfReaderScreen()}
                  {activeScreen === 'ai_assistant' && renderAiAssistantScreen()}
                  {activeScreen === 'quiz' && renderQuizScreen()}
                  {activeScreen === 'community' && renderCommunityScreen()}
                  {activeScreen === 'profile' && renderProfileScreen()}
                  {activeScreen === 'admin' && renderAdminScreen()}
                  {renderBottomNav()}
                </div>
              </div>
            </div>

            {/* Right Column: Native APK Download & Real-Time Admin Control Center */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-[#7564D8]">
                      Native Kotlin + Jetpack Compose (`com.eduvault.wb`)
                    </p>
                    <h2 className="text-2xl font-extrabold text-[#24232E] dark:text-white mt-0.5 font-bengali">
                      EduVault Native Android Studio & Live Cloud Console
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.play('tap');
                        setLanguage((l) => (l === 'bn' ? 'en' : 'bn'));
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] text-xs font-bold font-bengali"
                    >
                      {language === 'bn' ? 'ভাষা: বাংলা' : 'Language: English'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.play('tap');
                        setDarkMode(!darkMode);
                      }}
                      className="p-2 rounded-xl bg-[#FAFAFD] dark:bg-[#262335] border border-[#ECEBF2] dark:border-[#2E2B3D] text-[#24232E] dark:text-white"
                    >
                      {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#858593] leading-relaxed font-bengali">
                  সমস্ত প্রি-লোডেড/হার্ডকোডেড ডামি পিডিএফ সরিয়ে দেওয়া হয়েছে। এখন অ্যাপটি ১০০% রিয়েল-টাইম Firestore ডাটাবেসের সাথে যুক্ত। অ্যাডমিন লগইন করে পিডিএফ আপলোড করলে বা নোটিফিকেশন পাঠালে মুহূর্তের মধ্যে সব স্টুডেন্টের কাছে পৌঁছে যাবে।
                </p>

                {/* Screen Switcher */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {(
                    [
                      { id: 'welcome', title: '1. Login / Sign Up', sub: 'Google & Email Auth' },
                      { id: 'home', title: '2. Home Dashboard', sub: 'Real XP & Live Notice' },
                      { id: 'notifications', title: '3. Notifications', sub: `${notifications.length} Broadcasts` },
                      { id: 'library', title: '4. Digital Library', sub: `${materials.length} Real PDFs` },
                      { id: 'pdf_reader', title: '5. PDF Reader', sub: 'Notes & Highlights' },
                      { id: 'ai_assistant', title: '6. Gemini AI Assistant', sub: 'Bengali & English Q&A' },
                      { id: 'quiz', title: '7. Live Board Quiz', sub: `${quizzes.length} MCQs` },
                      { id: 'community', title: '8. Student Doubts', sub: `${communityPosts.length} Live Posts` },
                      { id: 'admin', title: '9. Admin & Push Notice', sub: 'Upload PDF & Broadcast' }
                    ] as { id: ScreenId; title: string; sub: string }[]
                  ).map((scr) => (
                    <button
                      key={scr.id}
                      type="button"
                      onClick={() => navigateToScreen(scr.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        activeScreen === scr.id
                          ? 'bg-[#7564D8] text-white border-[#7564D8] shadow-md shadow-[#7564D8]/20'
                          : 'bg-[#FAFAFD] dark:bg-[#13121A] border-[#ECEBF2] dark:border-[#2E2B3D] hover:border-[#7564D8]'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{scr.title}</div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
                          activeScreen === scr.id ? 'text-white/80' : 'text-[#858593]'
                        }`}
                      >
                        {scr.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Native Kotlin APK Build & Play Protect Compliance Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#25A878]" />
                    <h3 className="text-base font-bold text-[#24232E] dark:text-white font-bengali">
                      Google Play Protect Safe `eduvault.apk` Configuration
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#7564D8]">
                    V1 + V2 + V3 Signed
                  </span>
                </div>
                <p className="text-xs text-[#858593] leading-relaxed font-bengali">
                  এই প্রজেক্টের `/android` ফোল্ডারে সম্পূর্ণ Native Kotlin + Jetpack Compose সোর্স কোড, `google-services.json`, এবং V1+V2+V3 রিলিজ সিগনেচার (`app/build.gradle.kts`) সেটআপ করা আছে যাতে `eduvault.apk` ইনস্টল করার সময় Google Play Protect কোনো বাধা না দেয়।
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <a
                    href="/api/android/download-project"
                    className="px-4 py-2.5 rounded-xl bg-[#7564D8] text-white text-xs font-bold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Full Native Android Project (.zip)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setWorkspaceMode('kotlin_code')}
                    className="px-4 py-2.5 rounded-xl bg-[#F0EEFF] dark:bg-[#2B254A] text-[#7564D8] text-xs font-bold flex items-center gap-2"
                  >
                    <Code2 className="w-4 h-4" />
                    <span>View Kotlin & Gradle Source Files</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: 9-Screen Gallery */}
        {workspaceMode === 'showcase' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-[#24232E] dark:text-white">
                  EduVault 9-Screen Live Gallery
                </h2>
                <p className="text-sm text-[#858593]">
                  All screens below reflect live Firestore data with zero hardcoded dummy items.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWorkspaceMode('companion')}
                className="px-4 py-2 rounded-xl bg-[#7564D8] text-white text-xs font-semibold"
              >
                Back to Simulator
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(
                [
                  { id: 'welcome', name: '1. Login & Google Sign-In', render: renderWelcomeScreen },
                  { id: 'home', name: '2. Student Home Dashboard', render: renderHomeScreen },
                  { id: 'notifications', name: '3. Live Push Notifications', render: renderNotificationsScreen },
                  { id: 'library', name: '4. Digital PDF Library', render: renderLibraryScreen },
                  { id: 'pdf_reader', name: '5. Native PDF Reader', render: renderPdfReaderScreen },
                  { id: 'ai_assistant', name: '6. Gemini AI PDF Assistant', render: renderAiAssistantScreen },
                  { id: 'quiz', name: '7. Live Board Quiz', render: renderQuizScreen },
                  { id: 'community', name: '8. Student Doubts Community', render: renderCommunityScreen },
                  { id: 'admin', name: '9. Admin PDF & Broadcast Panel', render: renderAdminScreen }
                ] as const
              ).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[32px] bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D] p-3 shadow-sm flex flex-col"
                >
                  <div className="flex items-center justify-between px-2 pb-2">
                    <span className="text-xs font-bold text-[#7564D8]">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveScreen(item.id);
                        setWorkspaceMode('companion');
                      }}
                      className="text-[11px] font-semibold text-[#858593] hover:text-[#7564D8] flex items-center gap-0.5"
                    >
                      <span>Open</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="h-[540px] rounded-[24px] border border-[#ECEBF2] dark:border-[#2E2B3D] overflow-hidden relative">
                    {item.render()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode 3: Kotlin & Gradle Source Code Inspector */}
        {workspaceMode === 'kotlin_code' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-2.5">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1D1B27] border border-[#ECEBF2] dark:border-[#2E2B3D]">
                <h2 className="text-sm font-extrabold text-[#24232E] dark:text-white">
                  Native Android Studio Files (`/android`)
                </h2>
                <p className="text-xs text-[#858593] mt-1">
                  Configured for `eduvault.apk` with Play Protect V2/V3 signing and Firebase Cloud Messaging.
                </p>
              </div>

              {NATIVE_ANDROID_FILES_SHOWCASE.map((file) => {
                const selected = selectedKotlinFile.path === file.path;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => {
                      soundEngine.play('tap');
                      setSelectedKotlinFile(file);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                      selected
                        ? 'bg-[#7564D8] text-white border-[#7564D8]'
                        : 'bg-white dark:bg-[#1D1B27] border-[#ECEBF2] dark:border-[#2E2B3D] hover:border-[#7564D8]'
                    }`}
                  >
                    <div className="text-xs font-bold">{file.title}</div>
                    <div
                      className={`text-[11px] font-mono truncate mt-0.5 ${
                        selected ? 'text-white/80' : 'text-[#858593]'
                      }`}
                    >
                      {file.path}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-8 rounded-3xl bg-[#181724] text-slate-100 p-6 border border-[#2E2B3D] space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-xs font-mono text-[#A7A0ED] block">
                    {selectedKotlinFile.path}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {selectedKotlinFile.description}
                  </h3>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {selectedKotlinFile.module}
                </span>
              </div>
              <pre className="text-xs font-mono leading-relaxed overflow-x-auto text-slate-200">
                <code>{selectedKotlinFile.code}</code>
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
