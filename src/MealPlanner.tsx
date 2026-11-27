import { Check, Download, Plus, ShoppingBasket, X } from 'lucide-react';
import { FoodArt } from './FoodArt';
import { ingredientMap } from './catalog';
import type { MaterialUse, MealPlan } from './meal-plan';
import './meal-planner.css';

export function MealPlanner({plan, openRecipe, removeRecipe, markOwned, clear, exportList, close}: {
  plan: MealPlan; openRecipe: (id: string) => void; removeRecipe: (id: string) => void;
  markOwned: (id: string) => void; clear: () => void; exportList: () => void; close: () => void;
}) {
  function materials(items: MaterialUse[], mode: 'missing' | 'owned' | 'optional') {
    return <ul className="prep-materials">{items.map(item => {
      const name=ingredientMap.get(item.id)?.name ?? item.id;
      return <li key={item.id}>
        <FoodArt id={item.id} decorative/>
        <div className="prep-material-copy"><strong>{name}</strong><small>{item.requiredBy.length ? '必需：' : '可选：'}{(item.requiredBy.length ? item.requiredBy : item.optionalBy).map(r=>r.name).join('、')}</small>{item.requiredBy.length>0 && item.optionalBy.length>0 && <small>另作可选：{item.optionalBy.map(r=>r.name).join('、')}</small>}</div>
        {mode==='missing' ? <button className="secondary-button prep-owned-action" aria-label={`标记已有${name}`} onClick={()=>markOwned(item.id)}><Check size={15}/>家里已有</button> : <span className="prep-owned-label">{item.owned ? '家里有' : '未选择'}</span>}
      </li>;
    })}</ul>;
  }
  if (!plan.matches.length) return <div className="empty-state"><ShoppingBasket size={40}/><h3>这一桌，等你来安排</h3><p>从菜谱卡片点击「今日一桌」，开始搭配。</p><button className="primary-button" onClick={close}>去选菜</button></div>;

  return <div className="meal-planner">
    <p className="muted prep-intro">先选好下一顿，再看还要准备什么。清单按材料种类合并，用量请查看原谱。</p>
    <div className="prep-summary" aria-live="polite"><span><b>{plan.matches.length}</b> 道菜</span><span><b>{plan.readyCount}</b> 道材料齐全</span><span><b>{plan.missing.length}</b> 种需准备</span></div>
    <section aria-labelledby="prep-dishes"><h3 id="prep-dishes">这一桌的菜</h3><ul className="prep-dishes">{plan.matches.map(m=><li key={m.recipe.id}>
      <FoodArt id={m.recipe.id} type="recipe" decorative/>
      <div className="prep-dish-copy"><button className="prep-dish-name" onClick={()=>openRecipe(m.recipe.id)}>{m.recipe.name}</button><p className={m.status==='ready'?'prep-ready':''}>{m.status==='ready'?<><Check size={14}/>必需材料种类齐全</>:<>缺 {m.missing.length} 种：{m.missing.map(i=>ingredientMap.get(i.id)?.name ?? i.id).join('、')}</>}</p><button className="text-button prep-recipe-link" aria-label={`查看${m.recipe.name}做法`} onClick={()=>openRecipe(m.recipe.id)}>查看做法</button></div>
      <button className="icon-button prep-remove" aria-label={`移出${m.recipe.name}`} onClick={()=>removeRecipe(m.recipe.id)}><X size={19}/></button>
    </li>)}</ul></section>
    <section aria-labelledby="prep-missing"><h3 id="prep-missing">还需准备 <small>{plan.missing.length} 种必需材料 · 已去重</small></h3>{plan.missing.length ? <><p className="prep-hint">如果某样材料家里已经有，点「家里已有」即可更新整桌清单。</p>{materials(plan.missing,'missing')}</> : <p className="success-note"><Check size={17}/>这一桌的必需材料种类已经齐全。</p>}</section>
    <details className="prep-details"><summary>家里已有的必需材料 <span>{plan.owned.length} 种</span></summary>{plan.owned.length ? materials(plan.owned,'owned') : <p className="prep-hint">还没有选中这桌需要的材料，可从缺料清单标记已有。</p>}</details>
    <details className="prep-details"><summary>原谱可选材料 <span>{plan.optional.length} 种 · 不计入必购项</span></summary>{plan.optional.length ? materials(plan.optional,'optional') : <p className="prep-hint">这桌没有额外的原谱可选材料。</p>}</details>
    <div className="prep-footer"><button className="text-button" onClick={clear}>清空这一桌</button><div><button className="secondary-button" onClick={close}><Plus size={16}/>继续选菜</button><button className="primary-button" onClick={exportList}><Download size={16}/>导出备料清单</button></div></div>
  </div>;
}
