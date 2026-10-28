import { solve, arithmetic, format, approximate, parseNumber } from './math.js';
const $ = id => document.getElementById(id);
const pages = ['home', 'calculator', 'tutor', 'learn', 'thanks'];
document.querySelector('.skip').addEventListener('click', event => {
 event.preventDefault(); const main = $('main'); main.tabIndex = -1; main.focus();
});
function route() {
 const id = location.hash.slice(1) || 'home', selected = pages.includes(id) ? id : 'home';
 document.querySelectorAll('.page').forEach(p => { p.hidden = p.id !== selected; p.classList.toggle('active', p.id === selected); });
 document.querySelectorAll('nav a').forEach(a => { const active = a.hash === `#${selected}`; a.classList.toggle('active', active); if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
 document.title = `Nova Algebra X — ${selected === 'tutor' ? 'Nova AI' : selected === 'learn' ? 'Learning Lab' : selected[0].toUpperCase() + selected.slice(1)}`;
 window.scrollTo(0, 0); if (selected === 'tutor') checkConnection();
}
window.addEventListener('hashchange', () => { route(); const h = document.querySelector('.page:not([hidden]) h1'); h.tabIndex = -1; h.focus({preventScroll:true}); });
route();
function el(tag, text, className) { const n = document.createElement(tag); n.textContent = text; if(className) n.className = className; return n; }
const initial = $('solution').cloneNode(true);
$('equation-form').addEventListener('submit', e => {
 e.preventDefault(); $('equation-error').textContent = '';
 try {
  const r = solve($('a').value, $('b').value, $('c').value), {a,b,c} = r;
  const banner = el('div','','result-banner'), steps = el('ol','','steps'); banner.append(el('span','THE UNKNOWN, UNLOCKED','small-label'));
  const step = (text,note) => { const li=el('li',''), content=el('div',text); content.append(el('small',note)); li.append(content); steps.append(li); };
  step(`${format(a)}x + (${format(b)}) = ${format(c)}`,'Start with your equation.');
  if(r.type === 'unique') {
   banner.append(el('strong',`x = ${format(r.x)}`)); if(r.x.d !== 1n) banner.append(el('p',`Decimal approximation: ${approximate(r.x)}`));
   step(`${format(a)}x = ${format(c)} − (${format(b)}) = ${format(r.difference)}`,`Subtract ${format(b)} from both sides.`);
   step(`x = (${format(r.difference)}) ÷ (${format(a)}) = ${format(r.x)}`,`Divide both sides by ${format(a)}.`);
   step(`(${format(a)}) × (${format(r.x)}) + (${format(b)}) = ${format(c)} ✓`,'Substitute x into the original equation to check.');
  } else if(r.type === 'infinite') {
   banner.append(el('strong','Infinitely many solutions'),el('p','Every value of x makes this equation true.'));
   step(`${format(b)} = ${format(c)} ✓`,'Since a is zero, the x term disappears. Both sides are equal.');
  } else {
   banner.append(el('strong','No solution'),el('p','No value of x can make this equation true.'));
   step(`${format(b)} ≠ ${format(c)}`,'Since a is zero, the x term disappears. The remaining statement is false.');
  }
  $('solution').replaceChildren(banner,steps);
 } catch(error) { $('equation-error').textContent=error.message; $('solution').replaceChildren(el('p','Update the values to see a valid solution.','fine-print')); }
});
document.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.example.split(',');['a','b','c'].forEach((id,i)=>$(id).value=v[i]);$('equation-form').requestSubmit();}));
$('equation-reset').addEventListener('click',()=>{$('equation-form').reset();$('equation-error').textContent='';$('solution').replaceChildren(...initial.cloneNode(true).childNodes);$('a').focus();});
$('arithmetic-form').addEventListener('submit',e=>{e.preventDefault();try{const n=arithmetic($('left').value,$('operation').value,$('right').value);$('arithmetic-result').textContent=`Result: ${format(n)}${n.d===1n?'':` ≈ ${approximate(n)}`}`;}catch(error){$('arithmetic-result').textContent=error.message;}});

// Conversation is kept in memory only; no browser storage or server database.
let history=[], busy=false, requestController=null;
const welcome=$('chat-messages').cloneNode(true);
const KEY_STORAGE = 'nova_custom_gemini_key';
function getCustomKey() { try { return (localStorage.getItem(KEY_STORAGE) || '').trim(); } catch { return ''; } }
function setCustomKey(k) { try { if (k) localStorage.setItem(KEY_STORAGE, k.trim()); else localStorage.removeItem(KEY_STORAGE); } catch {} updateKeyUI(); }
function updateKeyUI() {
  const k = getCustomKey();
  const ind = $('custom-key-indicator'), inp = $('custom-api-key');
  if (ind) { ind.textContent = k ? 'Active' : 'Optional'; ind.classList.toggle('active', Boolean(k)); }
  if (inp && k && !inp.value) inp.value = k;
}
updateKeyUI();
$('save-api-key')?.addEventListener('click', () => {
  const val = $('custom-api-key')?.value.trim();
  const feedback = $('api-key-feedback');
  if (!val) { if (feedback) { feedback.textContent = 'Enter an API key first.'; feedback.className = 'api-key-feedback error'; } return; }
  setCustomKey(val);
  checkConnection();
  if (feedback) { feedback.textContent = 'Custom API key saved! Ready to use.'; feedback.className = 'api-key-feedback'; }
});
$('clear-api-key')?.addEventListener('click', () => {
  setCustomKey('');
  if ($('custom-api-key')) $('custom-api-key').value = '';
  checkConnection();
  const feedback = $('api-key-feedback');
  if (feedback) { feedback.textContent = 'Reset to server key.'; feedback.className = 'api-key-feedback'; }
});
async function checkConnection(){try{const res=await fetch('/api/health',{signal:AbortSignal.timeout(5000)});if(!res.ok)throw new Error();const h=await res.json();const custom=getCustomKey();if(custom){$('ai-status').textContent='Custom key active · Ready to try Gemini';$('ai-status').classList.add('ready');}else{$('ai-status').textContent=h.aiConfigured?'Key configured · Ready to try Gemini':'Setup needed · Gemini key not configured';$('ai-status').classList.toggle('ready',h.aiConfigured);}}catch{$('ai-status').textContent='Backend unavailable · Start the server';$('ai-status').classList.remove('ready');}}
function bubble(role,text){const n=el('div','',`bubble ${role}`);n.append(el('span',role==='user'?'YOU':'NOVA AI','bubble-label'),document.createTextNode(text));$('chat-messages').append(n);$('chat-messages').scrollTop=$('chat-messages').scrollHeight;return n;}
function setBusy(v){busy=v;$('send-chat').disabled=v;$('chat-input').disabled=v;$('chat-form').setAttribute('aria-busy',String(v));}
function updateCount(){$('char-count').textContent=`${$('chat-input').value.length} / 1500`;}
$('chat-input').addEventListener('input',updateCount);
$('chat-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!busy)$('chat-form').requestSubmit();}});
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{if(busy)return;$('chat-input').value=b.dataset.prompt;updateCount();$('chat-input').focus();}));
$('clear-chat').addEventListener('click',()=>{requestController?.abort();requestController=null;history=[];$('chat-messages').replaceChildren(...welcome.cloneNode(true).childNodes);$('chat-error').textContent='';$('chat-input').value='';updateCount();setBusy(false);checkConnection();});
$('chat-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const message=$('chat-input').value.trim();if(!message){$('chat-input').focus();return;}
 $('chat-error').textContent='';$('chat-messages').querySelector('.welcome-message')?.remove();
 const user=bubble('user',message),pending=bubble('model','Thinking through your question…');pending.classList.add('pending');setBusy(true);
 const controller=new AbortController();requestController=controller;const timer=setTimeout(()=>controller.abort('timeout'),35000);
 let context=history.slice(-10);while(context.length&&context.reduce((n,i)=>n+i.text.length,message.length)>9000)context=context.slice(2);
 try{
  const headers={'Content-Type':'application/json'};
  const customKey=getCustomKey();
  if(customKey)headers['x-gemini-api-key']=customKey;
  const res=await fetch('/api/algebra',{method:'POST',headers,body:JSON.stringify({message,history:context}),signal:controller.signal});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'Nova AI is unavailable. Please try again.');if(typeof data.reply!=='string'||!data.reply.trim())throw new Error('No answer was returned. Please try again.');if(requestController!==controller)return;
  pending.remove();bubble('model',data.reply);history=[...context,{role:'user',text:message},{role:'model',text:data.reply.slice(0,4000)}].slice(-10);
  $('chat-input').value='';updateCount();$('ai-status').textContent=customKey?'Connected with custom Gemini key':'Connected to Gemini';$('ai-status').classList.add('ready');
 }catch(error){if(requestController!==controller)return;pending.remove();user.remove();$('chat-error').textContent=controller.signal.aborted?'The request timed out. Please try again.':error instanceof TypeError?'Cannot reach the server. Run npm start and open http://localhost:3000.':error.message;$('ai-status').textContent='Last request failed · See message below';$('ai-status').classList.remove('ready');}
 finally{clearTimeout(timer);if(requestController===controller){setBusy(false);requestController=null;$('chat-input').focus();}}
});
const ns='http://www.w3.org/2000/svg';
function svg(tag,attrs,text){const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n;}
for(let i=-6;i<=6;i++){
 const x=220+i*30,y=200-i*30;
 $('graph-grid').append(svg('line',{x1:x,y1:20,x2:x,y2:380,stroke:i===0?'#57718e':'#21334a','stroke-width':i===0?1.5:1}),svg('line',{x1:40,y1:y,x2:400,y2:y,stroke:i===0?'#57718e':'#21334a','stroke-width':i===0?1.5:1}));
 if(i&&i%2===0)$('graph-grid').append(svg('text',{x,y:215,fill:'#91a9c2','font-size':10,'text-anchor':'middle'},i),svg('text',{x:209,y:y+4,fill:'#91a9c2','font-size':10,'text-anchor':'end'},i));
}
$('graph-grid').append(svg('text',{x:412,y:204,fill:'#c1d6eb','font-size':13},'x'),svg('text',{x:216,y:12,fill:'#c1d6eb','font-size':13},'y'));
function updateGraph(){const m=Number($('slope').value),b=Number($('intercept').value);$('slope-value').textContent=m;$('intercept-value').textContent=b;const equation=`y = ${m}x ${b<0?'−':'+'} ${Math.abs(b)}`;$('graph-equation').textContent=equation;$('graph-title').textContent=`Graph of ${equation}`;$('graph-line').setAttribute('d',`M40,${200-(-6*m+b)*30} L400,${200-(6*m+b)*30}`);$('intercept-point').setAttribute('cy',200-b*30);$('graph-insight').textContent=m===0?`A horizontal line! Every x gives y = ${b}.`:`Move 1 step right: y ${m>0?'increases':'decreases'} by ${Math.abs(m)}. The line crosses the y-axis at ${b}.`;$('graph-description').textContent=$('graph-insight').textContent;}
$('slope').addEventListener('input',updateGraph);$('intercept').addEventListener('input',updateGraph);$('graph-reset').addEventListener('click',()=>{$('slope').value=1;$('intercept').value=0;updateGraph();});updateGraph();
const challenges=[{a:4,b:3,c:19,x:4},{a:3,b:-5,c:16,x:7},{a:-2,b:6,c:12,x:-3},{a:5,b:2,c:2,x:0},{a:2,b:1,c:8,x:3.5}];let index=0;
$('next-challenge').addEventListener('click',()=>{index=(index+1)%challenges.length;const q=challenges[index];$('challenge-equation').textContent=`${q.a}x ${q.b<0?'−':'+'} ${Math.abs(q.b)} = ${q.c}`;$('challenge-answer').value='';$('challenge-feedback').textContent='';$('challenge-answer').focus();});
$('challenge-form').addEventListener('submit',e=>{e.preventDefault();const q=challenges[index];try{const n=parseNumber($('challenge-answer').value),x=parseNumber(q.x);$('challenge-feedback').textContent=n.n*x.d===x.n*n.d?`Exactly! (${q.a}) × (${q.x}) + (${q.b}) = ${q.c}. Both sides balance. ✓`:`Not quite yet. First subtract (${q.b}) from both sides, then divide by (${q.a}). Try again!`;}catch(error){$('challenge-feedback').textContent=error.message;}});
