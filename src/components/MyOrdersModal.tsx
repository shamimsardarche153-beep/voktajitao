import React, { useEffect, useState } from 'react';
import { LogOut, Package, Save, UserCheck, X } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  LocalSavedShipping,
  ORDER_STATUS_LABELS,
  OrderRecord,
} from '@/src/types/store';
import { formatBDT } from '@/src/lib/delivery';
import {
  AuthErrorDisplay,
  db,
  getAuthErrorInfo,
  getUserEmail,
  handleFirestoreError,
  isVerifiedUser,
  OperationType,
} from '@/src/lib/firebase';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  savedShipping: LocalSavedShipping;
  onSaveLocalShipping: (shipping: LocalSavedShipping) => void;
  onGoogleSignIn: () => Promise<User | null>;
  onSignOut: () => Promise<void>;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  savedShipping,
  onSaveLocalShipping,
  onGoogleSignIn,
  onSignOut,
}) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [name, setName] = useState(savedShipping.name);
  const [phone, setPhone] = useState(savedShipping.phone);
  const [address, setAddress] = useState(savedShipping.address);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorDisplay | null>(null);

  useEffect(() => {
    setName(savedShipping.name);
    setPhone(savedShipping.phone);
    setAddress(savedShipping.address);
  }, [savedShipping]);

  useEffect(() => {
    if (!isOpen || !currentUser || !isVerifiedUser(currentUser)) {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);
    const path = 'orders';
    const q = query(
      collection(db, path),
      where('customerUid', '==', currentUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: OrderRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<OrderRecord, 'id'>),
        }));
        list.sort((a, b) => {
          const tA =
            a.createdAt && typeof (a.createdAt as { toMillis?: () => number }).toMillis === 'function'
              ? (a.createdAt as { toMillis: () => number }).toMillis()
              : 0;
          const tB =
            b.createdAt && typeof (b.createdAt as { toMillis?: () => number }).toMillis === 'function'
              ? (b.createdAt as { toMillis: () => number }).toMillis()
              : 0;
          return tB - tA;
        });
        setOrders(list);
        setLoadingOrders(false);
      },
      (err) => {
        setLoadingOrders(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
    return () => unsub();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setProfileMsg('নাম, ফোন এবং ঠিকানা সবগুলো পূরণ করুন।');
      return;
    }
    setSavingProfile(true);
    try {
      onSaveLocalShipping({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      if (currentUser && isVerifiedUser(currentUser)) {
        await setDoc(doc(db, 'customers', currentUser.uid), {
          uid: currentUser.uid,
          email: getUserEmail(currentUser) || '',
          name: name.trim().slice(0, 80),
          phone: phone.trim().slice(0, 25),
          address: address.trim().slice(0, 300),
          updatedAt: serverTimestamp(),
        });
      }
      setProfileMsg('✓ আপনার ঠিকানা সফলভাবে সেভ হয়েছে।');
    } catch (err) {
      setProfileMsg('সেভ করতে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.WRITE, `customers/${currentUser?.uid}`);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="আমার অ্যাকাউন্ট ও অর্ডার"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#15803D]" />
            <h2 className="text-lg font-bold text-slate-900">আমার অ্যাকাউন্ট ও অর্ডার</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Account Login Bar */}
          {currentUser ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {currentUser.displayName || 'ক্রেতা'}
                </p>
                <p className="text-xs text-slate-600">{currentUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Gmail দিয়ে লগইন করুন
                  </p>
                  <p className="text-xs text-slate-600">
                    লগইন করলে আপনার ঠিকানা অটো-ফিল থাকবে ও আগের অর্ডারগুলো দেখতে পারবেন।
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => void handleSignIn()}
                  className="px-4 py-2 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
                >
                  {isSigningIn ? 'লগইন হচ্ছে...' : 'Google দিয়ে লগইন'}
                </button>
              </div>
              {authError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1.5">
                  <p>{authError.message}</p>
                  {authError.isPopupBlocked && typeof window !== 'undefined' && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block font-semibold text-[#EA580C] underline"
                    >
                      নতুন ট্যাবে খুলে লগইন করুন
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Saved Shipping Address Form */}
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              সেভ করা ডেলিভারি তথ্য (পরের অর্ডারে অটো বসবে)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="আপনার নাম"
                className="px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D]"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="মোবাইল নম্বর"
                className="px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D] tabular-nums"
              />
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="সম্পূর্ণ ঠিকানা (যেমন: ধানমন্ডি, ঢাকা)"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D]"
            />
            <div className="flex items-center justify-between gap-3">
              {profileMsg ? (
                <span className="text-xs font-medium text-[#15803D]">{profileMsg}</span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? 'সেভ হচ্ছে...' : 'ঠিকানা সেভ করুন'}</span>
              </button>
            </div>
          </form>

          {/* Order History */}
          {currentUser && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">আমার অর্ডারসমূহ</h3>
              {loadingOrders ? (
                <p className="text-sm text-slate-500">লোড হচ্ছে...</p>
              ) : orders.length === 0 ? (
                <div className="py-8 text-center border border-slate-200 rounded-xl bg-[#FAFAFA]">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">এখনো কোনো অর্ডার পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl border border-slate-200 bg-[#FAFAFA] space-y-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {order.id}
                        </span>
                        <span className="text-xs font-semibold text-[#15803D]">
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-0.5">
                        {order.items.map((i) => (
                          <div key={i.productId} className="flex justify-between">
                            <span>
                              {i.title} × {i.quantity}
                            </span>
                            <span className="tabular-nums font-medium">
                              {formatBDT(i.price * i.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-900 tabular-nums">
                        <span>
                          মোট (ডেলিভারি {formatBDT(order.deliveryCharge)} সহ)
                        </span>
                        <span className="text-[#15803D]">{formatBDT(order.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
