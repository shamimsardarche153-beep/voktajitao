import React from 'react';
import { Check, Eye, ShoppingCart } from 'lucide-react';
import { CATEGORY_LABELS, Product } from '@/src/types/store';
import { calculateDiscountPercent, formatBDT } from '@/src/lib/delivery';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  justAdded: boolean;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartQuantity,
  justAdded,
  onAddToCart,
  onViewDetails,
}) => {
  const discountPercent = calculateDiscountPercent(product.regularPrice, product.price);
  const isInCart = cartQuantity > 0;

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      {/* Product Image */}
      <button
        type="button"
        onClick={() => onViewDetails(product)}
        aria-label={`${product.title} বিস্তারিত দেখুন`}
        className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-[#15803D]"
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.title}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </button>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-1.5">
          {/* Unboxed clean metadata (Zero-Pill Rule) */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate">{CATEGORY_LABELS[product.category]}</span>
            {!product.inStock && (
              <span className="text-red-600 font-medium shrink-0">স্টক আউট</span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
            {product.title}
          </h3>

          {/* Price Row: Strikethrough Regular Price + Offer Price + % Saved */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5 tabular-nums">
            <span className="text-lg font-bold text-[#15803D]">
              {formatBDT(product.price)}
            </span>
            {product.regularPrice > product.price && (
              <span className="text-sm text-slate-400 line-through">
                {formatBDT(product.regularPrice)}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="text-xs font-semibold text-[#EA580C]">
                · {discountPercent}% সেভ
              </span>
            )}
          </div>
        </div>

        {/* Side-by-Side Action Buttons: Details (Left) | Add to Cart with Checkmark (Right) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onViewDetails(product)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span>বিস্তারিত</span>
          </button>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => onAddToCart(product)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isInCart
                ? 'bg-[#15803D] hover:bg-[#166534] text-white'
                : 'bg-[#EA580C] hover:bg-[#C2410C] text-white'
            } ${justAdded ? 'scale-[0.98]' : ''}`}
          >
            {isInCart ? (
              <>
                <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span className="tabular-nums">
                  {cartQuantity > 1 ? `Added (${cartQuantity})` : 'Added'}
                </span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
