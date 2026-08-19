// app.js — core FFConnect logic (client-side, progressive foundation)
(function(){
  // Keys
  const USERS_KEY = 'ff_users_v2';
  const POSTS_KEY = 'ff_posts_v2';
  const CURRENT_KEY = 'ff_current_v2';
  const NOTIF_KEY = 'ff_notifications_v2';

  // DOM
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const feedList = document.getElementById('feedList');
  const postText = document.getElementById('postText');
  const postCreateBtn = document.getElementById('postCreateBtn');
  const accountArea = document.getElementById('accountArea');
  const profileMenu = document.getElementById('profileMenu');
  const authModal = document.getElementById('authModal');
  const authSubmit = document.getElementById('authSubmit');
  const authToggle = document.getElementById('authToggle');
  const authTitle = document.getElementById('authTitle');
  const authMsg = document.getElementById('authMsg');
  const authUsername = document.getElementById('authUsername');
  const authPassword = document.getElementById('authPassword');
  const authBio = document.getElementById('authBio');
  const authReferral = document.getElementById('authReferral');
  const myProfileBtn = document.getElementById('myProfileBtn');
  const newPostBtn = document.getElementById('newPostBtn');
  const followingList = document.getElementById('followingList');
  const suggestionsList = document.getElementById('suggestionsList');
  const notificationsDrawer = document.getElementById('notificationsDrawer');
  const notifBtn = document.getElementById('notifBtn');
  const notifBadge = document.getElementById('notifBadge');
  const notificationsList = document.getElementById('notificationsList');
  const accountAreaMain = accountArea;
  const searchResults = document.getElementById('searchResults');
  const profileDrawer = document.getElementById('profileDrawer');
  const profileContent = document.getElementById('profileContent');

  // State
  let authMode = 'register'; // or 'login'

  // Utilities
  function lsGet(key, def){ try{ return JSON.parse(localStorage.getItem(key))||def; }catch(e){return def;} }
  function lsSet(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
  function now(){ return Date.now(); }
  function uid(){ return Math.floor(Math.random()*1e9); }
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Generate a short unique referral code
  function generateReferralCode(username){
    const users = loadUsers();
    let code;
    do {
      const rand = Math.random().toString(36).slice(2,8).toUpperCase();
      const base = (username||'user').toString().slice(0,4).toUpperCase();
      code = `${base}-${rand}`;
    } while(users.some(u=>u.referralCode === code));
    return code;
  }

  // Data helpers
  function loadUsers(){ return lsGet(USERS_KEY, []); }
  function saveUsers(u){ lsSet(USERS_KEY,u); }
  function loadPosts(){ return lsGet(POSTS_KEY, []); }
  function savePosts(p){ lsSet(POSTS_KEY,p); }
  function loadNotifs(){ return lsGet(NOTIF_KEY, []); }
  function saveNotifs(n){ lsSet(NOTIF_KEY,n); }
  function currentUser(){ return lsGet(CURRENT_KEY, null); }
  function setCurrentUser(u){ lsSet(CURRENT_KEY,u); renderAccountArea(); updateBadges(); }
  function clearCurrentUser(){ localStorage.removeItem(CURRENT_KEY); renderAccountArea(); updateBadges(); }

  // Count successful referrals for a user
  function countReferrals(username){
    const users = loadUsers();
    return users.filter(u => u.referredBy === username).length;
  }

  // Bootstrap seeded data
  function seed(){
    if(!localStorage.getItem(USERS_KEY)){
      const users = [
        {username:'alice', password:'alice', profile:{bio:'Loves decentralized social', location:'Lagos'}, following:[], followers:[], referralCode: generateReferralCode('alice'), referredBy: null},
        {username:'bob', password:'bob', profile:{bio:'Build fast things', location:'Abuja'}, following:[], followers:[], referralCode: generateReferralCode('bob'), referredBy: null}
      ];
      saveUsers(users);
    }
    if(!localStorage.getItem(POSTS_KEY)){
      const posts = [
        {id:uid(), author:'alice', text:'Welcome to FFConnect — an original social space!', likes:[], comments:[], createdAt: now()},
        {id:uid(), author:'bob', text:'Try following someone and leaving a comment.', likes:[], comments:[], createdAt: now()}
      ];
      savePosts(posts);
    }
    if(!localStorage.getItem(NOTIF_KEY)) saveNotifs([]);
  }

  // Auth
  function openAuth(){ authModal.setAttribute('aria-hidden','false'); authModal.style.display='flex'; authMsg.textContent=''; }
  function closeAuth(){ authModal.setAttribute('aria-hidden','true'); authModal.style.display='none'; }

  function toggleAuthMode(){ authMode = (authMode==='register')? 'login':'register'; authTitle.textContent = (authMode==='register')?'Create an account':'Log in'; authSubmit.textContent = (authMode==='register')?'Create account':'Log in'; authToggle.textContent = (authMode==='register')?'Switch to Log in':'Switch to Create'; authMsg.textContent=''; }
  authToggle.addEventListener('click', toggleAuthMode);

  function showAuthMsg(msg, ok){ authMsg.textContent = msg; authMsg.style.color = ok ? '#16a34a' : '#b91c1c'; }

  function submitAuth(){
    const u = (authUsername.value||'').trim();
    const p = authPassword.value||'';
    const bio = authBio.value||'';
    const referralInput = (authReferral && authReferral.value) ? authReferral.value.trim() : '';

    if(!u || !p){ showAuthMsg('Please provide both username and password.'); return; }
    const users = loadUsers();
    if(authMode==='register'){
      if(users.find(x=>x.username.toLowerCase()===u.toLowerCase())){ showAuthMsg('Username already taken.'); return; }

      // If referral code provided, find owner
      let referredBy = null;
      if(referralInput){
        const refOwner = users.find(x => x.referralCode && x.referralCode.toLowerCase() === referralInput.toLowerCase());
        if(refOwner){
          if(refOwner.username.toLowerCase() === u.toLowerCase()){
            showAuthMsg('You cannot use your own referral code.'); return;
          }
          referredBy = refOwner.username;
        } else {
          // If code not found, ignore but inform the user
          showAuthMsg('Referral code not found. Proceeding without a referrer.', false);
        }
      }

      const newUser = {username:u,password:p,profile:{bio,location:''}, followers:[], following:[], referralCode: generateReferralCode(u), referredBy: referredBy || null};
      users.push(newUser); saveUsers(users); setCurrentUser({username:u});
      showAuthMsg('Account created.'); closeAuth(); renderAll();
    } else {
      const found = users.find(x=>x.username.toLowerCase()===u.toLowerCase() && x.password===p);
      if(!found){ showAuthMsg('Invalid username or password.'); return; }
      setCurrentUser({username:found.username}); showAuthMsg('Logged in.'); closeAuth(); renderAll();
    }
    authUsername.value=''; authPassword.value=''; authBio.value=''; if(authReferral) authReferral.value='';
  }
  authSubmit.addEventListener('click', submitAuth);

  // Account UI
  function renderAccountArea(){
    const user = currentUser();
    if(user){
      const u = loadUsers().find(x=>x.username===user.username);
      const referrals = countReferrals(user.username);
      const code = u.referralCode || generateReferralCode(u.username);
      accountAreaMain.innerHTML = `<div><div style="font-weight:700">${escapeHtml(user.username)}</div><div class="small">${escapeHtml((u.profile && u.profile.bio)||'')}</div></div>
        <div style="margin-top:8px">Referral: <strong>${escapeHtml(code)}</strong> <button class="btn secondary" id="shareRefBtn">Share my referral code</button><div class="small" style="margin-top:6px">Successful referrals: ${referrals}</div></div>
        <div style="margin-top:8px"><button class="btn" id="logoutBtn">Log out</button> <button class="btn secondary" id="editProfileBtn">Edit profile</button></div>`;
      document.getElementById('logoutBtn').addEventListener('click', ()=>{ clearCurrentUser(); renderAll(); });
      document.getElementById('editProfileBtn').addEventListener('click', ()=>{ openProfileEdit(user.username); });
      document.getElementById('shareRefBtn').addEventListener('click', ()=>{ shareReferral(user.username); });
      profileMenu.innerHTML = `<button class="btn secondary" onclick="openProfileFor('${user.username}')">Profile</button>`;
    } else {
      accountAreaMain.innerHTML = `<div><button class="btn" id="openAuthBtn">Create account / Log in</button></div>`;
      document.getElementById('openAuthBtn').addEventListener('click', ()=>{ openAuth(); });
      profileMenu.innerHTML = `<button class="btn" id="openAuthBtn2">Sign in</button>`;
      document.getElementById('openAuthBtn2').addEventListener('click', ()=>{ openAuth(); });
    }
    renderFollowingList();
  }

  // Share referral code (mobile share or clipboard fallback)
  function shareReferral(username){
    const users = loadUsers(); const u = users.find(x=>x.username===username); if(!u) return; const code = u.referralCode;
    const shareText = `Join me on FFConnect! Use my referral code ${code} to sign up.`;
    const url = location.origin + location.pathname; // current site
    if(navigator.share){
      navigator.share({title:'Join FFConnect', text: shareText, url}).catch(()=>{});
    } else if(navigator.clipboard){
      navigator.clipboard.writeText(`${shareText} ${url}`).then(()=>{ alert('Referral code copied to clipboard'); });
    } else {
      prompt('Copy this referral info', `${shareText} ${url}`);
    }
  }

  // Posts
  function createPost(){
    const text = (postText.value||'').trim();
    if(!text){ alert('Please write something first.'); return; }
    const user = currentUser();
    if(!user){ openAuth(); return; }
    const posts = loadPosts();
    const p = {id:uid(), author:user.username, text, likes:[], comments:[], createdAt: now()};
    posts.unshift(p); savePosts(posts); postText.value=''; renderFeed();
  }
  postCreateBtn.addEventListener('click', createPost);
  newPostBtn.addEventListener('click', ()=>{ window.scrollTo({top:0,behavior:'smooth'}); document.getElementById('postText').focus(); });

  function renderFeed(){
    const posts = loadPosts();
    feedList.innerHTML='';
    if(posts.length===0) feedList.innerHTML='<div class="card small">No posts yet.</div>';
    posts.forEach(p=>{
      const el = document.createElement('div'); el.className='post card';
      el.innerHTML = `
        <div class="meta"><div><strong>${escapeHtml(p.author)}</strong> <div class="small">${new Date(p.createdAt).toLocaleString()}</div></div><div><button class="btn secondary" onclick="openProfileFor('${p.author}')">View</button></div></div>
        <div class="text">${escapeHtml(p.text)}</div>
        <div class="actions">
          <button class="like-btn" data-id="${p.id}">👍 <span class="like-count">${(p.likes||[]).length}</span></button>
          <button class="btn secondary comment-toggle" data-id="${p.id}">💬 Comment (${(p.comments||[]).length})</button>
        </div>
        <div class="comment-area" id="comments-${p.id}" style="display:none"></div>
      `;
      feedList.appendChild(el);
    });

    // attach handlers
    document.querySelectorAll('.like-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = Number(btn.dataset.id);
        toggleLike(id);
      });
    });
    document.querySelectorAll('.comment-toggle').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = Number(btn.dataset.id); toggleComments(id);
      });
    });
  }

  function toggleLike(postId){
    const user = currentUser(); if(!user){ openAuth(); return; }
    const posts = loadPosts(); const p = posts.find(x=>x.id===postId); if(!p) return;
    const ix = (p.likes||[]).indexOf(user.username);
    if(ix===-1){ p.likes.push(user.username); addNotification(p.author, `${user.username} liked your post.`); }
    else { p.likes.splice(ix,1); }
    savePosts(posts); renderFeed(); updateBadges();
  }

  function toggleComments(postId){
    const area = document.getElementById('comments-'+postId);
    if(!area) return; area.style.display = (area.style.display==='none') ? 'block' : 'none';
    renderComments(postId);
  }

  function renderComments(postId){
    const posts = loadPosts(); const p = posts.find(x=>x.id===postId); if(!p) return;
    const area = document.getElementById('comments-'+postId); area.innerHTML='';
    const form = document.createElement('div'); form.className='comment-form';
    form.innerHTML = `<textarea id="comment-input-${postId}" placeholder="Write a comment..."></textarea><div class=\"row\"><button class=\"btn\" id=\"comment-submit-${postId}\">Reply</button></div>`;
    area.appendChild(form);
    const list = document.createElement('div'); list.className='comment-list';
    (p.comments||[]).forEach(c=>{
      const ce = document.createElement('div'); ce.className='comment'; ce.innerHTML = `<div><strong>${escapeHtml(c.author)}</strong> <span class="small">${new Date(c.createdAt).toLocaleString()}</span></div><div>${escapeHtml(c.text)}</div>`; list.appendChild(ce);
    });
    area.appendChild(list);
    document.getElementById(`comment-submit-${postId}`).addEventListener('click', ()=>{ submitComment(postId); });
  }

  function submitComment(postId){
    const user = currentUser(); if(!user){ openAuth(); return; }
    const input = document.getElementById('comment-input-'+postId); if(!input) return; const text = (input.value||'').trim(); if(!text) return;
    const posts = loadPosts(); const p = posts.find(x=>x.id===postId); if(!p) return; p.comments = p.comments||[]; p.comments.push({id:uid(),author:user.username,text,createdAt:now()}); savePosts(posts); renderComments(postId); addNotification(p.author, `${user.username} commented on your post.`); renderFeed(); updateBadges();
  }

  // Profiles
  function openProfileFor(username){ openProfile(); renderProfile(username); }
  window.openProfileFor = openProfileFor; // expose for inline onclicks

  function openProfile(){ profileDrawer.setAttribute('aria-hidden','false'); profileDrawer.style.display='block'; }
  function closeProfile(){ profileDrawer.setAttribute('aria-hidden','true'); profileDrawer.style.display='none'; }
  function openProfileEdit(username){ openProfile(); renderProfile(username, {edit:true}); }

  function renderProfile(username, opts={}){
    const users = loadUsers(); const u = users.find(x=>x.username===username); if(!u) return; const posts = loadPosts().filter(p=>p.author===username);
    const referrals = countReferrals(username);
    profileContent.innerHTML = `<div><h3>${escapeHtml(u.username)}</h3><div class=\"small\">${escapeHtml(u.profile.bio||'')}</div><div class=\"small\">${escapeHtml(u.profile.location||'')}</div><div style=\"margin-top:8px\">Referral code: <strong>${escapeHtml(u.referralCode||'')}</strong> <button class=\"btn secondary\" id=\"shareProfileRef\">Share</button><div class=\"small\">Successful referrals: ${referrals}</div></div></div><div style=\"margin-top:10px\" id=\"profileActions\"></div><div style=\"margin-top:12px\"><h4>Posts</h4><div id=\"profilePosts\"></div></div>`;
    const actions = document.getElementById('profileActions');
    const current = currentUser();
    if(current && current.username===username){ actions.innerHTML = `<button class=\"btn\" id=\"editProfile\">Edit profile</button>`; document.getElementById('editProfile').addEventListener('click', ()=>{ renderProfile(username,{edit:true}); }); }
    else if(current){
      const isFollowing = u.followers && u.followers.includes(current.username);
      actions.innerHTML = `<button class=\"btn\" id=\"followBtn\">${isFollowing? 'Unfollow':'Follow'}</button>`;
      document.getElementById('followBtn').addEventListener('click', ()=>{ toggleFollow(username); renderProfile(username); renderAll(); });
    } else { actions.innerHTML = `<button class=\"btn\" onclick=\"openAuth()\">Sign in to follow</button>`; }

    // Hook up share for profile referral
    const shareProfileBtn = document.getElementById('shareProfileRef');
    if(shareProfileBtn){ shareProfileBtn.addEventListener('click', ()=>{ shareReferral(username); }); }

    // If edit mode
    if(opts.edit){ profileContent.innerHTML = `<div><h3>Edit profile</h3><input id=\"editBio\" placeholder=\"Bio\" value=\"${escapeHtml(u.profile.bio||'')}\" /><input id=\"editLocation\" placeholder=\"Location\" value=\"${escapeHtml(u.profile.location||'')}\" /><div class=\"row\"><button class=\"btn\" id=\"saveProfile\">Save</button><button class=\"btn secondary\" id=\"cancelEdit\">Cancel</button></div></div>`; document.getElementById('saveProfile').addEventListener('click', ()=>{ const bio = document.getElementById('editBio').value; const loc = document.getElementById('editLocation').value; u.profile.bio = bio; u.profile.location = loc; saveUsers(users); renderProfile(username); renderAll(); }); document.getElementById('cancelEdit').addEventListener('click', ()=>{ renderProfile(username); }); return; }

    // Render posts
    const pp = document.getElementById('profilePosts'); pp.innerHTML=''; posts.forEach(p=>{ const el = document.createElement('div'); el.className='post'; el.innerHTML = `<div><strong>${escapeHtml(p.author)}</strong> <span class=\"small\">${new Date(p.createdAt).toLocaleString()}</span></div><div class=\"text\">${escapeHtml(p.text)}</div><div class=\"actions\"><button class=\"like-btn\" data-id=\"${p.id}\">👍 <span class=\"like-count\">${(p.likes||[]).length}</span></button> <button class=\"btn secondary comment-toggle\" data-id=\"${p.id}\">💬</button></div><div id=\"comments-${p.id}\" class=\"comment-area\"></div>`; pp.appendChild(el); });
    // attach handlers
    pp.querySelectorAll('.like-btn').forEach(b=>b.addEventListener('click', ()=>{ toggleLike(Number(b.dataset.id)); }));
    pp.querySelectorAll('.comment-toggle').forEach(b=>b.addEventListener('click', ()=>{ toggleComments(Number(b.dataset.id)); }));
  }

  // Follow system
  function toggleFollow(target){ const user = currentUser(); if(!user){ openAuth(); return; } const users = loadUsers(); const me = users.find(x=>x.username===user.username); const them = users.find(x=>x.username===target); if(!me||!them) return; me.following = me.following||[]; them.followers = them.followers||[]; const i = me.following.indexOf(target); if(i===-1){ me.following.push(target); if(!them.followers.includes(me.username)) them.followers.push(me.username); addNotification(target, `${me.username} started following you.`); } else { me.following.splice(i,1); const j = them.followers.indexOf(me.username); if(j>-1) them.followers.splice(j,1); } saveUsers(users); renderFollowingList(); }

  function renderFollowingList(){ const user = currentUser(); followingList.innerHTML=''; if(!user) return; const u = loadUsers().find(x=>x.username===user.username); if(!u||!u.following) return; u.following.forEach(f=>{ const li = document.createElement('li'); li.innerHTML = `<button class=\"btn secondary\" onclick=\"openProfileFor('${f}')\">${escapeHtml(f)}</button>`; followingList.appendChild(li); }); }

  function renderSuggestions(){ suggestionsList.innerHTML=''; const users = loadUsers(); const current = currentUser(); const candidates = users.filter(u=>!current||u.username!==current.username).slice(0,5); candidates.forEach(u=>{ const li = document.createElement('li'); li.innerHTML = `<div><strong>${escapeHtml(u.username)}</strong><div class=\"small\">${escapeHtml(u.profile.bio||'')}</div><div style=\"margin-top:6px\"><button class=\"btn\" onclick=\"openProfileFor('${u.username}')\">View</button> <button class=\"btn secondary\" onclick=\"toggleFollow('${u.username}')\">Follow</button></div></div>`; suggestionsList.appendChild(li); }); }

  // Notifications
  function addNotification(username, text){ const notifs = loadNotifs(); notifs.unshift({id:uid(),owner:username,text,read:false,createdAt:now()}); saveNotifs(notifs); updateBadges(); }
  function getMyNotifications(){ const user = currentUser(); if(!user) return []; return loadNotifs().filter(n=>n.owner===user.username); }
  function renderNotifications(){ notificationsList.innerHTML=''; const my = getMyNotifications(); if(my.length===0) notificationsList.innerHTML='<div class="small">No notifications</div>'; my.forEach(n=>{ const d = document.createElement('div'); d.className='card'; d.innerHTML = `<div><div class=\"small\">${new Date(n.createdAt).toLocaleString()}</div><div>${escapeHtml(n.text)}</div></div>`; notificationsList.appendChild(d); }); }
  function openNotifications(){ notificationsDrawer.setAttribute('aria-hidden','false'); notificationsDrawer.style.display='block'; renderNotifications(); }
  function closeNotifications(){ notificationsDrawer.setAttribute('aria-hidden','true'); notificationsDrawer.style.display='none'; }
  notifBtn.addEventListener('click', ()=>{ if(notificationsDrawer.getAttribute('aria-hidden')==='true') openNotifications(); else closeNotifications(); });

  function updateBadges(){ const user = currentUser(); if(!user){ notifBadge.style.display='none'; return; } const my = getMyNotifications().filter(n=>!n.read); if(my.length>0){ notifBadge.style.display='inline-block'; notifBadge.textContent = my.length; } else { notifBadge.style.display='none'; } }

  // Search
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSearch(); });
  function doSearch(){ const q = (searchInput.value||'').trim().toLowerCase(); searchResults.innerHTML=''; if(!q) return; // search users
    const users = loadUsers().filter(u=>u.username.toLowerCase().includes(q) || (u.profile && u.profile.bio && u.profile.bio.toLowerCase().includes(q)));
    const posts = loadPosts().filter(p=>p.text.toLowerCase().includes(q));
    if(users.length===0 && posts.length===0) searchResults.innerHTML = '<div class="small">No results</div>';
    if(users.length>0){ const h = document.createElement('div'); h.innerHTML='<h4>Users</h4>'; searchResults.appendChild(h); users.forEach(u=>{ const el = document.createElement('div'); el.className='card'; el.innerHTML = `<div><strong>${escapeHtml(u.username)}</strong><div class=\"small\">${escapeHtml(u.profile.bio||'')}</div><div style=\"margin-top:8px\"><button class=\"btn\" onclick=\"openProfileFor('${u.username}')\">View</button></div></div>`; searchResults.appendChild(el); }); }
    if(posts.length>0){ const h2 = document.createElement('div'); h2.innerHTML='<h4>Posts</h4>'; searchResults.appendChild(h2); posts.forEach(p=>{ const el = document.createElement('div'); el.className='post card'; el.innerHTML = `<div><strong>${escapeHtml(p.author)}</strong> <span class=\"small\">${new Date(p.createdAt).toLocaleString()}</span></div><div class=\"text\">${escapeHtml(p.text)}</div><div class=\"row\"><button class=\"btn\" onclick=\"openProfileFor('${p.author}')\">View author</button></div>`; searchResults.appendChild(el); }); }
  }

  // Render helpers
  function renderAll(){ renderAccountArea(); renderFeed(); renderSuggestions(); renderFollowingList(); updateBadges(); }

  // Initialization
  seed(); renderAll();

  // Expose some functions to global scope for inline handlers
  window.openAuth = openAuth;
  window.openProfile = openProfile;
  window.openProfileFor = function(u){ openProfileFor(u); };
  window.toggleFollow = function(u){ toggleFollow(u); };
  window.openProfileEdit = openProfileEdit;

  // Close drawers on outside click (simple)
  document.addEventListener('click', (e)=>{
    if(!notificationsDrawer.contains(e.target) && e.target!==notifBtn) { /* keep closed until toggled */ }
  });

  // small helper to render feed at start
  renderFeed();
})();
