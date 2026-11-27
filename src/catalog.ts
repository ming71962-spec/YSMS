import ingredientData from './data/ingredients.json';
import recipeData from './data/recipes.json';
import type { Ingredient, Recipe } from './types';
export const ingredients = ingredientData as Ingredient[];
export const recipes = recipeData as Recipe[];
export const ingredientMap = new Map(ingredients.map(i => [i.id, i]));
export const recipeMap = new Map(recipes.map(r => [r.id, r]));
