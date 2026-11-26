import { Product } from '@/src/types/store';

export const PRESET_PRODUCT_IMAGES = [
  {
    label: 'Wireless Earbuds',
    url: '/src/assets/images/product_wireless_earbuds_1795630107453.jpg',
  },
  {
    label: 'Smart Watch',
    url: '/src/assets/images/product_smartwatch_band_1795630107274.jpg',
  },
  {
    label: 'Vitamin C Serum',
    url: '/src/assets/images/product_niacinamide_serum_1795630107808.jpg',
  },
  {
    label: 'SPF 50 Sunscreen',
    url: '/src/assets/images/product_sunscreen_gel_1795630108342.jpg',
  },
  {
    label: 'Cotton Polo Shirt',
    url: '/src/assets/images/product_polo_tshirt_1795630108692.jpg',
  },
  {
    label: 'Classic Panjabi',
    url: '/src/assets/images/product_panjabi_kurta_1795630109976.jpg',
  },
  {
    label: 'USB Mini Juicer',
    url: '/src/assets/images/product_mini_juicer_1795630109950.jpg',
  },
  {
    label: 'Electric Lint Remover',
    url: '/src/assets/images/product_lint_remover_1795630109991.jpg',
  },
];

export const STARTER_PRODUCTS: Product[] = [
  {
    id: 'starter-m10-earbuds',
    title: 'M10 Pro TWS Wireless Earbuds',
    category: 'electronics',
    regularPrice: 1450,
    price: 690,
    shortFeature: 'ডিজিটাল ব্যাটারি ডিসপ্লে ও ক্রিস্টাল ক্লিয়ার সাউন্ড',
    description:
      'প্রতিদিনের কল, মিউজিক ও গেমিংয়ের জন্য সেরা বাজেট ওয়্যারলেস ইয়ারবাড। এর পাওয়ার ব্যাংক কেসে আছে ডিজিটাল LED ব্যাটারি ইন্ডিকেটর, যা জরুরি মুহূর্তে ফোনও চার্জ করতে সাহায্য করে।',
    features: [
      'Bluetooth 5.3 ফাস্ট অটো-পেয়ারিং',
      'ডিজিটাল LED চার্জিং কেস ডিসপ্লে',
      'এক চার্জে ৪–৫ ঘণ্টা ব্যাকআপ',
      'পানি ও ঘাম প্রতিরোধী IPX5 ডিজাইন',
    ],
    imageUrl: '/src/assets/images/product_wireless_earbuds_1795630107453.jpg',
    inStock: true,
  },
  {
    id: 'starter-t900-smartwatch',
    title: 'T900 Ultra Smart Watch (Orange Edition)',
    category: 'electronics',
    regularPrice: 2200,
    price: 1190,
    shortFeature: 'ব্লুটুথ কলিং, বড় HD ডিসপ্লে ও অরেঞ্জ স্পোর্টস স্ট্র্যাপ',
    description:
      'হাতে প্রিমিয়াম লুকের পাশাপাশি ব্লুটুথ কলিং, নোটিফিকেশন অ্যালার্ট ও হেলথ ট্র্যাকিং সুবিধা। ছেলে-মেয়ে সবার হাতেই দারুণ মানানসই।',
    features: [
      '২.০৯ ইঞ্চি বড় HD টাচ ডিসপ্লে',
      'সরাসরি ঘড়ি থেকেই ব্লুটুথ কল রিসিভ ও ডায়াল',
      'হোয়াটসঅ্যাপ ও মেসেজ নোটিফিকেশন',
      'ওয়্যারলেস ম্যাগনেটিক চার্জার বক্সে থাকছে',
    ],
    imageUrl: '/src/assets/images/product_smartwatch_band_1795630107274.jpg',
    inStock: true,
  },
  {
    id: 'starter-vitc-serum',
    title: 'Aura Vitamin C & Hyaluronic Glow Serum',
    category: 'cosmetics',
    regularPrice: 850,
    price: 490,
    shortFeature: 'ত্বকের উজ্জ্বলতা বাড়াতে ও দাগ কমাতে কার্যকর ৩০মি.লি. সিরাম',
    description:
      'নন-স্টিকি ও দ্রুত শোষিত হওয়া ভিটামিন সি ও হায়ালুরোনিক অ্যাসিড সমৃদ্ধ ফেস সিরাম। নিয়মিত ব্যবহারে রোদে পোড়া দাগ কমে এবং ত্বক থাকে হাইড্রেটেড ও উজ্জ্বল।',
    features: [
      'সব ধরনের ত্বকের জন্য উপযোগী ফর্মুলা',
      'ডার্ক স্পট ও আনইভেন স্কিনটোন কমাতে সাহায্য করে',
      '৩০মি.লি. এয়ারটাইট ড্রপার বোতল',
      'প্যারাবেন ও ক্ষতিকর কেমিক্যাল মুক্ত',
    ],
    imageUrl: '/src/assets/images/product_niacinamide_serum_1795630107808.jpg',
    inStock: true,
  },
  {
    id: 'starter-sunscreen-spf50',
    title: 'Hydra Matte UV Sunscreen Gel SPF 50+',
    category: 'cosmetics',
    regularPrice: 950,
    price: 580,
    shortFeature: 'হোয়াইট কাস্ট ছাড়া লাইটওয়েট UVA+UVB সান প্রোটেকশন',
    description:
      'বাংলাদেশের গরম ও আর্দ্র আবহাওয়ার কথা মাথায় রেখে তৈরি ম্যাট ফিনিশ সানস্ক্রিন জেল। মুখে তেলতেলে ভাব বা সাদা দাগ ফেলে না।',
    features: [
      'SPF 50+ ব্রড স্পেকট্রাম UVA ও UVB সুরক্ষা',
      'জিরো হোয়াইট কাস্ট ও নন-গ্রিজি ম্যাট ফিনিশ',
      'ওয়াটার-রেজিস্ট্যান্ট ও ফ্র্যাগ্র্যান্স-ফ্রি',
      '৫০মি.লি. ট্র্যাভেল-ফ্রেন্ডলি টিউব',
    ],
    imageUrl: '/src/assets/images/product_sunscreen_gel_1795630108342.jpg',
    inStock: true,
  },
  {
    id: 'starter-forest-polo',
    title: 'Premium Cotton Pique Polo Shirt',
    category: 'clothing',
    regularPrice: 1100,
    price: 650,
    shortFeature: '১০০% আরামদায়ক কটন পিকে ফ্যাব্রিক — অফিস ও ক্যাজুয়াল লুক',
    description:
      'সফট ও বাতাস চলাচল উপযোগী ২২০ GSM কটন পিকে কাপড়ে তৈরি ফরেস্ট গ্রিন পোলো টি-শার্ট। ধোয়ার পরেও রঙ জ্বলে না বা কুঁচকে যায় না।',
    features: [
      '২২০ GSM ১০০% রিং-স্পান কটন পিকে',
      'কালার গ্যারান্টি ও নিখুঁত সেলাই',
      'স্লিম-কমফোর্ট ফিট (M, L, XL অ্যাভেইলেবল)',
      'গরমে সারাদিন আরামদায়ক অনুভূতি',
    ],
    imageUrl: '/src/assets/images/product_polo_tshirt_1795630108692.jpg',
    inStock: true,
  },
  {
    id: 'starter-cotton-panjabi',
    title: 'Classic Olive Cotton Embroidered Panjabi',
    category: 'clothing',
    regularPrice: 1850,
    price: 1150,
    shortFeature: 'সুতি কাপড়ের ওপর নিখুঁত এমব্রয়ডারি — উৎসব ও জুম্মার জন্য সেরা',
    description:
      'প্রিমিয়াম সুতি কাপড় ও গলার প্লেটে মার্জিত সুতোর কাজ করা অলিভ গ্রিন পাঞ্জাবি। হালকা ওজনের হওয়ায় যেকোনো মৌসুমে পরতে দারুণ আরাম।',
    features: [
      '১০০% প্রিমিয়াম কমফোর্ট কটন ফ্যাব্রিক',
      'কলার ও প্লাকেটে নিখুঁত এমব্রয়ডারি',
      'দুই পাশে সুবিধাজনক পকেট',
      'সহজ ওয়াশ ও লং-লাস্টিং কালার',
    ],
    imageUrl: '/src/assets/images/product_panjabi_kurta_1795630109976.jpg',
    inStock: true,
  },
  {
    id: 'starter-mini-juicer',
    title: 'USB Portable 6-Blade Mini Juicer',
    category: 'problem-solving',
    regularPrice: 1600,
    price: 890,
    shortFeature: 'বিদ্যুৎ ছাড়াই যেকোনো জায়গায় ৩০ সেকেন্ডে ফ্রেশ জুস ও স্মুদি',
    description:
      'অফিস, জিম বা ভ্রমণে টাটকা ফলের জুস ও মিল্কশেক বানানোর স্মার্ট সমাধান। ৬টি স্টেইনলেস স্টিল ব্লেড ও USB রিচার্জেবল ব্যাটারি থাকায় খুবই সহজে পরিষ্কার করা যায়।',
    features: [
      '৬টি স্টেইনলেস স্টিল ৩D পাওয়ারফুল ব্লেড',
      'USB রিচার্জেবল — পাওয়ার ব্যাংকেও চার্জ হয়',
      '৩৮০মি.লি. ফুড-গ্রেড নিরাপদ বোতল',
      'ডাবল-ক্লিক সেফটি লক সিস্টেম',
    ],
    imageUrl: '/src/assets/images/product_mini_juicer_1795630109950.jpg',
    inStock: true,
  },
  {
    id: 'starter-lint-remover',
    title: 'Rechargeable Electric Cloth Lint Remover',
    category: 'problem-solving',
    regularPrice: 990,
    price: 540,
    shortFeature: 'পুরোনো সোয়েটার, ব্লেজার বা টি-শার্টের গুটি তুলে নতুনের মতো করে',
    description:
      'কাপড়ের ওপর ওঠা অনাকাঙ্ক্ষিত রোঁয়া বা গুটি কয়েক সেকেন্ডেই পরিষ্কার করে কাপড়কে একদম নতুনের মতো লুক দেয়। কাপড় কাটার কোনো ভয় নেই।',
    features: [
      'হানিকম্ব স্টেইনলেস স্টিল সেফটি মেশ',
      'হাই-স্পিড রোটারি ব্লেড ও ডাস্ট কালেক্টর',
      'Type-C রিচার্জেবল লং ব্যাটারি ব্যাকআপ',
      'কম্বল, সোয়েটার, হুডি ও শাল—সব কাপড়ে নিরাপদ',
    ],
    imageUrl: '/src/assets/images/product_lint_remover_1795630109991.jpg',
    inStock: true,
  },
];
