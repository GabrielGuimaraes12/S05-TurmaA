export const REMINDERS_KEY = 'inatel.reminders.v1';
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const dateKey = value => {const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function makeEvents(now = new Date()) {
  const data = [
    ['Introdução à inteligência artificial','Tecnologia','Palestra','Auditório 1',7,14,90,'Uma conversa sobre os fundamentos da inteligência artificial e suas aplicações. Conheça exemplos práticos e tire suas dúvidas sobre os primeiros passos na área.','Núcleo de Tecnologia'],
    ['Oficina de desenvolvimento web','Tecnologia','Oficina','Laboratório 2',10,16,120,'Construa uma página responsiva e explore boas práticas de HTML, CSS e JavaScript. Uma atividade prática para quem quer transformar ideias em interfaces.','Comunidade de Desenvolvimento'],
    ['Seu primeiro estágio','Carreira','Encontro','Auditório 2',12,10,60,'Como organizar o currículo, preparar-se para entrevistas e encontrar oportunidades alinhadas aos seus interesses. Traga suas perguntas.','Núcleo de Carreiras'],
    ['Pesquisa que transforma','Pesquisa','Seminário','Sala de Seminários',15,14,90,'Conheça projetos de pesquisa, seus desafios e formas de participação. Uma oportunidade para se aproximar da iniciação científica.','Núcleo de Pesquisa'],
    ['Ideias em movimento','Empreendedorismo','Workshop','Espaço de Inovação',18,15,120,'Da identificação de um problema à primeira proposta de solução: exercite a construção e a comunicação de uma ideia em equipe.','Núcleo de Empreendedorismo'],
    ['Conexões pelo mundo','Intercâmbio','Conversa','Sala Virtual',21,17,60,'Explore possibilidades de experiências internacionais, organização de documentos e planejamento de estudos. Encontro com espaço para dúvidas.','Relações Internacionais']
  ];
  return data.map(([title,category,kind,location,days,hour,duration,description,organizer],i)=>{
    const start=new Date(now);start.setDate(start.getDate()+days);start.setHours(hour,0,0,0);
    return {id:`${dateKey(start)}-${i}`,title,category,kind,location,start:start.toISOString(),end:new Date(+start+duration*60000).toISOString(),description,organizer,mode:i===5?'Online':'Presencial'};
  });
}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(`${value}T12:00:00`);return Number.isFinite(+d)&&dateKey(d)===value;}
export function validateFilters({from='',to=''}={}) {
  if((from&&!validDate(from))||(to&&!validDate(to)))return 'Informe uma data válida.';
  return from&&to&&from>to?'A data final deve ser igual ou posterior à data inicial.':'';
}
export function filterEvents(events,filters={},now=new Date()) {
  if(validateFilters(filters))return [];
  const {query='',category='',from='',to=''}=filters;
  return events.filter(e=>new Date(e.start)>now&&(!category||e.category===category)&&(!from||dateKey(e.start)>=from)&&(!to||dateKey(e.start)<=to)&&normalize(`${e.title} ${e.description} ${e.category}`).includes(normalize(query))).sort((a,b)=>new Date(a.start)-new Date(b.start));
}
export function reminderTime(event,minutes,now=new Date()) {
  if(![15,30,60].includes(Number(minutes)))throw Error('Escolha uma antecedência válida.');
  const notice=+new Date(event.start)-Number(minutes)*60000;
  if(!Number.isFinite(notice)||notice<=+now)throw Error('Este horário de aviso já passou. Escolha outra antecedência.');
  return new Date(notice).toISOString();
}
export function loadReminders(storage) {
  try {
    const raw=storage.getItem(REMINDERS_KEY);if(raw===null)return {};
    const value=JSON.parse(raw);
    if(!value||Array.isArray(value)||typeof value!=='object')throw Error();
    for(const [key,r] of Object.entries(value))if(!r||r.eventId!==key||![15,30,60].includes(r.minutes)||!Number.isFinite(Date.parse(r.notice))||typeof r.title!=='string')throw Error();
    return value;
  }catch{throw Error('Não foi possível ler seus lembretes neste navegador. Os dados existentes foram preservados.');}
}
export function saveReminder(storage,event,minutes,now=new Date()) {
  const notice=reminderTime(event,Number(minutes),now);
  const saved=loadReminders(storage);
  const item={eventId:event.id,title:event.title,start:event.start,notice,minutes:Number(minutes),updatedAt:now.toISOString()};
  saved[event.id]=item;
  try {storage.setItem(REMINDERS_KEY,JSON.stringify(saved));}catch{throw Error('Não foi possível salvar neste navegador. Libere espaço ou permita o armazenamento e tente novamente.');}
  return item;
}
export function removeReminder(storage,eventId) {
  const saved=loadReminders(storage);delete saved[eventId];
  try{storage.setItem(REMINDERS_KEY,JSON.stringify(saved));}catch{throw Error('Não foi possível excluir o lembrete. Tente novamente.');}
  return saved;
}
