import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence setup warning:', err);
});

export const ADMIN_EMAILS = [
  'saifulislam14720@gmail.com',
  'shamimsardarche153@gmail.com',
];

export const ADMIN_EMAIL = ADMIN_EMAILS.join(' / ');

export function getUserEmail(user: User | null): string | null {
  if (!user) return null;
  if (user.email) return user.email.trim();
  const providerEmail = user.providerData?.find((p) => Boolean(p.email))?.email;
  return providerEmail ? providerEmail.trim() : null;
}

export function isVerifiedUser(user: User | null): boolean {
  if (!user) return false;
  return (
    user.emailVerified ||
    user.providerData?.some((p) => p.providerId === 'google.com') === true
  );
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized);
}

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  return isVerifiedUser(user) && isAdminEmail(getUserEmail(user));
}

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface AuthErrorDisplay {
  code: string;
  message: string;
  isPopupBlocked: boolean;
}

export function getAuthErrorInfo(err: unknown): AuthErrorDisplay {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : '';
  const rawMsg = err instanceof Error ? err.message : String(err ?? '');

  if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
    return {
      code,
      isPopupBlocked: true,
      message:
        'ব্রাউজার বা প্রিভিউ উইন্ডো Google লগইন পপআপ ব্লক করেছে। অনুগ্রহ করে পপআপ Allow করুন অথবা নিচের বাটনে ক্লিক করে নতুন ট্যাবে অ্যাপটি খুলে লগইন করুন।',
    };
  }
  if (code === 'auth/popup-closed-by-user') {
    return {
      code,
      isPopupBlocked: false,
      message: 'Google লগইন পপআপটি সম্পন্ন হওয়ার আগেই বন্ধ করা হয়েছে। আবার চেষ্টা করুন।',
    };
  }
  if (code === 'auth/cancelled-popup-request') {
    return {
      code,
      isPopupBlocked: false,
      message: 'আগের লগইন রিকোয়েস্ট বাতিল হয়েছে। অনুগ্রহ করে আবার লগইন বাটনে ক্লিক করুন।',
    };
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return {
      code,
      isPopupBlocked: true,
      message: `এই ডোমেইন (${host}) Firebase-এ অনুমোদিত নয়। অনুগ্রহ করে মূল অ্যাপ লিংক থেকে চেষ্টা করুন অথবা Firebase Auth-এ ডোমেইন যোগ করুন।`,
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      code,
      isPopupBlocked: false,
      message: 'ইন্টারনেট সংযোগে সমস্যা হয়েছে। নেটওয়ার্ক চেক করে আবার চেষ্টা করুন।',
    };
  }
  return {
    code: code || 'auth/unknown',
    isPopupBlocked: false,
    message: `Google লগইন করা যায়নি (${code || rawMsg || 'অজানা ত্রুটি'})। অনুগ্রহ করে আবার চেষ্টা করুন।`,
  };
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
