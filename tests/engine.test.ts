import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRecipe, rankRecipes, searchRecipe, shoppingList, restoreState } from '../src/engine.ts';
import type { Recipe, Ingredient } from '../src/types.ts';
const recipe = {id:'tomato-eggs',name:'西红柿炒鸡蛋',aliases:['番茄炒蛋'],ingredients:[{id:'tomato',tier:'L1'},{id:'egg',tier:'L1'},{id:'salt',tier:'L1'},{id:'sugar',tier:'L3'}]} as Recipe;
const ingredients = [{id:'tomato',name:'西红柿',aliases:['番茄']},{id:'egg',name:'鸡蛋',aliases:['鸡子']} ] as Ingredient[];
test('缺必需材料不能被调料和可选项的数量掩盖',()=>{
  assert.equal(matchRecipe(recipe,['salt','sugar']).status,'partial');
  assert.deepEqual(matchRecipe(recipe,['salt','sugar']).missing.map(i=>i.id),['tomato','egg']);
});
test('常备调料与手选食材合并后判定种类齐全，可选项不阻塞',()=>{
  assert.equal(matchRecipe(recipe,['tomato','egg','salt','salt']).status,'ready');
  assert.equal(matchRecipe(recipe,['tomato','egg']).status,'almost');
});
test('别名、多食材检索与全角符号',()=>{
  assert.equal(searchRecipe(recipe,'番茄＋鸡蛋',ingredients),true);
  assert.equal(searchRecipe(recipe,'鸡蛋，牛肉',ingredients),false);
});
test('一桌清单去重，按菜追溯；已有食材不会出现在采购项',()=>{
  const another = {...recipe,id:'another',name:'另一道菜'};
  const list = shoppingList([recipe,another],['egg']);
  assert.deepEqual(list.map(i=>i.id),['tomato','salt']);
  assert.equal(list[0].dishes.length,2);
});
test('排名不会改变原数据，所有必需材料命中的菜优先',()=>{
  const other = {...recipe,id:'other',ingredients:[{id:'beef',tier:'L1' as const}]};
  assert.equal(rankRecipes([other,recipe],['tomato','egg','salt'])[0].recipe.id,recipe.id);
  assert.equal(recipe.ingredients.length,4);
});
test('本地数据异常时剔除旧ID、重复与非字符串内容',()=>{
  assert.deepEqual(restoreState({selected:['tomato','bad','tomato',4],meal:['unknown']},new Set(['tomato']),new Set()),{selected:['tomato'],pantry:[],favorites:[],meal:[]});
});
test('没有必需项的异常菜谱不能显示材料齐全',()=>{
  assert.equal(matchRecipe({...recipe,ingredients:[]},[]).status,'partial');
});
