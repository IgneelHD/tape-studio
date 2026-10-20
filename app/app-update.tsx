import {useEffect,useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
import {RefreshCw} from 'lucide-react';

// Desktop app only: the GitHub Pages build has nothing to update.
export default function AppUpdate(){
  const [version,setVersion]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{if(isTauri())invoke<string>('app_version').then(setVersion);},[]);
  if(!isTauri())return null;
  const check=async()=>{setBusy(true);try{await invoke('check_update');}finally{setBusy(false);}};
  return <div className="section app-update">
    <h3>Tape Studio {version}</h3>
    <button className="btn" disabled={busy} onClick={check}><RefreshCw size={16} className={busy?'spin':undefined}/>{busy?'Проверка…':'Проверить обновления'}</button>
  </div>;
}
