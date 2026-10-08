import {initTerrain,mapSvg,mapPoint,lineMap,navStart,target,wash} from './terrain.js';
const $=id=>document.getElementById(id);
const terrain=initTerrain($('terrain'),$('hotspots'));
const data={
 association:{title:'קוראים את השטח, סימן אחר סימן',intro:'נחבר יחד בין מה שרואים מולנו לבין המפה: נתחיל ברכס, נוסיף את האוכף ואז נראה את התמונה השלמה.',visual:'אותו סימן בשטח ובמפה',note:'ההדגשה מלווה את ההסבר',principleTitle:'מהצורה הבודדת לתמונה שלמה',principle:'לומדים לזהות גם את צורת הקרקע וגם את היחסים בינה לבין הסימנים שסביבה. כך מראה השטח מתחבר למפה.',duration:'כ־2 דקות · הסבר מודרך',review:'בכל צעד מודגש סימן אחד בשטח ובמפה, לצד הסבר קצר. אפשר להתקדם בקצב אישי ולחזור לכל שלב.'},
 handrail:{title:'תוואי רציף עוזר לנו לעקוב אחרי הדרך',intro:'נלווה קטע תנועה לדוגמה לאורך ערוץ. נראה מהו מעקה, ואיך משלבים בו עצירות להשוואה עם המפה.',visual:'המסלול נבנה יחד עם ההסבר',note:'דוגמה מודרכת · קטע אחר קטע',principleTitle:'קשר רציף עם השטח',principle:'המעקה נותן עוגן שקל לעקוב אחריו לאורך הדרך. ההשוואה למפה משלבת צורה, כיוון ומרחק מהנקודה הקודמת.',duration:'כ־2 דקות · ליווי תנועה',review:'הקו נחשף בהדרגה. כל שלב מסביר את תפקידו של התוואי או של עצירת ההשוואה; אין בחירת מסלול או בדיקת תשובה.'},
 blind:{title:'כשהראות מוגבלת, נשענים על כיוון ומרחק',intro:'נבנה יחד דוגמה פתורה: מתחילים מנקודה ידועה, שומרים על אזימוט 060° ואומדים 600 מטר בעזרת צעדים כפולים.',visual:'מבט מהשטח בראות מוגבלת',note:'המצפן מראה כיוון · הספירה אומדת מרחק',principleTitle:'בונים אומדן מנקודת מוצא ידועה',principle:'הכיוון והמרחק מאפשרים לאמוד מיקום גם בלי סימנים מזוהים. זהו מיקום משוער, שצריך להשוות לסימן שטח כשאפשר.',duration:'כ־3 דקות · דוגמה פתורה',review:'הערכים והחישוב מוסברים מראש. התקדמות בין השלבים מדגימה את התנועה, בלי לדרוש חישוב, בחירת כיוון או החלטת הגעה.'},
 debrief:{title:'רואים איך כיוון ומרחק משפיעים על המיקום',intro:'נתחיל בדוגמה ללא שגיאה. נוסיף שגיאת כיוון, נציג שגיאת מרחק, ואז נראה את השפעתן יחד.',visual:'המחשה במבט־על',note:'כאן חושפים את המיקום לצורך ההסבר',principleTitle:'מבינים מדוע האומדן צריך אימות',principle:'שגיאת כיוון מזיזה את נקודת הסיום הצדה. שגיאת מרחק משנה את אורך התנועה. בשטח, השוואה לסימן מזוהה עוזרת לבדוק את האומדן.',duration:'כ־2 דקות · המחשה סיבתית',review:'ארבעה מצבי הדגמה מוסברים, ללא ציון או אבחון של הלומד. המסלול במבט־על הוא כלי הוראה ולא איכון חי בזמן הניווט.'}
};
const steps={
 association:[
  {name:'הרכס משמאל',title:'מתחילים מסימן אחד שקל להבחין בו',body:'הרכס מופיע משמאל לכיוון המבט. במפה, ההדגשה מסמנת את אותו רכס. כרגע אנחנו בנקודת מוצא ידועה — לומדים לחבר בין שתי התצוגות.',caption:'1 · הרכס: אותה צורת קרקע בשתי תצוגות',point:{x:-250,z:-120},landmark:0},
  {name:'האוכף מלפנים',title:'מוסיפים את היחס בין שתי פסגות',body:'לפנים רואים אזור נמוך בין שתי פסגות — אוכף. קווי הגובה במפה מתארים את המעבר ביניהן. שימו לב גם למיקומו ביחס לרכס שכבר הכרנו.',caption:'2 · האוכף: מעבר נמוך בין שתי פסגות',point:{x:15,z:-120},landmark:1},
  {name:'הערוץ ביניהם',title:'הסימן השלישי מחבר את התמונה',body:'הערוץ עובר מתחת לרכס. כעת יש קשר בין שלושה סימנים: רכס משמאל, אוכף מלפנים וערוץ במרחב שביניהם. מסתכלים על היחסים, בנוסף לצורה של כל סימן.',caption:'3 · הערוץ: מחברים בין הסימנים שסביבו',point:{x:wash(130),z:130},landmark:2},
  {name:'התמונה השלמה',title:'כך מראה השטח מתחבר למפה',body:'ההדגשות מציגות יחד את שלושת הסימנים. בדוגמה הזו המוצא ידוע מראש. בניווט, משווים את היחסים בין הסימנים לצד הכיוון והמרחק כדי לבסס את זיהוי המיקום.',caption:'4 · צורה, יחסים, כיוון ומרחק',landmark:-1}
 ],
 handrail:[
  {name:'מוצא ידוע',title:'מתחילים מנקודה שכבר זוהתה',body:'זו נקודת המוצא שלנו. לפנינו ערוץ שאפשר לעקוב אחריו ברצף. תוואי כזה יכול לשמש מעקה: עוגן שמסייע לשמור קשר עם השטח לאורך התנועה.',caption:'1 · מוצא ידוע ותוואי שאפשר לעקוב אחריו',landmark:0},
  {name:'ליווי לאורך הערוץ',title:'המעקה ממשיך איתנו לאורך הדרך',body:'הקו מדגים קטע תנועה לצד הערוץ. בכל פעם שנראה את התוואי, נוכל לקשור את מה שסביבנו לתכנון במפה. כאן הערוץ משמש דוגמה לתוואי רציף.',caption:'2 · שומרים קשר עם התוואי הרציף',landmark:1},
  {name:'עצירה להשוואה',title:'גם לאורך מעקה משווים למפה',body:'נעצור לדוגמה ליד הקטע המסומן. נסתכל על צורת הערוץ וכיוונו, ועל המרחק מהמוצא. המעקה מסייע להתמצאות; ההשוואה של כמה נתונים מחזקת את אומדן המיקום.',caption:'3 · צורת הערוץ, כיוונו והמרחק מהמוצא',landmark:1},
  {name:'חיבור לסימן הבא',title:'מחברים את התוואי לסימן שבסוף הקטע',body:'המסלול ממשיך אל אזור האוכף. כך מתקבל רצף מובן: מוצא ידוע, תוואי מלווה, השוואה בדרך וסימן נוסף בהמשך. בחירת ציר בפועל תלויה גם בעבירות ובמשימה.',caption:'4 · רצף של עוגנים לאורך הדרך',landmark:2}
 ],
 blind:[
  {name:'כיוון ומרחק מראש',title:'שני נתונים מגדירים את קטע התנועה',body:'בדוגמה שלנו היעד נמצא בכיוון 060° ובמרחק 600 מטר מהמוצא. המפה הקטנה מציגה את התכנון. בזמן התנועה היא אינה מציגה מיקום חי.',caption:'1 · מוצא ידוע → כיוון 060° → מרחק 600 מ׳',pairs:0},
  {name:'תרגום המרחק לצעדים',title:'מפרקים יחד את החישוב',body:'בדוגמה, צעד כפול שנמדד מראש הוא 1.5 מטר. לכן 600 ÷ 1.5 = 400 צעדים כפולים. הכיול אישי ותלוי בתנאי התנועה; הערך כאן נועד להמחשה.',caption:'2 · 600 מטר ÷ 1.5 מטר = 400 צעדים כפולים',pairs:0},
  {name:'תנועה לפי שני הנתונים',title:'המצפן מלווה את הכיוון, הספירה את המרחק',body:'נעצור באמצע הדוגמה: נספרו 200 צעדים כפולים, ולכן אומדן המרחק הוא 300 מטר. ממשיכים לשמור על הכיוון המתוכנן לצד ספירת הצעדים.',caption:'3 · 200 צעדים כפולים × 1.5 מטר = אומדן של 300 מ׳',pairs:200},
  {name:'מיקום משוער',title:'גם כשהספירה הושלמה, המיקום הוא אומדן',body:'400 צעדים כפולים נותנים אומדן של 600 מטר. שגיאה בכיוון או באורך הצעד עשויה לשנות את מקום הסיום. בהמחשה הבאה נראה בדיוק כיצד זה קורה.',caption:'4 · הושלמה הספירה: אומדן מרחק, עדיין ללא אימות מיקום',pairs:400}
 ],
 debrief:[
  {name:'הדוגמה ללא שגיאה',title:'קודם רואים את התנועה המתוכננת',body:'כיוון 060° ומרחק 600 מטר מובילים בדיוק לנקודת היעד בדוגמה האידאלית. נשתמש בקו הזה כבסיס להשוואה.',angle:0,length:600},
  {name:'השפעת שגיאת כיוון',title:'אותו מרחק, נקודת סיום אחרת',body:'נוסיף סטייה קבועה של 4° לכיוון, ונשאיר את המרחק על 600 מטר. קו התנועה מסתיים הצדה, כ־42 מטר מהיעד.',angle:4,length:600},
  {name:'השפעת שגיאת מרחק',title:'אותו כיוון, תנועה קצרה יותר',body:'נחזור לכיוון 060°, אבל נציג צעדים שאורכם בפועל 1.35 מטר. 400 צעדים כפולים נותנים 540 מטר — 60 מטר פחות מהתכנון.',angle:0,length:540},
  {name:'שתי ההשפעות יחד',title:'כך שגיאות מצטברות לאורך התנועה',body:'כעת מוצגות יחד סטיית כיוון של 4° ותנועה באורך 540 מטר. הפער בדוגמה הוא כ־72 מטר. זו הסיבה שבודקים את אומדן המיקום מול סימן שטח מזוהה כשאפשר.',angle:4,length:540}
 ]
};
let mode='association';const progress={association:0,handrail:0,blind:0,debrief:0};
const track=[navStart,{x:wash(180),z:180},{x:wash(0),z:0},{x:wash(-180),z:-180},{x:15,z:-120}];
const landmarks=steps.association.slice(0,3).map(s=>s.point);
function smallMap(content=''){return `<div class="mini-map">${mapSvg(content,300,205)}</div>`;}
function spot(p,n,active,w=300,h=205){const x=(p.x+500)/1000*w,y=(p.z+350)/700*h;return `${active?`<circle cx="${x}" cy="${y}" r="23" fill="#749C75" fill-opacity=".18" stroke="#5B7C5C" stroke-width="1.5"/>`:''}${mapPoint(p.x,p.z,n,w,h,active?'#5B7C5C':'#DCCDB2')}`;}
function stepList(){return `<div class="guided-steps" aria-label="שלבי ההסבר">${steps[mode].map((s,i)=>`<button class="guided-step" data-step="${i}" ${i===progress[mode]?'aria-current="step"':''}><b>${i+1}</b><span>${s.name}</span></button>`).join('')}</div>`;}
function nextLabel(){return progress[mode]<3?`נמשיך: ${steps[mode][progress[mode]+1].name}`:mode==='association'?'נראה איך התוואי מלווה אותנו':mode==='handrail'?'נעבור לניווט בראות מוגבלת':mode==='blind'?'נראה איך מצטברת שגיאה':'חזרה לתחילת ההמחשה';}
function next(){if(progress[mode]<3)progress[mode]++;else if(mode==='debrief')progress[mode]=0;else mode=({association:'handrail',handrail:'blind',blind:'debrief'})[mode];render();}
function render(){const d=data[mode],i=progress[mode],s=steps[mode][i];$('title').textContent=d.title;$('intro').textContent=d.intro;$('visual-title').textContent=d.visual;$('visual-note').textContent=d.note;$('stage-caption').textContent=s.caption||'';$('principle-title').textContent=d.principleTitle;$('principle').textContent=d.principle;$('duration').textContent=d.duration;$('review-note').textContent=d.review;
 document.body.classList.toggle('blind',mode==='blind');$('terrain-stage').hidden=mode==='debrief';$('map-stage').hidden=mode!=='debrief';$('compass-strip').hidden=mode!=='blind';document.querySelectorAll('[data-concept]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.concept===mode)));history.replaceState(null,'','#'+mode);
 $('feedback').innerHTML=`<span class="explanation-label">צעד ${i+1} מתוך 4 · נסתכל יחד</span><strong>${s.title}</strong><p>${s.body}</p>`;
 let controls=`<div class="guide-head"><h2>לומדים צעד אחר צעד</h2><span>אפשר לחזור לכל שלב</span></div>${stepList()}`;
 if(mode==='association'){
  const map=spot({x:-310,z:235},'א',false)+landmarks.map((p,k)=>spot(p,k+1,k===i||i===3)).join('');controls+=smallMap(map)+`<p class="sub">א · המוצא הידוע. המספרים מחברים בין הסימנים בשטח ובמפה. הצפון כלפי מעלה.</p>`;
  $('visual-bottom').innerHTML=`<span class="focus-key"><i></i>ההדגשה בשטח תואמת להדגשה במפה</span><span class="push">מוצא ידוע · מבט לצפון־מזרח</span>`;
 }else if(mode==='handrail'){
  let route='';const end=[0,2,2,4][i];for(let k=0;k<end;k++)route+=lineMap(track[k],track[k+1],300,205);controls+=smallMap(route+spot(navStart,'א',i===0)+spot(track[2],'ב',i===1||i===2)+spot(track[4],'ג',i===3))+`<p class="sub">א · מוצא. ב · עצירת השוואה לדוגמה. ג · אזור האוכף בהמשך.</p>`;
  $('visual-bottom').innerHTML='<span><i class="legend-line"></i>קטע התנועה שהוסבר</span><span class="push">המסלול מתווסף בהדרגה</span>';
 }else if(mode==='blind'){
  const plan=lineMap(navStart,target,300,205)+mapPoint(navStart.x,navStart.z,'א',300,205)+mapPoint(target.x,target.z,'ב',300,205);controls+=smallMap(plan)+`<div class="guide-values"><span>כיוון <b dir="ltr">060°</b></span><span>מרחק <b>600 מ׳</b></span></div><div class="calculation" dir="rtl"><b dir="ltr">600 ÷ 1.5 = 400</b><span>צעדים כפולים בדוגמה</span></div>`;
  $('visual-bottom').innerHTML=`<b>${s.pairs} צעדים כפולים · אומדן ${s.pairs*1.5} מ׳</b><span class="push">תכנון בלבד · ללא מיקום חי</span>`;
 }else{
  const rad=(60+s.angle)*Math.PI/180,actual={x:navStart.x+s.length*Math.sin(rad),z:navStart.z-s.length*Math.cos(rad)},miss=Math.hypot(actual.x-target.x,actual.z-target.z);
  const tx=(target.x+500)/1000*740,ty=(target.z+350)/700*480,ax=(actual.x+500)/1000*740,ay=(actual.z+350)/700*480;
  const labels=`<g transform="translate(${tx+22},${ty-42})"><rect width="118" height="34" rx="8" class="annotation"/><text x="59" y="22" text-anchor="middle" class="map-text" font-size="15">היעד המתוכנן</text></g>${i?`<g transform="translate(${ax+22},${ay+16})"><rect width="118" height="34" rx="8" class="annotation"/><text x="59" y="22" text-anchor="middle" class="map-text" font-size="15">סיום ההדגמה</text></g>`:''}`;
  $('map-stage').innerHTML=mapSvg(lineMap(navStart,target)+(i?lineMap(navStart,actual,740,480,'#5B7C5C'):'')+mapPoint(navStart.x,navStart.z,'א')+mapPoint(target.x,target.z,'ב')+(i?mapPoint(actual.x,actual.z,'●',740,480,'#5B7C5C'):'')+labels);
  controls+=`<div class="result-table"><div><span>כיוון בדוגמה</span><b dir="ltr">${String(60+s.angle).padStart(3,'0')}°</b></div><div><span>מרחק בדוגמה</span><b>${s.length} מ׳</b></div><div><span>אורך צעד כפול</span><b>${(s.length/400).toFixed(2)} מ׳</b></div></div><div class="demo-gap"><b>${Math.round(miss)} מ׳</b><span>פער מהיעד בדוגמה</span></div>`;
  $('visual-bottom').innerHTML='<span><i class="legend-line"></i>תכנון</span><span><i class="legend-line demo"></i>תנועת ההדגמה</span><span class="push">הערכים סינתטיים לצורך הסבר</span>';
 }
 $('controls').innerHTML=controls+`<button class="primary" id="next">${nextLabel()}</button>`;document.querySelectorAll('[data-step]').forEach(el=>el.onclick=()=>{progress[mode]=Number(el.dataset.step);render();});$('next').onclick=next;
 if(mode!=='debrief'){terrain.setMode(mode,0,mode==='blind'?s.pairs*1.5:[0,2,2,4][i]);terrain.focus(mode==='association'&&i===3?-1:s.landmark);}
}
$('hotspots').addEventListener('click',e=>{const el=e.target.closest('[data-landmark]');if(!el)return;progress[mode]=mode==='association'?Number(el.dataset.landmark):[0,2,3][Number(el.dataset.landmark)];render();});
document.querySelectorAll('[data-concept]').forEach(el=>el.onclick=()=>{mode=el.dataset.concept;render();});const hash=location.hash.slice(1);if(data[hash])mode=hash;const initialStep=Number(new URLSearchParams(location.search).get('step'));if(Number.isInteger(initialStep)&&initialStep>=0&&initialStep<=3)progress[mode]=initialStep;render();


