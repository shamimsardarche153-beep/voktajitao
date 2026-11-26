import { DeliveryZone } from '@/src/types/store';

export const INSIDE_DHAKA_CHARGE = 70;
export const OUTSIDE_DHAKA_CHARGE = 100;

const OUTSIDE_DHAKA_OVERRIDE_PATTERNS = [
  'ঢাকার বাইরে',
  'ঢাকার বাহিরে',
  'outside dhaka',
  'out of dhaka',
];

const INSIDE_DHAKA_KEYWORDS = [
  'ঢাকা',
  'dhaka',
  'মিরপুর',
  'mirpur',
  'উত্তরা',
  'uttara',
  'ধানমন্ডি',
  'dhanmondi',
  'গুলশান',
  'gulshan',
  'বনানী',
  'banani',
  'মোহাম্মদপুর',
  'mohammadpur',
  'বাড্ডা',
  'badda',
  'মতিঝিল',
  'motijheel',
  'রামপুরা',
  'rampura',
  'খিলগাঁও',
  'khilgaon',
  'ফার্মগেট',
  'farmgate',
  'বসুন্ধরা',
  'bashundhara',
  'তেজগাঁও',
  'tejgaon',
  'ওয়ারী',
  'ওয়ারী',
  'wari',
  'যাত্রাবাড়ী',
  'যাত্রাবাড়ি',
  'jatrabari',
  'শাহবাগ',
  'shahbag',
  'শ্যামলী',
  'shyamoli',
  'কল্যাণপুর',
  'kallyanpur',
  'আদাবর',
  'adabor',
  'বনশ্রী',
  'banasree',
  'ক্যান্টনমেন্ট',
  'cantonment',
  'লালবাগ',
  'lalbagh',
  'সূত্রাপুর',
  'sutrapur',
  'ডেমরা',
  'demra',
  'কামরাঙ্গীরচর',
  'kamrangirchar',
  'হাজারীবাগ',
  'hazaribagh',
  'পল্লবী',
  'pallabi',
  'কাফরুল',
  'kafrul',
  'খিলক্ষেত',
  'khilkhet',
  'তুরাগ',
  'turag',
  'দক্ষিণখান',
  'dakshinkhan',
  'উত্তরখান',
  'uttarkhan',
  'সবুজবাগ',
  'sabujbagh',
  'মুগদা',
  'mugda',
  'গেন্ডারিয়া',
  'গেন্ডারিয়া',
  'gendaria',
  'কদমতলী',
  'kadamtali',
  'শ্যামপুর',
  'shyampur',
  'নিউমার্কেট',
  'new market',
  'কলাবাগান',
  'kalabagan',
  'আজিমপুর',
  'azimpur',
  'মগবাজার',
  'moghbazar',
  'মালিবাগ',
  'malibagh',
  'শান্তিনগর',
  'shantinagar',
  'কাকরাইল',
  'kakrail',
  'পল্টন',
  'paltan',
  'আফতাবনগর',
  'aftabnagar',
  'বারিধারা',
  'baridhara',
  'নিকুঞ্জ',
  'nikunja',
  'কুড়িল',
  'কুড়িল',
  'kuril',
  'বসিলা',
  'bosila',
  'আগারগাঁও',
  'agargaon',
  'কারওয়ান বাজার',
  'কারওয়ান বাজার',
  'karwan bazar',
  'চকবাজার',
  'chawkbazar',
  'জিগাতলা',
  'jigatola',
  'সায়েন্সল্যাব',
  'সায়েন্সল্যাব',
  'science lab',
  'নীলক্ষেত',
  'nilkhet',
  'এলিফ্যান্ট রোড',
  'elephant road',
  'পান্থপথ',
  'panthapath',
  'গ্রিন রোড',
  'green road',
  'শনির আখড়া',
  'শনির আখড়া',
  'shonir akhra',
  'মাতুয়াইল',
  'মাতুয়াইল',
  'matuail',
  'রায়েরবাগ',
  'রায়েরবাগ',
  'rayerbag',
  'দনিয়া',
  'দনিয়া',
  'dania',
  'সাভার',
  'savar',
  'কেরানীগঞ্জ',
  'keraniganj',
  'ধামরাই',
  'dhamrai',
  'দোহার',
  'dohar',
  'নবাবগঞ্জ',
  'nawabganj',
];

export function detectDeliveryFromAddress(address: string): {
  zone: DeliveryZone;
  charge: number;
  hasAddress: boolean;
} {
  const trimmed = address.trim();
  if (!trimmed) {
    return {
      zone: 'inside_dhaka',
      charge: INSIDE_DHAKA_CHARGE,
      hasAddress: false,
    };
  }

  const normalized = trimmed.toLowerCase();

  for (const phrase of OUTSIDE_DHAKA_OVERRIDE_PATTERNS) {
    if (normalized.includes(phrase)) {
      return {
        zone: 'outside_dhaka',
        charge: OUTSIDE_DHAKA_CHARGE,
        hasAddress: true,
      };
    }
  }

  for (const keyword of INSIDE_DHAKA_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        zone: 'inside_dhaka',
        charge: INSIDE_DHAKA_CHARGE,
        hasAddress: true,
      };
    }
  }

  return {
    zone: 'outside_dhaka',
    charge: OUTSIDE_DHAKA_CHARGE,
    hasAddress: true,
  };
}

export function calculateDiscountPercent(regularPrice: number, offerPrice: number): number {
  if (!regularPrice || regularPrice <= offerPrice || offerPrice <= 0) {
    return 0;
  }
  return Math.round(((regularPrice - offerPrice) / regularPrice) * 100);
}

export function formatBDT(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-US')}`;
}
