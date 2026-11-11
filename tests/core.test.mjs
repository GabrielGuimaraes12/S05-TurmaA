import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEvents, filterEvents, validateFilters, reminderTime, saveReminder, loadReminders, removeReminder } from '../assets/core.mjs';
const now = new Date('2026-11-11T10:00:00-03:00');
const event = {id:'e1',title:'Introdução à inteligência artificial',description:'Aplicações',category:'Tecnologia',start:'2026-11-20T14:00:00-03:00'};
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
test('a agenda gerada contém eventos futuros e identificadores distintos',()=>{const list=makeEvents(now);assert.ok(list.length>=6);assert.equal(new Set(list.map(e=>e.id)).size,list.length);assert.ok(list.every(e=>new Date(e.start)>now));});
test('busca ignora caixa e acentos e combina categoria e período',()=>{assert.equal(filterEvents([event],{query:'INTELIGENCIA',category:'Tecnologia',from:'2026-11-20',to:'2026-11-20'},now).length,1);assert.equal(filterEvents([event],{query:'inteligência',category:'Carreira'},now).length,0);});
test('eventos passados não aparecem e busca inexistente retorna vazio',()=>{assert.equal(filterEvents([event],{},new Date('2027-01-01')).length,0);assert.equal(filterEvents([event],{query:'zzzz'},now).length,0);});
test('valida intervalo invertido e data impossível',()=>{assert.ok(validateFilters({from:'2026-12-02',to:'2026-12-01'}));assert.ok(validateFilters({from:'2026-02-30'}));assert.equal(validateFilters({from:'2026-11-20',to:'2026-11-20'}),'');});
test('aviso subtrai antecedência e recusa tempo passado e opção inválida',()=>{assert.equal(new Date(reminderTime(event,30,now)).toISOString(),'2026-11-20T16:30:00.000Z');assert.throws(()=>reminderTime(event,30,new Date('2026-11-20T16:40Z')));assert.throws(()=>reminderTime(event,0,now));});
test('salvar e editar persiste somente um lembrete por evento',()=>{const store=memory();saveReminder(store,event,30,now);saveReminder(store,event,60,now);const saved=loadReminders(store);assert.equal(Object.keys(saved).length,1);assert.equal(saved.e1.minutes,60);assert.equal(saved.e1.eventId,'e1');});
test('erro de escrita é propagado sem fingir sucesso',()=>{const store={getItem:()=>null,setItem:()=>{throw Error('Quota');}};assert.throws(()=>saveReminder(store,event,30,now),/salvar/i);});
test('JSON corrompido gera erro recuperável sem apagar os dados',()=>{const store=memory();store.setItem('inatel.reminders.v1','broken');assert.throws(()=>loadReminders(store),/ler/i);assert.equal(store.getItem('inatel.reminders.v1'),'broken');});
test('excluir é persistente e não afeta outros lembretes',()=>{const store=memory();saveReminder(store,event,30,now);saveReminder(store,{...event,id:'e2'},30,now);removeReminder(store,'e1');assert.deepEqual(Object.keys(loadReminders(store)),['e2']);});
