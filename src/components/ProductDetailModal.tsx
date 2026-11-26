import React, { useState } from 'react';
import { Check, Minus, Plus, ShoppingBag, ShoppingCart, X } from 'lucide-react';
import { CATEGORY_LABELS, Product } from '@/src/types/store';
import { calculateDiscountPercent, formatBDT } from '@/src/lib/delivery';
import { ProductImage } from './ProductImage';

interface ProductDetailModalProps {
  product: Product | null;
  cartQuantity: number;
  onClose: () => void;
  onAddQuantity: (product: Product, quantity: number) => void;
  onOpenCart: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  cartQuantity,
  onClose,
  onAddQuantity,
  onOpenCart,
}) => {
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  if (!product) return null;

  const discountPercent = calculateDiscountPercent(product.regularPrice, product.price);
  const savedAmount = Math.max(0, product.regularPrice - product.price);

  const handleAdd = () => {
    onAddQuantity(product, qty);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>{CATEGORY_LABELS[product.category]}</span>
            <span aria-hidden="true">·</span>
            <span className={product.inStock ? 'text-[#15803D]' : 'text-red-600'}>
              {product.inStock ? 'স্টকে আছে' : 'স্টক আউট'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বিস্তারিত বন্ধ করুন"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split */}
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Image */}
          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
            <ProductImage src={product.imageUrl} alt={product.title} />
          </div>

          {/* Info & Purchase Module */}
          <div className="space-y-4">
            <div>
              <h2
                id="product-modal-title"
                className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug"
              >
                {product.title}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {product.shortFeature}
              </p>
            </div>

            {/* Pricing */}
            <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-slate-200 flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
              <span className="text-2xl font-bold text-[#15803D]">
                {formatBDT(product.price)}
              </span>
              {product.regularPrice > product.price && (
                <span className="text-base text-slate-400 line-through">
                  {formatBDT(product.regularPrice)}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-xs font-semibold text-[#EA580C]">
                  {discountPercent}% সেভ ({formatBDT(savedAmount)} ছাড়)
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-700 leading-relaxed">
              {product.description}
            </p>

            {/* Feature List */}
            {product.features && product.features.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  প্রধান ফিচারসমূহ
                </h3>
                <ul className="space-y-1.5">
                  {product.features.map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <Check className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="pt-2 space-y-3 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">পরিমাণ:</span>
                <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="পরিমাণ কমান"
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-semibold tabular-nums text-slate-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(20, q + 1))}
                    aria-label="পরিমাণ বাড়ান"
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {cartQuantity > 0 && (
                  <span className="text-xs font-medium text-[#15803D] tabular-nums">
                    কার্টে আছে: {cartQuantity}টি
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={!product.inStock}
                  onClick={handleAdd}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                    addedFeedback
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#EA580C] hover:bg-[#C2410C] text-white'
                  }`}
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>কার্টে যোগ হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span>কার্টে যোগ করুন · {formatBDT(product.price * qty)}</span>
                    </>
                  )}
                </button>

                {cartQuantity > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCart();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>অর্ডার করুন</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
