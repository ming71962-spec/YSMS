import type { Ingredient, Recipe, Match } from './types.ts';

export const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('zh-CN');

export function matchRecipe(recipe: Recipe, available: Iterable<string>): Match {
  const ids = new Set(available);
  const required = recipe.ingredients.filter(i => i.tier === 'L1');
  const missing = required.filter(i => !ids.has(i.id));
  const owned = recipe.ingredients.filter(i => ids.has(i.id));
  return {recipe, required, missing, owned, coverage: required.length ? (required.length - missing.length) / required.length : 0,
    status: required.length > 0 && missing.length === 0 ? 'ready' : missing.length === 1 ? 'almost' : 'partial'};
}

export function searchRecipe(recipe: Recipe, query: string, ingredients: Ingredient[]): boolean {
  const terms = normalize(query).split(/[、,，+＋]+/).filter(Boolean);
  if (!terms.length) return true;
  const names = new Map(ingredients.map(i => [i.id, [i.name, ...i.aliases].map(normalize)]));
  const haystack = [recipe.name, ...recipe.aliases, ...recipe.ingredients.flatMap(i => names.get(i.id) ?? [])].map(normalize);
  return terms.every(term => haystack.some(value => value.includes(term)));
}

export function rankRecipes(recipes: Recipe[], available: Iterable<string>): Match[] {
  const ids = new Set(available);
  return recipes.map(r => matchRecipe(r, ids)).sort((a, b) => b.coverage - a.coverage || b.owned.length - a.owned.length || a.recipe.name.localeCompare(b.recipe.name, 'zh-CN'));
}

export function shoppingList(recipes: Recipe[], available: Iterable<string>) {
  const ids = new Set(available);
  const result = new Map<string, string[]>();
  for (const recipe of recipes) for (const ingredient of recipe.ingredients) {
    if (ingredient.tier !== 'L1' || ids.has(ingredient.id)) continue;
    result.set(ingredient.id, [...(result.get(ingredient.id) ?? []), recipe.name]);
  }
  return [...result].map(([id, dishes]) => ({id, dishes}));
}

export function restoreState(value: unknown, ingredientIds: Set<string>, recipeIds: Set<string>) {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const valid = (key: string, ids: Set<string>) => Array.isArray(input[key]) ? [...new Set((input[key] as unknown[]).filter((v): v is string => typeof v === 'string' && ids.has(v)))] : [];
  return {selected: valid('selected', ingredientIds), pantry: valid('pantry', ingredientIds), favorites: valid('favorites', recipeIds), meal: valid('meal', recipeIds)};
}
