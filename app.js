const U='https://kfysmqwhpzemoknqakzn.supabase.co',K='sb_publishable_UNdKtQ2mCMaaWcMK0FvVIA_r8cNIUl-';const db=supabase.createClient(U,K);const $=id=>document.getElementById(id);let user=null,picks={},filter='all',profile=null,isAdmin=false,results={};const names={okregowa:'Liga Okręgowa Skoczów–Żywiec • kolejka 8',a:'A Klasa Żywiec • kolejka 7',b:'B Klasa Żywiec • kolejka 7'};async function login(){message.textContent='Logowanie...';const{data,error}=await db.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error){message.textContent='❌ '+error.message;return}await enter(data.user)}async function register(){
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
async function logout(){await db.auth.signOut();location.reload()}async function loadProfile(){const{data,error}=await db.from('profiles').select('id,nickname,avatar,favorite_club').eq('id',user.id).maybeSingle();profile=data||null;const nick=profile?.nickname||user.user_metadata?.nickname||user.email;if($('nicknameBox'))$('nicknameBox').classList.add('hidden');$('userInfo').innerHTML=`<button class="profileLink" onclick="showMyProfile()">${esc(profile?.avatar||'👤')} ${esc(nick)}</button>`}async function saveNickname(){const n=$('nickname').value.trim();if(n.length<2){$('nickMsg').textContent='Nick musi mieć co najmniej 2 znaki.';return}const{error}=await db.from('profiles').upsert({id:user.id,nickname:n});if(error){$('nickMsg').textContent=error.code==='23505'?'Ten nick jest już zajęty.':'❌ '+error.message;return}$('nickMsg').textContent='';await loadProfile();await loadRanking()}function locked(m){return m.kickoff&&Date.now()>=new Date(m.kickoff).getTime()}async function enter(u){user=u;const nickOk=await ensureNickname(u);if(!nickOk)return;$('auth').classList.add('hidden');$('app').classList.remove('hidden');await loadProfile();await loadPicks();await loadResults();await checkAdmin();await loadNotifications();render()}async function loadPicks(){const{data,error}=await db.from('picks').select('match_id,home_score,away_score').eq('user_id',user.id);if(error){$('status').innerHTML='<div class="warn">⚠️ Nie udało się pobrać typów.</div>';return}picks={};(data||[]).forEach(p=>picks[p.match_id]=p)}async function savePick(id){const m=MATCHES.find(x=>x.id===id);if(locked(m))return;const h=Number($('h-'+id).value),a=Number($('a-'+id).value);if(!Number.isInteger(h)||!Number.isInteger(a)||h<0||a<0){alert('Wpisz oba wyniki jako liczby 0 lub większe.');return}const{error}=await db.from('picks').upsert({user_id:user.id,match_id:id,home_score:h,away_score:a},{onConflict:'user_id,match_id'});if(error){alert('Nie udało się zapisać: '+error.message);return}picks[id]={match_id:id,home_score:h,away_score:a};render()}function resultBadge(m){const r=results[m.id];if(!r||r.status==='scheduled')return '';if(r.status==='live')return `<div class="resultline live"><span>🔴 NA ŻYWO${r.minute?` • ${r.minute}'`:''}</span><b>${r.home_score??0} : ${r.away_score??0}</b></div>`;if(r.status==='finished')return `<div class="resultline finished"><span>KONIEC</span><b>${r.home_score} : ${r.away_score}</b></div>`;return ''}
function card(m){const p=picks[m.id],isLocked=locked(m),disabled=isLocked?'disabled':'';return `<div class="match">${resultBadge(m)}<div class="teams">${m.home}<br><span class="versus">—</span> ${m.away}</div><div class="date">🗓 ${m.label}</div><div class="score"><input id="h-${m.id}" type="number" min="0" inputmode="numeric" value="${p?.home_score??''}" ${disabled}><span>:</span><input id="a-${m.id}" type="number" min="0" inputmode="numeric" value="${p?.away_score??''}" ${disabled}><button class="save" onclick="savePick('${m.id}')" ${disabled}>Zapisz</button></div>${isLocked?'<div class="locked">🔒 Typowanie zamknięte</div>':p?'<div class="saved">✓ Typ zapisany online</div>':''}</div>`}
async function loadResults(){const{data,error}=await db.from('match_results').select('match_id,home_score,away_score,status,minute,updated_at');if(error)return;results={};(data||[]).forEach(r=>results[r.match_id]=r)}
function renderLive(){const active=MATCHES.filter(m=>results[m.id]?.status==='live');const finished=MATCHES.filter(m=>results[m.id]?.status==='finished');let html='';if(active.length){html+=active.map(m=>{const r=results[m.id];const p=picks[m.id];return `<div class="livecard"><div class="liveMeta"><span class="livePill">● LIVE${r.minute?` • ${r.minute}'`:''}</span><span>${m.label}</span></div><div class="liveTeams"><span>${m.home}</span><b>${r.home_score??0} : ${r.away_score??0}</b><span>${m.away}</span></div>${p?`<div class="yourPick">Twój typ: <b>${p.home_score} : ${p.away_score}</b></div>`:''}</div>`}).join('')}else html+='<div class="emptyLive">Teraz nie trwa żaden mecz.</div>';if(finished.length){html+='<h3 class="recentTitle">Ostatnio zakończone</h3>'+finished.slice(0,6).map(m=>{const r=results[m.id];return `<div class="finishedRow"><span>${m.home} – ${m.away}</span><b>${r.home_score} : ${r.away_score}</b></div>`}).join('')}$('liveMatches').innerHTML=html}function render(){let html='';['okregowa','a','b'].forEach(l=>{if(filter!=='all'&&filter!==l)return;const ms=MATCHES.filter(m=>m.league===l);if(ms.length)html+=`<h3 class="league">${names[l]}</h3>`+ms.map(card).join('')});$('matches').innerHTML=html}
async function checkAdmin(){
  const{data,error}=await db.rpc('is_admin');
  isAdmin=!error&&data===true;
  $('tabAdmin').classList.toggle('hidden',!isAdmin);
}
async function loadAdmin(){
  if(!isAdmin)return;
  await loadResults();
  $('adminMatches').innerHTML=MATCHES.map(m=>{
    const r=results[m.id]||{status:'scheduled'};
    return `<div class="adminmatch"><div class="adminteams">${m.home}<br>— ${m.away}</div><div class="date">${m.label}</div><div class="adminstatus"><select id="rs-${m.id}"><option value="scheduled" ${r.status==='scheduled'?'selected':''}>Przed meczem</option><option value="live" ${r.status==='live'?'selected':''}>🔴 Na żywo</option><option value="finished" ${r.status==='finished'?'selected':''}>Koniec</option></select><input id="rm-${m.id}" class="minute" type="number" min="1" max="130" inputmode="numeric" placeholder="min" value="${r.minute??''}"></div><div class="adminscore"><input id="rh-${m.id}" type="number" min="0" inputmode="numeric" value="${r.home_score??''}"><span>:</span><input id="ra-${m.id}" type="number" min="0" inputmode="numeric" value="${r.away_score??''}"><button onclick="saveResult('${m.id}')">Zapisz</button></div></div>`;
  }).join('');
}
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
  const rows=data||[];
  $('adminUsers').innerHTML=rows.length?rows.map(r=>{
    const finished=r.finished_count??r.finished_picks??0;
    const rank=autoRank(r.points,r.exact_scores,finished);
    const points=r.points??0, exact=r.exact_scores??0, count=r.picks_count??0;
    const mine=r.user_id===user.id;
    return `<div class="usercard"><div class="usercardTop"><div><b>${esc(r.nickname||'Bez nicku')}</b><small>${esc(r.email||'')}</small></div><span class="badge">${esc(rank)}</span></div><div class="userstats"><span>${points} pkt</span><span>🎯 ${exact}</span><span>${finished} rozliczonych</span><span>${count} typów</span></div><button onclick="adminUserPicks('${r.user_id}','${esc(r.nickname||r.email||'Użytkownik')}')">📊 Typy</button><button onclick="adminEditUser('${r.user_id}','${esc(r.nickname||'')}')">✏️ Edytuj użytkownika</button>${mine?'<small class="muted">Konto administratora</small>':`<button onclick="adminDeleteUser('${r.user_id}','${esc(r.email||r.nickname||'użytkownika')}')">🗑 Usuń użytkownika</button>`}</div>`;
  }).join(''):'Brak użytkowników.';
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
  if(l){await loadResults();renderLive()}
  if(r)await loadRanking();
  if(c)await loadChat();
  if(n)await loadNotifications();
  if(a){await loadAdmin();await loadAdminUsers();}
}document.querySelectorAll('.filters button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;document.querySelectorAll('.filters button').forEach(x=>x.classList.toggle('active',x===b));render()});(async()=>{const{data}=await db.auth.getSession();if(data.session)await enter(data.session.user)})();setInterval(async()=>{if(!user)return;await loadResults();if(!$('matchesView').classList.contains('hidden'))render();if(!$('liveView').classList.contains('hidden'))renderLive();await loadNotifications();if(!$('chatView').classList.contains('hidden'))await loadChat()},10000);