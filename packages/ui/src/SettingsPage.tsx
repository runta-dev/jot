export function SettingsPage({localDraft,onLocalDraft}:{localDraft:boolean;onLocalDraft:(value:boolean)=>void}){
 return <div className="settings-page">
  <div className="settings-inner">
   <h1>Settings</h1>
   <h2>Jev compose</h2>
   <div className="settings-card">
    <label className="settings-row">
     <span>
      <strong>Use local LLM</strong>
      <span>A local LLM writes the final reply. Jev still chooses tools. When off, Jev writes the answer itself, which can be slower and less fluent.</span>
     </span>
     <input type="checkbox" role="switch" checked={localDraft} onChange={e=>onLocalDraft(e.target.checked)}/>
    </label>
   </div>
  </div>
 </div>;
}
