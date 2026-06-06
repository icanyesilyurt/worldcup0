const hdr=document.getElementById('hdr'),hbg=document.getElementById('hbg'),mob=document.getElementById('mobnav');
const showAllMatchesBtn=document.getElementById('showAllMatches');

function showAuthMessage(message){
  const box=document.getElementById('authMessage');
  if(!box) return;
  box.textContent=message;
  box.hidden=!message;
}

function formatAuthError(error){
  const message=error?.message || String(error || 'Bir hata oluştu.');
  const lower=message.toLowerCase();
  if(lower.includes('email not confirmed')){
    return 'E-posta doğrulaması gerekiyor. Supabase ayarlarından email confirmation kapatılabilir.';
  }
  if(lower.includes('rate') || lower.includes('security') || lower.includes('too many') || lower.includes('after')){
    return 'Çok kısa sürede tekrar denedin. Lütfen biraz bekleyip yeniden dene.';
  }
  return message;
}

function getSupabaseClient(){
  if(!window.supabaseClient){
    showAuthMessage('Supabase bağlantısı için js/supabase.js içindeki SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini doldur.');
    return null;
  }
  return window.supabaseClient;
}

function generatePlayerName(){
  return 'Oyuncu#'+Math.floor(100000+Math.random()*900000);
}

function generateReferralCode(){
  return 'WCA'+Math.floor(100000+Math.random()*900000);
}

function showAuthTab(tab){
  const loginForm=document.getElementById('loginForm');
  const signupForm=document.getElementById('signupForm');
  const loginTab=document.getElementById('loginTab');
  const signupTab=document.getElementById('signupTab');
  if(!loginForm || !signupForm) return;
  const isSignup=tab==='signup';
  loginForm.hidden=isSignup;
  signupForm.hidden=!isSignup;
  loginTab?.classList.toggle('btn-p',!isSignup);
  loginTab?.classList.toggle('btn-o',isSignup);
  signupTab?.classList.toggle('btn-p',isSignup);
  signupTab?.classList.toggle('btn-o',!isSignup);
}

function openAuthModal(tab='login'){
  const modal=document.getElementById('authModal');
  if(!modal){window.location.href='index.html#'+tab;return;}
  showAuthMessage('');
  showAuthTab(tab);
  modal.hidden=false;
  document.body.classList.add('modal-open');
}

function closeAuthModal(){
  const modal=document.getElementById('authModal');
  if(!modal) return;
  modal.hidden=true;
  document.body.classList.remove('modal-open');
}

async function getCurrentUser(){
  const client=getSupabaseClient();
  if(!client) return null;
  const {data,error}=await client.auth.getUser();
  if(error) return null;
  return data.user || null;
}

function handlePredictionStart(event){
  event?.preventDefault();
  getCurrentUser().then(user=>{
    if(user){window.location.href='predictions.html';return;}
    openAuthModal('login');
  });
  return false;
}

async function loadProfileForUser(user){
  const client=getSupabaseClient();
  if(!client || !user) return null;
  let {data:profile,error}=await client.from('profiles').select('*').eq('id',user.id).single();
  if(error || !profile){
    const country=user.user_metadata?.country || 'Türkiye';
    const insertProfile={
      id:user.id,
      email:user.email,
      display_name:generatePlayerName(),
      country,
      premium:false,
      total_points:0,
      referral_code:generateReferralCode(),
      referred_by:null,
      created_at:new Date().toISOString()
    };
    const {data:newProfile,error:insertError}=await client.from('profiles').insert(insertProfile).select('*').single();
    if(insertError){showAuthMessage(insertError.message);return null;}
    profile=newProfile;
  }
  return profile;
}

function fillProfileFields(profile,user){
  document.getElementById('profileDisplayName') && (document.getElementById('profileDisplayName').textContent=profile.display_name || 'Oyuncu');
  document.getElementById('profileName') && (document.getElementById('profileName').textContent=profile.display_name || 'Oyuncu');
  document.getElementById('profileEmail') && (document.getElementById('profileEmail').textContent=user.email || profile.email || '-');
  document.getElementById('profileCountry') && (document.getElementById('profileCountry').textContent=profile.country || '-');
  document.getElementById('profileCountryTop') && (document.getElementById('profileCountryTop').textContent=profile.country || '-');
  document.getElementById('profilePoints') && (document.getElementById('profilePoints').textContent=profile.total_points ?? 0);
  document.getElementById('profileReferral') && (document.getElementById('profileReferral').textContent=profile.referral_code || '-');
}

function showTournamentPredictionMessage(message){
  const box=document.getElementById('tournamentPredictionMessage');
  if(!box) return;
  box.textContent=message;
  box.hidden=!message;
}

function setSelectValue(id,value){
  const select=document.getElementById(id);
  if(!select || !value) return;
  const option=[...select.options].find(item=>item.value===value || item.textContent===value);
  if(option) select.value=option.value;
}

function setTournamentPredictionLocked(isLocked){
  ['champion','finalist_1','finalist_2','top_scorer','top_assist','player_of_tournament'].forEach(id=>{
    const field=document.getElementById(id);
    if(field) field.disabled=isLocked;
  });
  const saveButton=document.getElementById('saveTournamentPredictions');
  if(saveButton){
    saveButton.disabled=isLocked;
    saveButton.hidden=isLocked;
  }
}

async function loadTournamentPredictions(){
  const saveButton=document.getElementById('saveTournamentPredictions');
  if(!saveButton) return;
  setTournamentPredictionLocked(false);
  const client=getSupabaseClient();
  if(!client) return;
  const user=await getCurrentUser();
  if(!user) return;
  const {data,error}=await client.from('tournament_predictions').select('champion,finalist_1,finalist_2,top_scorer,top_assist,player_of_tournament').eq('user_id',user.id).maybeSingle();
  if(error){showTournamentPredictionMessage(error.message);return;}
  if(!data) return;
  setSelectValue('champion',data.champion);
  setSelectValue('finalist_1',data.finalist_1);
  setSelectValue('finalist_2',data.finalist_2);
  setSelectValue('top_scorer',data.top_scorer);
  setSelectValue('top_assist',data.top_assist);
  setSelectValue('player_of_tournament',data.player_of_tournament);
  setTournamentPredictionLocked(true);
  showTournamentPredictionMessage('Turnuva tahminlerin kaydedildi. Bu tahminler artık değiştirilemez.');
}

async function saveTournamentPredictions(){
  const client=getSupabaseClient();
  if(!client) return;
  const user=await getCurrentUser();
  if(!user){
    showTournamentPredictionMessage('Tahmin yapmak için giriş yapmalısın.');
    setTimeout(()=>openAuthModal('login'),700);
    return;
  }

  const {data:existing,error:existingError}=await client.from('tournament_predictions').select('user_id').eq('user_id',user.id).maybeSingle();
  if(existingError){showTournamentPredictionMessage(existingError.message);return;}
  if(existing){
    setTournamentPredictionLocked(true);
    showTournamentPredictionMessage('Turnuva tahminlerini yalnızca bir kez yapabilirsin.');
    return;
  }

  const payload={
    user_id:user.id,
    champion:document.getElementById('champion')?.value,
    finalist_1:document.getElementById('finalist_1')?.value,
    finalist_2:document.getElementById('finalist_2')?.value,
    top_scorer:document.getElementById('top_scorer')?.value,
    top_assist:document.getElementById('top_assist')?.value,
    player_of_tournament:document.getElementById('player_of_tournament')?.value
  };

  const {error}=await client.from('tournament_predictions').insert(payload);
  if(error){
    const lower=(error.message || '').toLowerCase();
    if(lower.includes('duplicate') || lower.includes('unique')){
      setTournamentPredictionLocked(true);
      showTournamentPredictionMessage('Turnuva tahminlerini yalnızca bir kez yapabilirsin.');
      return;
    }
    showTournamentPredictionMessage(error.message);
    return;
  }
  setTournamentPredictionLocked(true);
  showTournamentPredictionMessage('Turnuva tahminlerin kaydedildi. Bu tahminler artık değiştirilemez.');
}
function showMatchPredictionMessage(message){
  const box=document.getElementById('matchPredictionMessage');
  if(!box) return;
  box.textContent=message;
  box.hidden=!message;
}

function lockMatchCard(card,homeScore,awayScore,message='Tahmin kaydedildi, değiştirilemez.'){
  const homeInput=card.querySelector('[data-role="home-score"]');
  const awayInput=card.querySelector('[data-role="away-score"]');
  const saveButton=card.querySelector('[data-role="save-match"]');
  const messageBox=card.querySelector('[data-role="match-message"]');
  if(homeInput){homeInput.value=homeScore;homeInput.disabled=true;}
  if(awayInput){awayInput.value=awayScore;awayInput.disabled=true;}
  if(saveButton){saveButton.disabled=true;saveButton.hidden=true;}
  if(messageBox){messageBox.textContent=message;messageBox.hidden=false;}
}

function createMatchCard(match,index,prediction){
  const card=document.createElement('div');
  card.className='rank-panel'+(index>=12?' extra-match':'');
  card.style.padding='18px';
  if(index>=12) card.hidden=true;
  card.dataset.matchId=match.id;

  const meta=document.createElement('p');
  meta.className='slabel';
  meta.textContent='Maç '+match.match_no+' · '+(match.match_date || '-')+' · '+(match.match_time || '-');
  card.appendChild(meta);

  const group=document.createElement('h3');
  group.className='hc-t';
  group.textContent=match.group_name || '-';
  card.appendChild(group);

  const teams=document.createElement('div');
  teams.className='rrow';
  teams.style.padding='12px 0';
  const home=document.createElement('span');
  home.className='rname';
  home.textContent=match.team_home || '-';
  const vs=document.createElement('span');
  vs.className='rval';
  vs.textContent='vs';
  const away=document.createElement('span');
  away.className='rname';
  away.style.textAlign='right';
  away.textContent=match.team_away || '-';
  teams.append(home,vs,away);
  card.appendChild(teams);

  const inputs=document.createElement('div');
  inputs.style.display='flex';
  inputs.style.gap='10px';
  inputs.style.marginTop='12px';
  const homeInput=document.createElement('input');
  homeInput.type='number';
  homeInput.min='0';
  homeInput.placeholder=(match.team_home || 'Takım 1')+' gol';
  homeInput.dataset.role='home-score';
  homeInput.style.cssText='width:100%;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-raised);color:var(--t1)';
  const awayInput=document.createElement('input');
  awayInput.type='number';
  awayInput.min='0';
  awayInput.placeholder=(match.team_away || 'Takım 2')+' gol';
  awayInput.dataset.role='away-score';
  awayInput.style.cssText='width:100%;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-raised);color:var(--t1)';
  inputs.append(homeInput,awayInput);
  card.appendChild(inputs);

  const message=document.createElement('div');
  message.className='hc-d';
  message.dataset.role='match-message';
  message.style.marginTop='12px';
  message.hidden=true;
  card.appendChild(message);

  const button=document.createElement('button');
  button.className='btn btn-o';
  button.type='button';
  button.dataset.role='save-match';
  button.style.marginTop='14px';
  button.textContent='Tahmini Kaydet';
  button.addEventListener('click',()=>saveMatchPrediction(match.id,card));
  card.appendChild(button);

  if(prediction){
    lockMatchCard(card,prediction.predicted_home_score,prediction.predicted_away_score);
  }
  return card;
}

async function loadMatches(){
  const list=document.getElementById('matchesList');
  if(!list) return;
  const client=getSupabaseClient();
  if(!client) return;
  showMatchPredictionMessage('');
  const {data:matches,error}=await client.from('matches').select('id,match_no,match_date,match_time,group_name,team_home,team_away,status').order('match_no',{ascending:true});
  if(error){showMatchPredictionMessage(error.message);return;}

  const user=await getCurrentUser();
  let predictionMap=new Map();
  if(user){
    const {data:predictions,error:predictionError}=await client.from('match_predictions').select('match_id,predicted_home_score,predicted_away_score').eq('user_id',user.id);
    if(predictionError){showMatchPredictionMessage(predictionError.message);return;}
    predictionMap=new Map((predictions || []).map(item=>[item.match_id,item]));
  }

  list.innerHTML='';
  (matches || []).forEach((match,index)=>{
    list.appendChild(createMatchCard(match,index,predictionMap.get(match.id)));
  });

  const showAllButton=document.getElementById('showAllMatches');
  if(showAllButton){
    showAllButton.hidden=(matches || []).length<=12;
  }
}

async function saveMatchPrediction(matchId,card){
  const client=getSupabaseClient();
  if(!client) return;
  const user=await getCurrentUser();
  const messageBox=card.querySelector('[data-role="match-message"]');
  if(!user){
    if(messageBox){messageBox.textContent='Tahmin yapmak için giriş yapmalısın.';messageBox.hidden=false;}
    showMatchPredictionMessage('Tahmin yapmak için giriş yapmalısın.');
    return;
  }

  const homeInput=card.querySelector('[data-role="home-score"]');
  const awayInput=card.querySelector('[data-role="away-score"]');
  const homeScore=homeInput?.value;
  const awayScore=awayInput?.value;
  if(homeScore==='' || awayScore===''){
    if(messageBox){messageBox.textContent='Lütfen iki takım için de skor gir.';messageBox.hidden=false;}
    return;
  }

  const payload={
    user_id:user.id,
    match_id:matchId,
    predicted_home_score:Number(homeScore),
    predicted_away_score:Number(awayScore)
  };
  const {error}=await client.from('match_predictions').insert(payload);
  if(error){
    const lower=(error.message || '').toLowerCase();
    if(lower.includes('duplicate') || lower.includes('unique')){
      lockMatchCard(card,homeScore,awayScore);
      return;
    }
    if(messageBox){messageBox.textContent=error.message;messageBox.hidden=false;}
    return;
  }
  lockMatchCard(card,homeScore,awayScore);
}
const ADMIN_EMAIL='ican.yslyrt@gmail.com';

function showAdminMessage(message){
  const box=document.getElementById('adminAccessMessage');
  if(!box) return;
  box.innerHTML=message;
  box.hidden=!message;
}

const adminDebugLines=[];

function writeAdminDebug(message){
  const box=document.getElementById('adminDebug');
  if(!box) return;
  adminDebugLines.push(message);
  box.textContent=adminDebugLines.join('\n');
  box.hidden=false;
}

function clearAdminDebug(){
  adminDebugLines.length=0;
  const box=document.getElementById('adminDebug');
  if(box){box.textContent='';box.hidden=true;}
}

function normalizeEmail(email){
  return (email || '').trim().toLowerCase();
}

function setAdminView(isAdmin){
  const loginPanel=document.getElementById('adminLoginPanel');
  const adminPanel=document.getElementById('adminPanel');
  if(loginPanel) loginPanel.hidden=isAdmin;
  if(adminPanel) adminPanel.hidden=!isAdmin;
}

function showAdminDenied(email){
  setAdminView(false);
  showAdminMessage('Bu sayfaya erişim yetkin yok. Giriş yapılan e-posta: '+email);
}

function createAdminMatchCard(match){
  const card=document.createElement('div');
  card.className='rank-panel feat';
  card.style.padding='18px';
  card.dataset.matchId=match.id;

  const meta=document.createElement('p');
  meta.className='slabel';
  meta.textContent='Maç '+match.match_no+' · '+(match.match_date || '-')+' · '+(match.match_time || '-');
  card.appendChild(meta);

  const group=document.createElement('h3');
  group.className='hc-t';
  group.textContent=match.group_name || '-';
  card.appendChild(group);

  const teams=document.createElement('div');
  teams.className='rrow';
  teams.style.padding='12px 0';
  const home=document.createElement('span');
  home.className='rname';
  home.textContent=match.team_home || '-';
  const vs=document.createElement('span');
  vs.className='rval';
  vs.textContent='vs';
  const away=document.createElement('span');
  away.className='rname';
  away.style.textAlign='right';
  away.textContent=match.team_away || '-';
  teams.append(home,vs,away);
  card.appendChild(teams);

  const status=document.createElement('div');
  status.className='hc-d';
  status.dataset.role='admin-status';
  status.style.marginTop='10px';
  status.textContent='Durum: '+(match.status || '-');
  card.appendChild(status);

  const inputs=document.createElement('div');
  inputs.style.display='flex';
  inputs.style.gap='10px';
  inputs.style.marginTop='14px';
  const homeInput=document.createElement('input');
  homeInput.type='number';
  homeInput.min='0';
  homeInput.placeholder=(match.team_home || 'Ev sahibi')+' skor';
  homeInput.value=match.home_score ?? '';
  homeInput.dataset.role='admin-home-score';
  homeInput.style.cssText='width:100%;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-raised);color:var(--t1)';
  const awayInput=document.createElement('input');
  awayInput.type='number';
  awayInput.min='0';
  awayInput.placeholder=(match.team_away || 'Deplasman')+' skor';
  awayInput.value=match.away_score ?? '';
  awayInput.dataset.role='admin-away-score';
  awayInput.style.cssText='width:100%;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-raised);color:var(--t1)';
  inputs.append(homeInput,awayInput);
  card.appendChild(inputs);

  const message=document.createElement('div');
  message.className='hc-d';
  message.dataset.role='admin-match-message';
  message.style.marginTop='12px';
  message.hidden=true;
  card.appendChild(message);

  const button=document.createElement('button');
  button.className='btn btn-p';
  button.type='button';
  button.style.marginTop='14px';
  button.dataset.role='admin-save-result';
  button.textContent=match.status==='finished'?'Sonucu Güncelle':'Sonucu Kaydet';
  button.addEventListener('click',()=>saveAdminMatchResult(match.id,card));
  card.appendChild(button);
  return card;
}

async function renderAdminPanel(){
  const list=document.getElementById('adminMatchesList');
  if(!list) return;
  const client=getSupabaseClient();
  if(!client) return;
  setAdminView(true);
  showAdminMessage('');
  const {data:matches,error}=await client.from('matches').select('id,match_no,match_date,match_time,group_name,team_home,team_away,status,home_score,away_score').order('match_no',{ascending:true});
  if(error){showAdminMessage(error.message);return;}
  list.innerHTML='';
  (matches || []).forEach(match=>list.appendChild(createAdminMatchCard(match)));
}

async function loadAdminPanel(){
  const list=document.getElementById('adminMatchesList');
  if(!list) return;
  setAdminView(false);
  clearAdminDebug();
  const client=getSupabaseClient();
  if(!client) return;
  const {data,error}=await client.auth.getSession();
  if(error){
    writeAdminDebug('Supabase hata mesajı: '+error.message);
    showAdminMessage(error.message);
    return;
  }
  const user=data.session?.user || null;
  if(!user){
    writeAdminDebug('Oturum yok');
    showAdminMessage('');
    return;
  }
  const email=normalizeEmail(user.email);
  writeAdminDebug('Oturum var');
  writeAdminDebug('Giriş yapılan email: '+email);
  if(email!==ADMIN_EMAIL){
    showAdminDenied(email);
    return;
  }
  await renderAdminPanel();
}

async function adminLogin(){
  const client=getSupabaseClient();
  if(!client) return;
  clearAdminDebug();
  writeAdminDebug('Giriş denemesi yapıldı');
  const email=document.getElementById('adminEmail')?.value.trim();
  const password=document.getElementById('adminPassword')?.value;
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error){
    writeAdminDebug('Giriş başarısız');
    writeAdminDebug('Supabase hata mesajı: '+error.message);
    showAdminMessage(error.message);
    return;
  }
  writeAdminDebug('Giriş başarılı');
  const signedEmail=normalizeEmail(data.user?.email);
  writeAdminDebug('Giriş yapılan email: '+signedEmail);
  if(signedEmail!==ADMIN_EMAIL){
    showAdminDenied(signedEmail);
    return;
  }
  await updateHeaderAuthState();
  await renderAdminPanel();
}

async function saveAdminMatchResult(matchId,card){
  const client=getSupabaseClient();
  if(!client) return;
  const user=await getCurrentUser();
  if(!user){setAdminView(false);showAdminMessage('Admin girişi yapmalısın.');return;}
  const email=normalizeEmail(user.email);
  if(email!==ADMIN_EMAIL){showAdminDenied(email);return;}

  const homeInput=card.querySelector('[data-role="admin-home-score"]');
  const awayInput=card.querySelector('[data-role="admin-away-score"]');
  const message=card.querySelector('[data-role="admin-match-message"]');
  const status=card.querySelector('[data-role="admin-status"]');
  const button=card.querySelector('[data-role="admin-save-result"]');
  if(homeInput.value==='' || awayInput.value===''){
    if(message){message.textContent='Lütfen iki takımın skorunu da gir.';message.hidden=false;}
    return;
  }

  const {error}=await client.from('matches').update({
    home_score:Number(homeInput.value),
    away_score:Number(awayInput.value),
    status:'finished'
  }).eq('id',matchId);
  if(error){if(message){message.textContent=error.message;message.hidden=false;}return;}
  if(status) status.textContent='Durum: finished';
  if(button) button.textContent='Sonucu Güncelle';
  if(message){message.textContent='Sonuç kaydedildi.';message.hidden=false;}
}
async function signUpUser(){
  const client=getSupabaseClient();
  if(!client) return;
  const email=document.getElementById('signupEmail')?.value.trim();
  const password=document.getElementById('signupPassword')?.value;
  const country=document.getElementById('signupCountry')?.value;
  const displayName=generatePlayerName();

  const {data,error}=await client.auth.signUp({
    email,
    password,
    options:{data:{country}}
  });
  if(error){showAuthMessage(formatAuthError(error));return;}

  const user=data.user;
  if(user){
    const {error:profileError}=await client.from('profiles').upsert({
      id:user.id,
      email:user.email,
      display_name:displayName,
      country,
      premium:false,
      total_points:0,
      referral_code:generateReferralCode(),
      referred_by:null,
      created_at:new Date().toISOString()
    });
    if(profileError){showAuthMessage(profileError.message);return;}
  }

  showAuthMessage('');
  closeAuthModal();
  await updateHeaderAuthState();
  window.location.href='profile.html';
}

async function loginUser(){
  const client=getSupabaseClient();
  if(!client) return;
  const email=document.getElementById('loginEmail')?.value.trim();
  const password=document.getElementById('loginPassword')?.value;
  const {error}=await client.auth.signInWithPassword({email,password});
  if(error){showAuthMessage(formatAuthError(error));return;}
  showAuthMessage('');
  closeAuthModal();
  await updateHeaderAuthState();
  window.location.href='profile.html';
}

async function logoutUser(){
  const client=getSupabaseClient();
  if(client){await client.auth.signOut();}
  window.location.href='index.html';
}

async function createOrLoadProfile(){
  const loggedOut=document.getElementById('loggedOutProfile');
  const loggedIn=document.getElementById('loggedInProfile');

  const client=getSupabaseClient();
  if(!client){
    if(loggedOut) loggedOut.hidden=false;
    if(loggedIn) loggedIn.hidden=true;
    return;
  }

  const user=await getCurrentUser();
  if(!user){
    if(loggedOut) loggedOut.hidden=false;
    if(loggedIn) loggedIn.hidden=true;
    return;
  }

  const profile=await loadProfileForUser(user);
  if(!profile) return;

  if(loggedOut) loggedOut.hidden=true;
  if(loggedIn) loggedIn.hidden=false;
  fillProfileFields(profile,user);
}

async function updateHeaderAuthState(){
  const user=await getCurrentUser();
  document.querySelectorAll('.auth-logged-out').forEach(el=>el.hidden=!!user);
  document.querySelectorAll('.auth-logged-in').forEach(el=>el.hidden=!user);
}

window.signUpUser=signUpUser;
window.loginUser=loginUser;
window.logoutUser=logoutUser;
window.getCurrentUser=getCurrentUser;
window.createOrLoadProfile=createOrLoadProfile;
window.updateHeaderAuthState=updateHeaderAuthState;
window.showAuthTab=showAuthTab;
window.openAuthModal=openAuthModal;
window.closeAuthModal=closeAuthModal;
window.handlePredictionStart=handlePredictionStart;
window.saveTournamentPredictions=saveTournamentPredictions;
window.loadTournamentPredictions=loadTournamentPredictions;
window.loadMatches=loadMatches;
window.saveMatchPrediction=saveMatchPrediction;
window.loadAdminPanel=loadAdminPanel;
window.saveAdminMatchResult=saveAdminMatchResult;
window.adminLogin=adminLogin;

window.addEventListener('scroll',()=>hdr.classList.toggle('sc',window.scrollY>40),{passive:true});
hbg.addEventListener('click',e=>{e.stopPropagation();const o=mob.classList.toggle('o');hbg.classList.toggle('o',o)});
document.addEventListener('click',()=>{mob.classList.remove('o');hbg.classList.remove('o')});
mob.addEventListener('click',e=>e.stopPropagation());
mob.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mob.classList.remove('o');hbg.classList.remove('o')}));
if(showAllMatchesBtn){
  showAllMatchesBtn.addEventListener('click',()=>{
    document.querySelectorAll('.extra-match').forEach(match=>match.hidden=false);
    showAllMatchesBtn.hidden=true;
  });
}

document.getElementById('signupForm')?.addEventListener('submit',e=>{e.preventDefault();signUpUser();});
document.getElementById('loginForm')?.addEventListener('submit',e=>{e.preventDefault();loginUser();});
document.getElementById('adminLoginForm')?.addEventListener('submit',e=>{e.preventDefault();adminLogin();});
document.getElementById('saveTournamentPredictions')?.addEventListener('click',e=>{e.preventDefault();saveTournamentPredictions();});
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeAuthModal();});

window.addEventListener('DOMContentLoaded',async()=>{
  if(document.getElementById('authModal')){
    const authParam=new URLSearchParams(location.search).get('auth');
    const requestedAuth=authParam==='signup' || location.hash==='#signup' ? 'signup' : 'login';
    showAuthTab(requestedAuth);
    if(location.hash==='#login' || location.hash==='#signup' || authParam==='login' || authParam==='signup'){
      openAuthModal(requestedAuth);
    }
  }
  await updateHeaderAuthState();
  await createOrLoadProfile();
  await loadTournamentPredictions();
  await loadMatches();
  await loadAdminPanel();
});











