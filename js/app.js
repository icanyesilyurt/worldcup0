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

async function loadTournamentPredictions(){
  const saveButton=document.getElementById('saveTournamentPredictions');
  if(!saveButton) return;
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

  const payload={
    user_id:user.id,
    champion:document.getElementById('champion')?.value,
    finalist_1:document.getElementById('finalist_1')?.value,
    finalist_2:document.getElementById('finalist_2')?.value,
    top_scorer:document.getElementById('top_scorer')?.value,
    top_assist:document.getElementById('top_assist')?.value,
    player_of_tournament:document.getElementById('player_of_tournament')?.value
  };

  const {error}=await client.from('tournament_predictions').upsert(payload,{onConflict:'user_id'});
  if(error){showTournamentPredictionMessage(error.message);return;}
  showTournamentPredictionMessage('Turnuva tahminlerin kaydedildi.');
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
document.getElementById('saveTournamentPredictions')?.addEventListener('click',e=>{e.preventDefault();saveTournamentPredictions();});
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeAuthModal();});

window.addEventListener('DOMContentLoaded',async()=>{
  if(document.getElementById('authModal')){
    showAuthTab(location.hash==='#signup'?'signup':'login');
    if(location.hash==='#login' || location.hash==='#signup'){
      openAuthModal(location.hash==='#signup'?'signup':'login');
    }
  }
  await updateHeaderAuthState();
  await createOrLoadProfile();
  await loadTournamentPredictions();
});




