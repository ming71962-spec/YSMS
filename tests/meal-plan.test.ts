import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMealPlan, formatMealPlan } from '../src/meal-plan.ts';
import type { Recipe } from '../src/types.ts';

const first = {id:'one',name:'番茄炒蛋',ingredients:[{id:'tomato',tier:'L1'},{id:'egg',tier:'L1'},{id:'salt',tier:'L1'},{id:'sugar',tier:'L3'}],source:{url:'https://example.org/one'}} as Recipe;
const second = {id:'two',name:'另一道菜',ingredients:[{id:'egg',tier:'L1'},{id:'sugar',tier:'L1'},{id:'tomato',tier:'L3'}],source:{url:'https://example.org/two'}} as Recipe;
const names = new Map([['tomato',{name:'番茄'}],['egg',{name:'鸡蛋'}],['salt',{name:'盐'}],['sugar',{name:'糖'}]]);

test('整桌必需材料按 ID 去重，重复菜品不重复计数，保留逐道用途',()=>{
  const p=buildMealPlan([first,second,first],['salt']);
  assert.equal(p.matches.length,2);
  assert.deepEqual(p.missing.map(i=>i.id),['tomato','egg','sugar']);
  assert.deepEqual(p.missing.find(i=>i.id==='egg')?.requiredBy.map(r=>r.id),['one','two']);
});
test('同一材料在不同菜中可选/必需并存时只进入必需分组，不受菜序影响',()=>{
  for(const dishes of [[first,second],[second,first]]) {
    const p=buildMealPlan(dishes,[]);
    assert.equal(p.missing.filter(i=>i.id==='sugar').length,1);
    assert.equal(p.optional.some(i=>i.id==='sugar'),false);
    assert.deepEqual(p.missing.find(i=>i.id==='sugar')?.optionalBy.map(r=>r.id),['one']);
  }
});
test('没有原谱可选项也能材料齐全，可选项不进入必购清单',()=>{
  const p=buildMealPlan([first],['tomato','egg','salt']);
  assert.equal(p.readyCount,1);
  assert.equal(p.missing.length,0);
  assert.deepEqual(p.optional.map(i=>[i.id,i.owned]),[['sugar',false]]);
});
test('重新标记已有后逐道状态和整桌清单同时变化，已有材料去重',()=>{
  const before=buildMealPlan([first],['salt','salt']);
  const after=buildMealPlan([first],['salt','tomato','egg']);
  assert.equal(before.readyCount,0);
  assert.equal(before.missing.length,2);
  assert.equal(after.readyCount,1);
  assert.equal(after.owned.length,3);
  assert.equal(after.matches[0].missing.length,0);
  assert.equal(before.missing.length,2,'先前结果不能被修改');
});
test('导出同一个模型的缺料、已有、可选和来源，随选料变化更新',()=>{
  const text=formatMealPlan(buildMealPlan([first],['salt']),names);
  assert.ok(text.includes('还需准备：2 种必需材料'));
  assert.ok(text.includes('□ 番茄（必需：番茄炒蛋）'));
  assert.ok(!text.includes('□ 糖'));
  assert.ok(text.includes('✓ 盐（必需：番茄炒蛋）'));
  assert.ok(text.includes('原谱可选：1 种，不计入必购清单'));
  assert.ok(text.includes(first.source.url));
  const updated=formatMealPlan(buildMealPlan([first],['salt','tomato','egg']),names);
  assert.ok(updated.includes('还需准备：0 种必需材料'));
  assert.ok(!updated.includes('□ 番茄'));
});
test('空菜单不误报材料齐全，也不产生采购项',()=>{
  const p=buildMealPlan([],['salt']);
  assert.equal(p.readyCount,0);
  assert.deepEqual(p.missing,[]);
  assert.equal(formatMealPlan(p,names),'今日一桌\n还没有选择菜品。');
});
