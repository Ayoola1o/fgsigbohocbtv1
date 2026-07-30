import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";

export interface CachedExamAnswerDoc {
  studentId: string;
  examId: string;
  sessionId: string;
  answers: Record<string, string>;
  lastSavedAt?: any;
  examEndTime?: any;
}

const getLocalStorageKey = (studentId: string, examId: string): string => {
  return `fia_offline_answers_${studentId.trim().toLowerCase()}_${examId.trim()}`;
};

/**
 * Saves exam answers to local storage (instant) and syncs to Firestore buffer (quota safe).
 * Should be called on question navigation or section switch.
 */
export const saveCachedAnswers = async (
  studentId: string,
  examId: string,
  sessionId: string,
  answers: Record<string, string>,
  examEndTime?: Date
): Promise<void> => {
  if (!studentId || !examId) return;

  const localKey = getLocalStorageKey(studentId, examId);
  const payload = {
    studentId,
    examId,
    sessionId,
    answers,
    lastSavedAt: new Date().toISOString(),
    examEndTime: examEndTime ? examEndTime.toISOString() : null
  };

  // 1. Dual-layer local storage save (instant 0-cost fallback)
  try {
    localStorage.setItem(localKey, JSON.stringify(payload));
  } catch (err) {
    console.warn("[ExamCacheService] LocalStorage save warning:", err);
  }

  // 2. Offline-persistent Firestore buffer sync
  try {
    const docId = `${studentId.trim().toLowerCase()}_${examId.trim()}`;
    const docRef = doc(db, "examAnswers", docId);
    
    await setDoc(docRef, {
      studentId,
      examId,
      sessionId,
      answers,
      lastSavedAt: serverTimestamp(),
      examEndTime: examEndTime ? Timestamp.fromDate(examEndTime) : null
    }, { merge: true });
  } catch (err) {
    console.warn("[ExamCacheService] Firestore buffer sync notice (saved locally):", err);
  }
};

/**
 * Retrieves cached answers from local storage or Firestore buffer.
 */
export const getCachedAnswers = async (
  studentId: string,
  examId: string
): Promise<Record<string, string> | null> => {
  if (!studentId || !examId) return null;

  const localKey = getLocalStorageKey(studentId, examId);

  // 1. Check local storage first
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.answers) {
        return parsed.answers;
      }
    }
  } catch (err) {
    console.warn("[ExamCacheService] LocalStorage read warning:", err);
  }

  // 2. Fallback to Firestore persistent cache
  try {
    const docId = `${studentId.trim().toLowerCase()}_${examId.trim()}`;
    const docRef = doc(db, "examAnswers", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as CachedExamAnswerDoc;
      return data.answers || null;
    }
  } catch (err) {
    console.warn("[ExamCacheService] Firestore cache read error:", err);
  }

  return null;
};

/**
 * Clears local and buffer cache after successful final submit to main backend API.
 */
export const clearCachedAnswers = async (
  studentId: string,
  examId: string
): Promise<void> => {
  if (!studentId || !examId) return;

  const localKey = getLocalStorageKey(studentId, examId);
  try {
    localStorage.removeItem(localKey);
  } catch (err) {
    // ignore
  }
};
