export type IngredientGroup = '蔬菜' | '蛋奶豆制品' | '肉类' | '主食' | '调料';
export type IngredientTier = 'L1' | 'L2' | 'L3';
export interface Ingredient { id: string; name: string; aliases: string[]; group: IngredientGroup; emoji: string; pantryDefault?: boolean }
export interface RecipeIngredient { id: string; tier: IngredientTier; note?: string }
export interface Recipe {
  id: string; name: string; aliases: string[]; category: '素菜' | '荤菜' | '主食' | '汤羹';
  emoji: string; color: string; description: string; ingredients: RecipeIngredient[];
  source: { url: string; commit: string; path: string; sha256: string; license: string; retrieved: string };
  original: string; annotationNote: string;
}
export interface Match { recipe: Recipe; required: RecipeIngredient[]; missing: RecipeIngredient[]; owned: RecipeIngredient[]; coverage: number; status: 'ready' | 'almost' | 'partial' }
