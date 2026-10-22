import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  type Firestore,
} from 'firebase/firestore';
import type { UpdateItem } from '../components/tabs/OverviewTab';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

/**
 * Firebase project credentials.
 * You can set these via Vite environment variables (.env / .env.local):
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 * Or directly edit this configuration object.
 */
export const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseDb(customConfig?: Partial<FirebaseClientConfig>): Firestore | null {
  const config = { ...DEFAULT_FIREBASE_CONFIG, ...customConfig };

  // If credentials are not yet configured, cleanly return null to use local fallback
  if (!config.projectId || !config.apiKey) {
    return null;
  }

  try {
    if (!appInstance) {
      appInstance = getApps().length > 0 ? getApp() : initializeApp(config);
    }
    if (!dbInstance && appInstance) {
      dbInstance = getFirestore(appInstance);
    }
    return dbInstance;
  } catch (err) {
    console.warn('[Firebase] Initialization error, falling back to local updates:', err);
    return null;
  }
}

/**
 * Fetches the latest "What's new" release posts from Firestore.
 * Collection: "whats_new"
 * Document structure:
 *  - title: string
 *  - date: string (e.g. "October 22, 2026")
 *  - summary: string
 *  - tag?: string (e.g. "Major Release", "What's New")
 *  - timestamp?: number | Timestamp (for sorting)
 */
export async function fetchWhatsNewFromFirestore(
  collectionName: string = 'whats_new',
  maxPosts: number = 6
): Promise<UpdateItem[] | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const colRef = collection(db, collectionName);
    let snap;
    try {
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(maxPosts));
      snap = await getDocs(q);
    } catch {
      // Fallback query without orderBy if index/timestamp is not yet populated
      const fallbackQuery = query(colRef, limit(maxPosts));
      snap = await getDocs(fallbackQuery);
    }

    if (!snap || snap.empty) return null;

    const items: UpdateItem[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled Update',
        date: data.date || '',
        summary: data.summary || '',
        tag: data.tag || undefined,
      };
    });

    return items;
  } catch (error) {
    console.warn('[Firebase] Could not fetch updates from Firestore:', error);
    return null;
  }
}
