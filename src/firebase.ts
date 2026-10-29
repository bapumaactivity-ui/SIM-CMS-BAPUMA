import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  Firestore,
  setLogLevel,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Set Firestore log level to silent to prevent repetitive backoff warning spam
try {
  setLogLevel('silent');
} catch (_) {}

// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId to getFirestore
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function ensureFirestoreNetworkEnabled(): Promise<void> {
  try {
    localStorage.removeItem('firestore_quota_exhausted_until');
    const enableP = enableNetwork(db).catch(() => {});
    const timeoutP = new Promise(resolve => setTimeout(resolve, 800));
    await Promise.race([enableP, timeoutP]);
  } catch (_) {}
}

// Error Handling Infrastructure conforming to Skill Specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuota = (error as any)?.code === 'resource-exhausted' || 
                  errMsg.includes('Quota limit exceeded') || 
                  errMsg.includes('resource-exhausted') || 
                  errMsg.includes('Quota exceeded') ||
                  errMsg.includes('free tier database');

  if (isQuota) {
    console.warn(`[Firestore Quota Notice] Operation ${operationType} on ${path || 'unknown'} paused due to daily write quota. LocalStorage remains fully operational.`);
    try {
      // 5-minute soft cooldown instead of 24-hour permanent freeze
      localStorage.setItem('firestore_quota_exhausted_until', String(Date.now() + 5 * 60 * 1000));
    } catch (_) {}
    return undefined as never;
  }

  const isPermissionDenied = errMsg.includes('Missing or insufficient permissions') ||
                             errMsg.includes('permission-denied') ||
                             (error as any)?.code === 'permission-denied';

  if (isPermissionDenied) {
    const errInfo: FirestoreErrorInfo = {
      error: errMsg,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  // Non-permission internal SDK errors (Target ID collisions, offline state, network timeouts)
  console.warn(`[Firestore ${operationType} Notice] on ${path || 'unknown'}:`, errMsg);
  throw (error instanceof Error ? error : new Error(errMsg));
}

// Validate Connection to Firestore on Boot (Non-blocking with fast timeout)
export async function testConnection(): Promise<boolean> {
  try {
    // Clear expired quota flags and ensure network is active
    try {
      const stored = localStorage.getItem('firestore_quota_exhausted_until');
      if (stored && parseInt(stored, 10) <= Date.now()) {
        localStorage.removeItem('firestore_quota_exhausted_until');
      }
      await enableNetwork(db).catch(() => {});
    } catch (_) {}

    const checkPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('connection timeout')), 2500)
    );
    await Promise.race([checkPromise, timeoutPromise]);
    console.log('Firebase Firestore connection verified successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is restricted.');
    } else {
      console.info('Firestore initialized:', (error as Error).message);
    }
    return false;
  }
}

// Google Sign-In with Popup
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error logging in with Google:', error);
    throw error;
  }
}

// Sign-Out
export async function logoutFirebase() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

export { onAuthStateChanged };
export type { FirebaseUser };
