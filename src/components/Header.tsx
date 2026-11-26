import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { CATEGORY_LABELS, CategoryId } from '@/src/types/store';

interface HeaderProps {
  activeCategory: CategoryId;
  onSelectCategory: (category: CategoryId) => void;
  cartCount: number;
  onOpenCart: () => void;
}

const NAV_CATEGORIES: CategoryId[] = [
  'all',
  'electronics',
  'cosmetics',
  'clothing',
  'problem-solving',
];

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  cartCount,
  onOpenCart,
}) => {
  const handleNavClick = (cat: CategoryId) => {
    onSelectCategory(cat);
    const catalogEl = document.getElementById('catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Mark + Single-Line Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectCategory('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#15803D] rounded-md"
        >
          <img
            src="/assets/aistudio/official_logo_5b27249c.png"
            alt="ভোক্তা-জিতাও লোগো"
            className="w-9 h-9 object-contain shrink-0"
          />
          <span className="text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap shrink-0">
            <span className="text-[#14532D]">ভোক্তা-</span>
            <span className="text-[#EA580C]">জিতাও</span>
          </span>
        </a>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav
          aria-label="প্রোডাক্ট ক্যাটাগরি"
          className="hidden lg:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleNavClick(cat)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#15803D] text-[#15803D] font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action (Cart Drawer Trigger) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="কার্ট ও অর্ডার ড্রয়ার খুলুন"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>কার্ট</span>
            <span className="tabular-nums bg-white/20 px-1.5 py-0.5 rounded text-xs font-bold">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
