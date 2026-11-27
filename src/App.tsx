import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import { CookingPot, Search, SlidersHorizontal, Plus, X, Check, Heart, LayoutGrid, Network, ShoppingBasket, BookOpen, Leaf, ChefHat, ExternalLink, RotateCcw, Download, Utensils, ChevronDown } from 'lucide-react';
import { ingredients, recipes, ingredientMap, recipeMap } from './catalog';
import { useKitchen, storageUnavailable } from './store';
import { matchRecipe, rankRecipes, searchRecipe, shoppingList, normalize } from './engine';
import type { Recipe, Match } from './types';
import '@xyflow/react/dist/style.css';
import './style.css';
import './ink.css';
import './kitchen-layout.css';
import { FoodArt } from './FoodArt';
import visuals from './data/visuals.json';

type Filter = 'all' | 'ready' | 'almost' | 'favorites';
type Focus = {type: 'recipe' | 'ingredient'; id: string};

function Dialog({title, close, children, wide = false}: {title: string; close: () => void; children: React.ReactNode; wide?: boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {dialog.close(); previous?.focus();};
  }, []);
  return <dialog ref={ref} className={`dialog ${wide ? 'wide' : ''}`} aria-label={title} onCancel={close} onClick={e => {if(e.target === e.currentTarget) close();}}>
    <div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="关闭弹窗" onClick={close}><X size={22}/></button></div>{children}
  </dialog>;
}

function RecipeGraph({focus, setFocus, available, openRecipe}: {focus: Focus; setFocus: (f: Focus) => void; available: Set<string>; openRecipe: (id: string) => void}) {
  const model = useMemo(() => {
    const recipe = focus.type === 'recipe' ? recipeMap.get(focus.id) : undefined;
    const ingredient = focus.type === 'ingredient' ? ingredientMap.get(focus.id) : undefined;
    const items = recipe ? recipe.ingredients.map(i => ({id:i.id, label:ingredientMap.get(i.id)!.name, emoji:ingredientMap.get(i.id)!.emoji, type:'ingredient' as const, tier:i.tier}))
      : recipes.filter(r => r.ingredients.some(i => i.id === focus.id)).map(r => ({id:r.id, label:r.name, emoji:r.emoji, type:'recipe' as const, tier:'L1'}));
    const center: Node = {id:'center', position:{x:310,y:255}, data:{label:<div className="graph-label"><FoodArt id={focus.id} type={focus.type} decorative/><strong>{recipe?.name ?? ingredient?.name}</strong><small>{recipe ? '点击外围食材继续探索' : '点击菜品展开材料'}</small></div>}, style:{width:180, minHeight:130, borderRadius:4, border:'1.5px solid #333333', background:'#f5f5f3', color:'#242424'}};
    const nodes: Node[] = [center]; const edges: Edge[] = [];
    items.forEach((item, index) => {
      const angle = -Math.PI/2 + index*Math.PI*2/items.length;
      const owned = item.type === 'ingredient' ? available.has(item.id) : matchRecipe(recipeMap.get(item.id)!,available).status === 'ready';
      const optional = item.tier === 'L3';
      nodes.push({id:item.type+':'+item.id, position:{x:325+Math.cos(angle)*270,y:275+Math.sin(angle)*245}, data:{label:<div className="graph-label"><FoodArt id={item.id} type={item.type} decorative/><strong>{item.label}</strong><small>{item.type === 'ingredient' ? (optional ? '可选 · ' : '') + (owned ? '家里有' : '未选择') : '查看材料'}</small></div>}, style:{width:150,minHeight:112,borderRadius:4,border:`1px ${optional?'dashed':'solid'} ${owned?'#555555':'#c4c4c4'}`,background:owned?'#eeeeec':'#fafaf8',color:'#303030'}});
      edges.push({id:'edge-'+index,source:'center',target:item.type+':'+item.id,style:{stroke:owned?'#555555':'#c9c9c9',strokeWidth:owned?2:1.4,strokeDasharray:optional?'5 5':undefined},type:'straight'});
    });
    return {nodes,edges};
  }, [focus,available]);
  return <div className="graph-wrapper">
    <div className="graph-caption"><span><Network size={16}/> 循着一味，寻一餐饭</span>{focus.type==='recipe' && <button className="text-button" onClick={()=>openRecipe(focus.id)}>查看做法 <BookOpen size={16}/></button>}</div>
    <div className="graph-space"><ReactFlow key={focus.type+focus.id} nodes={model.nodes} edges={model.edges} fitView fitViewOptions={{padding:.2}} minZoom={.35} maxZoom={1.8} nodesDraggable={false} nodesConnectable={false} onNodeClick={(_,node)=>{
      if(node.id==='center') return;
      const [type,id]=node.id.split(':'); setFocus({type:type as Focus['type'],id});
    }} proOptions={{hideAttribution:false}}><Background color="#dddddd" gap={22}/><Controls showInteractive={false}/></ReactFlow></div>
    <div className="graph-foot"><span className="legend-have">深墨实框：已拥有 / 材料齐全</span><span>虚线：原谱可选材料</span><button className="text-button" onClick={()=>setFocus({type:'recipe',id:'tomato-eggs'})}><RotateCcw size={14}/>回到番茄炒蛋</button></div>
  </div>;
}

function RecipeCard({match, open, explore}: {match: Match; open: () => void; explore: () => void}) {
  const {favorites,meal,toggle} = useKitchen();
  const {recipe,missing,status,required} = match;
  const requiredNames = required.filter(i => ingredientMap.get(i.id)?.group!=='调料').slice(0,3).map(i => ingredientMap.get(i.id)!.name);
  return <article className="recipe-card">
    <div className="card-art" ><FoodArt id={recipe.id} type="recipe" className="dish-illustration"/><span className="art-caption">{(visuals as Record<string,{kind?:string}>)[`recipe:${recipe.id}`]?.kind==='recipe-photo'?'原谱照片':'主料示意'}</span><span className="category-label">{recipe.category}</span><button className={`favorite icon-button ${favorites.includes(recipe.id)?'is-favorite':''}`} aria-label={`${favorites.includes(recipe.id)?'取消收藏':'收藏'}${recipe.name}`} aria-pressed={favorites.includes(recipe.id)} onClick={()=>toggle('favorites',recipe.id)}><Heart size={18} fill={favorites.includes(recipe.id)?'currentColor':'none'}/></button></div>
    <div className="card-body"><span className={`match-badge ${status}`}><span/>{status==='ready'?'材料种类齐全':status==='almost'?'再备 1 种材料':`还缺 ${missing.length} 种材料`}</span><button className="card-title" onClick={open}>{recipe.name}</button><p>{recipe.description}</p><div className="ingredient-preview">{requiredNames.map(n=><span key={n}>{n}</span>)}</div><div className="card-progress"><div style={{width:match.coverage*100+'%'}}/></div><div className="card-meta"><span>必需材料 {required.length-missing.length}/{required.length}</span><button className="text-button" onClick={explore}><Network size={14}/>关系图</button></div></div>
    <div className="card-actions"><button onClick={open}><BookOpen size={15}/>查看做法</button><button className={meal.includes(recipe.id)?'added':''} onClick={()=>toggle('meal',recipe.id)} aria-label={`${meal.includes(recipe.id)?'移出今日一桌':'加入今日一桌'}${recipe.name}`}>{meal.includes(recipe.id)?<Check size={17}/>:<Plus size={17}/>}<span>{meal.includes(recipe.id)?'已加入':'今日一桌'}</span></button></div>
  </article>;
}

function SourceSections({recipe}: {recipe:Recipe}) {
  const sections = recipe.original.split(/^## /m).slice(1).map(s => {const [title,...lines]=s.split('\n'); return {title:title.trim(),body:lines.join('\n')};}).filter(s=>['计算','操作','附加内容'].includes(s.title));
  const clean = (s:string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1').replace(/如果您遵循本指南[\s\S]*$/,'').trim();
  return <div className="source-sections">{sections.filter(s=>clean(s.body)).map(s=><section key={s.title}><h3>{s.title==='计算'?'原谱份量与用量':s.title==='操作'?'跟着原谱做':'原谱补充说明'}</h3><div className="source-text">{clean(s.body)}</div></section>)}</div>;
}

function RecipeDetail({recipe,available,close,explore}: {recipe:Recipe;available:Set<string>;close:()=>void;explore:()=>void}) {
  const {meal,toggle} = useKitchen();
  const m = matchRecipe(recipe,available);
  return <Dialog title={recipe.name} close={close} wide>
    <div className="detail-intro"><span className="detail-emoji"><FoodArt id={recipe.id} type="recipe"/></span><div><span className="eyebrow">{recipe.category} · HOWTOCOOK</span><p>{recipe.description}</p></div></div>
    <div className="detail-actions"><button className="primary-button" onClick={()=>toggle('meal',recipe.id)}>{meal.includes(recipe.id)?<Check size={17}/>:<Plus size={17}/>} {meal.includes(recipe.id)?'已加入今日一桌':'加入今日一桌'}</button><button className="secondary-button" onClick={explore}><Network size={17}/>探索关系图</button></div>
    <section className="detail-materials"><h3>准备材料 <small>{m.missing.length?`缺 ${m.missing.length} 种必需材料`:'必需材料种类齐全'}</small></h3><p className="muted">核对材料种类；实际数量、工具与用量请查看下方原谱。</p><div className="material-list">{recipe.ingredients.map(i=>{const ing=ingredientMap.get(i.id)!;const owned=available.has(i.id);return <div key={i.id} className={owned?'owned':''}><span><FoodArt id={ing.id} decorative/> {ing.name}</span><span>{i.tier==='L3'?'可选 · ':''}{owned?<><Check size={14}/>家里有</>:i.tier==='L1'?'需准备':'未选择'}</span></div>;})}</div></section>
    <details className="annotation"><summary>这份菜谱的版本与标注说明</summary><p>{recipe.annotationNote}</p><p>“必需 / 可选”由本项目依据原谱编辑整理。生抽 / 酱油归为同一检索项，烹调时按原谱选择具体种类；不自动视为老抽。</p></details>
    <SourceSections recipe={recipe}/>
    <footer className="detail-source"><a href={recipe.source.url} target="_blank" rel="noreferrer">查看 GitHub 原谱 <ExternalLink size={14}/></a><span>Unlicense · 固定版本 {recipe.source.commit.slice(0,7)}</span></footer>
  </Dialog>;
}

export default function App() {
  const {selected,pantry,favorites,meal,toggle,clear,example} = useKitchen();
  const [query,setQuery]=useState(''); const [ingredientQuery,setIngredientQuery]=useState('');
  const [group,setGroup]=useState('常用'); const [filter,setFilter]=useState<Filter>('all');
  const [view,setView]=useState<'cards'|'graph'>('cards'); const [focus,setFocus]=useState<Focus>({type:'recipe',id:'tomato-eggs'});
  const [detail,setDetail]=useState<string|null>(null); const [modal,setModal]=useState<'pantry'|'meal'|'about'|null>(null);
  const [warning,setWarning]=useState(storageUnavailable); const [category,setCategory]=useState('全部菜品');
  const [notice,setNotice]=useState('');
  const [pantryOpen,setPantryOpen]=useState(false);
  const resultsRef=useRef<HTMLDivElement>(null);
  function finishPicking() {
    setPantryOpen(false);
    requestAnimationFrame(()=>{
      resultsRef.current?.focus({preventScroll:true});
      resultsRef.current?.scrollIntoView({block:'start'});
    });
  }
  useEffect(()=>{const handler=()=>setWarning(true);window.addEventListener('kitchen-storage-error',handler);return()=>window.removeEventListener('kitchen-storage-error',handler);},[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),2600);return()=>clearTimeout(timer);},[notice]);
  const available=useMemo(()=>new Set([...selected,...pantry]),[selected,pantry]);
  const ranked=useMemo(()=>rankRecipes(recipes,available),[available]);
  const visible=ranked.filter(m=>searchRecipe(m.recipe,query,ingredients)&&(category==='全部菜品'||m.recipe.category===category)&&(filter==='all'||filter==='favorites'?filter!=='favorites'||favorites.includes(m.recipe.id):m.status===filter));
  const common=new Set(['tomato','egg','potato','broccoli','cucumber','onion','silken-tofu','wings','pork-belly','rice','seaweed','pumpkin']);
  const shownIngredients=ingredients.filter(i=>(normalize(i.name+' '+i.aliases.join(' ')).includes(normalize(ingredientQuery)))&&(ingredientQuery||group==='全部'||(group==='常用'?common.has(i.id):i.group===group)));
  const readyCount=ranked.filter(r=>r.status==='ready').length;
  const shopping=shoppingList(meal.map(id=>recipeMap.get(id)!).filter(Boolean),available);
  function exportList() {
    const dishes=meal.map(id=>recipeMap.get(id)!).filter(Boolean);
    const text=['今日一桌',...dishes.map(r=>'· '+r.name),'','待准备的必需食材（种类清单，数量请按原谱核对）',...(shopping.length?shopping.map(i=>`□ ${ingredientMap.get(i.id)!.name}（${i.dishes.join('、')}）`):['必需材料种类已齐全。']), '', '菜谱来源',...dishes.map(r=>r.name+' '+r.source.url)].join('\n');
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='今日一桌_备料清单.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('备料清单已导出');
  }
  function explore(id:string) {setFocus({type:'recipe',id});setView('graph');setDetail(null);}
  return <>
    <header className="topbar"><a className="brand" href="#" onClick={e=>{e.preventDefault();setQuery('');setFilter('all');setView('cards');}}><span className="brand-mark"><CookingPot size={24}/></span><span>食材工坊<small>人间烟火 · 纸上寻味</small></span></a><nav aria-label="主导航"><button aria-pressed={view==='cards'} className={view==='cards'?'active':''} onClick={()=>setView('cards')}><Utensils size={17}/>发现菜谱</button><button aria-pressed={view==='graph'} className={view==='graph'?'active':''} onClick={()=>setView('graph')}><Network size={17}/>食材关系图</button></nav><button className="meal-button" onClick={()=>setModal('meal')}><ShoppingBasket size={18}/><span>今日一桌</span><b>{meal.length}</b></button></header>
    {warning&&<div className="storage-warning">浏览器存储不可用或旧记录损坏，本次操作仍可使用，但可能无法保存。</div>}
    <div className="app-shell">
      <aside className="pantry-sidebar"><div className="sidebar-heading"><span className="eyebrow">厨房 · 从手边开始</span><h2>我的食材 <span>{selected.length}</span></h2><p>看看冰箱里，还有什么好食材。</p><button className="pantry-toggle" aria-expanded={pantryOpen} aria-controls="pantry-controls" onClick={()=>setPantryOpen(!pantryOpen)}>{pantryOpen?"收起食材":"挑选食材"}<ChevronDown size={16}/></button></div><p className="pantry-summary">已选 {selected.length} 种食材 · 常备 {pantry.length} 种调料，展开可调整。</p><div id="pantry-controls" className={`pantry-controls ${pantryOpen?"is-open":""}`}>
        <label className="input-box ingredient-search"><Search size={17}/><input aria-label="搜索食材" placeholder="找食材，例如：鸡蛋" value={ingredientQuery} onChange={e=>setIngredientQuery(e.target.value)}/>{ingredientQuery&&<button aria-label="清除食材搜索" className="icon-button" onClick={()=>setIngredientQuery('')}><X size={14}/></button>}</label>
        <div className="ingredient-groups" aria-label="食材分类">{['常用','蔬菜','蛋奶豆制品','肉类','主食','调料','全部'].map(g=><button key={g} className={group===g?'active':''} onClick={()=>setGroup(g)}>{g==='蛋奶豆制品'?'蛋 / 豆':g}</button>)}</div>
        <div className="ingredient-grid">{shownIngredients.map(i=>{const owned=available.has(i.id);const isPantry=pantry.includes(i.id);return <button key={i.id} className={`ingredient-tile ${owned?'selected':''}`} aria-label={`${isPantry?'常备':owned?'移除':'选择'}${i.name}`} aria-pressed={owned} onClick={()=>{if(isPantry){setModal('pantry');return;}toggle('selected',i.id);}}><FoodArt id={i.id} className="ingredient-art"/><span>{i.name}</span>{owned&&<span className="tile-check"><Check size={11}/></span>}{isPantry&&<small>常备</small>}</button>;})}{!shownIngredients.length&&<p className="empty-small">还没有收录这个食材，试试其他名称。</p>}</div>
        <div className="pantry-settings"><div><span><SlidersHorizontal size={16}/> 常备调料</span><button className="text-button" onClick={()=>setModal('pantry')}>管理</button></div><p>{pantry.map(id=>ingredientMap.get(id)?.name).join('、')||'未设置常备调料'}</p><small>已计入匹配。默认仅含盐和食用油，可自行修改。</small></div>
        <button className="primary-button pantry-done" onClick={finishPicking}>选好了，看看能做什么</button></div><div className="sidebar-bottom"><Leaf size={17}/><span>从手边食材开始，少一点纠结。</span></div>
      </aside>
      <main>
        <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="little-line"/> 一蔬一饭 · 皆有滋味</span><h1>今天，做点什么<span>？</span></h1><p>选好手边的食材，<br className="mobile-break"/>让下一顿饭有个着落。</p><button className="hero-example" onClick={()=>{example();setView('cards');setFilter('all');setQuery('');setCategory('全部菜品');setNotice('已加入西红柿和鸡蛋，试试再选一种食材');}}><FoodArt id="tomato" decorative/><FoodArt id="egg" decorative/>试试「番茄 + 鸡蛋」<Plus size={15}/></button></div><div className="hero-illustration" aria-hidden="true"><FoodArt id="hero" type="scene" decorative/><span className="plate-caption">竹影入窗，一饭清欢</span></div></section>
        <section className="selection-strip" aria-label="已选食材"><div className="selection-label"><span className="selection-dot"/>手边有 <b>{selected.length}</b> 种</div><div className="selected-tags">{selected.length?selected.map(id=><button key={id} onClick={()=>toggle('selected',id)} aria-label={`移除已选${ingredientMap.get(id)!.name}`}><FoodArt id={id} decorative/> {ingredientMap.get(id)!.name}<X size={13}/></button>):<span className="selection-placeholder">先挑选手边食材，或逛逛下面的菜谱。</span>}</div>{selected.length>0&&<button className="text-button clear-selection" onClick={()=>clear('selected')}>清空</button>}</section>
        <div className="results-heading" id="recipe-results" ref={resultsRef} tabIndex={-1}><div><span className="eyebrow">寻味 · 家常之间</span><h2>{view==='cards'?'你的下一道家常菜':'顺着食材，发现更多'}</h2></div><span className="ready-note"><ChefHat size={18}/>{readyCount>0?`${readyCount} 道菜的必需材料种类已齐全`:'选几样食材，看看能做什么'}</span></div>
        <div className="toolbar"><label className="input-box recipe-search"><Search size={18}/><input aria-label="搜索菜谱或食材" placeholder="搜菜名或食材，支持「番茄」这样的别名" value={query} onChange={e=>{setQuery(e.target.value);setView('cards');}}/>{query&&<button aria-label="清除菜谱搜索" className="icon-button" onClick={()=>setQuery('')}><X size={16}/></button>}</label><label className="category-select"><select aria-label="菜品分类" value={category} onChange={e=>{setCategory(e.target.value);setView('cards');}}>{['全部菜品','素菜','荤菜','主食','汤羹'].map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={15}/></label><div className="view-toggle"><button className={view==='cards'?'active':''} aria-label="卡片视图" onClick={()=>setView('cards')}><LayoutGrid size={18}/></button><button className={view==='graph'?'active':''} aria-label="关系图视图" onClick={()=>setView('graph')}><Network size={18}/></button></div></div>
        {view==='cards'?<><div className="filter-bar"><div role="group" aria-label="匹配筛选">{([['all','全部菜谱',recipes.length],['ready','材料齐全',readyCount],['almost','只差一种',ranked.filter(m=>m.status==='almost').length],['favorites','我的收藏',favorites.length]] as const).map(([key,label,count])=><button key={key} className={filter===key?'active':''} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{key==='favorites'&&<Heart size={14}/>} {label}<span>{count}</span></button>)}</div><span>{visible.length} 道菜 · 按材料匹配排序</span></div>
        <div className="recipe-grid">{visible.map(m=><RecipeCard key={m.recipe.id} match={m} open={()=>setDetail(m.recipe.id)} explore={()=>explore(m.recipe.id)}/>)}</div>{!visible.length&&<div className="empty-state"><CookingPot size={42}/><h3>这里暂时还没有合适的菜</h3><p>{filter==='favorites'?'点击菜谱上的爱心，就能收藏在这里。':'试着多选一些材料，或放宽搜索与筛选条件。'}</p><button className="secondary-button" onClick={()=>{setFilter('all');setQuery('');setCategory('全部菜品');}}>查看全部菜谱</button></div>}</>:<RecipeGraph focus={focus} setFocus={setFocus} available={available} openRecipe={setDetail}/>}
        <footer className="page-footer"><span>认真做一顿平常饭。</span><button className="text-button" onClick={()=>setModal('about')}>关于与开源来源 <ExternalLink size={13}/></button></footer>
      </main>
    </div>
    {detail&&recipeMap.has(detail)&&<RecipeDetail recipe={recipeMap.get(detail)!} available={available} close={()=>setDetail(null)} explore={()=>explore(detail)}/>}
    {modal==='pantry'&&<Dialog title="家里常备的调料" close={()=>setModal(null)}><p className="muted">勾选后会自动用于所有菜谱的匹配。没有的调料可以随时取消。</p><div className="pantry-checks">{ingredients.filter(i=>i.group==='调料').map(i=><label key={i.id}><input type="checkbox" checked={pantry.includes(i.id)} onChange={()=>toggle('pantry',i.id)}/><span>{i.name}</span></label>)}</div><div className="dialog-bottom"><span>已设 {pantry.length} 种常备材料</span><button className="primary-button" onClick={()=>setModal(null)}>完成</button></div></Dialog>}
    {modal==='meal'&&<Dialog title="今日一桌" close={()=>setModal(null)}><p className="muted">把想做的菜放在一起，合并查看缺少的材料。</p>{meal.length?<><div className="meal-list">{meal.map(id=>{const r=recipeMap.get(id)!;return <div key={id}><FoodArt id={r.id} type="recipe" decorative/><button className="text-button" onClick={()=>{setModal(null);setDetail(id);}}>{r.name}</button><button className="icon-button" aria-label={`移出${r.name}`} onClick={()=>toggle('meal',id)}><X size={18}/></button></div>;})}</div><h3>还需准备 <small>{shopping.length} 种必需材料</small></h3><p className="muted">先合并种类，实际数量请逐道核对原谱；可选材料见各菜详情。</p><div className="shopping-list">{shopping.map(i=><div key={i.id}><span className="shopping-box"/><div><strong>{ingredientMap.get(i.id)!.name}</strong><small>{i.dishes.join('、')}</small></div></div>)}</div>{!shopping.length&&<p className="success-note"><Check size={17}/>必需材料种类已经齐全。</p>}<div className="dialog-bottom"><button className="text-button" onClick={()=>clear('meal')}>清空这一桌</button><button className="primary-button" onClick={exportList}><Download size={16}/>导出备料清单</button></div></>:<div className="empty-state"><ShoppingBasket size={40}/><h3>这一桌，等你来安排</h3><p>从菜谱卡片点击「今日一桌」，开始搭配。</p><button className="primary-button" onClick={()=>setModal(null)}>去选菜</button></div>}</Dialog>}
    {modal==='about'&&<Dialog title="关于食材工坊" close={()=>setModal(null)}><div className="about-content"><p>一个从手边食材出发的做饭规划工具。当前版本提供 {recipes.length} 道中文菜谱，支持按食材找菜、查看原谱、关系探索、收藏和备料清单。</p><h3>开源的基础</h3><p><a href="https://github.com/Anduin2017/HowToCook" target="_blank" rel="noreferrer">HowToCook</a> 提供菜谱原文（Unlicense）。原始份量与做法保留，材料匹配标签由本项目编辑。</p><p>参考 <a href="https://github.com/YunYouJun/cook" target="_blank" rel="noreferrer">YunYouJun/cook</a> 的按食材选菜流程，以及 <a href="https://github.com/tfrere/recipe-display" target="_blank" rel="noreferrer">recipe-display</a> 的关系图与库存匹配设计。未复制这两个项目的业务代码。</p><p>食材彩图直接采用 <a href="https://github.com/cosmintrica/culinary-assets" target="_blank" rel="noreferrer">Culinary Assets</a>（CC0）；作者说明这是经其检查的 AI 生成素材。没有准确彩图的食材显示名称，避免用近似图替代。</p><p>有对应原图的菜品使用 HowToCook 照片，其余标为“主料示意”。鸡翅中使用翅中熟制参考图，未再使用鸡腿图。</p><p>页面山水装饰采用 <a href="https://github.com/LingDong-/shan-shui-inf" target="_blank" rel="noreferrer">shan-shui-inf</a>（Lingdong Huang，MIT）现成画面。页面为水墨灰度，食物保留原有颜色。</p><p>界面基于 React、Zustand、React Flow 与 Lucide。相关许可保留于项目源码及 <a href="/third-party-notices.txt" target="_blank" rel="noreferrer">第三方许可文件</a>。</p><h3>接下来一起打磨</h3><p>当前核对材料种类，不管理库存克重；份量保留原谱，尚未启用人数换算、自动平替与地图菜系筛选。</p><p>收藏、食材和调料只保存在当前浏览器，不会自动同步到其他设备。</p></div></Dialog>}
    {notice&&<div className="toast" role="status"><Check size={17}/>{notice}</div>}
  </>;
}
