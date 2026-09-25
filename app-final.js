const U='https://kfysmqwhpzemoknqakzn.supabase.co',K='sb_publishable_UNdKtQ2mCMaaWcMK0FvVIA_r8cNIUl-';const db=supabase.createClient(U,K);const $=id=>document.getElementById(id);let user=null,picks={},filter='all',profile=null,isAdmin=false,results={},goalEvents={},adminMatchFilter='all',adminUsersCache=[],presenceChannel=null,onlineUsers={};const names={okregowa:'Liga Okręgowa Skoczów–Żywiec • kolejka 8',a:'A Klasa Żywiec • kolejka 7',b:'B Klasa Żywiec • kolejka 7'};async function login(){message.textContent='Logowanie...';const{data,error}=await db.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error){message.textContent='❌ '+error.message;return}await enter(data.user)}async function register(){


/* =========================================================
   DZIKI TYPER — TERMINARZ Z SUPABASE v2
   dziki_schedule jest źródłem prawdy dla meczów ligowych.
   ========================================================= */
function scheduleLabel(kickoff){
  if(!kickoff)return 'Termin do potwierdzenia';
  return new Date(kickoff).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',',' •');
}
function localInputValue(kickoff){
  if(!kickoff)return '';
  const d=new Date(kickoff),z=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return z.toISOString().slice(0,16);
}
async function loadScheduleFromDb(){
  const{data,error}=await db.from('dziki_schedule').select('match_id,league_code,league_name,round,match_no,home_team,away_team,kickoff,status').order('league_code').order('round').order('match_no');
  if(error){console.warn('dziki_schedule:',error.message);return false}
  if(!data?.length)return false;
  for(let i=MATCHES.length-1;i>=0;i--)if(!MATCHES[i]?._custom)MATCHES.splice(i,1);
  data.forEach(x=>MATCHES.push({
    id:x.match_id,league:x.league_code==='o'?'okregowa':x.league_code,
    home:x.home_team,away:x.away_team,kickoff:x.kickoff,label:scheduleLabel(x.kickoff),
    scheduleStatus:x.status||'scheduled',round:x.round,matchNo:x.match_no
  }));
  return true;
}
async function editScheduledMatch(id){
  if(!isAdmin)return;
  const m=MATCHES.find(x=>x.id===id&&!x._custom);if(!m)return;
  const home=prompt('Gospodarz:',m.home);if(home===null)return;
  const away=prompt('Gość:',m.away);if(away===null)return;
  const raw=prompt('Data i godzina (RRRR-MM-DDTHH:MM):',localInputValue(m.kickoff));if(raw===null)return;
  const status=prompt('Status: scheduled / postponed / cancelled / finished',m.scheduleStatus||'scheduled');if(status===null)return;
  if(!home.trim()||!away.trim()){alert('Nazwy drużyn nie mogą być puste.');return}
  if(home.trim().toLowerCase()===away.trim().toLowerCase()){alert('Gospodarz i gość muszą być różnymi drużynami.');return}
  const allowed=['scheduled','postponed','cancelled','finished'];
  if(!allowed.includes(status.trim())){alert('Nieprawidłowy status.');return}
  let kickoff=null;
  if(raw.trim()){
    const d=new Date(raw);if(Number.isNaN(d.getTime())){alert('Nieprawidłowa data lub godzina.');return}
    kickoff=d.toISOString();
  }
  const swapped=home.trim()===m.away&&away.trim()===m.home;
  if(swapped&&!confirm('Odwracasz gospodarza i gościa. Typy użytkowników zostaną automatycznie odwrócone (np. 2:1 → 1:2), aby zachować ich znaczenie. Kontynuować?'))return;
  const{error}=await db.rpc('admin_update_schedule_match',{p_match_id:id,p_home_team:home.trim(),p_away_team:away.trim(),p_kickoff:kickoff,p_status:status.trim()});
  if(error){alert('Nie udało się zapisać meczu: '+error.message);return}
  await loadScheduleFromDb();await loadPicks();render();await loadAdmin();
  alert('✓ Mecz został zaktualizowany.');
}
 const n=$('regNickname').value.trim();
 if(n.length<2){message.textContent='❌ Wpisz nick (minimum 2 znaki).';return}
 if(n.length>30){message.textContent='❌ Nick może mieć maksymalnie 30 znaków.';return}
 if(!$('legalAccept')?.checked){message.textContent='❌ Zaznacz akceptację Regulaminu i zapoznanie się z Polityką prywatności / RODO.';return}
 message.textContent='Tworzenie konta...';
 const{data,error}=await db.auth.signUp({email:email.value.trim(),password:password.value,options:{data:{nickname:n}}});
 if(error){message.textContent='❌ '+error.message;return}
 if(data.session){await ensureNickname(data.user,n);await enter(data.user)}
 else message.textContent='✅ Konto utworzone. Sprawdź e-mail i potwierdź rejestrację.';
}
async function ensureNickname(u,fallback=''){
 const{data}=await db.from('profiles').select('nickname').eq('id',u.id).maybeSingle();
 if(data?.nickname&&data.nickname.trim().length>=2)return true;
 let n=(u.user_metadata?.nickname||fallback||'').trim();
 while(n.length<2){
  n=prompt('Ustaw swój nick w Dziki Typer (minimum 2 znaki):','');
  if(n===null){alert('Nick jest wymagany, aby korzystać z Dziki Typer.');n='';continue}
  n=n.trim(); if(n.length<2)alert('Nick musi mieć co najmniej 2 znaki.');
 }
 const{error}=await db.from('profiles').upsert({id:u.id,nickname:n},{onConflict:'id'});
 if(error){alert(error.code==='23505'?'Ten nick jest już zajęty. Wybierz inny nick.':'Nie udało się zapisać nicku: '+error.message);return false}
 return true;
}
async function logout(){if(presenceChannel){try{await presenceChannel.untrack();await db.removeChannel(presenceChannel)}catch(e){}}await db.auth.signOut();location.reload()}async function loadProfile(){const{data,error}=await db.from('profiles').select('id,nickname,avatar,favorite_club').eq('id',user.id).maybeSingle();profile=data||null;const nick=profile?.nickname||user.user_metadata?.nickname||user.email;if($('nicknameBox'))$('nicknameBox').classList.add('hidden');$('userInfo').innerHTML=`<button class="profileLink" onclick="showMyProfile()">${esc(profile?.avatar||'👤')} ${esc(nick)}</button>`}async function saveNickname(){const n=$('nickname').value.trim();if(n.length<2){$('nickMsg').textContent='Nick musi mieć co najmniej 2 znaki.';return}const{error}=await db.from('profiles').upsert({id:user.id,nickname:n});if(error){$('nickMsg').textContent=error.code==='23505'?'Ten nick jest już zajęty.':'❌ '+error.message;return}$('nickMsg').textContent='';await loadProfile();await loadRanking()}function locked(m){return m.kickoff&&Date.now()>=new Date(m.kickoff).getTime()}async function enter(u){user=u;const nickOk=await ensureNickname(u);if(!nickOk)return;$('auth').classList.add('hidden');$('app').classList.remove('hidden');await loadProfile();await startPresence();await loadPicks();await loadResults();await loadGoals();await checkAdmin();await loadNotifications();render()}
function onlineCount(){return Object.keys(onlineUsers).length}
function renderOnline(){
 const n=onlineCount();
 let badge=$('onlineBadge');
 if(!badge){
   badge=document.createElement('div');badge.id='onlineBadge';badge.className='onlineBadge';
   const info=$('userInfo'); if(info)info.after(badge);
 }
 if(badge)badge.innerHTML=`<span></span> Online: <b>${n}</b>`;if($('adminOnlineCount'))$('adminOnlineCount').textContent=String(n);
 const box=$('adminOnlineUsers');
 if(box){
   const rows=Object.values(onlineUsers).sort((a,b)=>String(a.nickname||'').localeCompare(String(b.nickname||''),'pl'));
   box.innerHTML=rows.length?rows.map(x=>`<div class="onlineUserRow"><span>🟢</span><b>${esc(x.nickname||'Użytkownik')}</b></div>`).join(''):'<p class="muted">Nikt poza Tobą nie jest teraz online.</p>';
 }
}
function rebuildPresence(){
 if(!presenceChannel)return;
 const state=presenceChannel.presenceState(), map={};
 Object.values(state).flat().forEach(x=>{if(x.user_id)map[x.user_id]=x});
 onlineUsers=map;renderOnline();
}
async function startPresence(){
 if(!user||presenceChannel)return;
 presenceChannel=db.channel('dziki-typer-online',{config:{presence:{key:user.id}}});
 presenceChannel.on('presence',{event:'sync'},rebuildPresence);
 presenceChannel.on('presence',{event:'join'},rebuildPresence);
 presenceChannel.on('presence',{event:'leave'},rebuildPresence);
 presenceChannel.subscribe(async status=>{
   if(status==='SUBSCRIBED'){
     await presenceChannel.track({user_id:user.id,nickname:profile?.nickname||user.email,avatar:profile?.avatar||'👤',online_at:new Date().toISOString()});
   }
 });
}
function ensureAdminOnlineUI(){
 if(!isAdmin||!$('adminUsersSection')||$('adminOnlinePanel'))return;
 const p=document.createElement('div');p.id='adminOnlinePanel';p.className='panel adminOnlinePanel';
 p.innerHTML='<div class="adminOnlineHead"><div><span class="eyebrow">🟢 ONLINE</span><h3>Osoby w aplikacji</h3></div><strong id="adminOnlineCount"></strong></div><div id="adminOnlineUsers"></div>';
 $('adminUsersSection').prepend(p);
 renderOnline();
}

async function loadPicks(){const{data,error}=await db.from('picks').select('match_id,home_score,away_score').eq('user_id',user.id);if(error){$('status').innerHTML='<div class="warn">⚠️ Nie udało się pobrać typów.</div>';return}picks={};(data||[]).forEach(p=>picks[p.match_id]=p)}async function savePick(id){const m=MATCHES.find(x=>x.id===id);if(locked(m))return;const h=Number($('h-'+id).value),a=Number($('a-'+id).value);if(!Number.isInteger(h)||!Number.isInteger(a)||h<0||a<0){alert('Wpisz oba wyniki jako liczby 0 lub większe.');return}const{error}=await db.from('picks').upsert({user_id:user.id,match_id:id,home_score:h,away_score:a},{onConflict:'user_id,match_id'});if(error){alert('Nie udało się zapisać: '+error.message);return}picks[id]={match_id:id,home_score:h,away_score:a};render()}function liveMinute(r){
 if(!r||r.status!=='live'||r.minute==null)return r?.minute??null;
 const base=Number(r.minute),saved=new Date(r.updated_at).getTime();
 if(!Number.isFinite(base)||!Number.isFinite(saved))return base;
 let v=base+Math.max(0,Math.floor((Date.now()-saved)/60000));
 if(base<=45)v=Math.min(v,45);
 return Math.min(v,130);
}
function resultBadge(m){const r=results[m.id];if(!r||r.status==='scheduled')return '';if(r.status==='live'){const lm=liveMinute(r);const state=(lm===45?'⏸ PRZERWA':`🔴 NA ŻYWO${lm?` • ${lm}'`:''}`);return `<div class="resultline live"><span>${state}</span><b>${r.home_score??0} : ${r.away_score??0}</b></div>`;}if(r.status==='finished')return `<div class="resultline finished"><span>KONIEC</span><b>${r.home_score} : ${r.away_score}</b></div>`;return ''}
function card(m){const p=picks[m.id],isLocked=locked(m),disabled=isLocked?'disabled':'';return `<div class="match">${resultBadge(m)}${goalsHtml(m.id)}<div class="teams">${m.home}<br><span class="versus">—</span> ${m.away}</div><div class="date">🗓 ${m.label}</div><div class="score"><input id="h-${m.id}" type="number" min="0" inputmode="numeric" value="${p?.home_score??''}" ${disabled}><span>:</span><input id="a-${m.id}" type="number" min="0" inputmode="numeric" value="${p?.away_score??''}" ${disabled}><button class="save" onclick="savePick('${m.id}')" ${disabled}>Zapisz</button></div>${isLocked?'<div class="locked">🔒 Typowanie zamknięte</div>':p?'<div class="saved">✓ Typ zapisany online</div>':''}</div>`}
async function loadResults(){const{data,error}=await db.from('match_results').select('match_id,home_score,away_score,status,minute,updated_at');if(error)return;results={};(data||[]).forEach(r=>results[r.match_id]=r)}
async function loadGoals(){const{data,error}=await db.from('match_goals').select('id,match_id,team,player,minute').order('minute',{ascending:true});if(error)return;goalEvents={};(data||[]).forEach(g=>(goalEvents[g.match_id]??=[]).push(g))}
function goalsHtml(id){const gs=goalEvents[id]||[];return gs.length?`<div class="goalEvents">${gs.map(g=>`<div>⚽ ${g.minute}' <b>${esc(g.player)}</b><small>${g.team==='home'?'Gospodarze':'Goście'}</small></div>`).join('')}</div>`:''}

function renderLive(){const active=MATCHES.filter(m=>!m._archived&&results[m.id]?.status==='live');const finished=MATCHES.filter(m=>results[m.id]?.status==='finished');let html='';if(active.length){html+=active.map(m=>{const r=results[m.id];const p=picks[m.id];return `<div class="livecard"><div class="liveMeta"><span class="livePill">${liveMinute(r)===45?'⏸ PRZERWA':`● LIVE${liveMinute(r)?` • ${liveMinute(r)}'`:''}`}</span><span>${m.label}</span></div><div class="liveTeams"><span>${m.home}</span><b>${r.home_score??0} : ${r.away_score??0}</b><span>${m.away}</span></div>${goalsHtml(m.id)}${p?`<div class="yourPick">Twój typ: <b>${p.home_score} : ${p.away_score}</b></div>`:''}</div>`}).join('')}else html+='<div class="emptyLive">Teraz nie trwa żaden mecz.</div>';if(finished.length){html+='<h3 class="recentTitle">Ostatnio zakończone</h3>'+finished.slice(0,6).map(m=>{const r=results[m.id];return `<div class="finishedRow"><span>${m.home} – ${m.away}</span><b>${r.home_score} : ${r.away_score}</b></div>`}).join('')}$('liveMatches').innerHTML=html}function render(){let html='';['okregowa','a','b'].forEach(l=>{if(filter!=='all'&&filter!==l)return;const ms=MATCHES.filter(m=>m.league===l);if(ms.length)html+=`<h3 class="league">${names[l]}</h3>`+ms.map(card).join('')});if(filter==='all'){const cms=MATCHES.filter(m=>m._custom&&!m._archived);const groups={};cms.forEach(m=>(groups[m.competition]??=[]).push(m));Object.entries(groups).forEach(([title,ms])=>html+=`<h3 class="league">🏆 ${esc(title)}</h3>`+ms.map(card).join(''));}$('matches').innerHTML=html}
async function checkAdmin(){
  const{data,error}=await db.rpc('is_admin');
  isAdmin=!error&&data===true;
  $('tabAdmin').classList.toggle('hidden',!isAdmin);
}
async function loadAdmin(){
  if(!isAdmin)return;
  await loadResults();
  const list=MATCHES.filter(m=>!m._archived&&(adminMatchFilter==='all'||(results[m.id]?.status||'scheduled')===adminMatchFilter));
  $('adminMatchCount').textContent=String(MATCHES.length);
  $('adminMatches').innerHTML=list.length?list.map(m=>{
    const r=results[m.id]||{status:'scheduled'};
    const status=r.status||'scheduled';
    const label=status==='live'?'🔴 LIVE':status==='finished'?'✓ Zakończony':'◷ Przed meczem';
    const score=status==='scheduled'?'—':`${r.home_score??0} : ${r.away_score??0}`;
    return `<div class="adminMatchRow" data-status="${status}"><button class="adminMatchSummary" onclick="toggleAdminMatch('${m.id}')"><span class="adminMatchMain"><b>${esc(m.home)} — ${esc(m.away)}</b><small>🗓 ${esc(m.label)}</small></span><span class="adminMatchResult"><strong>${score}</strong><em class="statusPill ${status}">${label}</em></span><span class="adminChevron" id="ac-${m.id}">⌄</span></button><div id="ae-${m.id}" class="adminMatchEdit hidden"><div class="adminEditGrid"><label>Status<select id="rs-${m.id}"><option value="scheduled" ${status==='scheduled'?'selected':''}>Przed meczem</option><option value="live" ${status==='live'?'selected':''}>🔴 Na żywo</option><option value="finished" ${status==='finished'?'selected':''}>Koniec</option></select></label><label>Minuta<input id="rm-${m.id}" class="minute" type="number" min="1" max="130" inputmode="numeric" placeholder="min" value="${r.minute??''}"></label></div><div class="adminScoreEdit"><input id="rh-${m.id}" type="number" min="0" inputmode="numeric" value="${r.home_score??''}" placeholder="0"><span>:</span><input id="ra-${m.id}" type="number" min="0" inputmode="numeric" value="${r.away_score??''}" placeholder="0"><button onclick="saveResult('${m.id}')">💾 Zapisz</button></div><div class="goalAdmin"><h4>⚽ Strzelcy bramek</h4><div class="goalAdd"><select id="gt-${m.id}"><option value="home">${esc(m.home)}</option><option value="away">${esc(m.away)}</option></select><input id="gp-${m.id}" placeholder="Imię i nazwisko"><input id="gm-${m.id}" type="number" min="1" max="130" placeholder="min"><button onclick="addGoal('${m.id}')">⚽ Dodaj bramkę</button></div><div class="goalAdminList">${(goalEvents[m.id]||[]).map(g=>`<div><span>⚽ ${g.minute}' ${esc(g.player)}</span><button class="dangerGhost" onclick="deleteGoal(${g.id})">🗑</button></div>`).join('')}</div></div>${!m._custom?`<div class="customMatchActions"><button onclick="editScheduledMatch('${m.id}')">✏️ Edytuj termin / drużyny</button></div>`:''}${m._custom?`<div class="customMatchActions"><button onclick="editCustomMatch(${Number(m._customId)})">✏️ Edytuj mecz</button>${status==='finished'?`<button onclick="archiveCustomMatch(${Number(m._customId)})">📦 Archiwizuj mecz</button>`:`<button class="dangerGhost" onclick="deleteCustomMatch(${Number(m._customId)})">🗑 Usuń mecz</button>`}</div>`:''}</div></div>`;
  }).join(''):'<div class="adminEmpty">Brak meczów w tym filtrze.</div>';
}
function adminSection(name){
  const matches=name==='matches';
  $('adminMatchesSection').classList.toggle('hidden',!matches);
  $('adminUsersSection').classList.toggle('hidden',matches);
  $('adminNavMatches').classList.toggle('active',matches);
  $('adminNavUsers').classList.toggle('active',!matches);
  if(matches)loadAdmin(); else {ensureAdminOnlineUI();loadAdminUsers();}
}
function toggleAdminMatch(id){
  const box=$('ae-'+id),chev=$('ac-'+id); if(!box)return;
  const opening=box.classList.contains('hidden');
  document.querySelectorAll('.adminMatchEdit').forEach(x=>x.classList.add('hidden'));
  document.querySelectorAll('.adminChevron').forEach(x=>x.textContent='⌄');
  if(opening){box.classList.remove('hidden');if(chev)chev.textContent='⌃'}
}
function setAdminMatchFilter(value,btn){
  adminMatchFilter=value;
  document.querySelectorAll('.adminFilters button').forEach(b=>b.classList.toggle('active',b===btn));
  loadAdmin();
}
async function refreshAdminDashboard(){await loadAdmin();await loadAdminUsers();}

async function addGoal(id){if(!isAdmin)return;const team=$('gt-'+id).value,player=$('gp-'+id).value.trim(),minute=Number($('gm-'+id).value);if(!player||!Number.isInteger(minute)){alert('Wpisz strzelca i minutę.');return}const{error}=await db.from('match_goals').insert({match_id:id,team,player,minute});if(error){alert(error.message);return}await loadGoals();await loadAdmin();render();renderLive()}
async function deleteGoal(id){if(!isAdmin||!confirm('Usunąć strzelca?'))return;const{error}=await db.from('match_goals').delete().eq('id',id);if(error){alert(error.message);return}await loadGoals();await loadAdmin();render();renderLive()}
async function saveResult(id){
  if(!isAdmin)return;
  const status=$('rs-'+id).value;
  const hv=$('rh-'+id).value,av=$('ra-'+id).value,mv=$('rm-'+id).value;
  if(status!=='scheduled'&&(hv===''||av==='')){alert('Dla LIVE lub zakończonego meczu wpisz wynik.');return}
  const h=hv===''?0:Number(hv),a=av===''?0:Number(av),minute=mv===''?null:Number(mv);
  if(!Number.isInteger(h)||!Number.isInteger(a)||h<0||a<0){alert('Wynik musi być liczbą 0 lub większą.');return}
  const{error}=await db.from('match_results').upsert({match_id:id,home_score:h,away_score:a,status,minute,updated_at:new Date().toISOString()},{onConflict:'match_id'});
  if(error){alert('Nie udało się zapisać: '+error.message);return}
  $('adminMsg').textContent=status==='live'?'✓ Wynik LIVE zapisany.':status==='finished'?'✓ Mecz zakończony. Ranking został przeliczony.':'✓ Status zapisany.';
  await loadResults();await loadAdmin();render();renderLive();
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function autoRank(points,exact,finished){
  points=Number(points||0); exact=Number(exact||0); finished=Number(finished||0);
  if(finished>=100 && points>=120 && exact>=15)return 'Mistrz Typera';
  if(finished>=50 && points>=55 && exact>=7)return 'Ekspert';
  if(finished>=25 && points>=25 && exact>=3)return 'Dobry Typer';
  if(finished>=10 && points>=8)return 'Typer';
  return 'Debiutant';
}
async function loadAdminUsers(){
  if(!isAdmin)return;
  const{data,error}=await db.rpc('admin_users');
  if(error){$('adminUsers').innerHTML='<div class="warn">❌ '+esc(error.message)+'</div>';return}
  adminUsersCache=data||[];
  if($('adminUserCount'))$('adminUserCount').textContent=String(adminUsersCache.length);
  renderAdminUsers();
}
function renderAdminUsers(){
  const box=$('adminUsers'); if(!box)return;
  const q=($('adminUserSearch')?.value||'').trim().toLowerCase();
  const rows=adminUsersCache.filter(r=>!q||String(r.nickname||'').toLowerCase().includes(q)||String(r.email||'').toLowerCase().includes(q));
  box.innerHTML=rows.length?rows.map(r=>{
    const finished=r.finished_count??r.finished_picks??0, rank=autoRank(r.points,r.exact_scores,finished);
    const points=r.points??0, exact=r.exact_scores??0, count=r.picks_count??0, mine=r.user_id===user.id;
    return `<div class="adminUserRow"><div class="adminUserTop"><div class="adminUserIdentity"><span class="adminAvatar">👤</span><span><b>${esc(r.nickname||'Bez nicku')}</b><small>${esc(r.email||'')}</small></span></div><span class="badge">${esc(rank)}</span></div><div class="adminUserStats"><span><b>${points}</b><small>pkt</small></span><span><b>🎯 ${exact}</b><small>dokładnych</small></span><span><b>${finished}</b><small>rozliczonych</small></span><span><b>${count}</b><small>typów</small></span></div><div class="adminUserActions"><button onclick="adminUserPicks('${r.user_id}','${esc(r.nickname||r.email||'Użytkownik')}')">📊 Typy</button><button onclick="adminEditUser('${r.user_id}','${esc(r.nickname||'')}')">✏️ Edytuj</button>${mine?'<span class="adminSelf">Administrator</span>':`<button class="dangerGhost" onclick="adminDeleteUser('${r.user_id}','${esc(r.email||r.nickname||'użytkownika')}')">🗑</button>`}</div></div>`;
  }).join(''):'<div class="adminEmpty">Nie znaleziono użytkownika.</div>';
}
async function adminUserPicks(id,label){
  const{data,error}=await db.rpc('admin_user_picks',{p_user_id:id});
  if(error){alert('Nie udało się pobrać typów: '+error.message);return}
  const rows=data||[];
  let box=$('adminPickHistory');
  if(!box){
    box=document.createElement('div');
    box.id='adminPickHistory';
    box.className='panel';
    $('adminUsers').before(box);
  }
  const matchName=id=>{
    const m=MATCHES.find(x=>x.id===id);
    return m?`${esc(m.home)} — ${esc(m.away)}`:esc(id);
  };
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h3 style="margin:0">📊 Typy: ${esc(label)}</h3><button onclick="$('adminPickHistory').remove()">✕</button></div>`+
    (rows.length?rows.map(r=>{
      const finished=r.status==='finished';
      let verdict='<span class="muted">⏳ Oczekuje</span>';
      if(finished){
        const exact=Number(r.pick_home)===Number(r.result_home)&&Number(r.pick_away)===Number(r.result_away);
        const outcome=Math.sign(Number(r.pick_home)-Number(r.pick_away))===Math.sign(Number(r.result_home)-Number(r.result_away));
        verdict=exact?'🎯 +3 pkt':outcome?'✅ +1 pkt':'❌ 0 pkt';
      }
      return `<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.12)"><b>${matchName(r.match_id)}</b><div>Typ: <b>${r.pick_home}:${r.pick_away}</b>${finished?` • Wynik: <b>${r.result_home}:${r.result_away}</b>`:''}</div><div>${verdict}</div></div>`;
    }).join(''):'<p class="muted">Brak zapisanych typów.</p>');
  box.scrollIntoView({behavior:'smooth',block:'start'});
}


async function adminEditUser(id,currentNickname){
  const nickname=prompt('Nowy nick użytkownika:',currentNickname||'');
  if(nickname===null)return;
  const n=nickname.trim();
  if(n.length<2){alert('Nick musi mieć co najmniej 2 znaki.');return}
  const avatar=prompt('Avatar (emoji), np. 👤 ⚽ 🐗 🎯 🔥 🏆:', '👤');
  if(avatar===null)return;
  const favoriteClub=prompt('Ulubiony klub (możesz zostawić puste):','');
  if(favoriteClub===null)return;
  const{error}=await db.rpc('admin_update_user_profile',{
    p_user_id:id,
    p_nickname:n,
    p_avatar:(avatar.trim()||'👤'),
    p_favorite_club:(favoriteClub.trim()||null)
  });
  if(error){alert(error.code==='23505'?'Ten nick jest już zajęty.':'Nie udało się zapisać profilu: '+error.message);return}
  alert('Profil użytkownika został zapisany.');
  await loadAdminUsers();
  await loadRanking();
}

async function adminDeleteUser(id,label){
  if(!confirm(`Usunąć konto ${label}? Tej operacji nie można cofnąć.`))return;
  const{error}=await db.rpc('admin_delete_user',{p_user_id:id});
  if(error){alert('Nie udało się usunąć użytkownika: '+error.message);return}
  alert('Użytkownik został usunięty.');
  await loadAdminUsers();
  await loadRanking();
}


async function showMyProfile(){
  const{data,error}=await db.rpc('my_typer_profile');
  if(error){alert('Nie udało się pobrać profilu: '+error.message);return}
  const r=Array.isArray(data)?data[0]:data;
  if(!r){alert('Brak danych profilu.');return}
  let box=$('myTyperProfile');
  if(!box){
    box=document.createElement('div');
    box.id='myTyperProfile';
    box.className='panel';
    const app=$('app');
    app.insertBefore(box, app.children[1]||null);
  }
  const rank=autoRank(r.points,r.exact_scores,r.finished_count);
  const acc=Number(r.accuracy_percent||0);
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
    <h2 style="margin:0">👤 Profil Typera</h2><button onclick="$('myTyperProfile').remove()">✕</button>
  </div>
  <div style="display:flex;align-items:center;gap:12px;margin-top:16px">
    <div style="font-size:48px">${esc(profile?.avatar||'👤')}</div>
    <div><h3 style="margin:0">${esc(profile?.nickname||user.email)}</h3>
    ${profile?.favorite_club?`<small class="muted">❤️ ${esc(profile.favorite_club)}</small>`:''}</div>
  </div>
  <button style="margin-top:12px" onclick="editMyProfile()">✏️ Edytuj profil</button>
  <div class="userstats" style="margin-top:12px">
    <span>🏅 ${esc(rank)}</span><span>🏆 Miejsce: ${r.place||'-'}</span>
    <span>⭐ ${r.points||0} pkt</span><span>📈 ${acc}% skuteczności</span>
    <span>🎯 ${r.exact_scores||0} dokładnych</span><span>🔥 Seria: ${r.current_streak||0}</span>
    <span>⚽ ${r.finished_count||0} rozliczonych typów</span>
  </div>`;
  box.scrollIntoView({behavior:'smooth',block:'start'});
}


function editMyProfile(){
  let box=$('profileEditor');
  if(box){box.remove();return}
  box=document.createElement('div');box.id='profileEditor';box.className='panel';
  const avatars=['👤','⚽','🐗','🎯','🔥','🏆','🦅','🦁','🐺','🟡'];
  const clubs=[...new Set(MATCHES.flatMap(m=>[m.home,m.away]))].sort();
  box.innerHTML=`<h3>✏️ Edytuj profil</h3>
    <p class="muted">Wybierz avatar:</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${avatars.map(a=>`<button onclick="selectAvatar('${a}')" style="font-size:26px;min-width:48px">${a}</button>`).join('')}</div>
    <p class="muted" style="margin-top:14px">Twój klub:</p>
    <select id="favoriteClub" style="width:100%"><option value="">— bez klubu —</option>${clubs.map(c=>`<option value="${esc(c)}" ${profile?.favorite_club===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <input type="hidden" id="selectedAvatar" value="${esc(profile?.avatar||'👤')}">
    <div style="display:flex;gap:8px;margin-top:14px"><button onclick="saveProfileLook()">💾 Zapisz</button><button onclick="$('profileEditor').remove()">Anuluj</button></div>`;
  $('myTyperProfile').appendChild(box);
}
function selectAvatar(a){
  $('selectedAvatar').value=a;
  document.querySelectorAll('#profileEditor button').forEach(b=>{if(b.textContent.trim()===a)b.style.outline='3px solid #f5b51b';else if(b.textContent.trim().length<=2)b.style.outline=''});
}
async function saveProfileLook(){
  const avatar=$('selectedAvatar').value||'👤',favorite_club=$('favoriteClub').value||null;
  const{error}=await db.from('profiles').update({avatar,favorite_club}).eq('id',user.id);
  if(error){alert('Nie udało się zapisać profilu: '+error.message);return}
  await loadProfile();$('myTyperProfile')?.remove();await showMyProfile();await loadRanking();
}


function chatTime(v){
  try{return new Date(v).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
  catch(e){return ''}
}

function highlightMentions(text){
  return esc(text).replace(/(^|\s)(@[\p{L}\p{N}_.-]+)/gu,'$1<strong>$2</strong>');
}

async function loadChat(){
  const box=$('chatMessages');
  if(!box)return;
  const [{data:msgs,error},{data:looks}]=await Promise.all([
    db.from('chat_messages').select('id,user_id,message,created_at').order('created_at',{ascending:false}).limit(100),
    db.rpc('public_chat_profiles')
  ]);
  if(error){box.innerHTML='<div class="warn">❌ Nie udało się pobrać czatu: '+esc(error.message)+'</div>';return}
  const lookMap={};
  (looks||[]).forEach(x=>{if(x.id)lookMap[x.id]=x});
  const rows=(msgs||[]).slice().reverse();
  box.innerHTML=rows.length?rows.map(m=>{
    const p=lookMap[m.user_id]||{};
    const nick=p.nickname||'Użytkownik';
    const avatar=p.avatar||'👤';
    const del=isAdmin?` <button class="small" onclick="deleteChatMessage(${Number(m.id)})" title="Usuń wiadomość">🗑</button>`:'';
    return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.10)"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${esc(avatar)} ${esc(nick)}</b><span class="muted" style="font-size:12px">${chatTime(m.created_at)}${del}</span></div><div style="margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere">${highlightMentions(m.message)}</div></div>`;
  }).join(''):'<p class="muted">Jeszcze nikt nic nie napisał.</p>';
  box.scrollTop=box.scrollHeight;
}

async function sendChatMessage(){
  const input=$('chatInput'),msg=$('chatMsg');
  if(!input)return;
  const text=input.value.trim();
  if(!profile?.nickname||profile.nickname.trim().length<2){alert('Najpierw ustaw swój nick w profilu.');return}
  if(!text){msg.textContent='Wpisz wiadomość.';return}
  if(text.length>500){msg.textContent='Wiadomość może mieć maksymalnie 500 znaków.';return}
  msg.textContent='Wysyłanie...';
  const{error}=await db.rpc('send_chat_message',{p_message:text});
  if(error){msg.textContent='❌ '+error.message;return}
  input.value='';msg.textContent='✓ Wysłano.';
  await loadChat();await loadNotifications();
}

async function deleteChatMessage(id){
  if(!isAdmin)return;
  if(!confirm('Usunąć tę wiadomość?'))return;
  const{error}=await db.from('chat_messages').delete().eq('id',id);
  if(error){alert('Nie udało się usunąć wiadomości: '+error.message);return}
  await loadChat();
}

async function loadNotifications(){
  const{data,error}=await db.from('notifications').select('id,text,is_read,created_at,message_id').order('created_at',{ascending:false}).limit(100);
  if(error)return;
  const rows=data||[], unread=rows.filter(n=>!n.is_read).length;
  const count=$('notificationCount');
  if(count)count.textContent=String(unread);
  const box=$('notificationsList');
  if(!box)return;
  box.innerHTML=rows.length?rows.map(n=>`<div style="padding:12px;border-bottom:1px solid rgba(255,255,255,.10);${n.is_read?'opacity:.7':'font-weight:700'}"><div>${n.is_read?'🔔':'🟡'} ${esc(n.text)}</div><small class="muted">${chatTime(n.created_at)}</small></div>`).join(''):'<p class="muted">Brak powiadomień.</p>';
}

async function markAllNotificationsRead(){
  const{error}=await db.from('notifications').update({is_read:true}).eq('is_read',false);
  if(error){alert('Nie udało się oznaczyć powiadomień: '+error.message);return}
  await loadNotifications();
}

async function loadRanking(){
 const[{data,error},{data:looks}]=await Promise.all([db.rpc('full_ranking'),db.rpc('public_profile_looks')]);
 if(error){$('ranking').textContent='Nie udało się pobrać rankingu.';return}
 const lm={};(looks||[]).forEach(x=>lm[x.nickname]=x);
 const rows=(data||[]).slice(0,50);
 if(!rows.length){$('ranking').innerHTML='<div class="rankingEmpty">Ranking jest jeszcze pusty.</div>';return}
 const rk=r=>autoRank(r.points,r.exact_scores,r.finished_count??r.finished_picks??0), av=r=>lm[r.nickname]?.avatar||'👤';
 const top=rows.slice(0,3);
 const podium=`<div class="rankingPodium">${top.map((r,i)=>`<div class="podiumCard podium${i+1}"><div class="podiumPlace">${i===0?'🥇':i===1?'🥈':'🥉'} ${i+1}</div><div class="podiumAvatar">${esc(av(r))}</div><div class="podiumNick">${esc(r.nickname||'Bez nicku')}</div><span class="rankbadge">${esc(rk(r))}</span><div class="podiumStats"><span><b>${Number(r.picks_count||0)}</b><small>typów</small></span><span><b>${Number(r.points||0)}</b><small>pkt</small></span></div></div>`).join('')}</div>`;
 const list=rows.map((r,i)=>`<div class="rankingLine"><span class="rankingPlace">${i+1}</span><span class="rankingPlayer"><span class="rankingAvatar">${esc(av(r))}</span><span><b>${esc(r.nickname||'Bez nicku')}</b><small>🎯 ${Number(r.exact_scores||0)} dokładnych</small></span></span><span class="rankingPicks">${Number(r.picks_count||0)}</span><span class="rankingPoints">${Number(r.points||0)}</span><span class="rankingRank"><span class="rankbadge">${esc(rk(r))}</span></span></div>`).join('');
 $('ranking').innerHTML=`${podium}<div class="rankingTable"><div class="rankingLine rankingHeader"><span>#</span><span>Gracz</span><span>Typy</span><span>Pkt</span><span>Ranga</span></div>${list}</div><div class="rankingFooter">👥 Ranking pokazuje maksymalnie 50 graczy.</div>`;
}
async function showTab(t){
  const m=t==='matches',l=t==='live',r=t==='ranking',c=t==='chat',n=t==='notifications',a=t==='admin';
  $('matchesView').classList.toggle('hidden',!m);
  $('liveView').classList.toggle('hidden',!l);
  $('rankingView').classList.toggle('hidden',!r);
  $('chatView').classList.toggle('hidden',!c);
  $('notificationsView').classList.toggle('hidden',!n);
  $('adminView').classList.toggle('hidden',!a);
  $('tabMatches').classList.toggle('active',m);
  $('tabLive').classList.toggle('active',l);
  $('tabRanking').classList.toggle('active',r);
  $('tabChat').classList.toggle('active',c);
  $('tabNotifications').classList.toggle('active',n);
  $('tabAdmin').classList.toggle('active',a);
  if(l){await loadResults();await loadGoals();renderLive()}
  if(r)await loadRanking();
  if(c)await loadChat();
  if(n)await loadNotifications();
  if(a){ensureCustomMatchAdminUI();ensureAdminOnlineUI();await loadAdmin();await loadAdminUsers();renderOnline();}
}document.querySelectorAll('.filters button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;document.querySelectorAll('.filters button').forEach(x=>x.classList.toggle('active',x===b));render()});(async()=>{const{data}=await db.auth.getSession();if(data.session)await enter(data.session.user)})();setInterval(async()=>{if(!user)return;await loadResults();await loadGoals();if(!$('matchesView').classList.contains('hidden'))render();if(!$('liveView').classList.contains('hidden'))renderLive();await loadNotifications();if(!$('chatView').classList.contains('hidden'))await loadChat()},10000);

/* =========================================================
   DZIKI TYPER — DODATKOWE MECZE ADMINA v1
   Puchar Polski • sparingi • inne rozgrywki
   ========================================================= */
let customMatchesCache=[];

function customMatchId(id){return `custom-${Number(id)}`}

function customDateLabel(kickoff){
  if(!kickoff)return 'Termin do potwierdzenia';
  const d=new Date(kickoff);
  return d.toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

async function loadCustomMatches(){
  const{data,error}=await db.from('custom_matches').select('id,competition,home_team,away_team,kickoff,created_at,archived').order('kickoff',{ascending:true});
  if(error){console.warn('custom_matches:',error.message);return}
  customMatchesCache=data||[];
  for(let i=MATCHES.length-1;i>=0;i--)if(MATCHES[i]?._custom)MATCHES.splice(i,1);
  customMatchesCache.forEach(x=>MATCHES.push({
    id:customMatchId(x.id),
    league:'custom',
    home:x.home_team,
    away:x.away_team,
    kickoff:x.kickoff,
    label:customDateLabel(x.kickoff),
    competition:x.competition,
    _custom:true,
    _customId:x.id,
    _archived:x.archived===true
  }));
  names.custom='Dodatkowe mecze';
}

function ensureCustomMatchAdminUI(){
  if(!isAdmin||!$('adminMatchesSection')||$('customMatchAdmin'))return;
  const box=document.createElement('div');
  box.id='customMatchAdmin'; box.className='customMatchAdmin';
  box.innerHTML=`<div class="customMatchHead"><div><span class="eyebrow">➕ NOWY MECZ</span><h3>Dodaj dodatkowe spotkanie</h3></div></div>
  <p class="muted">Puchar Polski, sparing lub inne rozgrywki. Po zapisaniu mecz od razu pojawi się w typowaniu.</p>
  <div class="customMatchGrid">
    <label>Rozgrywki<input id="cmCompetition" maxlength="80" placeholder="np. Puchar Polski"></label>
    <label>Gospodarz<input id="cmHome" maxlength="100" placeholder="Nazwa gospodarza"></label>
    <label>Gość<input id="cmAway" maxlength="100" placeholder="Nazwa gościa"></label>
    <label>Data i godzina<input id="cmKickoff" type="datetime-local"></label>
  </div>
  <button class="customAddBtn" onclick="addCustomMatch()">➕ DODAJ MECZ</button>
  <div id="customMatchMsg" class="saved"></div>`;
  const head=$('adminMatchesSection').querySelector('.adminSectionHead');
  if(head)head.after(box); else $('adminMatchesSection').prepend(box);
}

async function addCustomMatch(){
  if(!isAdmin)return;
  const competition=$('cmCompetition').value.trim(),home=$('cmHome').value.trim(),away=$('cmAway').value.trim(),raw=$('cmKickoff').value;
  if(!competition||!home||!away||!raw){alert('Uzupełnij rozgrywki, gospodarza, gościa oraz datę i godzinę.');return}
  if(home.toLowerCase()===away.toLowerCase()){alert('Gospodarz i gość muszą być różnymi drużynami.');return}
  const kickoff=new Date(raw);
  if(Number.isNaN(kickoff.getTime())){alert('Podaj prawidłową datę i godzinę.');return}
  const{error}=await db.from('custom_matches').insert({competition,home_team:home,away_team:away,kickoff:kickoff.toISOString()});
  if(error){alert('Nie udało się dodać meczu: '+error.message);return}
  $('customMatchMsg').textContent='✓ Mecz został dodany.';
  ['cmCompetition','cmHome','cmAway','cmKickoff'].forEach(id=>$(id).value='');
  await refreshCustomMatches();
}

async function editCustomMatch(id){
  if(!isAdmin)return;
  const x=customMatchesCache.find(m=>Number(m.id)===Number(id)); if(!x)return;
  const competition=prompt('Rozgrywki:',x.competition); if(competition===null)return;
  const home=prompt('Gospodarz:',x.home_team); if(home===null)return;
  const away=prompt('Gość:',x.away_team); if(away===null)return;
  const current=x.kickoff?new Date(new Date(x.kickoff).getTime()-new Date(x.kickoff).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  const raw=prompt('Data i godzina (RRRR-MM-DDTHH:MM):',current); if(raw===null)return;
  if(!competition.trim()||!home.trim()||!away.trim()||!raw.trim()){alert('Wszystkie pola są wymagane.');return}
  const kickoff=new Date(raw); if(Number.isNaN(kickoff.getTime())){alert('Nieprawidłowa data lub godzina.');return}
  const{error}=await db.from('custom_matches').update({competition:competition.trim(),home_team:home.trim(),away_team:away.trim(),kickoff:kickoff.toISOString()}).eq('id',id);
  if(error){alert('Nie udało się zapisać zmian: '+error.message);return}
  await refreshCustomMatches();
}

async function deleteCustomMatch(id){
  if(!isAdmin)return;
  const x=customMatchesCache.find(m=>Number(m.id)===Number(id)); if(!x)return;
  if(!confirm(`Usunąć mecz ${x.home_team} — ${x.away_team}? Typy i wynik tego meczu również zostaną usunięte.`))return;
  const{error}=await db.rpc('admin_delete_custom_match',{p_custom_id:Number(id)});
  if(error){alert('Nie udało się usunąć meczu: '+error.message);return}
  await refreshCustomMatches();
}


async function archiveCustomMatch(id){
 if(!isAdmin)return;
 const x=customMatchesCache.find(m=>Number(m.id)===Number(id));if(!x)return;
 if(results[customMatchId(id)]?.status!=='finished'){alert('Najpierw ustaw status Koniec i zapisz wynik.');return}
 if(!confirm(`Archiwizować mecz ${x.home_team} — ${x.away_team}? Punkty i historia typów zostaną zachowane.`))return;
 const{error}=await db.rpc('admin_archive_custom_match',{p_custom_id:Number(id)});
 if(error){alert('Nie udało się zarchiwizować: '+error.message);return}
 alert('📦 Zarchiwizowano. Punkty i historia zostały zachowane.');
 await refreshCustomMatches();
}

async function refreshCustomMatches(){
  await loadCustomMatches();
  await loadPicks();
  await loadResults();
  render();
  renderLive();
  if(isAdmin){ensureCustomMatchAdminUI();await loadAdmin();}
  if($('weekHit'))renderWeekAdmin();
}

/* =========================================================
   DZIKI TYPER — ATRAKCJE KOLEJKI v1
   HIT kolejki • Pojedynek tygodnia • Podsumowanie kolejki
   ========================================================= */
let weekFeature=null;

function weekMatchLabel(id){
  const m=MATCHES.find(x=>x.id===id);
  return m?`${m.home} — ${m.away}`:id||'—';
}
function ensureWeekUI(){
  const nav=document.querySelector('.dashboardNav');
  if(nav&&!$('tabWeek')){
    const b=document.createElement('button');
    b.id='tabWeek'; b.type='button'; b.onclick=()=>showTab('week');
    b.innerHTML='<span class="navIcon">🔥</span><span class="navCopy"><b>KOLEJKA</b><small>HIT • pojedynek • podsumowanie</small></span><span class="navArrow">›</span>';
    nav.appendChild(b);
  }
  if(!$('weekView')){
    const v=document.createElement('section'); v.id='weekView'; v.className='hidden';
    v.innerHTML='<div class="weekHero"><span>🔥 DZIKI TYPER</span><h2>Atrakcje kolejki</h2><p>HIT kolejki, pojedynek tygodnia i najważniejsze liczby w jednym miejscu.</p></div><div id="weekContent"><div class="panel">Ładowanie…</div></div>';
    const anchor=$('adminView')||$('app').lastElementChild; anchor.before(v);
  }
  if(isAdmin&&$('adminView')&&!$('adminWeekPanel')){
    const p=document.createElement('div'); p.id='adminWeekPanel'; p.className='panel adminWeekPanel';
    p.innerHTML='<div class="adminWeekHead"><div><span class="eyebrow">🔥 ATRAKCJE KOLEJKI</span><h2>HIT i pojedynek tygodnia</h2></div></div><p class="muted">Wybierz mecz wyróżniony jako HIT oraz dwóch typerów do pojedynku. Podsumowanie policzy się automatycznie z zakończonych spotkań.</p><label class="adminWeekLabel">Nazwa kolejki<input id="weekTitle" maxlength="60" placeholder="np. Weekend 26–27 września"></label><label class="adminWeekLabel">🔥 HIT kolejki<select id="weekHit"></select></label><div class="adminWeekDuel"><label>⚔️ Typer 1<select id="weekDuelA"></select></label><label>⚔️ Typer 2<select id="weekDuelB"></select></label></div><button onclick="saveWeekFeature()">💾 Zapisz atrakcje kolejki</button><div id="weekAdminMsg" class="saved"></div>';
    const target=$('adminMatchesSection')||$('adminView'); target.prepend(p);
  }
}

async function loadWeekFeature(){
  ensureWeekUI();
  const{data,error}=await db.rpc('current_week_feature');
  if(error){
    if($('weekContent'))$('weekContent').innerHTML='<div class="panel warn">⚠️ Moduł kolejki wymaga uruchomienia pliku SQL z paczki.</div>';
    return;
  }
  weekFeature=Array.isArray(data)?data[0]:data;
  renderWeekFeature();
  if(isAdmin)renderWeekAdmin();
}

function renderWeekFeature(){
  const box=$('weekContent'); if(!box)return;
  const w=weekFeature;
  if(!w||!w.id){box.innerHTML='<div class="panel weekEmpty">🔥 Administrator jeszcze nie ustawił atrakcji tej kolejki.</div>';return}
  const hit=MATCHES.find(m=>m.id===w.hit_match_id), hr=hit?results[hit.id]:null;
  const hitScore=hr&&hr.status!=='scheduled'?`<strong>${hr.home_score??0} : ${hr.away_score??0}</strong>`:'<strong>VS</strong>';
  const a=w.duel_a_nickname||'Typer 1', b=w.duel_b_nickname||'Typer 2';
  const ap=Number(w.duel_a_points||0), bp=Number(w.duel_b_points||0);
  const duelState=Number(w.finished_matches||0)===0?'Pojedynek ruszy po zakończeniu pierwszego meczu':ap===bp?'Na razie remis':`${ap>bp?a:b} prowadzi`;
  const winner=w.winner_nickname?`<div class="summaryWinner"><span>👑 TYPER KOLEJKI</span><b>${esc(w.winner_nickname)}</b><small>${Number(w.winner_points||0)} pkt • 🎯 ${Number(w.winner_exact||0)} dokładnych</small></div>`:'<div class="summaryWinner waiting"><span>🏆 PODSUMOWANIE</span><b>Jeszcze gramy</b><small>Wyniki pojawią się po zakończeniu spotkań.</small></div>';
  box.innerHTML=`<div class="weekHit"><div class="weekTag">🔥 HIT KOLEJKI</div><div class="weekHitTeams"><span>${esc(hit?.home||'Nie wybrano')}</span>${hitScore}<span>${esc(hit?.away||'meczu')}</span></div>${hit?`<small>🗓 ${esc(hit.label)}</small>`:''}</div>
  <div class="weekDuelCard"><div class="weekTag">⚔️ POJEDYNEK TYGODNIA</div><div class="duelBoard"><div><b>${esc(a)}</b><strong>${ap}</strong><small>pkt</small></div><span>VS</span><div><b>${esc(b)}</b><strong>${bp}</strong><small>pkt</small></div></div><p>${esc(duelState)}</p></div>
  <div class="weekSummary"><div class="weekTag">🏆 PODSUMOWANIE KOLEJKI</div>${winner}<div class="summaryStats"><span><b>${Number(w.finished_matches||0)}</b><small>zakończonych meczów</small></span><span><b>${Number(w.total_picks||0)}</b><small>rozliczonych typów</small></span><span><b>${Number(w.exact_picks||0)}</b><small>dokładnych wyników</small></span></div></div>`;
}

function renderWeekAdmin(){
  ensureWeekUI(); if(!$('weekHit'))return;
  const matchOpts='<option value="">— wybierz mecz —</option>'+MATCHES.filter(m=>!m._archived).map(m=>`<option value="${esc(m.id)}">${esc(m.home)} — ${esc(m.away)} • ${esc(m.label)}</option>`).join('');
  $('weekHit').innerHTML=matchOpts;
  const users=adminUsersCache||[];
  const userOpts='<option value="">— wybierz typera —</option>'+users.map(r=>`<option value="${esc(r.user_id)}">${esc(r.nickname||r.email||'Użytkownik')}</option>`).join('');
  $('weekDuelA').innerHTML=userOpts; $('weekDuelB').innerHTML=userOpts;
  if(weekFeature){
    $('weekTitle').value=weekFeature.title||'';
    $('weekHit').value=weekFeature.hit_match_id||'';
    $('weekDuelA').value=weekFeature.duel_user_a||'';
    $('weekDuelB').value=weekFeature.duel_user_b||'';
  }
}

async function saveWeekFeature(){
  if(!isAdmin)return;
  const title=$('weekTitle').value.trim()||'Aktualna kolejka',hit=$('weekHit').value,a=$('weekDuelA').value,b=$('weekDuelB').value;
  if(!hit){alert('Wybierz HIT kolejki.');return}
  if(!a||!b){alert('Wybierz dwóch typerów do pojedynku.');return}
  if(a===b){alert('W pojedynku muszą być dwie różne osoby.');return}
  const ids=MATCHES.map(m=>m.id);
  const{error}=await db.rpc('admin_set_week_feature',{p_title:title,p_hit_match_id:hit,p_duel_user_a:a,p_duel_user_b:b,p_match_ids:ids});
  if(error){alert('Nie udało się zapisać: '+error.message);return}
  $('weekAdminMsg').textContent='✓ Atrakcje kolejki zapisane.';
  await loadWeekFeature();
}

const _oldLoadAdminUsers=loadAdminUsers;
loadAdminUsers=async function(){await _oldLoadAdminUsers(); if(isAdmin){ensureWeekUI();renderWeekAdmin();}};
const _oldEnter=enter;
enter=async function(u){await loadScheduleFromDb();await loadCustomMatches();await _oldEnter(u);ensureCustomMatchAdminUI();ensureWeekUI();await loadWeekFeature();};
const _oldShowTab=showTab;
showTab=async function(t){
  if(t!=='week')return _oldShowTab(t);
  ['matchesView','liveView','rankingView','chatView','notificationsView','adminView'].forEach(id=>$(id)?.classList.add('hidden'));
  ['tabMatches','tabLive','tabRanking','tabChat','tabNotifications','tabAdmin'].forEach(id=>$(id)?.classList.remove('active'));
  ensureWeekUI();$('weekView').classList.remove('hidden');$('tabWeek')?.classList.add('active');
  await loadResults();await loadWeekFeature();
};

(function(){const s=document.createElement('style');s.textContent=`.goalEvents{margin:8px 0 12px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04)}.goalEvents div{display:grid;grid-template-columns:auto 1fr auto;gap:8px;padding:4px 0}.goalEvents small{opacity:.7}.goalAdmin{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1)}.goalAdd{display:grid;grid-template-columns:1fr 1fr 70px;gap:7px}.goalAdd button{grid-column:1/-1}.goalAdminList>div{display:flex;justify-content:space-between;padding:7px 0}@media(max-width:600px){.goalAdd{grid-template-columns:1fr 80px}.goalAdd select{grid-column:1/-1}}`;document.head.appendChild(s)})();

(function(){const s=document.createElement('style');s.textContent=`
.onlineBadge{display:inline-flex;align-items:center;gap:6px;margin:6px 0 0;padding:6px 10px;border:1px solid rgba(63,214,111,.25);border-radius:999px;background:rgba(63,214,111,.08);font-size:13px}
.onlineBadge>span{width:9px;height:9px;border-radius:50%;background:#3fd66f;box-shadow:0 0 10px rgba(63,214,111,.7)}
.adminOnlinePanel{margin-bottom:16px}.adminOnlineHead{display:flex;align-items:center;justify-content:space-between;gap:12px}
.adminOnlineHead h3{margin:3px 0 10px}.adminOnlineHead>strong{font-size:28px}
.onlineUserRow{display:flex;align-items:center;gap:8px;padding:9px 0;border-top:1px solid rgba(255,255,255,.08)}
`;document.head.appendChild(s)})();
