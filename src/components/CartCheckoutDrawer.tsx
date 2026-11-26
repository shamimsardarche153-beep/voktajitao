import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  CartItem,
  LocalSavedShipping,
  OrderRecord,
  Product,
} from '@/src/types/store';
import {
  calculateDiscountPercent,
  detectDeliveryFromAddress,
  formatBDT,
} from '@/src/lib/delivery';
import {
  db,
  getAuthErrorInfo,
  getUserEmail,
  handleFirestoreError,
  isVerifiedUser,
  OperationType,
} from '@/src/lib/firebase';
import { ProductImage } from './ProductImage';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  allProducts: Product[];
  currentUser: User | null;
  savedShipping: LocalSavedShipping;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onAddProduct: (product: Product) => void;
  onClearCart: () => void;
  onSaveLocalShipping: (shipping: LocalSavedShipping) => void;
  onGoogleSignIn: () => Promise<User | null>;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  allProducts,
  currentUser,
  savedShipping,
  onUpdateQuantity,
  onRemoveItem,
  onAddProduct,
  onClearCart,
  onSaveLocalShipping,
  onGoogleSignIn,
}) => {
  const [name, setName] = useState(savedShipping.name || '');
  const [phone, setPhone] = useState(savedShipping.phone || '');
  const [address, setAddress] = useState(savedShipping.address || '');
  const [note, setNote] = useState('');
  const [isEditingSaved, setIsEditingSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);
  const [linkedAfterOrder, setLinkedAfterOrder] = useState(false);

  const hasSavedProfile = Boolean(
    savedShipping.name.trim() &&
      savedShipping.phone.trim() &&
      savedShipping.address.trim()
  );

  // Sync saved shipping into form whenever savedShipping updates and user isn't mid-edit
  useEffect(() => {
    if (savedShipping.name && !name) setName(savedShipping.name);
    if (savedShipping.phone && !phone) setPhone(savedShipping.phone);
    if (savedShipping.address && !address) setAddress(savedShipping.address);
  }, [savedShipping, name, phone, address]);

  useEffect(() => {
    if (isOpen && hasSavedProfile) {
      setName(savedShipping.name);
      setPhone(savedShipping.phone);
      setAddress(savedShipping.address);
      setIsEditingSaved(false);
    } else if (isOpen && !hasSavedProfile) {
      setIsEditingSaved(true);
    }
  }, [isOpen, hasSavedProfile, savedShipping]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const deliveryInfo = useMemo(
    () => detectDeliveryFromAddress(address),
    [address]
  );

  const grandTotal = subtotal + (deliveryInfo.hasAddress ? deliveryInfo.charge : 0);

  // Upsell items: up to 4 in-stock products not currently in the cart
  const upsellProducts = useMemo(() => {
    const cartIds = new Set(cart.map((c) => c.productId));
    return allProducts
      .filter((p) => p.inStock && !cartIds.has(p.id))
      .slice(0, 4);
  }, [allProducts, cart]);

  if (!isOpen) return null;

  const handleUseSavedSummary = () => {
    setIsEditingSaved(false);
    setFormError('');
  };

  const handleGoogleConnectAndSync = async (isPostOrder = false) => {
    setIsSigningIn(true);
    setFormError('');
    try {
      const user = await onGoogleSignIn();
      if (user && name.trim().length >= 2 && phone.trim().length >= 6 && address.trim().length >= 5) {
        const profilePath = `customers/${user.uid}`;
        try {
          await setDoc(doc(db, 'customers', user.uid), {
            uid: user.uid,
            email: getUserEmail(user) || '',
            name: name.trim().slice(0, 80),
            phone: phone.trim().slice(0, 25),
            address: address.trim().slice(0, 300),
            updatedAt: serverTimestamp(),
          });
          if (isPostOrder) {
            setLinkedAfterOrder(true);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, profilePath);
        }
      }
    } catch (err) {
      setFormError(getAuthErrorInfo(err).message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();
    const cleanNote = note.trim();

    if (cart.length === 0) {
      setFormError('কার্টে অন্তত একটি প্রোডাক্ট যোগ করুন।');
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 80) {
      setFormError('অনুগ্রহ করে সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর)।');
      setIsEditingSaved(true);
      return;
    }
    if (!/^[0-9+\-\s()]{6,25}$/.test(cleanPhone)) {
      setFormError('সঠিক মোবাইল নম্বর দিন (যেমন: 01712345678)।');
      setIsEditingSaved(true);
      return;
    }
    if (cleanAddress.length < 5 || cleanAddress.length > 300) {
      setFormError('অনুগ্রহ করে ডেলিভারির সম্পূর্ণ ঠিকানা লিখুন।');
      setIsEditingSaved(true);
      return;
    }

    setIsSubmitting(true);
    const { zone, charge } = detectDeliveryFromAddress(cleanAddress);
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const orderItems = cart.slice(0, 50).map((item) => ({
      productId: item.productId.slice(0, 128),
      title: item.title.slice(0, 120),
      price: item.price,
      quantity: Math.min(99, Math.max(1, Math.floor(item.quantity))),
      imageUrl: item.imageUrl.slice(0, 500),
    }));

    const orderPayload = {
      customerUid: currentUser?.uid ?? '',
      customerName: cleanName.slice(0, 80),
      phone: cleanPhone.slice(0, 25),
      address: cleanAddress.slice(0, 300),
      deliveryZone: zone,
      deliveryCharge: charge,
      subtotal,
      totalAmount: subtotal + charge,
      note: cleanNote.slice(0, 300),
      items: orderItems,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'orders', orderId), orderPayload);

      // Save shipping profile locally for instant auto-fill on next visit
      onSaveLocalShipping({
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
      });

      // Also sync to Gmail-linked Firestore customer profile if already signed in
      if (currentUser && isVerifiedUser(currentUser)) {
        try {
          await setDoc(doc(db, 'customers', currentUser.uid), {
            uid: currentUser.uid,
            email: getUserEmail(currentUser) || '',
            name: cleanName.slice(0, 80),
            phone: cleanPhone.slice(0, 25),
            address: cleanAddress.slice(0, 300),
            updatedAt: serverTimestamp(),
          });
        } catch (profileErr) {
          handleFirestoreError(
            profileErr,
            OperationType.WRITE,
            `customers/${currentUser.uid}`
          );
        }
      }

      setConfirmedOrder({
        ...orderPayload,
        id: orderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setLinkedAfterOrder(Boolean(currentUser));
      onClearCart();
      setNote('');
    } catch (err) {
      setFormError('অর্ডার সাবমিট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      try {
        handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
      } catch {
        // Logged via handleFirestoreError
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="শপিং কার্ট ও অর্ডার ড্রয়ার"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#EA580C]" />
            <h2 className="text-lg font-bold text-slate-900">
              {confirmedOrder ? 'অর্ডার কনফার্মেশন' : 'আপনার কার্ট ও অর্ডার'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              onClose();
            }}
            aria-label="কার্ট বন্ধ করুন"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {confirmedOrder ? (
            /* Order Receipt Screen */
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-[#15803D] mx-auto" />
                <h3 className="text-xl font-bold text-slate-900">
                  অর্ডার সফলভাবে গ্রহণ করা হয়েছে!
                </h3>
                <p className="text-sm text-slate-700">
                  অর্ডার আইডি:{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {confirmedOrder.id}
                  </span>
                </p>
                <p className="text-xs text-slate-600">
                  শীঘ্রই আমাদের প্রতিনিধি আপনার সাথে ফোনে যোগাযোগ করবেন (ক্যাশ অন ডেলিভারি)।
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-[#FAFAFA] space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">ক্রেতার নাম:</span>
                  <span className="font-semibold text-slate-900">
                    {confirmedOrder.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">মোবাইল:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {confirmedOrder.phone}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 shrink-0">ঠিকানা:</span>
                  <span className="font-medium text-slate-900 text-right">
                    {confirmedOrder.address}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                  {confirmedOrder.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex justify-between text-xs text-slate-700"
                    >
                      <span>
                        {item.title} × {item.quantity}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatBDT(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 pt-2.5 space-y-1 tabular-nums">
                  <div className="flex justify-between text-slate-600">
                    <span>ডেলিভারি চার্জ ({confirmedOrder.deliveryZone === 'inside_dhaka' ? 'ঢাকার মধ্যে' : 'ঢাকার বাহিরে'}):</span>
                    <span>{formatBDT(confirmedOrder.deliveryCharge)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#15803D]">
                    <span>সর্বমোট বিল (COD):</span>
                    <span>{formatBDT(confirmedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Seamless Gmail Sync CTA for first-time guest orders */}
              {!currentUser && !linkedAfterOrder && (
                <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/60 space-y-2.5">
                  <p className="text-sm font-semibold text-slate-900">
                    পরের বার আর ঠিকানা লিখতে না চাইলে Gmail-এ সেভ রাখুন
                  </p>
                  <p className="text-xs text-slate-600">
                    একবার Google দিয়ে লগইন করলে আপনার নাম, ফোন ও ঠিকানা সবসময় অটো-লগইন
                    অবস্থায় সেভ থাকবে এবং যেকোনো ডিভাইস থেকে অর্ডার ট্র্যাক করতে পারবেন।
                  </p>
                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={() => handleGoogleConnectAndSync(true)}
                    className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSigningIn
                      ? 'লগইন হচ্ছে...'
                      : 'Google (Gmail) দিয়ে অটো-সেভ করুন'}
                  </button>
                </div>
              )}

              {linkedAfterOrder && (
                <p className="text-xs text-center font-medium text-[#15803D]">
                  ✓ আপনার নাম, ফোন ও ঠিকানা আপনার অ্যাকাউন্টে সেভ রয়েছে—পরের বার অটো চলে আসবে।
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  onClose();
                }}
                className="w-full py-3 bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                আরও কেনাকাটা করুন
              </button>
            </div>
          ) : cart.length === 0 ? (
            /* Empty Cart State */
            <div className="py-12 text-center space-y-4">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-900">
                  আপনার কার্ট এখন খালি
                </p>
                <p className="text-sm text-slate-500">
                  পছন্দের প্রোডাক্টের “Add to Cart” বাটনে চাপলেই এখানে যোগ হয়ে যাবে।
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                প্রোডাক্ট দেখুন
              </button>
            </div>
          ) : (
            /* Active Cart + Upsells + Auto-Fill Checkout Form */
            <>
              {/* 1. Cart Line Items */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  নির্বাচিত প্রোডাক্ট ({cart.reduce((s, i) => s + i.quantity, 0)}টি)
                </h3>
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="p-3 bg-white flex items-center gap-3"
                    >
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <ProductImage src={item.imageUrl} alt={item.title} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.title}
                        </p>
                        <p className="text-xs font-semibold text-[#15803D] tabular-nums">
                          {formatBDT(item.price)} × {item.quantity} ={' '}
                          {formatBDT(item.price * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="inline-flex items-center border border-slate-200 rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.productId, item.quantity - 1)
                            }
                            aria-label="সংখ্যা কমান"
                            className="p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-bold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.productId, item.quantity + 1)
                            }
                            aria-label="সংখ্যা বাড়ান"
                            className="p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId)}
                          aria-label="রিমুভ করুন"
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Checkout Upsell Strip */}
              {upsellProducts.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    আপনি চাইলে এটার সাথে এগুলোও নিতে পারেন
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {upsellProducts.map((p) => {
                      const pct = calculateDiscountPercent(p.regularPrice, p.price);
                      return (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl border border-slate-200 bg-[#FAFAFA] flex flex-col justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-11 h-9 rounded-md overflow-hidden bg-white shrink-0 border border-slate-200">
                              <ProductImage src={p.imageUrl} alt={p.title} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                                {p.title}
                              </p>
                              <div className="flex items-baseline gap-1 text-xs tabular-nums">
                                <span className="font-bold text-[#15803D]">
                                  {formatBDT(p.price)}
                                </span>
                                {pct > 0 && (
                                  <span className="text-[11px] text-[#EA580C] font-medium">
                                    -{pct}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAddProduct(p)}
                            className="w-full py-1.5 px-2 bg-white hover:bg-[#EA580C] text-[#EA580C] hover:text-white border border-orange-200 hover:border-[#EA580C] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            + সাথে যোগ করুন
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Customer Shipping & Order Form */}
              <form onSubmit={handleSubmitOrder} className="space-y-4 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    অর্ডার করার তথ্য (Cash on Delivery)
                  </h3>
                  {!currentUser ? (
                    <button
                      type="button"
                      disabled={isSigningIn}
                      onClick={() => handleGoogleConnectAndSync(false)}
                      className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
                    >
                      {isSigningIn ? 'লগইন হচ্ছে...' : 'Gmail দিয়ে অটো-ফিল'}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#15803D]">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Gmail লগইন যুক্ত</span>
                    </span>
                  )}
                </div>

                {/* Returning customer saved summary card */}
                {hasSavedProfile && !isEditingSaved ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#15803D]">
                        ✓ আপনার সেভ করা ঠিকানা অটো-ফিল হয়েছে
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingSaved(true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#EA580C] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>পরিবর্তন করুন</span>
                      </button>
                    </div>
                    <div className="text-sm text-slate-800 space-y-0.5">
                      <p className="font-semibold">{name}</p>
                      <p className="tabular-nums text-slate-700">{phone}</p>
                      <p className="text-slate-700">{address}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hasSavedProfile && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleUseSavedSummary}
                          className="text-xs font-medium text-[#15803D] hover:underline cursor-pointer"
                        >
                          আগের সেভ করা তথ্য ব্যবহার করুন
                        </button>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        আপনার নাম *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="যেমন: মো. সাইফুল ইসলাম"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        মোবাইল নম্বর *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D] tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        সম্পূর্ণ ঠিকানা * (ঢাকা বা জেলার নাম লিখুন)
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="বাসা/রোড নং, এলাকা, থানা ও জেলা (যেমন: মিরপুর ১০, ঢাকা অথবা চট্টগ্রাম)"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                      />
                    </div>
                  </div>
                )}

                {/* Purely Automatic Delivery Charge Notice (No Manual Toggle) */}
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#FAFAFA] border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-[#15803D] shrink-0" />
                    {deliveryInfo.hasAddress ? (
                      <span>
                        ঠিকানা অনুযায়ী অটো ডেলিভারি:{' '}
                        <strong className="text-slate-900">
                          {deliveryInfo.zone === 'inside_dhaka'
                            ? 'ঢাকার মধ্যে'
                            : 'ঢাকার বাহিরে'}
                        </strong>
                      </span>
                    ) : (
                      <span>ঠিকানা লিখলে ডেলিভারি চার্জ অটো হিসাব হবে (ঢাকা ৳৭০ / বাইরে ৳১০০)</span>
                    )}
                  </div>
                  {deliveryInfo.hasAddress && (
                    <span className="font-bold text-[#15803D] tabular-nums shrink-0">
                      {formatBDT(deliveryInfo.charge)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    বিশেষ কোনো নোট (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="যেমন: কালার বা সাইজ সংক্রান্ত তথ্য"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                  />
                </div>

                {/* Bill Breakdown */}
                <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-slate-200 space-y-1.5 text-sm tabular-nums">
                  <div className="flex justify-between text-slate-600">
                    <span>প্রোডাক্টের মোট মূল্য</span>
                    <span>{formatBDT(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      ডেলিভারি চার্জ{' '}
                      {deliveryInfo.hasAddress
                        ? deliveryInfo.zone === 'inside_dhaka'
                          ? '(ঢাকার মধ্যে)'
                          : '(ঢাকার বাহিরে)'
                        : '(ঠিকানা অনুযায়ী অটো)'}
                    </span>
                    <span>
                      {deliveryInfo.hasAddress ? formatBDT(deliveryInfo.charge) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
                    <span>সর্বমোট পরিশোধযোগ্য</span>
                    <span className="text-[#15803D]">{formatBDT(grandTotal)}</span>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {isSubmitting
                    ? 'অর্ডার কনফার্ম হচ্ছে...'
                    : `অর্ডার কনফার্ম করুন · ${formatBDT(grandTotal)}`}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
