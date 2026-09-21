async function logout(){
  await db.auth.signOut();
  location.reload();
}

async function checkSession(){
  const {data}=await db.auth.getSession();

  if(data.session){
    document.getElementById('message').innerHTML=
      '✅ Zalogowany: '+data.session.user.email+
      '<br><button onclick="logout()">Wyloguj</button>';
  }
}

checkSession();
