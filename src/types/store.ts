export type CategoryId =
  | 'all'
  | 'electronics'
  | 'cosmetics'
  | 'clothing'
  | 'problem-solving';

export type ProductCategory = Exclude<CategoryId, 'all'>;

export interface Product {
  id: string;
  title: string;
  category: ProductCategory;
  regularPrice: number;
  price: number;
  shortFeature: string;
  description: string;
  features: string[];
  imageUrl: string;
  inStock: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  regularPrice: number;
  imageUrl: string;
  quantity: number;
}

export interface CustomerProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  updatedAt?: unknown;
}

export interface LocalSavedShipping {
  name: string;
  phone: string;
  address: string;
}

export type DeliveryZone = 'inside_dhaka' | 'outside_dhaka';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItemPayload {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface OrderRecord {
  id: string;
  customerUid: string;
  customerName: string;
  phone: string;
  address: string;
  deliveryZone: DeliveryZone;
  deliveryCharge: number;
  subtotal: number;
  totalAmount: number;
  note: string;
  items: OrderItemPayload[];
  status: OrderStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  all: 'সব প্রোডাক্ট',
  electronics: 'ইলেকট্রনিক্স',
  cosmetics: 'কসমেটিক্স',
  clothing: 'ক্লথিং',
  'problem-solving': 'হট প্রবলেম সলভিং',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending (অপেক্ষমাণ)',
  confirmed: 'Confirmed (নিশ্চিত)',
  shipped: 'Shipped (ডেলিভারিতে)',
  delivered: 'Delivered (সম্পন্ন)',
  cancelled: 'Cancelled (বাতিল)',
};

export interface UserAccountRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  provider: 'google.com';
  createdAt?: unknown;
  lastLoginAt?: unknown;
}

export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string;
  addedByEmail: string;
  inviteId: string;
  role: 'admin';
  createdAt?: unknown;
}

export interface AdminInviteRecord {
  id: string;
  email: string;
  addedByUid: string;
  addedByEmail: string;
  createdAt?: unknown;
}

