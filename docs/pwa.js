(() => {
  const status=text=>{window.habitOfflineStatus=text;const el=document.querySelector('#offline-status');if(el)el.textContent=text;};
  if(location.hostname==='127.0.0.1'&&location.port==='4175'){status('This is the live-edit PC preview. Offline installation is enabled in the separate mobile release.');return;}
  if(!('serviceWorker' in navigator)||!window.isSecureContext){status('Offline installation needs the hosted HTTPS link (or localhost on your PC).');return;}
  status('Preparing offline access...');
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    navigator.serviceWorker.ready.then(()=>status('Offline access is being prepared. Keep a backup of your data.'));
    const updated=()=>status('An update is ready. Close all Habit Buddy windows and reopen to use it.');
    if(reg.waiting)updated();
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)updated();if(worker.state==='redundant')status('Offline setup could not finish. Reopen online and try again.');});});
  }).catch(()=>status('Offline setup could not finish. The app still works online; reopen online to try again.'));
})();

