import React from 'react';
import { ArrowDown, ShieldCheck, UserCheck } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeroSectionProps {
  currentUser: User | null;
  savedCustomerName: string;
  isAdmin: boolean;
  onBrowseProducts: () => void;
  onOpenMyOrders: () => void;
  onOpenAdmin: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  currentUser,
  savedCustomerName,
  isAdmin,
  onBrowseProducts,
  onOpenMyOrders,
  onOpenAdmin,
}) => {
  return (
    <section
      id="top"
      className="bg-white border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Left Copy & Brand Tagline */}
          <div className="lg:col-span-8 space-y-4">
            <p className="text-sm font-semibold text-[#15803D] tracking-wide">
              voktajitao · আপনার বিশ্বস্ত অনলাইন শপ
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-slate-900 leading-tight [text-wrap:balance]">
              <span className="text-[#14532D]">ভোক্তা-</span>
              <span className="text-[#EA580C]">জিতাও</span>
              <span className="text-slate-900"> — সাশ্রয়ী দামে ভোক্তার স্বস্তি</span>
            </h1>
            <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
              পছন্দের প্রোডাক্টে ক্লিক করেই সরাসরি কার্টে যোগ করুন, বিস্তারিত ফিচার দেখে
              নাম-ফোন-ঠিকানা দিয়ে ক্যাশ অন ডেলিভারিতে অর্ডার করুন। ঢাকায় ডেলিভারি চার্জ
              মাত্র <span className="font-semibold text-slate-900 tabular-nums">৳৭০</span> ও
              ঢাকার বাহিরে{' '}
              <span className="font-semibold text-slate-900 tabular-nums">৳১০০</span>।
            </p>

            {/* Primary CTA + Clean Utility Links */}
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBrowseProducts}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <span>সব প্রোডাক্ট দেখুন</span>
                <ArrowDown className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenMyOrders}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#15803D]" />
                <span>
                  {currentUser
                    ? `আমার অ্যাকাউন্ট (${savedCustomerName || currentUser.displayName || 'Gmail'})`
                    : 'লগইন / আমার অর্ডার'}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:text-[#EA580C] transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isAdmin ? 'অ্যাডমিন ড্যাশবোর্ড' : 'অ্যাডমিন প্যানেল'}</span>
              </button>
            </div>
          </div>

          {/* Right Official Logo Showcase */}
          <div className="lg:col-span-4 flex justify-start lg:justify-end">
            <div className="flex items-center gap-4 bg-[#FAFAFA] border border-slate-200 rounded-xl p-4 sm:p-5 w-full sm:w-auto">
              <img
                src="/assets/aistudio/official_logo_5b27249c.png"
                alt="ভোক্তা-জিতাও অফিসিয়াল লোগো"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0"
              />
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">অফিশিয়াল স্টোর</p>
                <p className="text-lg font-bold text-slate-900">
                  <span className="text-[#14532D]">ভোক্তা-</span>
                  <span className="text-[#EA580C]">জিতাও</span>
                </p>
                <p className="text-xs font-semibold text-[#15803D]">
                  সাশ্রয়ী দামে ভোক্তার স্বস্তি
                </p>
                <p className="text-xs text-slate-500">voktajitao · Cash on Delivery</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
