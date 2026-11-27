import type { Recipe } from './types.ts';
import { matchRecipe } from './engine.ts';

type Dish = Pick<Recipe, 'id' | 'name'>;
export interface MaterialUse {
  id: string;
  requiredBy: Dish[];
  optionalBy: Dish[];
  owned: boolean;
}

/** UI projection only: preserve the original matching rules and ingredient IDs. */
export function buildMealPlan(recipes: Recipe[], available: Iterable<string>) {
  const ids = new Set(available);
  const dishes = [...new Map(recipes.map(r => [r.id, r])).values()];
  const uses = new Map<string, MaterialUse>();
  for (const dish of dishes) for (const item of dish.ingredients) {
    if (item.tier !== 'L1' && item.tier !== 'L3') continue;
    const use = uses.get(item.id) ?? {id: item.id, requiredBy: [], optionalBy: [], owned: ids.has(item.id)};
    const target = item.tier === 'L1' ? use.requiredBy : use.optionalBy;
    if (!target.some(r => r.id === dish.id)) target.push({id: dish.id, name: dish.name});
    uses.set(item.id, use);
  }
  const required = [...uses.values()].filter(i => i.requiredBy.length);
  const matches = dishes.map(r => matchRecipe(r, ids));
  return {
    matches,
    readyCount: matches.filter(m => m.status === 'ready').length,
    missing: required.filter(i => !i.owned),
    owned: required.filter(i => i.owned),
    // A material required by another dish belongs in the required section once.
    optional: [...uses.values()].filter(i => !i.requiredBy.length && i.optionalBy.length),
  };
}

export type MealPlan = ReturnType<typeof buildMealPlan>;

export function formatMealPlan(plan: MealPlan, ingredients: ReadonlyMap<string, {name: string}>) {
  if (!plan.matches.length) return '今日一桌\n还没有选择菜品。';
  const name = (id: string) => ingredients.get(id)?.name ?? id;
  const usage = (item: MaterialUse) => item.requiredBy.length
    ? `必需：${item.requiredBy.map(r => r.name).join('、')}${item.optionalBy.length ? `；另作可选：${item.optionalBy.map(r => r.name).join('、')}` : ''}`
    : `可选：${item.optionalBy.map(r => r.name).join('、')}`;
  const row = (i: MaterialUse) => `${name(i.id)}（${usage(i)}）`;
  return [
    '今日一桌',
    ...plan.matches.map(m => `· ${m.recipe.name}：${m.status === 'ready' ? '必需材料种类齐全' : `缺 ${m.missing.length} 种必需材料（${m.missing.map(i => name(i.id)).join('、')}）`}`),
    '', '清单按种类合并，实际用量和工具请逐道查看原谱。',
    '', `还需准备：${plan.missing.length} 种必需材料`,
    ...(plan.missing.length ? plan.missing.map(i => `□ ${row(i)}`) : ['必需材料种类已齐全。']),
    '', `家里已有：${plan.owned.length} 种必需材料`,
    ...(plan.owned.length ? plan.owned.map(i => `✓ ${row(i)}`) : ['暂无已选中的必需材料。']),
    '', `原谱可选：${plan.optional.length} 种，不计入必购清单`,
    ...(plan.optional.length ? plan.optional.map(i => `· ${row(i)} · ${i.owned ? '家里有' : '未选择'}`) : ['本桌没有额外的原谱可选材料。']),
    '', '菜谱来源', ...plan.matches.map(m => `${m.recipe.name} ${m.recipe.source.url}`),
  ].join('\n');
}
