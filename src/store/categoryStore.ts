import { create } from 'zustand';
import { db } from '@db/index';
import { categories } from '@db/schema';
import type { Category, NewCategory } from '@db/schema';
import { eq } from 'drizzle-orm';
import { newId } from '@lib/ids';

interface CategoryStore {
  categories: Category[];
  load: () => Promise<void>;
  addCategory: (data: Omit<NewCategory, 'id'>) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>((set) => ({
  categories: [],

  load: async () => {
    const rows = await db.select().from(categories);
    set({ categories: rows });
  },

  addCategory: async (data) => {
    const id = newId();
    await db.insert(categories).values({ ...data, id });
    const inserted = await db.select().from(categories).where(eq(categories.id, id));
    const category = inserted[0];
    set((s) => ({ categories: [...s.categories, category] }));
    return category;
  },

  removeCategory: async (id) => {
    await db.delete(categories).where(eq(categories.id, id));
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },
}));
