/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ShoppingBag, ShieldCheck, UserCheck } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  CATEGORY_LABELS,
  CartItem,
  CategoryId,
  CustomerProfile,
  LocalSavedShipping,
  Product,
} from '@/src/types/store';
import { formatBDT } from '@/src/lib/delivery';
import {
  auth,
  db,
  getUserEmail,
  googleProvider,
  handleFirestoreError,
  isAdminUser,
  isVerifiedUser,
  OperationType,
} from '@/src/lib/firebase';
import { STARTER_PRODUCTS } from '@/src/data/starterProducts';
import { Header } from '@/src/components/Header';
import { HeroSection } from '@/src/components/HeroSection';
import { ProductCard } from '@/src/components/ProductCard';
import { ProductDetailModal } from '@/src/components/ProductDetailModal';
import { CartCheckoutDrawer } from '@/src/components/CartCheckoutDrawer';
import { MyOrdersModal } from '@/src/components/MyOrdersModal';
import { AdminPanelModal } from '@/src/components/AdminPanelModal';

const CART_STORAGE_KEY = 'voktajitao_cart_v1';
const SHIPPING_STORAGE_KEY = 'voktajitao_shipping_v1';

const CATEGORY_TABS: CategoryId[] = [
  'all',
  'electronics',
  'cosmetics',
  'clothing',
  'problem-solving',
];

function readInitialCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readInitialShipping(): LocalSavedShipping {
  try {
    const raw = localStorage.getItem(SHIPPING_STORAGE_KEY);
    if (!raw) return { name: '', phone: '', address: '' };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed?.name === 'string' ? parsed.name : '',
      phone: typeof parsed?.phone === 'string' ? parsed.phone : '',
      address: typeof parsed?.address === 'string' ? parsed.address : '',
    };
  } catch {
    return { name: '', phone: '', address: '' };
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isDynamicAdmin, setIsDynamicAdmin] = useState(false);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const syncedSessionUidRef = useRef<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<CartItem[]>(readInitialCart);
  const [savedShipping, setSavedShipping] =
    useState<LocalSavedShipping>(readInitialShipping);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  // Listen to Firebase Auth state, record login in /users, claim pending admin invite, and load customer profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (!user) {
        syncedSessionUidRef.current = null;
        setIsDynamicAdmin(false);
        return;
      }

      if (isVerifiedUser(user)) {
        const email = (getUserEmail(user) || '').toLowerCase();

        // 1. Record / update user account login in /users/{uid} once per session
        if (syncedSessionUidRef.current !== user.uid && email) {
          syncedSessionUidRef.current = user.uid;
          const userPath = `users/${user.uid}`;
          try {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (!userSnap.exists()) {
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: email.slice(0, 160),
                displayName: (user.displayName || '').trim().slice(0, 120),
                photoURL: (user.photoURL || '').trim().slice(0, 500),
                provider: 'google.com',
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
              });
            } else {
              await updateDoc(doc(db, 'users', user.uid), {
                email: email.slice(0, 160),
                displayName: (user.displayName || '').trim().slice(0, 120),
                photoURL: (user.photoURL || '').trim().slice(0, 500),
                lastLoginAt: serverTimestamp(),
              });
            }
          } catch (userErr) {
            try {
              handleFirestoreError(userErr, OperationType.WRITE, userPath);
            } catch {
              // Logged cleanly without disrupting session
            }
          }

          // 2. Check if this user has a pending admin invite by email and claim /admins/{uid}
          if (!isAdminUser(user)) {
            try {
              const adminSnap = await getDoc(doc(db, 'admins', user.uid));
              if (!adminSnap.exists()) {
                const inviteQuery = query(
                  collection(db, 'adminInvites'),
                  where('email', '==', email)
                );
                const inviteSnap = await getDocs(inviteQuery);
                if (!inviteSnap.empty) {
                  const firstInvite = inviteSnap.docs[0];
                  const inviteData = firstInvite.data() as { addedByEmail?: string };
                  await setDoc(doc(db, 'admins', user.uid), {
                    uid: user.uid,
                    email: email.slice(0, 160),
                    displayName: (user.displayName || '').trim().slice(0, 120),
                    addedByEmail: (inviteData.addedByEmail || '').slice(0, 160),
                    inviteId: firstInvite.id,
                    role: 'admin',
                    createdAt: serverTimestamp(),
                  });
                }
              }
            } catch (inviteErr) {
              try {
                handleFirestoreError(inviteErr, OperationType.WRITE, `admins/${user.uid}`);
              } catch {
                // Logged cleanly without disrupting customer flow
              }
            }
          }
        }

        // 3. Load saved shipping profile from /customers/{uid}
        const path = `customers/${user.uid}`;
        try {
          const snap = await getDoc(doc(db, 'customers', user.uid));
          if (snap.exists()) {
            const data = snap.data() as CustomerProfile;
            const nextShipping: LocalSavedShipping = {
              name: data.name || user.displayName || '',
              phone: data.phone || '',
              address: data.address || '',
            };
            setSavedShipping(nextShipping);
            try {
              localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(nextShipping));
            } catch {
              // Ignore
            }
          } else if (user.displayName) {
            setSavedShipping((prev) => ({
              name: prev.name || user.displayName || '',
              phone: prev.phone,
              address: prev.address,
            }));
          }
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.GET, path);
          } catch {
            // Structured error logged without breaking auth initialization
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // Real-time listener on /admins/{uid} so dynamically added or removed admins update immediately
  useEffect(() => {
    if (!currentUser || !isVerifiedUser(currentUser)) {
      setIsDynamicAdmin(false);
      return;
    }
    const adminDocPath = `admins/${currentUser.uid}`;
    const unsub = onSnapshot(
      doc(db, 'admins', currentUser.uid),
      (snap) => {
        setIsDynamicAdmin(snap.exists() && snap.data()?.role === 'admin');
      },
      (err) => {
        setIsDynamicAdmin(false);
        try {
          handleFirestoreError(err, OperationType.GET, adminDocPath);
        } catch {
          // Structured error logged
        }
      }
    );
    return () => unsub();
  }, [currentUser]);

  // Listen to public products collection
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list: Product[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Product, 'id'>),
        }));
        setFirestoreProducts(list);
        setLoadingProducts(false);
      },
      (err) => {
        setLoadingProducts(false);
        handleFirestoreError(err, OperationType.LIST, 'products');
      }
    );
    return () => unsub();
  }, []);

  // Show live Firestore products once populated; fallback to STARTER_PRODUCTS on fresh empty store
  const catalogProducts = useMemo(() => {
    return firestoreProducts.length > 0 ? firestoreProducts : STARTER_PRODUCTS;
  }, [firestoreProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogProducts.filter((product) => {
      const matchesCat =
        activeCategory === 'all' || product.category === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        product.title.toLowerCase().includes(q) ||
        product.shortFeature.toLowerCase().includes(q) ||
        CATEGORY_LABELS[product.category].toLowerCase().includes(q)
      );
    });
  }, [catalogProducts, activeCategory, searchQuery]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const getCartQuantity = (productId: string) =>
    cart.find((item) => item.productId === productId)?.quantity ?? 0;

  const handleAddToCart = (product: Product, quantity = 1) => {
    if (!product.inStock) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(99, i.quantity + quantity) }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          regularPrice: product.regularPrice,
          imageUrl: product.imageUrl,
          quantity: Math.min(99, quantity),
        },
      ];
    });
    setJustAddedId(product.id);
    setTimeout(() => {
      setJustAddedId((curr) => (curr === product.id ? null : curr));
    }, 900);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(99, quantity) }
          : i
      )
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSaveLocalShipping = (shipping: LocalSavedShipping) => {
    setSavedShipping(shipping);
    try {
      localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(shipping));
    } catch {
      // Ignore
    }
  };

  const handleGoogleSignIn = async (): Promise<User | null> => {
    syncedSessionUidRef.current = null;
    const result = await signInWithPopup(auth, googleProvider);
    setCurrentUser(result.user);
    setAuthReady(true);
    return result.user;
  };

  const handleSignOut = async () => {
    syncedSessionUidRef.current = null;
    setIsDynamicAdmin(false);
    await signOut(auth);
    setCurrentUser(null);
  };

  const isAdmin = isAdminUser(currentUser) || isDynamicAdmin;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-slate-900">
      <Header
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1">
        <HeroSection
          currentUser={currentUser}
          savedCustomerName={savedShipping.name}
          isAdmin={isAdmin}
          onBrowseProducts={() => {
            document
              .getElementById('catalog-section')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onOpenMyOrders={() => setIsMyOrdersOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />

        {/* Main Storefront Catalog */}
        <section
          id="catalog-section"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6"
        >
          {/* Category Tabs & Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {CATEGORY_TABS.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#15803D] text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-72 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="প্রোডাক্ট খুঁজুন..."
                aria-label="প্রোডাক্ট খুঁজুন"
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#15803D]"
              />
            </div>
          </div>

          {/* Section Title */}
          <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {CATEGORY_LABELS[activeCategory]}
            </h2>
            <span className="text-xs sm:text-sm text-slate-500 tabular-nums">
              মোট {filteredProducts.length}টি প্রোডাক্ট
            </span>
          </div>

          {/* Product Grid */}
          {loadingProducts && firestoreProducts.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-slate-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-4/5" />
                    <div className="h-9 bg-slate-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center bg-white border border-slate-200 rounded-xl space-y-3">
              <p className="text-base font-semibold text-slate-900">
                এই ক্যাটাগরি বা সার্চে কোনো প্রোডাক্ট পাওয়া যায়নি
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-[#15803D] text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                সব প্রোডাক্ট দেখুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartQuantity={getCartQuantity(product.id)}
                  justAdded={justAddedId === product.id}
                  onAddToCart={(p) => handleAddToCart(p, 1)}
                  onViewDetails={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/official_logo_5b27249c.png"
              alt="ভোক্তা-জিতাও"
              className="w-11 h-11 object-contain shrink-0"
            />
            <div>
              <p className="text-base font-bold">
                <span className="text-[#14532D]">ভোক্তা-</span>
                <span className="text-[#EA580C]">জিতাও</span>{' '}
                <span className="text-xs font-normal text-slate-500">(voktajitao)</span>
              </p>
              <p className="text-xs font-medium text-[#15803D]">
                সাশ্রয়ী দামে ভোক্তার স্বস্তি
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <span>ঢাকায় ডেলিভারি ৳৭০ · সারাদেশে ৳১০০ (ক্যাশ অন ডেলিভারি)</span>
            <button
              type="button"
              onClick={() => setIsMyOrdersOpen(true)}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-[#15803D] cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>আমার অর্ডার</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAdminOpen(true)}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-[#EA580C] cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>অ্যাডমিন প্যানেল</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Slim Floating Bottom Cart Bar (visible when items added, well under 15% mobile height) */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full px-4 py-3 bg-[#14532D] hover:bg-[#15803D] text-white rounded-xl shadow-lg flex items-center justify-between gap-3 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-sm font-semibold tabular-nums">
              <ShoppingBag className="w-4 h-4 text-[#F97316]" />
              <span>{cartCount}টি প্রোডাক্ট কার্টে</span>
              <span aria-hidden="true">·</span>
              <span>{formatBDT(cartSubtotal)}</span>
            </div>
            <span className="px-3 py-1 bg-[#EA580C] text-white text-xs font-bold rounded-lg whitespace-nowrap">
              অর্ডার করুন →
            </span>
          </button>
        </div>
      )}

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        cartQuantity={selectedProduct ? getCartQuantity(selectedProduct.id) : 0}
        onClose={() => setSelectedProduct(null)}
        onAddQuantity={(p, qty) => handleAddToCart(p, qty)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <CartCheckoutDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        allProducts={catalogProducts}
        currentUser={currentUser}
        savedShipping={savedShipping}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onAddProduct={(p) => handleAddToCart(p, 1)}
        onClearCart={() => setCart([])}
        onSaveLocalShipping={handleSaveLocalShipping}
        onGoogleSignIn={handleGoogleSignIn}
      />

      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        currentUser={currentUser}
        savedShipping={savedShipping}
        onSaveLocalShipping={handleSaveLocalShipping}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />

      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        currentUser={currentUser}
        authReady={authReady}
        isAdmin={isAdmin}
        firestoreProducts={firestoreProducts}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
