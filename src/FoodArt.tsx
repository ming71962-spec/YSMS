import visuals from './data/visuals.json';
interface Visual { label: string; kind?: string; src?: string; svg?: string; short?: string; ingredients?: string[]; }
const artwork: Record<string, Visual> = visuals;

export function FoodArt({id, type = 'ingredient', className = '', decorative = false}: {id: string; type?: 'ingredient' | 'recipe' | 'scene'; className?: string; decorative?: boolean}) {
  const key = `${type}:${id}`;
  const item = artwork[key];
  if (!item) return null;
  if(item.kind === 'ingredient-collage') return <span className={`food-art food-collage ${className}`} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : item.label} aria-hidden={decorative ? true : undefined} data-art-key={key}>{item.ingredients?.map(i=><FoodArt key={i} id={i} decorative/>)}</span>;
  if(item.kind === 'text') return <span className={`food-art food-wordmark ${className}`} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : item.label} aria-hidden={decorative ? true : undefined} data-art-key={key}><span>{item.short ?? item.label}</span></span>;
  return <img className={`food-art ${className} ${item.kind ?? ''}`} src={item.src ?? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg ?? '')}`} alt={decorative ? '' : item.label} aria-hidden={decorative ? true : undefined} draggable={false} data-art-key={key}/>;
}
