import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid, "profile"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid, "profile"));
  return snap.exists() ? snap.data() : null;
}

export async function saveUserSettings(uid, settings) {
  await setDoc(doc(db, "users", uid, "settings"), settings, { merge: true });
}

export async function getUserSettings(uid) {
  const snap = await getDoc(doc(db, "users", uid, "settings"));
  return snap.exists() ? snap.data() : null;
}

export async function startServiceSession(uid) {
  const ref = await addDoc(collection(db, "serviceLogs", uid, "sessions"), {
    date: serverTimestamp(),
    verses: [],
    searchHistory: [],
  });
  return ref.id;
}

export async function logProjectedVerse(uid, sessionId, verse) {
  const ref = doc(db, "serviceLogs", uid, "sessions", sessionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existing = snap.data().verses || [];
  await updateDoc(ref, {
    verses: [...existing, { ...verse, projectedAt: Date.now() }],
  });
}

export async function getRecentSessions(uid, count = 10) {
  const q = query(
    collection(db, "serviceLogs", uid, "sessions"),
    orderBy("date", "desc"),
    limit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
