import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ingredients, recipes } from './catalog';
import { restoreState } from './engine';

const ingredientIds = new Set(ingredients.map(i => i.id));
const recipeIds = new Set(recipes.map(i => i.id));
export let storageUnavailable = false;
const safeStorage = {
  getItem(key: string) {try {const raw = localStorage.getItem(key); if(raw) JSON.parse(raw); return raw;} catch {storageUnavailable = true; return null;}},
  setItem(key: string, value: string) {try {localStorage.setItem(key, value);} catch {storageUnavailable = true; window.dispatchEvent(new Event('kitchen-storage-error'));}},
  removeItem(key: string) {try {localStorage.removeItem(key);} catch {storageUnavailable = true;}}
};
interface State {
  selected: string[]; pantry: string[]; favorites: string[]; meal: string[];
  toggle: (field: 'selected' | 'pantry' | 'favorites' | 'meal', id: string) => void;
  clear: (field: 'selected' | 'meal') => void;
  example: () => void;
}
export const useKitchen = create<State>()(persist((set) => ({
  selected: [], pantry: ingredients.filter(i => i.pantryDefault).map(i => i.id), favorites: [], meal: [],
  toggle: (field, id) => set(s => ({[field]: s[field].includes(id) ? s[field].filter(v => v !== id) : [...s[field], id]})),
  clear: field => set({[field]: []}),
  example: () => set(s => ({selected: [...new Set([...s.selected, 'tomato', 'egg'])]}))
}), {
  name: 'kitchen-workshop-v1', version: 1,
  storage: createJSONStorage(() => safeStorage),
  partialize: s => ({selected: s.selected, pantry: s.pantry, favorites: s.favorites, meal: s.meal}),
  merge: (persisted, current) => persisted && typeof persisted === 'object'
    ? {...current, ...restoreState(persisted, ingredientIds, recipeIds)} : current
}));
