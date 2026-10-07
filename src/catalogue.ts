import Fuse from 'fuse.js';
import rawProducts from './data/products.json';
import rawGuidance from './data/guidance.json';
import rawSources from './data/sources.json';
import { validateCatalogue, guidanceSchema, sourceSchema, validateEvidence, formulationKey, normalize, type Product, type Guidance } from './domain';
export const products=validateCatalogue(rawProducts);
export const guidance=rawGuidance.map(g=>guidanceSchema.parse(g));
export const sources=rawSources.map(s=>sourceSchema.parse(s));
validateEvidence(guidance,sources);
const index=new Fuse(products.map(p=>({...p,searchText:normalize([p.brand_name,p.generic_name,p.strength,p.dosage_form,p.manufacturer,p.release_type].join(' '))})),{keys:[{name:'brand_name',weight:0.38},{name:'generic_name',weight:0.27},{name:'manufacturer',weight:0.15},{name:'strength',weight:0.1},{name:'dosage_form',weight:0.1}],threshold:0.32,ignoreLocation:true,includeScore:true});
const haystack=(p:Product)=>normalize([p.brand_name,p.generic_name,p.strength,p.dosage_form,p.manufacturer,p.release_type].join(' '));
function isOneEdit(a:string,b:string){if(Math.abs(a.length-b.length)>1)return false;if(a===b)return true;for(let i=0;i<Math.max(a.length,b.length);i++){if(a[i]===b[i])continue;if(a.length===b.length)return a.slice(i+1)===b.slice(i+1)||(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2));if(a.length>b.length)return a.slice(i+1)===b.slice(i);return a.slice(i)===b.slice(i+1);}return true;}
export function searchProducts(query:string):Product[]{const q=normalize(query).replace(/(\d)\s*(mg|ml)\b/g,'$1 $2');if(!q)return [];const tokens=q.split(/\s+/);const candidates=new Map<string,{product:Product,score:number}>();for(const p of products){const hay=normalize([p.brand_name,p.generic_name,p.strength,p.dosage_form,p.manufacturer,p.release_type].join(' '));if(tokens.every(t=>hay.includes(t)))candidates.set(p.id,{product:p,score:normalize(p.brand_name)===q?-2:normalize(`${p.brand_name} ${p.strength}`)===q?-1:0});}
// Token intersection allows mixed-field queries such as "Cefixime 200 capsule".
let tokenCandidates:Map<string,number>|null=null;
for(const token of tokens){const direct=products.filter(p=>haystack(p).includes(token));const matches:Map<string,number>=direct.length?new Map(direct.map(p=>[p.id,0])):/\d/.test(token)?new Map():new Map(index.search(token).map(r=>[r.item.id,r.score??1]));if(!direct.length&&token.length>=3&&!/\d/.test(token)){for(const p of products)if(haystack(p).split(/[\s+/]+/).some(word=>isOneEdit(token,word)))matches.set(p.id,0.1);}if(tokenCandidates===null)tokenCandidates=matches;else{const next=new Map<string,number>();for(const [id,score] of tokenCandidates)if(matches.has(id))next.set(id,score+matches.get(id)!);tokenCandidates=next;}}
for(const [id,score] of tokenCandidates??[])if(!candidates.has(id))candidates.set(id,{product:products.find(p=>p.id===id)!,score:1+score});
return [...candidates.values()].sort((a,b)=>a.score-b.score||a.product.brand_name.localeCompare(b.product.brand_name)||a.product.id.localeCompare(b.product.id,undefined,{numeric:true})).map(x=>x.product);}
const guidanceIndex=new Map(guidance.map(g=>[formulationKey(g),g]));
export function resolveGuidance(product:Product,confirmed:boolean):Guidance|null{if(!confirmed||product.release_type==='UNKNOWN')return null;const record=guidanceIndex.get(formulationKey(product));return record&&record.verification_status!=='NOT_AVAILABLE'?record:null;}
export const coveredProducts=products.filter(p=>resolveGuidance(p,true)).length;
