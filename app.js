const U='https://kfysmqwhpzemoknqakzn.supabase.co',K='sb_publishable_UNdKtQ2mCMaaWcMK0FvVIA_r8cNIUl-';const db=supabase.createClient(U,K);const $=id=>document.getElementById(id);let user=null,picks={},filter='all',profile=null,isAdmin=false,results={};const names={okregowa:'Liga Okręgowa Skoczów–Żywiec • kolejka 8',a:'A Klasa Żywiec • kolejka 7',b:'B Klasa Żywiec • kolejka 7'};async function login(){message.textContent='Logowanie...';const{data,error}=await db.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error){message.textContent='❌ '+error.message;return}await enter(data.user)}async function register(){message.textContent='Tworzenie konta...';const{data,error}=await db.auth.signUp({email:email.value.trim(),password:password.value});if(error){message.textContent='❌ '+error.message;return}if(data.session)await enter(data.user);else message.textContent='✅ Konto utworzone. Sprawdź e-mail i potwierdź rejestrację.'}async function logout(){await db.auth.signOut();location.reload()}async function loadProfile(){const{data}=await db.from('profiles').select('id,nickname').eq('id',user.id).maybeSingle();profile=data||null;$('nicknameBox').classList.toggle('hidden',!!profile);$('userInfo').textContent='👤 '+(profile?.nickname||user.email)}async function saveNickname(){const n=$('nickname').value.trim();if(n.length<2){$('nickMsg').textContent='Nick musi mieć co najmniej 2 znaki.';return}const{error}=await db.from('profiles').upsert({id:user.id,nickname:n});if(error){$('nickMsg').textContent=error.code==='23505'?'Ten nick jest już zajęty.':'❌ '+error.message;return}$('nickMsg').textContent='';await loadProfile();await loadRanking()}function locked(m){return m.kickoff&&Date.now()>=new Date(m.kickoff).getTime()}async function enter(u){user=u;$('auth').classList.add('hidden');$('app').classList.remove('hidden');await loadProfile();await loadPicks();await loadResults();await checkAdmin();render()}async function loadPicks(){const{data,error}=await db.from('picks').select('match_id,home_score,away_score').eq('user_id',user.id);if(error){$('status').innerHTML='<div class="warn">⚠️ Nie udało się pobrać typów.</div>';return}picks={};(data||[]).forEach(p=>picks[p.match_id]=p)}async function savePick(id){const m=MATCHES.find(x=>x.id===id);if(locked(m))return;const h=Number($('h-'+id).value),a=Number($('a-'+id).value);if(!Number.isInteger(h)||!Number.isInteger(a)||h<0||a<0){alert('Wpisz oba wyniki jako liczby 0 lub większe.');return}const{error}=await db.from('picks').upsert({user_id:user.id,match_id:id,home_score:h,away_score:a},{onConflict:'user_id,match_id'});if(error){alert('Nie udało się zapisać: '+error.message);return}picks[id]={match_id:id,home_score:h,away_score:a};render()}function resultBadge(m){const r=results[m.id];if(!r||r.status==='scheduled')return '';if(r.status==='live')return `<div class="resultline live"><span>🔴 NA ŻYWO${r.minute?` • ${r.minute}'`:''}</span><b>${r.home_score??0} : ${r.away_score??0}</b></div>`;if(r.status==='finished')return `<div class="resultline finished"><span>KONIEC</span><b>${r.home_score} : ${r.away_score}</b></div>`;return ''}
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
    return `<div class="usercard"><div class="usercardTop"><div><b>${esc(r.nickname||'Bez nicku')}</b><small>${esc(r.email||'')}</small></div><span class="badge">${esc(rank)}</span></div><div class="userstats"><span>${points} pkt</span><span>🎯 ${exact}</span><span>${finished} rozliczonych</span><span>${count} typów</span></div><button onclick="adminUserPicks('${r.user_id}','${esc(r.nickname||r.email||'Użytkownik')}')">📊 Typy</button>${mine?'<small class="muted">Konto administratora</small>':`<button onclick="adminDeleteUser('${r.user_id}','${esc(r.email||r.nickname||'użytkownika')}')">🗑 Usuń użytkownika</button>`}</div>`;
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

async function adminDeleteUser(id,label){
  if(!confirm(`Usunąć konto ${label}? Tej operacji nie można cofnąć.`))return;
  const{error}=await db.rpc('admin_delete_user',{p_user_id:id});
  if(error){alert('Nie udało się usunąć użytkownika: '+error.message);return}
  alert('Użytkownik został usunięty.');
  await loadAdminUsers();
  await loadRanking();
}

async function loadRanking(){const{data,error}=await db.rpc('full_ranking');if(error){$('ranking').textContent='Nie udało się pobrać rankingu.';return}const rows=data||[];$('ranking').innerHTML='<div class="rankrow rankhead"><span>#</span><span>Gracz</span><span class="rankcount">Pkt</span></div>'+rows.map((r,i)=>`<div class="rankrow"><span class="ranknum">${i+1}</span><span>${esc(r.nickname||'Bez nicku')} <span class="rankbadge">${esc(autoRank(r.points,r.exact_scores,r.finished_count??r.finished_picks??0))}</span><small style="display:block;color:#9fc7bb">🎯 ${r.exact_scores} • typy ${r.picks_count}</small></span><span class="rankcount"><b>${r.points}</b></span></div>`).join('')}async function showTab(t){
  const m=t==='matches',l=t==='live',r=t==='ranking',a=t==='admin';
  $('matchesView').classList.toggle('hidden',!m);
  $('liveView').classList.toggle('hidden',!l);
  $('rankingView').classList.toggle('hidden',!r);
  $('adminView').classList.toggle('hidden',!a);
  $('tabMatches').classList.toggle('active',m);
  $('tabLive').classList.toggle('active',l);
  $('tabRanking').classList.toggle('active',r);
  $('tabAdmin').classList.toggle('active',a);
  if(l){await loadResults();renderLive()}
  if(r)await loadRanking();
  if(a){await loadAdmin();await loadAdminUsers();}
}document.querySelectorAll('.filters button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;document.querySelectorAll('.filters button').forEach(x=>x.classList.toggle('active',x===b));render()});(async()=>{const{data}=await db.auth.getSession();if(data.session)await enter(data.session.user)})();setInterval(async()=>{if(!user)return;await loadResults();if(!$('matchesView').classList.contains('hidden'))render();if(!$('liveView').classList.contains('hidden'))renderLive()},10000);