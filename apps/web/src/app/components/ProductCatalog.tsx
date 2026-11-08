'use client';

import Image from 'next/image';
import type { Product, ProductMenuCategory } from '../types';
import { productCategories } from '../types';

interface ProductCatalogProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  searchName: string;
  selectedCategory: ProductMenuCategory;
  categoryMenuOpen: boolean;
  onSearchChange: (value: string) => void;
  onSelectCategory: (value: ProductMenuCategory) => void;
  onCloseCategoryMenu: () => void;
  onRetry: () => void;
  onBuyNow: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export function ProductCatalog({
  products,
  loading,
  error,
  searchName,
  selectedCategory,
  categoryMenuOpen,
  onSearchChange,
  onSelectCategory,
  onCloseCategoryMenu,
  onRetry,
  onBuyNow,
  onAddToCart,
}: ProductCatalogProps) {
  const menuProducts = products.filter(
    (product) => product.status !== 'UNAVAILABLE',
  );
  const searchedProducts = menuProducts.filter((product) =>
    product.name
      .toLocaleLowerCase()
      .includes(searchName.trim().toLocaleLowerCase()),
  );
  const visibleProducts =
    selectedCategory === 'ALL'
      ? searchedProducts
      : selectedCategory === 'UNCATEGORIZED'
        ? searchedProducts.filter((product) => product.category === null)
        : searchedProducts.filter(
            (product) => product.category === selectedCategory,
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
  const categoryChoices = [
    { value: 'ALL' as const, label: 'Tất cả món', count: searchedProducts.length },
    ...productCategories
      .map(({ value, label }) => ({
        value,
        label,
        count: searchedProducts.filter((product) => product.category === value)
          .length,
      }))
      .filter((category) => category.count > 0),
    ...(searchedProducts.some((product) => product.category === null)
      ? [
          {
            value: 'UNCATEGORIZED' as const,
            label: 'Chưa phân loại',
            count: searchedProducts.filter((product) => product.category === null)
              .length,
          },
        ]
      : []),
  ];
  const selectedCategoryLabel =
    categoryChoices.find((category) => category.value === selectedCategory)
      ?.label ?? 'Tất cả món';

  return (
    <section>
      <div className="my-5 sm:my-7">
        <p className="text-sm leading-6 text-[#69746b]">
          Chọn món yêu thích hoặc tìm nhanh theo tên món.
        </p>
        <label className="mt-4 flex min-h-12 max-w-2xl items-center gap-3 rounded-2xl border border-[#dce2da] bg-white px-4 py-3 shadow-sm focus-within:border-[#59775e] focus-within:ring-4 focus-within:ring-[#59775e]/10 sm:mt-5">
          <span aria-hidden="true" className="text-lg text-[#768279]">
            ⌕
          </span>
          <input
            type="search"
            value={searchName}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo tên món..."
            aria-label="Tìm món theo tên"
            className="w-full bg-transparent text-base outline-none placeholder:text-[#a1aaa2]"
          />
        </label>
      </div>

      {categoryMenuOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Đóng danh mục"
            onClick={onCloseCategoryMenu}
            className="absolute inset-0 bg-black/45"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-categories-heading"
            className="absolute inset-y-0 left-0 flex w-[min(88vw,30rem)] max-w-full flex-col bg-white shadow-2xl animate-[menu-drawer-enter_180ms_ease-out]"
          >
            <header className="flex min-h-[76px] items-center justify-between border-b border-[#e8e1d3] px-6">
              <h2
                id="product-categories-heading"
                className="text-xl font-semibold text-[#26352c]"
              >
                Thực đơn
              </h2>
              <button
                type="button"
                onClick={onCloseCategoryMenu}
                aria-label="Đóng danh mục"
                className="flex h-11 w-11 items-center justify-center rounded-full text-3xl leading-none text-[#69746b] hover:bg-[#f4f7f2]"
              >
                ×
              </button>
            </header>
            <nav aria-label="Danh mục đồ uống" className="overflow-y-auto p-4">
              <ul className="space-y-1">
                {categoryChoices.map((category) => {
                  const isSelected = category.value === selectedCategory;
                  return (
                    <li key={category.value}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory(category.value);
                          onCloseCategoryMenu();
                        }}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`flex min-h-[60px] w-full items-center justify-between px-4 text-left text-base transition ${isSelected ? 'bg-[#e6f4ff] font-semibold text-[#2786c8]' : 'rounded-lg text-[#26352c] hover:bg-[#f4f7f2]'}`}
                      >
                        <span>{category.label}</span>
                        <span>({category.count})</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}

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
            className="mt-4 min-h-11 rounded-lg bg-[#304b39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#243b2c]"
          >
            Thử tải lại
          </button>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="rounded-2xl border border-[#e8e1d3] bg-white px-6 py-12 text-center">
          <p className="font-medium text-[#46544a]">
            {menuProducts.length === 0
              ? 'Thực đơn hiện chưa có món nào.'
              : selectedCategory !== 'ALL' && searchedProducts.length > 0
                ? `Danh mục ${selectedCategoryLabel} hiện chưa có món phù hợp.`
                : 'Không tìm thấy món có tên phù hợp.'}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedProducts.map((group) => (
            <section key={group.key} aria-labelledby={`category-${group.key}`}>
              <h2
                id={`category-${group.key}`}
                className="mb-4 text-lg font-semibold text-[#304b39] sm:text-xl"
              >
                {group.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {group.products.map((product) => {
                  const isAvailable =
                    product.status === 'AVAILABLE' && product.stockQuantity > 0;
                  return (
                    <article
                      key={product.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-[#e8e1d3] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:flex-row md:justify-between"
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={640}
                          height={360}
                          unoptimized
                          className="h-44 w-full object-cover md:h-full md:min-h-44 md:w-2/5"
                        />
                      ) : (
                        <div className="flex h-36 w-full shrink-0 items-center justify-center bg-[#edf2e9] px-2 text-center text-sm font-medium text-[#718074] md:h-auto md:min-h-44 md:w-2/5">
                          Chưa có hình món
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:p-5">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="min-w-0 text-base font-semibold sm:text-lg">
                              {product.name}
                            </h3>
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold sm:px-2.5 sm:text-xs ${isAvailable ? 'bg-[#edf2e9] text-[#405d47]' : 'bg-[#f4eeee] text-[#8b5a53]'}`}
                            >
                              {isAvailable ? 'Còn món' : 'Tạm hết'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-[#9a6d3e]">
                            {product.price.toLocaleString('vi-VN')} đ
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5">
                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => onBuyNow(product)}
                            className="min-h-11 rounded-xl border border-[#dce2da] px-2 py-2.5 text-xs font-semibold text-[#405d47] transition hover:bg-[#f4f7f2] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
                          >
                            Mua ngay
                          </button>
                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => onAddToCart(product)}
                            className="min-h-11 rounded-xl bg-[#304b39] px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-not-allowed disabled:bg-[#d9ded8] disabled:text-[#788078] sm:px-3 sm:text-sm"
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
