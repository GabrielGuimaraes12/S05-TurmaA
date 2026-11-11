import {makeEvents,filterEvents,validateFilters,reminderTime,loadReminders,saveReminder,removeReminder} from './core.mjs';

const paths={
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2m4 0h2M8 18h2"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
 filters:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
 chart:'<path d="M5 20V10h3v10M11 20V4h3v16M17 20v-7h3v7"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 back:'<path d="m15 5-7 7 7 7"/>',
 next:'<path d="m9 5 7 7-7 7"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>'
};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.info}</svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const format=(value,options)=>new Intl.DateTimeFormat('pt-BR',options).format(new Date(value));
const date=value=>format(value,{day:'2-digit',month:'long'});
const time=value=>format(value,{hour:'2-digit',minute:'2-digit'});
const full=value=>`${date(value)} de ${new Date(value).getFullYear()}`;
const $=selector=>document.querySelector(selector);
const main=$('#main');
const tabs=[['notices','Avisos','mail'],['schedule','Horários','clock'],['grades','Notas','chart'],['attendance','Frequência','calendar'],['menu','Menu','menu'],['events','Eventos','calendar']];
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();}};}
let events;
try{events=JSON.parse(storage.getItem('inatel.events.v1'));if(!Array.isArray(events)||events.length===0||!events.every(e=>typeof e.id==='string'&&typeof e.title==='string'&&Number.isFinite(Date.parse(e.start)))||events.every(e=>new Date(e.start)<=new Date()))events=null;}catch{events=null;}
if(!events){events=makeEvents();try{storage.setItem('inatel.events.v1',JSON.stringify(events));}catch{/* A agenda pode ser consultada mesmo sem armazenamento. */}}
let reminders={},storageError='';
function refreshReminders(){try{reminders=loadReminders(storage);storageError='';}catch(e){storageError=e.message;}}
refreshReminders();
let filters={query:'',category:'',from:'',to:''};
let state={page:'events',tab:'events',id:null};
let listScroll=0,minutes=30,saveError='',busy=false,toastTimer;
const selected=()=>events.find(e=>e.id===state.id);
const demoNote='<p class="demo-note">Projeto acadêmico · Eventos ilustrativos</p>';
function announce(message){$('#live').textContent=message;}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function go(page,extra={},replace=false){
  if(busy)return;
  if(state.page==='events')listScroll=window.scrollY;
  state={...state,page,...extra};
  history[replace?'replaceState':'pushState']({...state},'',`#${page}`);
  render();
}
history.replaceState({...state},'','#events');
window.addEventListener('popstate',e=>{if(busy){history.pushState({...state},'','#saving');return;}state=e.state?.page?e.state:{page:'events',tab:'events',id:null};if(['detail','reminder','success','failure'].includes(state.page)&&!selected())state={page:'events',tab:'events',id:null};render();});
function back(){
  if(state.page==='filters')go('events');
  else if(['detail','success','saved'].includes(state.page))go('events');
  else if(state.page==='reminder')go(state.editing?'success':'detail');
  else if(state.page==='failure')go('detail');
  else if(state.page==='events')go('menu',{tab:'menu'});
  else go('events',{tab:'events'});
}
function header(){
  const titles={events:'Agenda de eventos',filters:'Filtros',detail:'Detalhes do evento',reminder:'Lembrete',success:'Confirmação',saving:'Salvando lembrete',failure:'Lembrete',saved:'Meus lembretes',notices:'Avisos',schedule:'Horários',grades:'Notas',attendance:'Frequência',menu:'Menu'};
  const canBack=['filters','detail','reminder','success','failure','saved'].includes(state.page);
  $('#header').innerHTML=`<div class="brandline"><span class="brand">Inatel</span><span>ACADÊMICO</span></div><div class="toolbar">${canBack?`<button class="back" data-action="back" aria-label="Voltar">${icon('back')}</button>`:'<span></span>'}<h1>${titles[state.page]||'Agenda de eventos'}</h1><span></span></div>`;
  $('#nav').innerHTML=tabs.map(([id,label,ic])=>`<button class="nav-item" data-tab="${id}" ${state.tab===id?'aria-current="page"':''} ${busy?'disabled':''}>${icon(ic)}<span>${label}</span></button>`).join('');
}
function eventHTML(e){const saved=reminders[e.id];return `<button class="event" data-event="${esc(e.id)}" aria-label="Ver detalhes de ${esc(e.title)}"><span class="date-tile"><b>${format(e.start,{day:'2-digit'})}</b><span>${format(e.start,{month:'short'}).replace('.','')}</span></span><span class="event-copy"><span class="event-tag">${esc(e.category)} · ${esc(e.kind)}</span><h3>${esc(e.title)}</h3><span class="event-meta">${icon('clock')}${time(e.start)} às ${time(e.end)}</span><span class="event-meta">${esc(e.location)} · ${esc(e.mode)}</span>${saved?`<span class="saved-label">${icon('bell')}Lembrete salvo · ${saved.minutes} min antes</span>`:''}</span>${icon('next','chevron')}</button>`;}
function filterChips(){const labels=[filters.category,filters.from?`De ${format(filters.from+'T12:00:00',{day:'2-digit',month:'2-digit'})}`:'',filters.to?`Até ${format(filters.to+'T12:00:00',{day:'2-digit',month:'2-digit'})}`:''].filter(Boolean);return labels.length?`<div class="chips">${labels.map(label=>`<span class="chip">${esc(label)}</span>`).join('')}<button class="text-btn" data-action="clear-filters">Limpar filtros</button></div>`:'';}
function listHTML(){const list=filterEvents(events,filters);return list.length?list.map(eventHTML).join(''):`<section class="empty"><div class="empty-icon">${icon('search')}</div><h2>Nenhum evento encontrado</h2><p>Tente outro assunto ou período para encontrar atividades do seu interesse.</p><div class="actions"><button class="primary" data-action="filters">Alterar filtros</button><button class="secondary" data-action="clear-all">Limpar busca e filtros</button></div></section>`;}
function renderEvents(){const list=filterEvents(events,filters);main.innerHTML=`<section class="section-head"><div><p class="eyebrow">Conteúdos e notícias</p><h2>Acontece no campus</h2></div><span class="count" aria-label="${list.length} eventos">${list.length}</span></section>${storageError?`<div class="content"><p class="error">${esc(storageError)}</p></div>`:''}<div class="search-wrap">${icon('search')}<label class="sr-only" for="event-search">Buscar eventos</label><input id="event-search" type="search" placeholder="Buscar por título ou assunto" value="${esc(filters.query)}" autocomplete="off"><button class="clear-search" data-action="clear-query" aria-label="Limpar busca" ${!filters.query?'hidden':''}>×</button></div><div id="chips">${filterChips()}</div><div class="filter-bar"><button class="filter-btn" data-action="filters">${icon('filters')}Filtros</button><span id="result-count" class="result-count">${list.length} ${list.length===1?'evento encontrado':'eventos encontrados'}</span></div><div id="event-list">${listHTML()}</div>${demoNote}`;}
function updateList(){const list=filterEvents(events,filters);$('#event-list').innerHTML=listHTML();$('#result-count').textContent=`${list.length} ${list.length===1?'evento encontrado':'eventos encontrados'}`;$('.count').textContent=list.length;$('.count').setAttribute('aria-label',`${list.length} eventos`);$('.clear-search').hidden=!filters.query;announce(`${list.length} eventos encontrados`);}
function renderFilters(){const categories=[...new Set(events.map(e=>e.category))];main.innerHTML=`<section class="content"><p class="form-intro">Escolha o que você quer encontrar. Você pode combinar assunto e período.</p><form id="filter-form" novalidate><div class="form-group"><label for="category">Categoria</label><select id="category" name="category"><option value="">Todas as categorias</option>${categories.map(c=>`<option ${c===filters.category?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="two-fields"><div class="form-group"><label for="date-from">Data inicial</label><input id="date-from" name="from" type="date" value="${esc(filters.from)}" aria-describedby="filter-error"></div><div class="form-group"><label for="date-to">Data final</label><input id="date-to" name="to" type="date" value="${esc(filters.to)}" aria-describedby="filter-error"></div></div><p id="filter-error" class="error" role="alert" hidden></p><div class="actions"><button class="primary" type="submit">Aplicar filtros</button><button class="secondary" type="button" data-action="reset-draft">Limpar campos</button></div></form></section>`;}
function renderDetail(){const e=selected();main.innerHTML=`<article class="content detail"><span class="detail-tag">${esc(e.category)} · ${esc(e.kind)}</span><h2>${esc(e.title)}</h2><p class="organizer">Por ${esc(e.organizer)}</p><dl class="info-list"><div class="info-row">${icon('calendar')}<div><dt>Data</dt><dd>${full(e.start)}</dd></div></div><div class="info-row">${icon('clock')}<div><dt>Horário</dt><dd>${time(e.start)} às ${time(e.end)}</dd></div></div><div class="info-row">${icon('pin')}<div><dt>${e.mode==='Online'?'Formato':'Local'}</dt><dd>${esc(e.location)} · ${esc(e.mode)}</dd></div></div></dl><h3>Sobre o evento</h3><p class="description">${esc(e.description)}</p>${reminders[e.id]?`<p class="notice">Lembrete salvo para ${date(reminders[e.id].notice)}, às ${time(reminders[e.id].notice)}.</p>`:''}<button class="primary" data-action="remind">${icon('bell')}${reminders[e.id]?'Editar lembrete':'Criar lembrete'}</button>${reminders[e.id]?'<div class="actions"><button class="secondary" data-action="show-saved">Conferir lembrete</button></div>':''}<p class="fine">O lembrete ajuda você a se organizar. Ele não realiza inscrição no evento.</p></article>${demoNote}`;}
function renderReminder(){const e=selected();const option=Number(minutes);main.innerHTML=`<section class="content"><div class="event-summary"><h2>${esc(e.title)}</h2><p>${full(e.start)} · ${time(e.start)}</p></div><form id="reminder-form"><fieldset class="options"><legend>Quando deseja receber o aviso?</legend>${[15,30,60].map(n=>{let unavailable=false;try{reminderTime(e,n);}catch{unavailable=true;}return `<label class="radio-row"><input type="radio" name="minutes" value="${n}" ${n===option?'checked':''} ${unavailable?'disabled':''}><span>${n===60?'1 hora':n+' minutos'} antes${unavailable?'<small>Horário de aviso já passou</small>':''}</span></label>`;}).join('')}</fieldset><div id="notice-preview" class="preview"></div><p id="reminder-error" class="error" role="alert" hidden></p><div class="actions"><button class="primary" type="submit">${reminders[e.id]?'Salvar alterações':'Salvar lembrete'}</button><button class="secondary" type="button" data-action="back">Cancelar</button></div><p class="fine">Nesta demonstração, o lembrete fica salvo apenas neste navegador. Não há envio de notificação em segundo plano.</p></form></section>`;preview();}
function preview(){try{const value=reminderTime(selected(),minutes);$('#notice-preview').innerHTML=`<p class="eyebrow">Horário do aviso</p><strong>${date(value)}, às ${time(value)}</strong><span>${minutes} minutos antes do evento</span>`;}catch(e){$('#notice-preview').innerHTML=`<span>${esc(e.message)}</span>`;}}
function receipt(r){return `<div class="receipt"><h3>${esc(selected().title)}</h3><dl><dt>Evento</dt><dd>${date(selected().start)}<br>${time(selected().start)}</dd><dt>Aviso</dt><dd>${date(r.notice)}<br>${time(r.notice)}</dd><dt>Antecedência</dt><dd>${r.minutes} minutos</dd></dl></div>`;}
function renderSuccess(){const r=reminders[state.id];if(!r){state.page='detail';header();renderDetail();return;}main.innerHTML=`<section class="status-screen"><div class="status-icon success">${icon('check')}</div><h2>Lembrete salvo</h2><p>Confira os dados. Seu lembrete está disponível neste navegador.</p>${receipt(r)}<div class="actions"><button class="primary" data-action="events">Voltar à agenda</button><button class="secondary" data-action="remind">Editar lembrete</button><button class="text-btn" data-action="delete">Excluir lembrete</button></div><p class="fine">Demonstração acadêmica, sem envio de notificações.</p></section>`;}
function renderSaving(){main.innerHTML=`<section class="status-screen" aria-busy="true"><div class="status-icon"><span class="spinner"></span></div><h2>Salvando lembrete...</h2><p>Aguarde a confirmação.<br>Estamos guardando sua preferência.</p><div class="event-summary" style="text-align:left;margin-top:32px"><h3>${esc(selected().title)}</h3><p>${minutes} minutos antes</p></div><button class="secondary" disabled>Salvando...</button></section>`;}
function renderFailure(){main.innerHTML=`<section class="status-screen"><div class="status-icon fail">${icon('info')}</div><h2>Não foi possível salvar</h2><p role="alert">${esc(saveError)}</p><div class="notice">Sua escolha de ${minutes} minutos foi mantida. O salvamento ainda não foi confirmado.</div><div class="actions"><button class="primary" data-action="retry">Tentar novamente</button><button class="secondary" data-action="review">Revisar configuração</button></div></section>`;}
function renderSaved(){const items=events.filter(e=>reminders[e.id]&&new Date(e.start)>new Date());main.innerHTML=`<section class="section-head"><div><p class="eyebrow">Sua programação</p><h2>Meus lembretes</h2></div></section>${items.length?items.map(eventHTML).join(''):`<section class="empty"><div class="empty-icon">${icon('bell')}</div><h2>Nenhum lembrete por aqui</h2><p>Encontre um evento e salve um aviso para organizar sua participação.</p><button class="primary" data-action="events">Explorar eventos</button></section>`}${demoNote}`;}
function renderMenu(){main.innerHTML=`<p class="menu-section">Aluno</p><div class="profile"><span class="avatar">${icon('user')}</span><div><strong>Gabriel Filhagosa Guimaraes</strong><p>Engenharia de Software · 126</p></div></div><p class="menu-section">Conteúdos e notícias</p><button class="menu-row" data-action="events">${icon('calendar')}<span class="row-copy"><strong>Agenda de eventos</strong><small>Encontre atividades no campus</small></span>${icon('next','chevron')}</button><button class="menu-row" data-action="saved">${icon('bell')}<span class="row-copy"><strong>Meus lembretes</strong><small>Consulte os avisos que você salvou</small></span>${icon('next','chevron')}</button><p class="menu-section">Aproveitamento escolar</p>${[['grades','Notas','Resultados do semestre','chart'],['attendance','Frequência','Acompanhe sua presença','calendar'],['schedule','Horários','Organize sua semana','clock']].map(([id,label,sub,ic])=>`<button class="menu-row" data-tab="${id}">${icon(ic)}<span class="row-copy"><strong>${label}</strong><small>${sub}</small></span>${icon('next','chevron')}</button>`).join('')}<p class="menu-section">Projeto</p><div class="content"><p class="fine">Interface acadêmica da agenda de eventos. Os conteúdos e dados exibidos são ilustrativos e não estão conectados aos sistemas da instituição.</p><a href="./documentacao/projeto-final.pdf" target="_blank" rel="noopener">Documentação do projeto (PDF)</a></div>`;}
function renderOther(){
  if(state.page==='notices'){main.innerHTML=`<section class="content"><p class="eyebrow">Comunicação</p><h2>Bem-vindo ao campus</h2><p class="description">A agenda de eventos ganhou um lugar na sua navegação. Explore palestras, oficinas e encontros e organize seus lembretes.</p><button class="primary" data-action="events">Conhecer a agenda ${icon('arrow')}</button></section>${demoNote}`;return;}
  if(state.page==='schedule'){main.innerHTML=`<section class="content"><p class="notice">Horários ilustrativos para demonstrar a navegação.</p><table class="simple-table"><caption>Minha semana</caption><thead><tr><th>Dia</th><th>Horário</th><th>Atividade</th></tr></thead><tbody><tr><td>Seg</td><td>10:00</td>Projeto integrado</td></tr><tr><td>Qua</td><td>14:00</td>Laboratório</td></tr><tr><td>Sex</td><td>08:00</td>Estudos dirigidos</td></tr></tbody></table><button class="secondary" data-action="events">Ver eventos no campus</button></section>`;return;}
  if(state.page==='grades'){main.innerHTML=`<section class="content"><p class="notice">Dados fictícios, usados somente para demonstrar esta tela.</p><table class="simple-table"><caption>Projeto integrado</caption><thead><tr><th>Avaliação</th><th>Nota</th></tr></thead><tbody><tr><td>Atividade 1</td><td>85</td></tr><tr><td>Atividade 2</td><td>90</td></tr></tbody></table><table class="simple-table"><caption>Laboratório de projetos</caption><thead><tr><th>Avaliação</th><th>Nota</th></tr></thead><tbody><tr><td>Prática 1</td><td>88</td></tr></tbody></table></section>`;return;}
  main.innerHTML=`<section class="content"><p class="notice">Dados fictícios, usados somente para demonstrar esta tela.</p><table class="simple-table"><caption>Projeto integrado</caption><thead><tr><th>Mês</th><th>Aulas</th><th>Presenças</th></tr></thead><tbody><tr><td>Set</td><td>12</td><td>12</td></tr><tr><td>Out</td><td>16</td><td>15</td></tr></tbody></table></section>`;
}
function render(){header();const renders={events:renderEvents,filters:renderFilters,detail:renderDetail,reminder:renderReminder,success:renderSuccess,saving:renderSaving,failure:renderFailure,saved:renderSaved,menu:renderMenu};(renders[state.page]||renderOther)();main.focus({preventScroll:true});window.scrollTo(0,state.page==='events'?listScroll:0);}
async function save(){
  if(busy)return;
  try{reminderTime(selected(),minutes);}catch(e){const box=$('#reminder-error');if(box){box.hidden=false;box.textContent=e.message;box.scrollIntoView({block:'center'});}else toast(e.message);return;}
  busy=true;state.page='saving';header();renderSaving();window.scrollTo(0,0);announce('Salvando lembrete');
  await new Promise(resolve=>setTimeout(resolve,650));
  try{if(!navigator.onLine)throw Error('Você está sem conexão. Reconecte-se e tente novamente; sua escolha foi preservada.');saveReminder(storage,selected(),minutes);refreshReminders();busy=false;go('success',{},true);announce('Lembrete salvo com sucesso');}
  catch(e){saveError=e.message;busy=false;go('failure',{},true);announce('Não foi possível salvar o lembrete');}
}
function askDelete(){const dialog=$('#confirm-dialog');dialog.innerHTML=`<h2 id="dialog-title">Excluir este lembrete?</h2><p>O aviso de ${esc(selected().title)} será removido deste navegador.</p><div class="dialog-actions"><button class="secondary" autofocus data-action="cancel-delete">Manter lembrete</button><button class="danger" data-action="confirm-delete">Excluir lembrete</button></div>`;dialog.showModal();}
document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||button.disabled||busy)return;
  if(button.dataset.tab){go(button.dataset.tab,{tab:button.dataset.tab});return;}
  if(button.dataset.event){go('detail',{tab:'events',id:button.dataset.event,editing:false});return;}
  const action=button.dataset.action;
  if(action==='back')back();
  else if(action==='events')go('events',{tab:'events'});
  else if(action==='filters')go('filters');
  else if(action==='saved')go('saved',{tab:'events'});
  else if(action==='remind'){minutes=reminders[state.id]?.minutes||30;go('reminder',{editing:state.page==='success'});}
  else if(action==='show-saved')go('success');
  else if(action==='clear-query'){filters.query='';$('#event-search').value='';updateList();$('#event-search').focus();}
  else if(action==='clear-filters'){filters={...filters,category:'',from:'',to:''};render();}
  else if(action==='clear-all'){filters={query:'',category:'',from:'',to:''};listScroll=0;render();}
  else if(action==='reset-draft'){const form=$('#filter-form');form.elements.category.value='';form.elements.from.value='';form.elements.to.value='';$('#filter-error').hidden=true;form.querySelectorAll('[aria-invalid]').forEach(n=>n.removeAttribute('aria-invalid'));}
  else if(action==='retry')save();
  else if(action==='review')go('reminder');
  else if(action==='delete')askDelete();
  else if(action==='cancel-delete')$('#confirm-dialog').close();
  else if(action==='confirm-delete'){try{reminders=removeReminder(storage,state.id);$('#confirm-dialog').close();go('detail');toast('Lembrete excluído.');}catch(error){$('#confirm-dialog').close();toast(error.message);}}
});
document.addEventListener('input',e=>{if(e.target.id==='event-search'){filters.query=e.target.value;updateList();}});
document.addEventListener('change',e=>{if(e.target.name==='minutes'){minutes=Number(e.target.value);$('#reminder-error').hidden=true;preview();}});
document.addEventListener('submit',e=>{
  if(e.target.id==='filter-form'){e.preventDefault();const form=e.target;const next={...filters,category:form.elements.category.value,from:form.elements.from.value,to:form.elements.to.value};const error=validateFilters(next);if(error){$('#filter-error').hidden=false;$('#filter-error').textContent=error;$('#date-to').setAttribute('aria-invalid','true');$('#date-to').focus();return;}filters=next;listScroll=0;go('events');}
  if(e.target.id==='reminder-form'){e.preventDefault();save();}
});
window.addEventListener('storage',()=>{refreshReminders();if(!busy)render();});
render();
