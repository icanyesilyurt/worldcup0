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

function showHomeAuthTab(tab){
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
  if(location.hash !== (isSignup ? '#signup' : '#login')){
    history.replaceState(null,'',isSignup ? '#signup' : '#login');
  }
}

async function getCurrentUser(){
  const client=getSupabaseClient();
  if(!client) return null;
  const {data,error}=await client.auth.getUser();
  if(error) return null;
  return data.user || null;
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

function fillHomeSummary(profile,user){
  document.getElementById('summaryDisplayName') && (document.getElementById('summaryDisplayName').textContent=profile.display_name || 'Oyuncu');
  document.getElementById('summaryName') && (document.getElementById('summaryName').textContent=profile.display_name || 'Oyuncu');
  document.getElementById('summaryEmail') && (document.getElementById('summaryEmail').textContent=user.email || profile.email || '-');
  document.getElementById('summaryCountry') && (document.getElementById('summaryCountry').textContent=profile.country || '-');
  document.getElementById('summaryCountryTop') && (document.getElementById('summaryCountryTop').textContent=profile.country || '-');
  document.getElementById('summaryPoints') && (document.getElementById('summaryPoints').textContent=profile.total_points ?? 0);
  document.getElementById('summaryReferral') && (document.getElementById('summaryReferral').textContent=profile.referral_code || '-');
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
  await updateHeaderAuthState();
  await createOrLoadProfile();
}

async function loginUser(){
  const client=getSupabaseClient();
  if(!client) return;
  const email=document.getElementById('loginEmail')?.value.trim();
  const password=document.getElementById('loginPassword')?.value;
  const {error}=await client.auth.signInWithPassword({email,password});
  if(error){showAuthMessage(formatAuthError(error));return;}
  showAuthMessage('');
  await updateHeaderAuthState();
  await createOrLoadProfile();
}

async function logoutUser(){
  const client=getSupabaseClient();
  if(client){await client.auth.signOut();}
  window.location.href='index.html';
}

async function createOrLoadProfile(){
  const loggedOut=document.getElementById('loggedOutProfile');
  const loggedIn=document.getElementById('loggedInProfile');
  const homeAuthBox=document.getElementById('homeAuthBox');
  const homeProfileSummary=document.getElementById('homeProfileSummary');

  const client=getSupabaseClient();
  if(!client){
    if(loggedOut) loggedOut.hidden=false;
    if(loggedIn) loggedIn.hidden=true;
    if(homeAuthBox) homeAuthBox.hidden=false;
    if(homeProfileSummary) homeProfileSummary.hidden=true;
    return;
  }

  const user=await getCurrentUser();
  if(!user){
    if(loggedOut) loggedOut.hidden=false;
    if(loggedIn) loggedIn.hidden=true;
    if(homeAuthBox) homeAuthBox.hidden=false;
    if(homeProfileSummary) homeProfileSummary.hidden=true;
    return;
  }

  const profile=await loadProfileForUser(user);
  if(!profile) return;

  if(loggedOut) loggedOut.hidden=true;
  if(loggedIn) loggedIn.hidden=false;
  if(homeAuthBox) homeAuthBox.hidden=true;
  if(homeProfileSummary) homeProfileSummary.hidden=false;
  fillProfileFields(profile,user);
  fillHomeSummary(profile,user);
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
window.showHomeAuthTab=showHomeAuthTab;

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

window.addEventListener('DOMContentLoaded',async()=>{
  if(document.getElementById('homeAuthBox')){
    showHomeAuthTab(location.hash==='#signup'?'signup':'login');
  }
  await updateHeaderAuthState();
  await createOrLoadProfile();
});
