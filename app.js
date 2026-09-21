const SUPABASE_URL='https://kfysmqwhpzemoknqakzn.supabase.co';
const SUPABASE_KEY='sb_publishable_UNdKtQ2mCMaaWcMK0FvVIA_r8cNIUl-';

const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

async function register(){
  const email=document.getElementById('email').value.trim();
  const password=document.getElementById('password').value;
  const msg=document.getElementById('message');

  const {error}=await db.auth.signUp({email,password});

  msg.textContent=error
    ? '❌ '+error.message
    : '✅ Konto utworzone. Sprawdź e-mail i potwierdź rejestrację.';
}

async function login(){
  const email=document.getElementById('email').value.trim();
  const password=document.getElementById('password').value;
  const msg=document.getElementById('message');

  const {error}=await db.auth.signInWithPassword({email,password});

  msg.textContent=error
    ? '❌ '+error.message
    : '✅ Zalogowano!';
}
