import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Edit3,
  ExternalLink,
  LogOut,
  PackagePlus,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AdminInviteRecord,
  AdminUserRecord,
  CATEGORY_LABELS,
  CustomerProfile,
  ORDER_STATUS_LABELS,
  OrderRecord,
  OrderStatus,
  Product,
  ProductCategory,
  UserAccountRecord,
} from '@/src/types/store';
import { calculateDiscountPercent, formatBDT } from '@/src/lib/delivery';
import {
  ADMIN_EMAIL,
  ADMIN_EMAILS,
  AuthErrorDisplay,
  db,
  getAuthErrorInfo,
  getUserEmail,
  handleFirestoreError,
  OperationType,
} from '@/src/lib/firebase';
import { PRESET_PRODUCT_IMAGES, STARTER_PRODUCTS } from '@/src/data/starterProducts';
import { ProductImage } from './ProductImage';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  authReady: boolean;
  isAdmin: boolean;
  firestoreProducts: Product[];
  onGoogleSignIn: () => Promise<User | null>;
  onSignOut: () => Promise<void>;
}

const EMPTY_FORM = {
  title: '',
  category: 'electronics' as ProductCategory,
  regularPrice: '',
  price: '',
  shortFeature: '',
  description: '',
  featuresText: '',
  imageUrl: PRESET_PRODUCT_IMAGES[0].url,
  inStock: true,
};

function toTimestampMillis(ts: unknown): number {
  if (ts && typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function formatDateTime(ts: unknown): string {
  const ms = toTimestampMillis(ts);
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString('bn-BD', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return new Date(ms).toLocaleString();
  }
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  authReady,
  isAdmin,
  firestoreProducts,
  onGoogleSignIn,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'admins'>('orders');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const [registeredUsers, setRegisteredUsers] = useState<UserAccountRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, CustomerProfile>>({});
  const [userSearch, setUserSearch] = useState('');

  const [adminRecords, setAdminRecords] = useState<AdminUserRecord[]>([]);
  const [adminInvites, setAdminInvites] = useState<AdminInviteRecord[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminActionMsg, setAdminActionMsg] = useState('');
  const [adminActionError, setAdminActionError] = useState('');

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorDisplay | null>(null);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savingProduct, setSavingProduct] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const autoSeededRef = useRef(false);

  const currentEmail = getUserEmail(currentUser);

  // Subscribe to all orders when signed in as verified admin
  useEffect(() => {
    if (!isOpen || !authReady || !isAdmin) {
      setOrders([]);
      setOrdersError('');
      return;
    }
    setLoadingOrders(true);
    setOrdersError('');
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const list: OrderRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<OrderRecord, 'id'>),
        }));
        list.sort((a, b) => toTimestampMillis(b.createdAt) - toTimestampMillis(a.createdAt));
        setOrders(list);
        setLoadingOrders(false);
      },
      (err) => {
        setLoadingOrders(false);
        setOrdersError('অর্ডার লিস্ট লোড করতে অনুমতি বা সংযোগ সমস্যা হয়েছে। অনুগ্রহ করে পেজ রিলোড করে আবার চেষ্টা করুন।');
        try {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        } catch {
          // Structured error logged while keeping UI responsive
        }
      }
    );
    return () => unsub();
  }, [isOpen, authReady, isAdmin]);

  // Subscribe to registered website users, customer shipping profiles, active admins, and pending admin invites
  useEffect(() => {
    if (!isOpen || !authReady || !isAdmin) {
      setRegisteredUsers([]);
      setCustomerProfiles({});
      setAdminRecords([]);
      setAdminInvites([]);
      return;
    }

    setLoadingUsers(true);
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserAccountRecord[] = snapshot.docs.map((d) => ({
          ...(d.data() as UserAccountRecord),
          uid: d.id,
        }));
        list.sort((a, b) => toTimestampMillis(b.lastLoginAt) - toTimestampMillis(a.lastLoginAt));
        setRegisteredUsers(list);
        setLoadingUsers(false);
      },
      (err) => {
        setLoadingUsers(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'users');
        } catch {
          // Structured error logged
        }
      }
    );

    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        const map: Record<string, CustomerProfile> = {};
        snapshot.docs.forEach((d) => {
          map[d.id] = d.data() as CustomerProfile;
        });
        setCustomerProfiles(map);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'customers');
        } catch {
          // Structured error logged
        }
      }
    );

    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snapshot) => {
        const list: AdminUserRecord[] = snapshot.docs.map((d) => ({
          ...(d.data() as AdminUserRecord),
          uid: d.id,
        }));
        list.sort((a, b) => toTimestampMillis(b.createdAt) - toTimestampMillis(a.createdAt));
        setAdminRecords(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'admins');
        } catch {
          // Structured error logged
        }
      }
    );

    const unsubInvites = onSnapshot(
      collection(db, 'adminInvites'),
      (snapshot) => {
        const list: AdminInviteRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AdminInviteRecord, 'id'>),
        }));
        list.sort((a, b) => toTimestampMillis(b.createdAt) - toTimestampMillis(a.createdAt));
        setAdminInvites(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'adminInvites');
        } catch {
          // Structured error logged
        }
      }
    );

    return () => {
      unsubUsers();
      unsubCustomers();
      unsubAdmins();
      unsubInvites();
    };
  }, [isOpen, authReady, isAdmin]);

  // Auto-seed starter products once if Firestore catalog is empty when admin opens panel
  useEffect(() => {
    if (isOpen && authReady && isAdmin && firestoreProducts.length === 0 && !autoSeededRef.current) {
      autoSeededRef.current = true;
      void handleSeedStarterProducts(true);
    }
  }, [isOpen, authReady, isAdmin, firestoreProducts.length]);

  const activeAdminEmailsSet = useMemo(() => {
    const set = new Set(ADMIN_EMAILS.map((e) => e.toLowerCase()));
    adminRecords.forEach((a) => {
      if (a.email) set.add(a.email.toLowerCase());
    });
    return set;
  }, [adminRecords]);

  const pendingInvites = useMemo(
    () =>
      adminInvites.filter(
        (inv) => inv.email && !activeAdminEmailsSet.has(inv.email.toLowerCase())
      ),
    [adminInvites, activeAdminEmailsSet]
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return registeredUsers;
    return registeredUsers.filter((u) => {
      const cust = customerProfiles[u.uid];
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (cust?.phone || '').toLowerCase().includes(q) ||
        (cust?.address || '').toLowerCase().includes(q)
      );
    });
  }, [registeredUsers, customerProfiles, userSearch]);

  if (!isOpen) return null;

  const handleAdminSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await onGoogleSignIn();
    } catch (err) {
      setAuthError(getAuthErrorInfo(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAdminSignOut = async () => {
    setAuthError(null);
    setOrdersError('');
    try {
      await onSignOut();
    } catch (err) {
      setAuthError(getAuthErrorInfo(err));
    }
  };

  const handleAddNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminActionMsg('');
    setAdminActionError('');

    const cleanEmail = newAdminEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 160) {
      setAdminActionError('অনুগ্রহ করে একটি সঠিক Gmail ঠিকানা লিখুন।');
      return;
    }
    if (activeAdminEmailsSet.has(cleanEmail)) {
      setAdminActionError('এই Gmail অ্যাকাউন্টটি ইতিমধ্যেই অ্যাডমিন তালিকায় রয়েছে।');
      return;
    }
    if (pendingInvites.some((inv) => inv.email.toLowerCase() === cleanEmail)) {
      setAdminActionError('এই Gmail-এ ইতিমধ্যেই অ্যাডমিন ইনভাইট পাঠানো আছে।');
      return;
    }
    if (!currentUser) return;

    setAddingAdmin(true);
    try {
      const matchedUser = registeredUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail
      );

      if (matchedUser) {
        await setDoc(doc(db, 'admins', matchedUser.uid), {
          uid: matchedUser.uid,
          email: cleanEmail,
          displayName: (matchedUser.displayName || '').trim().slice(0, 120),
          addedByEmail: (currentEmail || '').toLowerCase().slice(0, 160),
          inviteId: '',
          role: 'admin',
          createdAt: serverTimestamp(),
        });
        setAdminActionMsg(
          `✓ ${cleanEmail} সরাসরি অ্যাডমিন হিসেবে যুক্ত হয়েছেন।`
        );
      } else {
        const inviteId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await setDoc(doc(db, 'adminInvites', inviteId), {
          email: cleanEmail,
          addedByUid: currentUser.uid,
          addedByEmail: (currentEmail || '').toLowerCase().slice(0, 160),
          createdAt: serverTimestamp(),
        });
        setAdminActionMsg(
          `✓ ${cleanEmail} যুক্ত হয়েছে। উনি এই Gmail দিয়ে ওয়েবসাইটে লগইন করলেই স্বয়ংক্রিয়ভাবে অ্যাডমিন প্যানেল ব্যবহার করতে পারবেন।`
        );
      }
      setNewAdminEmail('');
    } catch (err) {
      setAdminActionError('নতুন অ্যাডমিন যুক্ত করতে সমস্যা হয়েছে।');
      try {
        handleFirestoreError(err, OperationType.WRITE, 'admins');
      } catch {
        // Logged cleanly
      }
    } finally {
      setAddingAdmin(false);
    }
  };

  const handlePromoteUserToAdmin = async (userAcc: UserAccountRecord) => {
    setAdminActionMsg('');
    setAdminActionError('');
    const cleanEmail = userAcc.email.toLowerCase();
    if (activeAdminEmailsSet.has(cleanEmail)) return;
    try {
      await setDoc(doc(db, 'admins', userAcc.uid), {
        uid: userAcc.uid,
        email: cleanEmail.slice(0, 160),
        displayName: (userAcc.displayName || '').trim().slice(0, 120),
        addedByEmail: (currentEmail || '').toLowerCase().slice(0, 160),
        inviteId: '',
        role: 'admin',
        createdAt: serverTimestamp(),
      });
      setAdminActionMsg(`✓ ${cleanEmail} কে অ্যাডমিন করা হয়েছে।`);
      setFeedbackMsg(`✓ ${cleanEmail} কে অ্যাডমিন করা হয়েছে।`);
    } catch (err) {
      setAdminActionError('অ্যাডমিন করতে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, `admins/${userAcc.uid}`);
    }
  };

  const handleRemoveAdmin = async (adminRec: AdminUserRecord) => {
    setAdminActionMsg('');
    setAdminActionError('');
    const emailLower = adminRec.email.toLowerCase();
    if (
      ADMIN_EMAILS.some((e) => e.toLowerCase() === emailLower) ||
      adminRec.uid === currentUser?.uid
    ) {
      setAdminActionError('মূল অ্যাডমিন বা নিজের অ্যাকাউন্ট রিমুভ করা যাবে না।');
      return;
    }
    try {
      await deleteDoc(doc(db, 'admins', adminRec.uid));
      const matchingInvites = adminInvites.filter(
        (inv) => inv.email.toLowerCase() === emailLower
      );
      for (const inv of matchingInvites) {
        await deleteDoc(doc(db, 'adminInvites', inv.id));
      }
      setAdminActionMsg(`✓ ${adminRec.email} কে অ্যাডমিন তালিকা থেকে সরানো হয়েছে।`);
    } catch (err) {
      setAdminActionError('অ্যাডমিন রিমুভ করতে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.DELETE, `admins/${adminRec.uid}`);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    setAdminActionMsg('');
    setAdminActionError('');
    try {
      await deleteDoc(doc(db, 'adminInvites', inviteId));
      setAdminActionMsg('✓ পেন্ডিং অ্যাডমিন ইনভাইট বাতিল করা হয়েছে।');
    } catch (err) {
      setAdminActionError('ইনভাইট বাতিল করতে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.DELETE, `adminInvites/${inviteId}`);
    }
  };

  const handleSeedStarterProducts = async (silentOnThrow = false) => {
    setSeeding(true);
    setFeedbackMsg('');
    const existingIds = new Set(firestoreProducts.map((p) => p.id));
    try {
      for (const item of STARTER_PRODUCTS) {
        const basePayload = {
          title: item.title,
          category: item.category,
          regularPrice: item.regularPrice,
          price: item.price,
          shortFeature: item.shortFeature,
          description: item.description,
          features: item.features,
          imageUrl: item.imageUrl,
          inStock: item.inStock,
          updatedAt: serverTimestamp(),
        };
        if (existingIds.has(item.id)) {
          await updateDoc(doc(db, 'products', item.id), basePayload);
        } else {
          await setDoc(doc(db, 'products', item.id), {
            ...basePayload,
            createdAt: serverTimestamp(),
          });
        }
      }
      setFeedbackMsg('✓ স্টার্টার ৮টি প্রোডাক্ট ডাটাবেসে যুক্ত হয়েছে।');
    } catch (err) {
      setFeedbackMsg('প্রোডাক্ট লোড করতে সমস্যা হয়েছে।');
      if (silentOnThrow) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'products');
        } catch {
          // Structured error logged without unhandled promise rejection
        }
      } else {
        handleFirestoreError(err, OperationType.WRITE, 'products');
      }
    } finally {
      setSeeding(false);
    }
  };

  const handleOrderStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setForm({
      title: product.title,
      category: product.category,
      regularPrice: String(product.regularPrice),
      price: String(product.price),
      shortFeature: product.shortFeature,
      description: product.description,
      featuresText: product.features.join('\n'),
      imageUrl: product.imageUrl,
      inStock: product.inStock,
    });
    setActiveTab('products');
    setFeedbackMsg('');
  };

  const handleResetForm = () => {
    setEditingProductId(null);
    setForm(EMPTY_FORM);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg('');

    const regPrice = Number(form.regularPrice);
    const offerPrice = Number(form.price);
    const features = form.featuresText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (form.title.trim().length < 2) {
      setFeedbackMsg('প্রোডাক্টের নাম লিখুন।');
      return;
    }
    if (!Number.isFinite(regPrice) || regPrice <= 0 || !Number.isFinite(offerPrice) || offerPrice <= 0) {
      setFeedbackMsg('সঠিক রেগুলার ও অফার দাম লিখুন।');
      return;
    }
    if (offerPrice > regPrice) {
      setFeedbackMsg('অফার দাম রেগুলার দামের চেয়ে বেশি হতে পারবে না।');
      return;
    }
    if (form.shortFeature.trim().length < 2 || form.description.trim().length < 5) {
      setFeedbackMsg('সংক্ষিপ্ত ফিচার এবং বিস্তারিত বিবরণ লিখুন।');
      return;
    }

    setSavingProduct(true);
    const productId =
      editingProductId ||
      `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      if (editingProductId) {
        await updateDoc(doc(db, 'products', productId), {
          title: form.title.trim().slice(0, 120),
          category: form.category,
          regularPrice: regPrice,
          price: offerPrice,
          shortFeature: form.shortFeature.trim().slice(0, 140),
          description: form.description.trim().slice(0, 2000),
          features,
          imageUrl: form.imageUrl.trim().slice(0, 500),
          inStock: form.inStock,
          updatedAt: serverTimestamp(),
        });
        setFeedbackMsg('✓ প্রোডাক্ট আপডেট হয়েছে।');
      } else {
        await setDoc(doc(db, 'products', productId), {
          title: form.title.trim().slice(0, 120),
          category: form.category,
          regularPrice: regPrice,
          price: offerPrice,
          shortFeature: form.shortFeature.trim().slice(0, 140),
          description: form.description.trim().slice(0, 2000),
          features,
          imageUrl: form.imageUrl.trim().slice(0, 500),
          inStock: form.inStock,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setFeedbackMsg('✓ নতুন প্রোডাক্ট যোগ হয়েছে।');
      }
      handleResetForm();
    } catch (err) {
      setFeedbackMsg('সেভ করতে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, `products/${productId}`);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleStock = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), {
        inStock: !product.inStock,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      setFeedbackMsg('✓ প্রোডাক্ট ডিলিট করা হয়েছে।');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    }
  };

  const filteredOrders =
    statusFilter === 'all'
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  const previewDiscount = calculateDiscountPercent(
    Number(form.regularPrice),
    Number(form.price)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="অ্যাডমিন প্যানেল"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-[#15803D] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate">
                ভোক্তা-জিতাও — অ্যাডমিন প্যানেল
              </h2>
              {currentEmail && isAdmin && (
                <p className="text-xs text-[#15803D] font-medium truncate">
                  লগইন: {currentEmail}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {currentUser && (
              <button
                type="button"
                onClick={() => void handleAdminSignOut()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="অ্যাডমিন প্যানেল বন্ধ করুন"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auth Gate or Dashboard */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {!authReady ? (
            <div className="max-w-md mx-auto py-12 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-[#15803D] mx-auto animate-pulse" />
              <p className="text-sm font-medium text-slate-600">
                অ্যাকাউন্ট স্ট্যাটাস যাচাই হচ্ছে...
              </p>
            </div>
          ) : !currentUser ? (
            <div className="max-w-md mx-auto py-10 text-center space-y-4">
              <ShieldCheck className="w-12 h-12 text-[#15803D] mx-auto" />
              <h3 className="text-xl font-bold text-slate-900">অ্যাডমিন লগইন প্রয়োজন</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                নতুন প্রোডাক্ট যোগ করতে ও কাস্টমারের অর্ডার দেখতে অ্যাডমিন অ্যাকাউন্ট (
                <span className="font-medium text-slate-800 break-all">{ADMIN_EMAIL}</span>) দিয়ে
                Google Sign-In করুন।
              </p>
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => void handleAdminSignIn()}
                className="px-6 py-3 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors"
              >
                {isSigningIn ? 'Google পপআপ খুলছে...' : 'Google দিয়ে অ্যাডমিন লগইন করুন'}
              </button>

              {authError && (
                <div className="text-left p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-2.5">
                  <div className="flex items-start gap-2 text-xs font-medium text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p>{authError.message}</p>
                      <p className="font-mono text-[11px] text-red-500">
                        Code: {authError.code}
                      </p>
                    </div>
                  </div>
                  {authError.isPopupBlocked && typeof window !== 'undefined' && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>নতুন ব্রাউজার ট্যাবে খুলে লগইন করুন</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : !isAdmin ? (
            <div className="max-w-md mx-auto py-10 text-center space-y-4">
              <h3 className="text-lg font-bold text-red-600">অ্যাডমিন অনুমোদন নেই</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                আপনি বর্তমানে{' '}
                <span className="font-semibold text-slate-900 break-all">
                  {currentEmail || 'অজানা অ্যাকাউন্ট'}
                </span>{' '}
                দিয়ে লগইন আছেন। অ্যাডমিন প্যানেল ব্যবহারের জন্য অনুগ্রহ করে অনুমোদিত অ্যাডমিন
                Gmail (<span className="font-semibold break-all">{ADMIN_EMAIL}</span>) দিয়ে লগইন করুন।
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => void handleAdminSignIn()}
                  className="px-5 py-2.5 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-semibold rounded-lg cursor-pointer"
                >
                  {isSigningIn ? 'লগইন হচ্ছে...' : 'অন্য Google অ্যাকাউন্ট দিয়ে লগইন করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleAdminSignOut()}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
                >
                  লগআউট
                </button>
              </div>

              {authError && (
                <div className="text-left p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-2.5">
                  <div className="flex items-start gap-2 text-xs font-medium text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p>{authError.message}</p>
                      <p className="font-mono text-[11px] text-red-500">
                        Code: {authError.code}
                      </p>
                    </div>
                  </div>
                  {authError.isPopupBlocked && typeof window !== 'undefined' && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>নতুন ব্রাউজার ট্যাবে খুলে লগইন করুন</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sub-Navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    অর্ডার লিস্ট ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                      activeTab === 'products'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    প্রোডাক্ট ম্যানেজার ({firestoreProducts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                      activeTab === 'users'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>ইউজার লিস্ট ({registeredUsers.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admins')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                      activeTab === 'admins'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>নতুন অ্যাডমিন ({activeAdminEmailsSet.size})</span>
                  </button>
                </div>

                {activeTab === 'products' && (
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={() => void handleSeedStarterProducts(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>{seeding ? 'লোড হচ্ছে...' : 'স্টার্টার প্রোডাক্ট রিস্টোর করুন'}</span>
                  </button>
                )}
              </div>

              {feedbackMsg && (
                <div className="px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-medium text-[#15803D]">
                  {feedbackMsg}
                </div>
              )}

              {activeTab === 'orders' ? (
                /* Orders View */
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {(['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                            statusFilter === st
                              ? 'bg-[#15803D] border-[#15803D] text-white'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {st === 'all' ? 'সব অর্ডার' : ORDER_STATUS_LABELS[st]}
                        </button>
                      )
                    )}
                  </div>

                  {ordersError ? (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                      {ordersError}
                    </div>
                  ) : loadingOrders ? (
                    <p className="text-sm text-slate-500">অর্ডার লোড হচ্ছে...</p>
                  ) : filteredOrders.length === 0 ? (
                    <div className="py-12 text-center border border-slate-200 rounded-xl bg-[#FAFAFA]">
                      <p className="text-sm text-slate-600">কোনো অর্ডার পাওয়া যায়নি।</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-4 rounded-xl border border-slate-200 bg-[#FAFAFA] space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-mono text-xs font-semibold text-slate-500">
                                {order.id}
                              </p>
                              <p className="text-base font-bold text-slate-900">
                                {order.customerName}
                              </p>
                              <a
                                href={`tel:${order.phone}`}
                                className="text-sm font-semibold text-[#15803D] hover:underline tabular-nums"
                              >
                                {order.phone}
                              </a>
                            </div>

                            <select
                              value={order.status}
                              onChange={(e) =>
                                void handleOrderStatusChange(
                                  order.id,
                                  e.target.value as OrderStatus
                                )
                              }
                              aria-label="অর্ডার স্ট্যাটাস পরিবর্তন করুন"
                              className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 cursor-pointer"
                            >
                              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
                                <option key={st} value={st}>
                                  {ORDER_STATUS_LABELS[st]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                            <strong>ঠিকানা:</strong> {order.address}{' '}
                            <span className="text-slate-500">
                              ({order.deliveryZone === 'inside_dhaka' ? 'ঢাকার মধ্যে ৳৭০' : 'ঢাকার বাহিরে ৳১০০'})
                            </span>
                            {order.note && (
                              <span className="block mt-1 text-slate-500">
                                নোট: {order.note}
                              </span>
                            )}
                          </p>

                          <div className="space-y-1 text-xs text-slate-700">
                            {order.items.map((item) => (
                              <div key={item.productId} className="flex justify-between">
                                <span>
                                  {item.title} × {item.quantity}
                                </span>
                                <span className="font-semibold tabular-nums">
                                  {formatBDT(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold tabular-nums">
                            <span className="text-slate-600">
                              মোট বিল (ডেলিভারি {formatBDT(order.deliveryCharge)} সহ)
                            </span>
                            <span className="text-[#EA580C]">
                              {formatBDT(order.totalAmount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'products' ? (
                /* Products Manager View */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Add / Edit Form */}
                  <form
                    onSubmit={handleSaveProduct}
                    className="lg:col-span-5 p-4 sm:p-5 rounded-xl border border-slate-200 bg-[#FAFAFA] space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <PackagePlus className="w-4 h-4 text-[#EA580C]" />
                        <span>
                          {editingProductId ? 'প্রোডাক্ট এডিট করুন' : 'নতুন প্রোডাক্ট যোগ করুন'}
                        </span>
                      </h3>
                      {editingProductId && (
                        <button
                          type="button"
                          onClick={handleResetForm}
                          className="text-xs font-medium text-slate-600 hover:underline cursor-pointer"
                        >
                          নতুন যোগ করুন
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        প্রোডাক্টের নাম *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="যেমন: M10 Wireless Earbuds"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ক্যাটাগরি *
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value as ProductCategory })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="electronics">ইলেকট্রনিক্স</option>
                        <option value="cosmetics">কসমেটিক্স</option>
                        <option value="clothing">ক্লথিং</option>
                        <option value="problem-solving">হট প্রবলেম সলভিং</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          রেগুলার দাম (৳) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={form.regularPrice}
                          onChange={(e) =>
                            setForm({ ...form, regularPrice: e.target.value })
                          }
                          placeholder="1200"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          অফার দাম (৳) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          placeholder="850"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg tabular-nums"
                        />
                      </div>
                    </div>

                    {previewDiscount > 0 && (
                      <p className="text-xs font-semibold text-[#15803D]">
                        কাস্টমার দেখতে পাবেন: {previewDiscount}% সেভ
                      </p>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        সংক্ষিপ্ত ফিচার (১ লাইন) *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.shortFeature}
                        onChange={(e) =>
                          setForm({ ...form, shortFeature: e.target.value })
                        }
                        placeholder="যেমন: লং ব্যাটারি ব্যাকআপ ও ফাস্ট চার্জিং"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        বিস্তারিত বিবরণ *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                        placeholder="প্রোডাক্ট সম্পর্কে বিস্তারিত লিখুন..."
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ফিচার লিস্ট (প্রতি লাইনে একটি)
                      </label>
                      <textarea
                        rows={3}
                        value={form.featuresText}
                        onChange={(e) =>
                          setForm({ ...form, featuresText: e.target.value })
                        }
                        placeholder="ফিচার ১&#10;ফিচার ২&#10;ফিচার ৩"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        প্রোডাক্ট ছবি (প্রিসেট বা ছবির URL) *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.imageUrl}
                        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg mb-2"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        {PRESET_PRODUCT_IMAGES.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => setForm({ ...form, imageUrl: preset.url })}
                            title={preset.label}
                            className={`aspect-[4/3] rounded-md overflow-hidden border-2 cursor-pointer ${
                              form.imageUrl === preset.url
                                ? 'border-[#EA580C]'
                                : 'border-slate-200'
                            }`}
                          >
                            <ProductImage src={preset.url} alt={preset.label} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.inStock}
                        onChange={(e) => setForm({ ...form, inStock: e.target.checked })}
                        className="rounded border-slate-300 text-[#15803D]"
                      />
                      <span>স্টকে আছে (In Stock)</span>
                    </label>

                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="w-full py-2.5 px-4 bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {editingProductId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>
                        {savingProduct
                          ? 'সেভ হচ্ছে...'
                          : editingProductId
                            ? 'আপডেট সেভ করুন'
                            : 'প্রোডাক্ট যোগ করুন'}
                      </span>
                    </button>
                  </form>

                  {/* Product List */}
                  <div className="lg:col-span-7 space-y-3">
                    {firestoreProducts.length === 0 ? (
                      <div className="p-8 text-center border border-slate-200 rounded-xl bg-[#FAFAFA]">
                        <p className="text-sm text-slate-600">
                          ডাটাবেসে এখনো কোনো প্রোডাক্ট নেই। উপরে “স্টার্টার প্রোডাক্ট রিস্টোর করুন”
                          ক্লিক করুন অথবা বামের ফর্ম থেকে যোগ করুন।
                        </p>
                      </div>
                    ) : (
                      firestoreProducts.map((product) => {
                        const disc = calculateDiscountPercent(
                          product.regularPrice,
                          product.price
                        );
                        return (
                          <div
                            key={product.id}
                            className="p-3 rounded-xl border border-slate-200 bg-white flex items-center gap-3"
                          >
                            <div className="w-20 h-15 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                              <ProductImage src={product.imageUrl} alt={product.title} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-500">
                                {CATEGORY_LABELS[product.category]}
                              </p>
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {product.title}
                              </h4>
                              <p className="text-xs tabular-nums">
                                <span className="font-bold text-[#15803D]">
                                  {formatBDT(product.price)}
                                </span>{' '}
                                <span className="line-through text-slate-400">
                                  {formatBDT(product.regularPrice)}
                                </span>{' '}
                                {disc > 0 && (
                                  <span className="text-[#EA580C] font-semibold">
                                    · {disc}% সেভ
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => void handleToggleStock(product)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md border cursor-pointer ${
                                  product.inStock
                                    ? 'border-emerald-200 bg-emerald-50 text-[#15803D]'
                                    : 'border-red-200 bg-red-50 text-red-700'
                                }`}
                              >
                                {product.inStock ? 'In Stock' : 'Stock Out'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditProduct(product)}
                                aria-label="এডিট করুন"
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteProduct(product.id)}
                                aria-label="ডিলিট করুন"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : activeTab === 'users' ? (
                /* Registered Users List View */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        ওয়েবসাইটে লগইন করা ইউজার তালিকা
                      </h3>
                      <p className="text-xs text-slate-600">
                        যারা Google (Gmail) দিয়ে অ্যাকাউন্ট খুলে লগইন করেছেন তাদের নাম, ইমেইল ও সর্বশেষ লগইনের সময়।
                      </p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="নাম, Gmail বা ফোন খুঁজুন..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                      />
                    </div>
                  </div>

                  {loadingUsers ? (
                    <p className="text-sm text-slate-500">ইউজার তালিকা লোড হচ্ছে...</p>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-12 text-center border border-slate-200 rounded-xl bg-[#FAFAFA]">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">
                        {registeredUsers.length === 0
                          ? 'এখনো কোনো ইউজার ওয়েবসাইটে লগইন করেননি।'
                          : 'সার্চের সাথে মিলে এমন কোনো ইউজার পাওয়া যায়নি।'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredUsers.map((userAcc) => {
                        const cust = customerProfiles[userAcc.uid];
                        const isThisAdmin = activeAdminEmailsSet.has(
                          userAcc.email.toLowerCase()
                        );
                        return (
                          <div
                            key={userAcc.uid}
                            className="p-4 rounded-xl border border-slate-200 bg-[#FAFAFA] flex flex-col justify-between gap-3"
                          >
                            <div className="flex items-start gap-3">
                              {userAcc.photoURL ? (
                                <img
                                  src={userAcc.photoURL}
                                  alt={userAcc.displayName || userAcc.email}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#14532D] font-bold text-sm flex items-center justify-center shrink-0">
                                  {(userAcc.displayName || userAcc.email || 'U')
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {userAcc.displayName || cust?.name || 'ক্রেতা'}
                                  </p>
                                  {isThisAdmin && (
                                    <span className="text-[11px] font-bold text-[#15803D] shrink-0">
                                      অ্যাডমিন
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 break-all">
                                  {userAcc.email}
                                </p>
                              </div>
                            </div>

                            {cust && (cust.phone || cust.address) && (
                              <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                                {cust.phone && (
                                  <p className="tabular-nums">
                                    <strong>ফোন:</strong> {cust.phone}
                                  </p>
                                )}
                                {cust.address && (
                                  <p>
                                    <strong>ঠিকানা:</strong> {cust.address}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                              <div className="space-y-0.5">
                                <p>প্রথম লগইন: {formatDateTime(userAcc.createdAt)}</p>
                                <p>সর্বশেষ লগইন: {formatDateTime(userAcc.lastLoginAt)}</p>
                              </div>
                              {!isThisAdmin && (
                                <button
                                  type="button"
                                  onClick={() => void handlePromoteUserToAdmin(userAcc)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-[#15803D] text-[#15803D] hover:text-white border border-emerald-200 hover:border-[#15803D] text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer"
                                >
                                  + অ্যাডমিন করুন
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Admin Management View */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Add New Admin Form */}
                  <form
                    onSubmit={handleAddNewAdmin}
                    className="lg:col-span-5 p-4 sm:p-5 rounded-xl border border-slate-200 bg-[#FAFAFA] space-y-3.5"
                  >
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-[#EA580C]" />
                      <span>নতুন অ্যাডমিন যুক্ত করুন</span>
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      যাকে অ্যাডমিন বানাতে চান তার Gmail ঠিকানা লিখুন। তিনি আগে লগইন করে থাকলে সাথে সাথে অ্যাডমিন হবেন, অথবা পরবর্তীতে ওই Gmail দিয়ে লগইন করলেই স্বয়ংক্রিয়ভাবে অ্যাডমিন প্যানেল খুলবে।
                    </p>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        নতুন অ্যাডমিনের Gmail ঠিকানা *
                      </label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="example@gmail.com"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                      />
                    </div>

                    {adminActionError && (
                      <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {adminActionError}
                      </p>
                    )}
                    {adminActionMsg && (
                      <p className="text-xs font-medium text-[#15803D] bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        {adminActionMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={addingAdmin}
                      className="w-full py-2.5 px-4 bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 text-white text-sm font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{addingAdmin ? 'যুক্ত হচ্ছে...' : 'অ্যাডমিন যুক্ত করুন'}</span>
                    </button>
                  </form>

                  {/* Active Admins & Pending Invites */}
                  <div className="lg:col-span-7 space-y-5">
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-bold text-slate-900">
                        অ্যাক্টিভ অ্যাডমিন তালিকা
                      </h4>

                      {/* Bootstrapped Primary Admins */}
                      {ADMIN_EMAILS.map((primaryEmail) => (
                        <div
                          key={primaryEmail}
                          className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 break-all">
                              {primaryEmail}
                            </p>
                            <p className="text-xs text-[#15803D] font-medium">
                              মূল অ্যাডমিন (স্থায়ী)
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Dynamically Added Admins */}
                      {adminRecords
                        .filter(
                          (rec) =>
                            !ADMIN_EMAILS.some(
                              (p) => p.toLowerCase() === rec.email.toLowerCase()
                            )
                        )
                        .map((rec) => (
                          <div
                            key={rec.uid}
                            className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 break-all">
                                {rec.displayName ? `${rec.displayName} (${rec.email})` : rec.email}
                              </p>
                              <p className="text-xs text-slate-500">
                                যুক্ত করেছেন: {rec.addedByEmail || 'অ্যাডমিন'} ·{' '}
                                {formatDateTime(rec.createdAt)}
                              </p>
                            </div>
                            {rec.uid !== currentUser?.uid && (
                              <button
                                type="button"
                                onClick={() => void handleRemoveAdmin(rec)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg shrink-0 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>রিমুভ</span>
                              </button>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Pending Invites (emails added before first login) */}
                    {pendingInvites.length > 0 && (
                      <div className="space-y-2.5 pt-2 border-t border-slate-200">
                        <h4 className="text-sm font-bold text-slate-900">
                          পেন্ডিং ইনভাইট (লগইনের অপেক্ষায়)
                        </h4>
                        {pendingInvites.map((inv) => (
                          <div
                            key={inv.id}
                            className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/40 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 break-all">
                                {inv.email}
                              </p>
                              <p className="text-xs text-slate-600">
                                যুক্ত করেছেন: {inv.addedByEmail} · প্রথমবার Google লগইন করলেই সক্রিয় হবে
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleDeleteInvite(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>বাতিল</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
