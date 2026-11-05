'use client';

import Image from 'next/image';
import type { Product } from '../types';
import { productCategories } from '../types';

interface ProductCatalogProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  searchName: string;
  onSearchChange: (value: string) => void;
  onRetry: () => void;
  onBuyNow: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export function ProductCatalog({
  products,
  loading,
  error,
  searchName,
  onSearchChange,
  onRetry,
  onBuyNow,
  onAddToCart,
}: ProductCatalogProps) {
  const visibleProducts = products.filter((product) =>
    product.name
      .toLocaleLowerCase()
      .includes(searchName.trim().toLocaleLowerCase()),
  );
  const groupedProducts: Array<{
    key: string;
    label: string;
    products: Product[];
  }> = productCategories
    .map(({ value, label }) => ({
      key: value,
      label,
      products: visibleProducts.filter((product) => product.category === value),
    }))
    .filter((group) => group.products.length > 0);
  const uncategorizedProducts = visibleProducts.filter(
    (product) => product.category === null,
  );
  if (uncategorizedProducts.length > 0) {
    groupedProducts.push({
      key: 'UNCATEGORIZED',
      label: 'Chưa phân loại',
      products: uncategorizedProducts,
    });
  }

  return (
    <section>
      <div className="my-7">
        <p className="text-sm leading-6 text-[#69746b]">
          Chọn món yêu thích hoặc tìm nhanh theo tên món.
        </p>
        <label className="mt-5 flex max-w-2xl items-center gap-3 rounded-2xl border border-[#dce2da] bg-white px-4 py-3 shadow-sm focus-within:border-[#59775e] focus-within:ring-4 focus-within:ring-[#59775e]/10">
          <span aria-hidden="true" className="text-lg text-[#768279]">
            ⌕
          </span>
          <input
            type="search"
            value={searchName}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo tên món..."
            aria-label="Tìm món theo tên"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#a1aaa2]"
          />
        </label>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-2xl border border-[#e8e1d3] bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-white p-6">
          <p role="alert" className="font-medium text-red-700">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-[#304b39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#243b2c]"
          >
            Thử tải lại
          </button>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="rounded-2xl border border-[#e8e1d3] bg-white px-6 py-12 text-center">
          <p className="font-medium text-[#46544a]">
            {products.length === 0
              ? 'Thực đơn hiện chưa có món nào.'
              : 'Không tìm thấy món có tên phù hợp.'}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedProducts.map((group) => (
            <section key={group.key} aria-labelledby={`category-${group.key}`}>
              <h2
                id={`category-${group.key}`}
                className="mb-4 text-xl font-semibold text-[#304b39]"
              >
                {group.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.products.map((product) => {
                  const isAvailable =
                    product.status === 'AVAILABLE' && product.stockQuantity > 0;
                  return (
                    <article
                      key={product.id}
                      className="flex flex-row justify-between overflow-hidden rounded-2xl border border-[#e8e1d3] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={640}
                          height={360}
                          unoptimized
                          className="h-full min-h-44 w-2/5 object-cover"
                        />
                      ) : (
                        <div className="flex min-h-44 w-2/5 shrink-0 items-center justify-center bg-[#edf2e9] px-2 text-center text-sm font-medium text-[#718074]">
                          Chưa có hình món
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:p-5">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg font-semibold">
                              {product.name}
                            </h3>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${isAvailable ? 'bg-[#edf2e9] text-[#405d47]' : 'bg-[#f4eeee] text-[#8b5a53]'}`}
                            >
                              {isAvailable ? 'Còn món' : 'Tạm hết'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-[#9a6d3e]">
                            {product.price.toLocaleString('vi-VN')} đ
                          </p>
                        </div>
                        <div className="mt-5 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => onBuyNow(product)}
                            className="rounded-xl border border-[#dce2da] px-3 py-2.5 text-sm font-semibold text-[#405d47] transition hover:bg-[#f4f7f2] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mua ngay
                          </button>
                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => onAddToCart(product)}
                            className="rounded-xl bg-[#304b39] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-not-allowed disabled:bg-[#d9ded8] disabled:text-[#788078]"
                          >
                            Thêm vào giỏ
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
