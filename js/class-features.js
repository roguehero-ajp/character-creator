/**
 * My RPG Source - Structured Class & Subclass Features
 * ---------------------------------------------------
 * Populates Page 2 from edition-specific SRD class progression data.
 * All twelve SRD classes are supported in both 2014 and 2024.
 *
 * Choice-heavy features use a saved notes field in this first pass. This is
 * deliberate: the engine tracks that the choice exists without inventing a
 * false universal option list for features whose legal choices differ by
 * edition, class, level, proficiency, or another subsystem.
 */
(() => {
  'use strict';
  const config=window.MyRPGConfig;
  const STATE_FIELD_ID='class-feature-state';
  const LIST_ID='class-feature-groups';
  const CONTINUATION_HOST_ID='class-feature-pages';
  const PAGE2_FEATURE_LIMIT=8;
  const CONTINUATION_PAGE_LIMIT=24;
  const STATE_VERSION=1;
  const state={loaded:false,entries:[],byClass:new Map(),subclasses:new Map(),data:emptyState(),error:null};
  let readyPromise=Promise.resolve(state);

  function emptyState(){return {version:STATE_VERSION,subclasses:{},choices:{},manualSubclassFeatures:{}};}
  function text(v){return String(v??'').trim();}
  function integer(v,f=0){const n=parseInt(v,10);return Number.isFinite(n)?n:f;}
  function field(){return document.getElementById(STATE_FIELD_ID);}
  function slug(v){return text(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function codexUrl(entry){
    const globalId=['dnd5e',config?.edition||'2024','class-feature',entry.id].join(':');
    const p=new URLSearchParams({game:'dnd5e',edition:config?.edition||'2024',type:'class-feature',entry:globalId});
    return `codex.html?${p.toString()}`;
  }
  function readState(){
    const raw=text(field()?.value); state.data=emptyState(); if(!raw)return state.data;
    try{const parsed=JSON.parse(raw); if(parsed&&typeof parsed==='object'){
      state.data.version=STATE_VERSION;
      state.data.subclasses=(parsed.subclasses&&typeof parsed.subclasses==='object')?parsed.subclasses:{};
      state.data.choices=(parsed.choices&&typeof parsed.choices==='object')?parsed.choices:{};
      state.data.manualSubclassFeatures=(parsed.manualSubclassFeatures&&typeof parsed.manualSubclassFeatures==='object')?parsed.manualSubclassFeatures:{};
    }}catch(e){console.warn('Class feature state could not be parsed.',e);} return state.data;
  }
  function writeState(emit=true){const f=field();if(!f)return;f.value=JSON.stringify(state.data);if(emit)f.dispatchEvent(new Event('input',{bubbles:true}));}
  async function fetchJson(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`Could not load ${path} (${r.status}).`);return r.json();}
  function classRows(){return Array.from(document.querySelectorAll('.class-level-row')).map((row,rowIndex)=>{
    const className=text(row.querySelector('.char-class-select')?.value); const level=integer(row.querySelector('.char-level-select')?.value,1);
    const entry=window.CharacterClasses?.findEntry?.(className); return entry?{rowIndex,id:entry.id,name:entry.name,level}:null;
  }).filter(Boolean);}
  function subclassMeta(classId){return state.subclasses.get(classId)||null;}
  function subclassSelection(classId){return state.data.subclasses[classId]||{id:'',manualName:''};}
  function ensureSubclassSelection(classId){if(!state.data.subclasses[classId])state.data.subclasses[classId]={id:'',manualName:''};return state.data.subclasses[classId];}
  function migrateSpellSubclassSelections(){
    const spellState=window.CharacterSpellcasting?.state?.sources||{};
    Object.entries(spellState).forEach(([classId,source])=>{if(!source)return;const existing=ensureSubclassSelection(classId);if(!existing.id&&text(source.subclassId)){existing.id=text(source.subclassId);existing.manualName=text(source.manualSubclassName);}});
  }
  function syncSpellSubclass(classId){
    const selection=subclassSelection(classId);
    window.CharacterSpellcasting?.setSubclassSelection?.(classId,selection.id,selection.manualName,{render:true,emit:false});
  }
  function groupEntries(classId){return state.byClass.get(classId)||[];}
  function earnedClassFeatures(row){return groupEntries(row.id).filter(e=>e.featureSource==='class'&&e.level<=row.level);}
  function earnedSubclassFeatures(row){
    const selection=subclassSelection(row.id); const meta=subclassMeta(row.id);
    if(!meta||selection.id!==meta.id||row.level<Number(meta.minimumLevel||1))return [];
    return groupEntries(row.id).filter(e=>e.featureSource==='subclass'&&e.subclassId===meta.id&&e.level<=row.level);
  }
  function make(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el;}
  function renderFeatureCard(entry,kind='class'){
    const card=make('div',`class-feature-card ${kind==='subclass'?'subclass':''}`); card.dataset.featureId=entry.id;
    const head=make('div','class-feature-card-head'); const main=make('div');
    main.append(make('div','class-feature-title',entry.title),make('div','class-feature-source',`${kind==='subclass'?entry.subclassName:entry.className} • level ${entry.level}`));
    const actions=make('div','class-feature-actions');
    const info=make('button','class-feature-info','i'); info.type='button'; info.dataset.classFeatureKnowledge=entry.id; info.setAttribute('aria-label',`Knowledge Card for ${entry.title}`);
    const link=make('a','class-feature-codex','Codex'); link.href=codexUrl(entry); link.target='_blank'; link.rel='noopener'; link.setAttribute('aria-label',`Open ${entry.title} in the Codex`);
    actions.append(info,link); head.append(main,actions); card.appendChild(head);
    if(entry.requiresChoice){
      const details=make('details','class-feature-choice');
      const saved=text(state.data.choices[entry.id]);
      const summary=make('summary','',saved?`Choice: ${saved}`:'Record choice…');
      const input=make('input','fantasy-input');input.type='text';input.dataset.classFeatureChoice=entry.id;input.placeholder='Record the option(s) chosen for this feature…';input.value=saved;
      input.addEventListener('input',()=>{summary.textContent=text(input.value)?`Choice: ${text(input.value)}`:'Record choice…';});
      details.append(summary,input);card.appendChild(details);
    }
    return card;
  }
  function renderSubclassPanel(row){
    const meta=subclassMeta(row.id); if(!meta||row.level<Number(meta.minimumLevel||1))return null;
    const selection=ensureSubclassSelection(row.id); const box=make('div','subclass-feature-panel');
    const label=make('label','',`${row.name} subclass`); const select=make('select','fantasy-input subclass-feature-select');select.dataset.classSubclass=row.id;
    for(const [value,labelText] of [['','Choose subclass…'],['__manual__','Other / manual subclass'],[meta.id,meta.name]]){const o=document.createElement('option');o.value=value;o.textContent=labelText;select.appendChild(o);} select.value=selection.id||'';label.appendChild(select);box.appendChild(label);
    if(selection.id==='__manual__'){
      const manual=make('input','fantasy-input subclass-manual-name');manual.type='text';manual.dataset.manualSubclassName=row.id;manual.placeholder='Subclass name…';manual.value=text(selection.manualName);box.appendChild(manual);
      const levels=(meta.featureLevels||[]).filter(l=>Number(l)<=row.level);
      levels.forEach(l=>{const wrap=make('label','manual-subclass-feature');wrap.appendChild(make('span','',`Level ${l} subclass feature`));const input=make('input','fantasy-input');input.type='text';input.dataset.manualSubclassFeature=`${row.id}:${l}`;input.placeholder='Feature name from your own source…';input.value=text(state.data.manualSubclassFeatures[`${row.id}:${l}`]);wrap.appendChild(input);box.appendChild(wrap);});
    }
    return box;
  }
  function featureRecordsForRow(row){
    return [
      ...earnedClassFeatures(row).map((entry)=>({entry,kind:'class'})),
      ...earnedSubclassFeatures(row).map((entry)=>({entry,kind:'subclass'}))
    ];
  }

  function createGroupShell(row,{showSubclass=true}={}){
    const group=make('section','class-feature-group');
    const gh=make('div','class-feature-group-head');
    gh.append(make('h4','class-feature-group-title',row.name),make('span','class-feature-level',`Class level ${row.level}`));
    group.appendChild(gh);
    if(showSubclass){const sub=renderSubclassPanel(row);if(sub)group.appendChild(sub);}
    const list=make('div','class-feature-list');
    group.appendChild(list);
    return {group,list};
  }

  function renderContinuationPages(overflowGroups){
    const host=document.getElementById(CONTINUATION_HOST_ID);if(!host)return 0;
    const flat=[];
    overflowGroups.forEach(({row,records})=>records.forEach(record=>flat.push({row,...record})));
    const fragment=document.createDocumentFragment();
    let pageCount=0;
    for(let offset=0;offset<flat.length;offset+=CONTINUATION_PAGE_LIMIT){
      const chunk=flat.slice(offset,offset+CONTINUATION_PAGE_LIMIT);pageCount+=1;
      const page=make('section','sheet-page class-feature-continuation-page');
      page.id=`class-feature-page-${pageCount}`;
      page.append(make('h2','fantasy-header','Class & Subclass Features — Continued'));
      const note=make('p','class-feature-page-note',`Feature continuation ${pageCount}${flat.length>CONTINUATION_PAGE_LIMIT?' • more pages follow':''}`);page.appendChild(note);
      const body=make('div','class-feature-continuation-body');
      const grouped=[]; const byKey=new Map();
      chunk.forEach(item=>{
        const key=`${item.row.rowIndex}:${item.row.id}`;
        if(!byKey.has(key)){const record={row:item.row,items:[]};byKey.set(key,record);grouped.push(record);}
        byKey.get(key).items.push(item);
      });
      grouped.forEach(({row,items})=>{
        const shell=createGroupShell(row,{showSubclass:false});
        items.forEach(item=>shell.list.appendChild(renderFeatureCard(item.entry,item.kind)));
        body.appendChild(shell.group);
      });
      page.appendChild(body);fragment.appendChild(page);
    }
    host.replaceChildren(fragment);return pageCount;
  }

  function render(){
    const host=document.getElementById(LIST_ID); if(!host)return;
    const rows=classRows(); const fragment=document.createDocumentFragment();
    const overflowGroups=[]; let remaining=PAGE2_FEATURE_LIMIT; let totalFeatures=0;
    rows.forEach(row=>{
      const records=featureRecordsForRow(row);totalFeatures+=records.length;
      const visible=records.slice(0,Math.max(0,remaining));
      const overflow=records.slice(visible.length);remaining=Math.max(0,remaining-visible.length);
      const shell=createGroupShell(row,{showSubclass:true});
      visible.forEach(item=>shell.list.appendChild(renderFeatureCard(item.entry,item.kind)));
      if(!records.length)shell.list.appendChild(make('p','class-feature-empty','No tracked class features at this level.'));
      if(overflow.length){
        const more=make('p','class-feature-more',`+ ${overflow.length} more feature${overflow.length===1?'':'s'} on the continuation page`);
        shell.list.appendChild(more);overflowGroups.push({row,records:overflow});
      }
      fragment.appendChild(shell.group);
    });
    if(!rows.length)fragment.appendChild(make('p','class-feature-empty','Choose a class to populate class features.'));
    host.replaceChildren(fragment);
    const continuationPages=renderContinuationPages(overflowGroups);
    window.CharacterKnowledge?.refresh?.();
    document.dispatchEvent(new CustomEvent('character:class-features-rendered',{detail:{edition:config?.edition||'2024',classCount:rows.length,featureCount:totalFeatures,continuationPages}}));
  }

  function bind(){
    document.addEventListener('change',e=>{
      const t=e.target;
      if(t?.matches?.('[data-class-subclass]')){const cid=t.dataset.classSubclass;const s=ensureSubclassSelection(cid);s.id=text(t.value);if(s.id!=='__manual__')s.manualName='';writeState();syncSpellSubclass(cid);render();document.dispatchEvent(new CustomEvent('character:subclass-changed',{detail:{classId:cid,subclassId:s.id,manualName:s.manualName,origin:'class-features'}}));return;}
      if(t?.matches?.('.char-class-select,.char-level-select'))render();
    },true);
    document.addEventListener('input',e=>{
      const t=e.target;
      if(t?.matches?.('[data-class-feature-choice]')){state.data.choices[t.dataset.classFeatureChoice]=t.value;writeState();return;}
      if(t?.matches?.('[data-manual-subclass-name]')){const cid=t.dataset.manualSubclassName;const s=ensureSubclassSelection(cid);s.manualName=t.value;writeState();syncSpellSubclass(cid);document.dispatchEvent(new CustomEvent('character:subclass-changed',{detail:{classId:cid,subclassId:s.id,manualName:s.manualName,origin:'class-features'}}));return;}
      if(t?.matches?.('[data-manual-subclass-feature]')){state.data.manualSubclassFeatures[t.dataset.manualSubclassFeature]=t.value;writeState();return;}
    },true);
    document.addEventListener('character:leveled-up',render);
    document.addEventListener('character:restored',()=>{readState();migrateSpellSubclassSelections();classRows().forEach(r=>syncSpellSubclass(r.id));render();});
    document.addEventListener('character:subclass-changed',e=>{
      if(e.detail?.origin==='class-features')return; const cid=text(e.detail?.classId); if(!cid)return; const s=ensureSubclassSelection(cid);s.id=text(e.detail?.subclassId);s.manualName=text(e.detail?.manualName);writeState();render();
    });
  }
  async function load(){
    const ed=config?.edition||'2024'; const [features,subs]=await Promise.all([fetchJson(`data/codex/dnd5e/${ed}/class-features.json`),fetchJson(`data/dnd5e/${ed}/subclasses.json`)]);
    state.entries=Array.isArray(features?.entries)?features.entries:[]; state.byClass=new Map(); state.entries.forEach(e=>{if(!state.byClass.has(e.classId))state.byClass.set(e.classId,[]);state.byClass.get(e.classId).push(e);});
    state.subclasses=new Map((subs?.subclasses||[]).map(s=>[s.classId,s])); state.loaded=true; state.error=null; readState();migrateSpellSubclassSelections();classRows().forEach(r=>syncSpellSubclass(r.id));render();
    document.dispatchEvent(new CustomEvent('character:class-features-ready',{detail:{edition:ed,featureCount:state.entries.length,subclassCount:state.subclasses.size}})); return state;
  }
  function init(){bind();readyPromise=Promise.allSettled([window.CharacterClasses?.ready,window.CharacterSpellcasting?.ready]).then(load).catch(err=>{state.error=err;console.error('Class feature engine failed to initialize:',err);return state;});return readyPromise;}
  window.CharacterClassFeatures=Object.freeze({get ready(){return readyPromise;},get loaded(){return state.loaded;},get error(){return state.error;},render,getSubclassSelection(classId){return {...subclassSelection(classId)};},get state(){return JSON.parse(JSON.stringify(state.data));}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
