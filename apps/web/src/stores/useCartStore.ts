import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  selectedSize?: string;
  sugarLevel?: string;
  iceLevel?: string;
  selectedToppings?: string[];
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateOptions: (
    id: string,
    options: Pick<CartItem, 'selectedSize' | 'sugarLevel' | 'iceLevel'>,
  ) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (newItem) =>
        set((state) => {
          const exists = state.items.find((i) => i.id === newItem.id);
          if (exists) {
            return {
              items: state.items.map((i) =>
                i.id === newItem.id ? { ...i, quantity: i.quantity + newItem.quantity } : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        }),
      updateOptions: (id, options) =>
        set((state) => {
          const item = state.items.find((current) => current.id === id);
          if (!item || item.category === 'TOPPING') return state;

          const productId = item.productId ?? item.id;
          const updatedItem = {
            ...item,
            ...options,
            id: JSON.stringify([
              productId,
              options.selectedSize,
              options.sugarLevel,
              options.iceLevel,
            ]),
          };
          const existingItem = state.items.find(
            (current) => current.id === updatedItem.id && current.id !== id,
          );
          if (existingItem) {
            return {
              items: state.items
                .filter((current) => current.id !== id)
                .map((current) =>
                  current.id === updatedItem.id
                    ? {
                        ...current,
                        quantity: current.quantity + item.quantity,
                      }
                    : current,
                ),
            };
          }

          return {
            items: state.items.map((current) =>
              current.id === id ? updatedItem : current,
            ),
          };
        }),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items:
            quantity < 1
              ? state.items.filter((item) => item.id !== id)
              : state.items.map((item) =>
                  item.id === id ? { ...item, quantity } : item,
                ),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'brewlite-cart' }
  )
);