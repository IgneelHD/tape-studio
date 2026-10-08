import {ADMIN} from './demo-admin';
type User={name:string;salt:string;check:string;keys?:{iv:string;data:string}};
export type AiSettings={openai:string;gemini:string;openaiModel:string;geminiModel:string};
export const emptySettings:AiSettings={openai:'',gemini:'',openaiModel:'gpt-4.1-mini',geminiModel:'gemini-2.5-flash'};
let active:User|null=null,secret:CryptoKey|null=null;
const encode=(b:ArrayBuffer|Uint8Array)=>btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer)));
const decode=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const users=():User[]=>JSON.parse(localStorage.getItem('tape-studio-users')||'[]');
const write=(rows:User[])=>localStorage.setItem('tape-studio-users',JSON.stringify(rows));
async function derive(password:string,salt:string){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:decode(salt),iterations:210000,hash:'SHA-256'},material,256);return {check:encode(await crypto.subtle.digest('SHA-256',bits)),key:await crypto.subtle.importKey('raw',bits,'AES-GCM',false,['encrypt','decrypt'])};}
export function owner(){return active?.name.toLowerCase()||'guest';}
export function accountName(){return active?.name||'';}
export function logout(){active=null;secret=null;}
export async function authenticate(name:string,password:string,register=false){name=name.trim();if(!/^[\p{L}\p{N}_-]{3,30}$/u.test(name))throw new Error('Логин: 3–30 букв, цифр, _ или -');if(password.length<10||password.length>200)throw new Error('Пароль: 10–200 символов');const rows=users();let u=rows.find(x=>x.name.toLowerCase()===name.toLowerCase());if(name.toLowerCase()==='admin'&&!u){u={...ADMIN};rows.push(u);write(rows);}if(register){if(u)throw new Error('Этот логин уже занят');const salt=encode(crypto.getRandomValues(new Uint8Array(16))),d=await derive(password,salt);u={name,salt,check:d.check};write([...rows,u]);active=u;secret=d.key;}else{if(!u)throw new Error('Неверный логин или пароль');const d=await derive(password,u.salt);if(d.check!==u.check)throw new Error('Неверный логин или пароль');active=u;secret=d.key;}return active!.name;}
export async function readSettings():Promise<AiSettings>{if(!active?.keys||!secret)return {...emptySettings};try{const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(active.keys.iv)},secret,decode(active.keys.data));return {...emptySettings,...JSON.parse(new TextDecoder().decode(bytes))};}catch{throw new Error('Не удалось прочитать настройки ключей');}}
export async function saveSettings(settings:AiSettings){if(!active||!secret)throw new Error('Войдите в тестовый аккаунт');const iv=crypto.getRandomValues(new Uint8Array(12)),data=await crypto.subtle.encrypt({name:'AES-GCM',iv},secret,new TextEncoder().encode(JSON.stringify(settings)));const next={...active,keys:{iv:encode(iv),data:encode(data)}};write(users().map(x=>x.name===active!.name?next:x));active=next;}
