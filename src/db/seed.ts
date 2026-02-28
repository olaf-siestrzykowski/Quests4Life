import { db } from './index';
import { categories } from './schema';

const DEFAULT_CATEGORIES = [
  { id: 'cat-health',   name: 'Health',    color: '#22c55e', icon: 'activity' },
  { id: 'cat-learn',   name: 'Learning',  color: '#3b82f6', icon: 'book'     },
  { id: 'cat-work',    name: 'Work',      color: '#f97316', icon: 'briefcase'},
  { id: 'cat-personal',name: 'Personal',  color: '#a855f7', icon: 'user'     },
  { id: 'cat-home',    name: 'Home',      color: '#eab308', icon: 'home'     },
  { id: 'cat-social',  name: 'Social',    color: '#ec4899', icon: 'users'    },
];

export async function seedDefaults() {
  for (const cat of DEFAULT_CATEGORIES) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }
}
