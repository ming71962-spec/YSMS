import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { matchRecipe, rankRecipes, searchRecipe, shoppingList, restoreState } from '../src/engine.ts';
import type { Recipe, Ingredient } from '../src/types.ts';

const rootDir = path.resolve(import.meta.dirname, '..');
const loadJson = <T>(relPath: string): T => JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8')) as T;

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

type VisualEntry = {
  label: string;
  kind?: string;
  src?: string;
  short?: string;
  ingredients?: string[];
  source?: string;
  sourcePath?: string;
  note?: string;
};

test('所有食材与菜谱均有对应视觉条目且引用 ID 完整有效', () => {
  const allIngredients = loadJson<Ingredient[]>('src/data/ingredients.json');
  const allRecipes = loadJson<Recipe[]>('src/data/recipes.json');
  const visuals = loadJson<Record<string, VisualEntry>>('src/data/visuals.json');
  const ingredientIds = new Set(allIngredients.map(i => i.id));

  assert.equal(allIngredients.length, ingredientIds.size);
  assert.ok(visuals['scene:hero']?.src, '缺少主页山水场景图');

  for (const ing of allIngredients) {
    const entry = visuals[`ingredient:${ing.id}`];
    assert.ok(entry, `缺少食材视觉配置: ingredient:${ing.id}`);
    assert.ok(entry.label.includes(ing.name), `食材视觉标签应包含食材名称: ${ing.id}`);
  }

  for (const rec of allRecipes) {
    const entry = visuals[`recipe:${rec.id}`];
    assert.ok(entry, `缺少菜谱视觉配置: recipe:${rec.id}`);
    for (const item of rec.ingredients) {
      assert.ok(ingredientIds.has(item.id), `菜谱 ${rec.id} 引用了未知食材 ID: ${item.id}`);
    }
    if (entry.kind === 'ingredient-collage') {
      assert.ok(entry.label.includes('主料示意'), `主料拼图菜谱必须标注“主料示意”: ${rec.id}`);
      assert.ok(Array.isArray(entry.ingredients) && entry.ingredients.length > 0, `缺少主料示意列表: ${rec.id}`);
      const recipeIngIds = new Set(rec.ingredients.map(i => i.id));
      for (const ingId of entry.ingredients) {
        assert.ok(recipeIngIds.has(ingId), `主料示意 ${rec.id} 包含非本菜食材: ${ingId}`);
      }
    } else if (entry.kind === 'recipe-photo') {
      assert.ok(entry.label.includes('原谱照片'), `原谱成品照必须标注“原谱照片”: ${rec.id}`);
      assert.ok(entry.source && entry.sourcePath, `原谱成品照应保留 source 与 sourcePath: ${rec.id}`);
    }
  }
});

test('所有视觉资源路径存在且 public/art 无孤立未引用文件', () => {
  const visuals = loadJson<Record<string, VisualEntry>>('src/data/visuals.json');
  const referenced = new Set<string>();

  for (const [key, entry] of Object.entries(visuals)) {
    if (entry.kind === 'text') {
      assert.equal(entry.src, undefined, `文字占位不应携带 src: ${key}`);
      assert.ok(entry.short, `文字占位缺少 short: ${key}`);
      continue;
    }
    if (entry.kind === 'ingredient-collage') continue;
    assert.ok(entry.src && entry.src.startsWith('/art/'), `图片条目应指向 /art/: ${key}`);
    const filePath = path.join(rootDir, 'public', entry.src.replace(/^\//, ''));
    assert.ok(fs.existsSync(filePath), `引用的资源文件不存在: ${entry.src} (${key})`);
    referenced.add(path.basename(filePath));
  }

  const actualFiles = fs.readdirSync(path.join(rootDir, 'public', 'art'));
  const orphaned = actualFiles.filter(f => !referenced.has(f));
  assert.deepEqual(orphaned, [], `public/art 存在未引用的孤立文件: ${orphaned.join(', ')}`);
});

test('B1 图文核对回归：青椒红椒不错配、鸡翅中保留熟制参考、非酱油项不携带酱油备注', () => {
  const visuals = loadJson<Record<string, VisualEntry>>('src/data/visuals.json');

  assert.equal(visuals['ingredient:green-pepper']?.kind, 'text');
  assert.equal(visuals['ingredient:red-pepper']?.src, '/art/red-pepper.webp');
  assert.equal(visuals['ingredient:red-pepper']?.sourcePath, 'assets/webp/bell_pepper.webp');

  const wings = visuals['ingredient:wings'];
  assert.equal(wings?.kind, 'ingredient-photo');
  assert.ok(wings?.label.includes('熟制参考'));
  assert.equal(wings?.source, 'Anduin2017/HowToCook');
  assert.ok(wings?.sourcePath?.includes('空气炸锅鸡翅中'));

  for (const [key, entry] of Object.entries(visuals)) {
    if (key === 'ingredient:soy' || key === 'ingredient:dark-soy') continue;
    assert.ok(!(entry.note ?? '').includes('酱油包装'), `非酱油条目 ${key} 不应出现误复制的酱油包装备注`);
  }
});
