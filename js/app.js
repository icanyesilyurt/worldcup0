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

async function getCurrentUser(){
  const client=getSupabaseClient();
  if(!client) return null;
  const {data,error}=await client.auth.getUser();
  if(error) return null;
  return data.user || null;
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

  window.location.href='profile.html';
}

async function loginUser(){
  const client=getSupabaseClient();
  if(!client) return;
  const email=document.getElementById('loginEmail')?.value.trim();
  const password=document.getElementById('loginPassword')?.value;
  const {error}=await client.auth.signInWithPassword({email,password});
  if(error){showAuthMessage(formatAuthError(error));return;}
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
  if(!loggedOut || !loggedIn) return;

  const client=getSupabaseClient();
  if(!client){loggedOut.hidden=false;loggedIn.hidden=true;return;}
  const user=await getCurrentUser();
  if(!user){loggedOut.hidden=false;loggedIn.hidden=true;return;}

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
    if(insertError){showAuthMessage(insertError.message);return;}
    profile=newProfile;
  }

  loggedOut.hidden=true;
  loggedIn.hidden=false;
  document.getElementById('profileDisplayName').textContent=profile.display_name || 'Oyuncu';
  document.getElementById('profileName').textContent=profile.display_name || 'Oyuncu';
  document.getElementById('profileEmail').textContent=user.email || profile.email || '-';
  document.getElementById('profileCountry').textContent=profile.country || '-';
  document.getElementById('profileCountryTop').textContent=profile.country || '-';
  document.getElementById('profilePoints').textContent=profile.total_points ?? 0;
  document.getElementById('profileReferral').textContent=profile.referral_code || '-';
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
  await updateHeaderAuthState();
  await createOrLoadProfile();
});




