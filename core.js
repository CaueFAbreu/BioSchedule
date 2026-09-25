(function(root){
const minute=t=>Number(t.split(':')[0])*60+Number(t.split(':')[1]);
const duration=m=>minute(m.end)-minute(m.start);
function normalize(raw,courses){const state={selected:{},completed:[]};if(!raw||typeof raw!=='object')return state;state.completed=courses.filter(c=>Array.isArray(raw.completed)&&raw.completed.includes(c.id)).map(c=>c.id);for(const c of courses){const v=raw.selected?.[c.id];if(c.offered&&!state.completed.includes(c.id)&&(c.sections.some(s=>s.id===v)||(v==='none'&&!c.sections.length)))state.selected[c.id]=v;}return state;}
function meetings(courses,state){return courses.flatMap(c=>{const id=state.selected[c.id];return id? (c.sections.find(s=>s.id===id)?.meetings||[]).map(m=>({...m,course:c,section:id})):[];});}
function overlap(a,b){if(a.day!==b.day||minute(a.start)>=minute(b.end)||minute(b.start)>=minute(a.end))return false;if(a.frequency===2&&b.frequency===2&&a.firstDate&&b.firstDate){const weeks=Math.round((Date.parse(a.firstDate)-Date.parse(b.firstDate))/604800000);if(Math.abs(weeks)%2===1)return false;}return true;}
function conflicts(ms){const pairs=[];for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++){const a=ms[i],b=ms[j];if(a.course.id!==b.course.id&&overlap(a,b))pairs.push({a,b,potential:a.frequency===2||b.frequency===2});}return pairs;}
function requirements(courses,state){return courses.filter(c=>state.selected[c.id]).map(c=>({course:c,unknown:c.prerequisites===null,missing:(c.prerequisites||[]).filter(id=>!state.completed.includes(id))}));}
function totals(courses,state){const ms=meetings(courses,state);const selected=courses.filter(c=>state.selected[c.id]);const completed=courses.filter(c=>state.completed.includes(c.id));const total=list=>({known:list.reduce((n,c)=>n+(c.hours??0),0),unknown:list.filter(c=>c.hours===null).length});return {count:selected.length,minutes:ms.reduce((n,m)=>n+duration(m)/(m.frequency||1),0),selected:total(selected),completed:total(completed),completedCount:completed.length};}
root.BIO_CORE={minute,duration,normalize,meetings,overlap,conflicts,requirements,totals};if(typeof module!=='undefined')module.exports=root.BIO_CORE;
})(typeof window==='undefined'?globalThis:window);
