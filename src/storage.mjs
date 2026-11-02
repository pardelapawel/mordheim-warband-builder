import {normalizeBand} from './model.mjs';
export const STORAGE_KEY='mordheim_rosters_v2';
export function readLibrary(storage) {
  const raw=storage.getItem(STORAGE_KEY);
  if(raw){const value=JSON.parse(raw);if(!value || !Array.isArray(value.bands)) throw new Error('Uszkodzona biblioteka band. Zapisane dane pozostają w przeglądarce.');return value;}
  const bands=[], notices=[], saved=storage.getItem('mordheim_saves'), current=storage.getItem('mordheim_current');
  let old=[], active=null;
  if(saved){try{const parsed=JSON.parse(saved);if(Array.isArray(parsed))old=parsed;else notices.push('Nieprawidłowa lista starych zapisów.');}catch{notices.push('Nie udało się odczytać starej listy zapisów.');}}
  if(current){try{active=JSON.parse(current);}catch{notices.push('Nie udało się odczytać ostatniej bandy.');}}
  for(const entry of old){try{bands.push(normalizeBand(entry));}catch(error){notices.push(`${entry?.name || 'Stary zapis'}: ${error.message}`);}}
  let selected=bands.find(b=>active && b.name===active.name && b.warbandTypeId===active.warbandTypeId);
  if(active){try{const migrated=normalizeBand(active);if(selected){migrated.id=selected.id;bands[bands.indexOf(selected)]=migrated;}else bands.push(migrated);selected=migrated;}catch(error){notices.push(error.message);}}
  return {bands,activeId:selected?.id || bands[0]?.id || null,notices};
}
export function writeLibrary(storage,bands,activeId){storage.setItem(STORAGE_KEY,JSON.stringify({schemaVersion:2,bands,activeId}));}
export function encodeShare(band,codec){return codec.compressToBase64(JSON.stringify(band)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function decodeShare(value,codec){if(!value || value.length>250000) throw new Error('Nieprawidłowy link bandy.');const source=value.replace(/-/g,'+').replace(/_/g,'/');const json=codec.decompressFromBase64(source.padEnd(Math.ceil(source.length/4)*4,'='));if(!json) throw new Error('Nie udało się odczytać linku bandy.');return normalizeBand(JSON.parse(json));}
