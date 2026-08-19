// app.js — updated FFConnect client-side logic (feed, profiles, likes, comments, follow, uploads, notifications)
(function(){
  const USERS_KEY = 'ff_users_v2';
  const POSTS_KEY = 'ff_posts_v2';
  const CURRENT_KEY = 'ff_current_v2';
  const NOTIF_KEY = 'ff_notifications_v2';

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
  const searchResults = document.getElementById('searchResults');
  const profileDrawer = document.getElementById('profileDrawer');
  const profileContent = document.getElementById('profileContent');
  const createPostCard = document.getElementById('createPostCard');

  let authMode = 'register';

  function lsGet(key, def){ try{ return JSON.parse(localStorage.getItem(key))||def; }catch(e){return def;} }
  function lsSet(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
  function now(){ return Date.now(); }
  function uid(){ return Math.floor(Math.random()*1e9); }
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function loadUsers(){ return lsGet(USERS_KEY, []); }
  function saveUsers(u){ lsSet(USERS_KEY,u); }
  function loadPosts(){ return lsGet(POSTS_KEY, []); }
  function savePosts(p){ lsSet(POSTS_KEY,p); }
  function loadNotifs(){ return lsGet(NOTIF_KEY, []); }
  function saveNotifs(n){ lsSet(NOTIF_KEY,n); }
  function currentUser(){ return lsGet(CURRENT_KEY, null); }
  function setCurrentUser(u){ lsSet(CURRENT_KEY,u); renderAccountArea(); updateBadges(); }
  function clearCurrentUser(){ localStorage.removeItem(CURRENT_KEY); renderAccountArea(); updateBadges(); }

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

  function countReferrals(username){
    const users = loadUsers();
    return users.filter(u => u.referredBy === username).length;
  }

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
        {id:uid(), author:'alice', text:'Welcome to FFConnect — an original social space!', media:[], likes:[], comments:[], createdAt: now()},
        {id:uid(), author:'bob', text:'Try following someone and leaving a comment.', media:[], likes:[], comments:[], createdAt: now()}
      ];
      savePosts(posts);
    }
    if(!localStorage.getItem(NOTIF_KEY)) saveNotifs([]);
  }

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

      let referredBy = null;
      if(referralInput){
        const refOwner = users.find(x => x.referralCode && x.referralCode.toLowerCase() === referralInput.toLowerCase());
        if(refOwner){
          if(refOwner.username.toLowerCase() === u.toLowerCase()){
            showAuthMsg('You cannot use your own referral code.'); return;
          }
          referredBy = refOwner.username;
        } else {
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

  function shareReferral(username){
    const users = loadUsers(); const u = users.find(x=>x.username===username); if(!u) return; const code = u.referralCode;
    const shareText = `Join me on FFConnect! Use my referral code ${code} to sign up.`;
    const url = location.origin + location.pathname;
    if(navigator.share){
      navigator.share({title:'Join FFConnect', text: shareText, url}).catch(()=>{});
    } else if(navigator.clipboard){
      navigator.clipboard.writeText(`${shareText} ${url}`).then(()=>{ alert('Referral code copied to clipboard'); });
    } else {
      prompt('Copy this referral info', `${shareText} ${url}`);
    }
  }

  function renderAccountArea(){
    const user = currentUser();
    if(user){
      const u = loadUsers().find(x=>x.username===user.username);
      const referrals = countReferrals(user.username);
      const code = u.referralCode || generateReferralCode(u.username);
      accountArea.innerHTML = '';
      const div = document.createElement('div');
      const top = document.createElement('div');
      top.innerHTML = `<div style="font-weight:700">${escapeHtml(user.username)}</div><div class="small">${escapeHtml((u.profile && u.profile.bio)||'')}</div>`;
      div.appendChild(top);
      const refWrap = document.createElement('div');
      refWrap.style.marginTop = '8px';
      refWrap.innerHTML = `Referral: <strong>${escapeHtml(code)}</strong> `;
      const shareBtn = document.createElement('button');
      shareBtn.className = 'btn secondary';
      shareBtn.id = 'shareRefBtn';
      shareBtn.textContent = 'Share my referral code';
      shareBtn.addEventListener('click', ()=>{ shareReferral(user.username); });
      refWrap.appendChild(shareBtn);
      const refCount = document.createElement('div');
      refCount.className = 'small';
      refCount.style.marginTop = '6px';
      refCount.textContent = `Successful referrals: ${referrals}`;
      refWrap.appendChild(refCount);
      div.appendChild(refWrap);
      const actions = document.createElement('div');
      actions.style.marginTop = '8px';
      actions.innerHTML = `<button class="btn" id="logoutBtn">Log out</button> <button class="btn secondary" id="editProfileBtn">Edit profile</button>`;
      div.appendChild(actions);
      accountArea.appendChild(div);
      document.getElementById('logoutBtn').addEventListener('click', ()=>{ clearCurrentUser(); renderAll(); });
      document.getElementById('editProfileBtn').addEventListener('click', ()=>{ openProfileEdit(user.username); });
      profileMenu.innerHTML = `<button class="btn secondary" onclick="openProfileFor('${user.username}')">Profile</button>`;
    } else {
      accountArea.innerHTML = `<div><button class="btn" id="openAuthBtn">Create account / Log in</button></div>`;
      document.getElementById('openAuthBtn').addEventListener('click', ()=>{ openAuth(); });
      profileMenu.innerHTML = `<button class="btn" id="openAuthBtn2">Sign in</button>`;
      document.getElementById('openAuthBtn2').addEventListener('click', ()=>{ openAuth(); });
    }
    renderFollowingList();
  }

  function addNotification(username, text){
    const notifs = loadNotifs();
    notifs.unshift({id:uid(),owner:username,text,read:false,createdAt:now()});
    saveNotifs(notifs);
    updateBadges();
  }

  function getMyNotifications(){ const user = currentUser(); if(!user) return []; return loadNotifs().filter(n=>n.owner===user.username); }

  function renderNotifications(){
    notificationsList.innerHTML = '';
    const my = getMyNotifications();
    if(my.length===0) notificationsList.innerHTML = '<div class="small">No notifications</div>';
    my.forEach(n=>{
      const d = document.createElement('div');
      d.className = 'card';
      const header = document.createElement('div');
      header.className = 'small';
      header.textContent = new Date(n.createdAt).toLocaleString();
      const body = document.createElement('div');
      body.innerHTML = escapeHtml(n.text);
      d.appendChild(header);
      d.appendChild(body);
      notificationsList.appendChild(d);
    });
  }

  function openNotifications(){ notificationsDrawer.setAttribute('aria-hidden','false'); notificationsDrawer.style.display='block'; markAllNotifsRead(); renderNotifications(); }
  function closeNotifications(){ notificationsDrawer.setAttribute('aria-hidden','true'); notificationsDrawer.style.display='none'; }
  notifBtn.addEventListener('click', ()=>{ if(notificationsDrawer.getAttribute('aria-hidden')==='true') openNotifications(); else closeNotifications(); });

  function markAllNotifsRead(){
    const user = currentUser(); if(!user) return;
    const notifs = loadNotifs(); let changed = false;
    for(const n of notifs){ if(n.owner===user.username && !n.read){ n.read = true; changed = true; } }
    if(changed) saveNotifs(notifs);
    updateBadges();
  }

  function updateBadges(){
    const user = currentUser();
    if(!user){ notifBadge.style.display='none'; return; }
    const my = getMyNotifications().filter(n=>!n.read);
    if(my.length>0){ notifBadge.style.display='inline-block'; notifBadge.textContent = my.length; } else { notifBadge.style.display='none'; }
  }

  function openProfileFor(username){ openProfile(); renderProfile(username); }
  window.openProfileFor = openProfileFor;

  function openProfile(){ profileDrawer.setAttribute('aria-hidden','false'); profileDrawer.style.display='block'; }
  function closeProfile(){ profileDrawer.setAttribute('aria-hidden','true'); profileDrawer.style.display='none'; }

  function createPost(){
    const text = (postText.value||'').trim();
    const user = currentUser();
    if(!user){ openAuth(); return; }
    if(!text && !attachedMedia.length){ alert('Please write something or attach a photo/video.'); return; }
    const posts = loadPosts();
    const p = {id:uid(), author:user.username, text, media: attachedMedia.slice(), likes:[], comments:[], createdAt: now()};
    attachedMedia = [];
    posts.unshift(p);
    savePosts(posts);
    postText.value='';
    renderFeed();
  }

  let attachedMedia = [];

  function buildAttachUI(){
    if(!createPostCard) return;
    const existing = document.getElementById('attachWrap');
    if(existing) return;
    const row = createPostCard.querySelector('.row') || createPostCard.appendChild(document.createElement('div'));
    const wrap = document.createElement('div');
    wrap.id = 'attachWrap';
    wrap.style.display = 'flex';
    wrap.style.gap = '8px';
    wrap.style.marginTop = '8px';
    const attachBtn = document.createElement('button');
    attachBtn.className = 'btn secondary';
    attachBtn.type = 'button';
    attachBtn.id = 'attachBtn';
    attachBtn.textContent = 'Attach photo/video';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'attachInput';
    fileInput.accept = 'image/*,video/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    attachBtn.addEventListener('click', ()=> fileInput.click());
    fileInput.addEventListener('change', handleFilesSelected);
    const preview = document.createElement('div');
    preview.id = 'attachPreview';
    preview.style.display = 'flex';
    preview.style.flexWrap = 'wrap';
    preview.style.gap = '8px';
    preview.style.marginTop = '8px';
    wrap.appendChild(attachBtn);
    wrap.appendChild(fileInput);
    wrap.appendChild(preview);
    createPostCard.appendChild(wrap);
  }

  function handleFilesSelected(e){
    const files = Array.from(e.target.files || []);
    const preview = document.getElementById('attachPreview');
    for(const f of files){
      if(!f.type.startsWith('image/') && !f.type.startsWith('video/')) continue;
      const reader = new FileReader();
      reader.onload = function(ev){
        const dataUrl = ev.target.result;
        const type = f.type.startsWith('image/') ? 'image' : 'video';
        attachedMedia.push({type, data: dataUrl, name: f.name});
        const el = document.createElement('div');
        el.style.width = '120px';
        el.style.height = '80px';
        el.style.overflow = 'hidden';
        el.style.borderRadius = '8px';
        el.style.border = '1px solid #e6f2ec';
        if(type === 'image'){
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          el.appendChild(img);
        } else {
          const vid = document.createElement('video');
          vid.src = dataUrl;
          vid.controls = true;
          vid.style.width = '100%';
          vid.style.height = '100%';
          vid.style.objectFit = 'cover';
          el.appendChild(vid);
        }
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn secondary';
        removeBtn.style.marginTop = '6px';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', ()=>{
          const index = Array.from(preview.children).indexOf(el);
          if(index > -1) attachedMedia.splice(index,1);
          el.remove();
        });
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.appendChild(el);
        container.appendChild(removeBtn);
        preview.appendChild(container);
      };
      reader.readAsDataURL(f);
    }
    e.target.value = '';
  }

  function renderFeed(){
    const posts = loadPosts();
    feedList.innerHTML = '';
    if(posts.length===0) feedList.innerHTML = '<div class="card small">No posts yet.</div>';
    posts.forEach(p=>{
      const el = document.createElement('div');
      el.className = 'post card';
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<div><strong>${escapeHtml(p.author)}</strong> <div class="small">${new Date(p.createdAt).toLocaleString()}</div></div>`;
      const viewBtnWrap = document.createElement('div');
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn secondary';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', ()=> openProfileFor(p.author));
      viewBtnWrap.appendChild(viewBtn);
      meta.appendChild(viewBtnWrap);
      el.appendChild(meta);
      if(p.text){
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.innerHTML = escapeHtml(p.text);
        el.appendChild(textDiv);
      }
      if(p.media && p.media.length){
        const mediaWrap = document.createElement('div');
        mediaWrap.style.display = 'flex';
        mediaWrap.style.flexWrap = 'wrap';
        mediaWrap.style.gap = '8px';
        mediaWrap.style.marginTop = '8px';
        p.media.forEach(m=>{
          const box = document.createElement('div');
          box.style.width = '160px';
          box.style.height = '120px';
          box.style.overflow = 'hidden';
          box.style.borderRadius = '8px';
          box.style.border = '1px solid #e6f2ec';
          if(m.type === 'image'){
            const img = document.createElement('img');
            img.src = m.data;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            box.appendChild(img);
          } else {
            const vid = document.createElement('video');
            vid.src = m.data;
            vid.controls = true;
            vid.style.width = '100%';
            vid.style.height = '100%';
            vid.style.objectFit = 'cover';
            box.appendChild(vid);
          }
          mediaWrap.appendChild(box);
        });
        el.appendChild(mediaWrap);
      }
      const actions = document.createElement('div');
      actions.className = 'actions';
      const likeBtn = document.createElement('button');
      likeBtn.className = 'like-btn';
      likeBtn.dataset.id = p.id;
      likeBtn.innerHTML = `👍 <span class="like-count">${(p.likes||[]).length}</span>`;
      likeBtn.addEventListener('click', ()=>toggleLike(p.id));
      const commentBtn = document.createElement('button');
      commentBtn.className = 'btn secondary';
      commentBtn.dataset.id = p.id;
      commentBtn.textContent = `💬 Comment (${(p.comments||[]).length})`;
      commentBtn.addEventListener('click', ()=> toggleComments(p.id));
      actions.appendChild(likeBtn);
      actions.appendChild(commentBtn);
      el.appendChild(actions);
      const commentArea = document.createElement('div');
      commentArea.className = 'comment-area';
      commentArea.id = `comments-${p.id}`;
      commentArea.style.display = 'none';
      el.appendChild(commentArea);
      feedList.appendChild(el);
    });
  }

  function toggleLike(postId){
    const user = currentUser(); if(!user){ openAuth(); return; }
    const posts = loadPosts(); const p = posts.find(x=>x.id===postId); if(!p) return;
    p.likes = p.likes || [];
    const ix = p.likes.indexOf(user.username);
    if(ix === -1){ p.likes.push(user.username); addNotification(p.author, `${user.username} liked your post.`); }
    else { p.likes.splice(ix,1); }
    savePosts(posts); renderFeed(); updateBadges();
  }

  function toggleComments(postId){
    const area = document.getElementById(`comments-${postId}`);
    if(!area) return;
    area.style.display = (area.style.display === 'none') ? 'block' : 'none';
    renderComments(postId);
  }

  function renderComments(postId){
    const posts = loadPosts(); const p = posts.find(x=>x.id===postId); if(!p) return;
    const area = document.getElementById(`comments-${postId}`); area.innerHTML = '';
    const form = document.createElement('div');
    form.className = 'comment-form';
    const textarea = document.createElement('textarea');
    textarea.id = `comment-input-${postId}`;
    textarea.placeholder = 'Write a comment...';
    textarea.style.width = '100%';
    textarea.style.minHeight = '48px';
    const submit = document.createElement('button');
    submit.className = 'btn';
    submit.id = `comment-submit-${postId}`;
    submit.textContent = 'Reply';
    submit.addEventListener('click', ()=> submitComment(postId));
    form.appendChild(textarea);
    const row = document.createElement('div');
    row.className = 'row';
    row.style.marginTop = '8px';
    row.appendChild(submit);
    form.appendChild(row);
    area.appendChild(form);
    const list = document.createElement('div');
    list.className = 'comment-list';
    (p.comments||[]).forEach(c=>{
      const ce = document.createElement('div');
      ce.className = 'comment';
      const meta = document.createElement('div');
      meta.innerHTML = `<strong>${escapeHtml(c.author)}</strong> <span class="small">${new Date(c.createdAt).toLocaleString()}</span>`;
      ce.appendChild(meta);
      const body = document.createElement('div');
      body.innerHTML = escapeHtml(c.text);
      ce.appendChild(body);
      const controls = document.createElement('div');
      controls.style.marginTop = '6px';
      const current = currentUser();
      if(current && current.username === c.author){
        const del = document.createElement('button');
        del.className = 'btn secondary';
        del.textContent = 'Delete';
        del.addEventListener('click', ()=>{ deleteComment(postId, c.id); });
        controls.appendChild(del);
      }
      ce.appendChild(controls);
      list.appendChild(ce);
    });
    area.appendChild(list);
  }

  function submitComment(postId){
    const user = currentUser(); if(!user){ openAuth(); return; }
    const input = document.getElementById(`comment-input-${postId}`); if(!input) return; const text = (input.value||'').trim(); if(!text) return;
    const posts = loadPosts(); const p = posts.find(x=>x.id===postId); if(!p) return;
    p.comments = p.comments || [];
    const comment = {id:uid(), author:user.username, text, createdAt: now()};
    p.comments.push(comment);
    savePosts(posts);
    addNotification(p.author, `${user.username} commented on your post.`);
    renderComments(postId);
    renderFeed();
    updateBadges();
  }

  function deleteComment(postId, commentId){
    const user = currentUser(); if(!user){ openAuth(); return; }
    const posts = loadPosts(); const p = posts.find(x=>x.id===postId); if(!p) return;
    const ix = (p.comments||[]).findIndex(c=>c.id===commentId);
    if(ix === -1) return;
    if(p.comments[ix].author !== user.username) return;
    p.comments.splice(ix,1);
    savePosts(posts);
    renderComments(postId);
    renderFeed();
  }

  function renderProfile(username, opts={}){
    const users = loadUsers(); const u = users.find(x=>x.username===username); if(!u) return;
    const posts = loadPosts().filter(p=>p.author===username);
    const referrals = countReferrals(username);
    profileContent.innerHTML = '';
    const header = document.createElement('div');
    header.innerHTML = `<h3>${escapeHtml(u.username)}</h3><div class="small">${escapeHtml(u.profile.bio||'')}</div><div class="small">${escapeHtml(u.profile.location||'')}</div>`;
    const refWrap = document.createElement('div');
    refWrap.style.marginTop = '8px';
    refWrap.innerHTML = `Referral code: <strong>${escapeHtml(u.referralCode||'')}</strong> `;
    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn secondary';
    shareBtn.textContent = 'Share';
    shareBtn.addEventListener('click', ()=> shareReferral(username));
    refWrap.appendChild(shareBtn);
    const refCount = document.createElement('div');
    refCount.className = 'small';
    refCount.textContent = `Successful referrals: ${referrals}`;
    refWrap.appendChild(refCount);
    header.appendChild(refWrap);
    profileContent.appendChild(header);
    const actions = document.createElement('div');
    actions.id = 'profileActions';
    actions.style.marginTop = '10px';
    const current = currentUser();
    if(current && current.username === username){
      const editBtn = document.createElement('button');
      editBtn.className = 'btn';
      editBtn.id = 'editProfile';
      editBtn.textContent = 'Edit profile';
      editBtn.addEventListener('click', ()=> renderProfile(username,{edit:true}));
      actions.appendChild(editBtn);
    } else if(current){
      const isFollowing = u.followers && u.followers.includes(current.username);
      const followBtn = document.createElement('button');
      followBtn.className = 'btn';
      followBtn.id = 'followBtn';
      followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
      followBtn.addEventListener('click', ()=>{ toggleFollow(username); renderProfile(username); renderAll(); });
      actions.appendChild(followBtn);
    } else {
      const signBtn = document.createElement('button');
      signBtn.className = 'btn';
      signBtn.textContent = 'Sign in to follow';
      signBtn.addEventListener('click', ()=> openAuth());
      actions.appendChild(signBtn);
    }
    profileContent.appendChild(actions);

    if(opts.edit){
      profileContent.innerHTML = '';
      const form = document.createElement('div');
      form.innerHTML = `<h3>Edit profile</h3>`;
      const bioInput = document.createElement('input');
      bioInput.id = 'editBio';
      bioInput.placeholder = 'Bio';
      bioInput.value = u.profile.bio || '';
      const locInput = document.createElement('input');
      locInput.id = 'editLocation';
      locInput.placeholder = 'Location';
      locInput.value = u.profile.location || '';
      const row = document.createElement('div');
      row.className = 'row';
      row.style.marginTop = '8px';
      const save = document.createElement('button');
      save.className = 'btn';
      save.id = 'saveProfile';
      save.textContent = 'Save';
      const cancel = document.createElement('button');
      cancel.className = 'btn secondary';
      cancel.id = 'cancelEdit';
      cancel.textContent = 'Cancel';
      save.addEventListener('click', ()=>{
        u.profile.bio = document.getElementById('editBio').value;
        u.profile.location = document.getElementById('editLocation').value;
        saveUsers(users);
        renderProfile(username);
        renderAll();
      });
      cancel.addEventListener('click', ()=> renderProfile(username));
      row.appendChild(save);
      row.appendChild(cancel);
      form.appendChild(bioInput);
      form.appendChild(locInput);
      form.appendChild(row);
      profileContent.appendChild(form);
      return;
    }

    const postsWrap = document.createElement('div');
    postsWrap.style.marginTop = '12px';
    postsWrap.innerHTML = '<h4>Posts</h4>';
    const profilePosts = document.createElement('div');
    profilePosts.id = 'profilePosts';
    posts.forEach(p=>{
      const el = document.createElement('div');
      el.className = 'post';
      el.innerHTML = `<div><strong>${escapeHtml(p.author)}</strong> <span class="small">${new Date(p.createdAt).toLocaleString()}</span></div>`;
      const text = document.createElement('div');
      text.className = 'text';
      text.innerHTML = escapeHtml(p.text || '');
      el.appendChild(text);
      if(p.media && p.media.length){
        const mediaWrap = document.createElement('div');
        mediaWrap.style.display = 'flex';
        mediaWrap.style.gap = '8px';
        mediaWrap.style.marginTop = '8px';
        p.media.forEach(m=>{
          const box = document.createElement('div');
          box.style.width = '160px';
          box.style.height = '120px';
          box.style.overflow = 'hidden';
          box.style.borderRadius = '8px';
          box.style.border = '1px solid #e6f2ec';
          if(m.type === 'image'){
            const img = document.createElement('img');
            img.src = m.data;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            box.appendChild(img);
          } else {
            const vid = document.createElement('video');
            vid.src = m.data;
            vid.controls = true;
            vid.style.width = '100%';
            vid.style.height = '100%';
            vid.style.objectFit = 'cover';
            box.appendChild(vid);
          }
          mediaWrap.appendChild(box);
        });
        el.appendChild(mediaWrap);
      }
      const act = document.createElement('div');
      act.className = 'actions';
      const like = document.createElement('button');
      like.className = 'like-btn';
      like.dataset.id = p.id;
      like.innerHTML = `👍 <span class="like-count">${(p.likes||[]).length}</span>`;
      like.addEventListener('click', ()=> toggleLike(p.id));
      act.appendChild(like);
      profilePosts.appendChild(el);
    });
    postsWrap.appendChild(profilePosts);
    profileContent.appendChild(postsWrap);
  }

  function toggleFollow(target){
    const user = currentUser(); if(!user){ openAuth(); return; }
    const users = loadUsers();
    const me = users.find(x=>x.username===user.username);
    const them = users.find(x=>x.username===target);
    if(!me || !them) return;
    me.following = me.following || [];
    them.followers = them.followers || [];
    const i = me.following.indexOf(target);
    if(i === -1){
      me.following.push(target);
      if(!them.followers.includes(me.username)) them.followers.push(me.username);
      addNotification(target, `${me.username} started following you.`);
    } else {
      me.following.splice(i,1);
      const j = them.followers.indexOf(me.username);
      if(j > -1) them.followers.splice(j,1);
    }
    saveUsers(users);
    renderFollowingList();
  }

  function renderFollowingList(){
    const user = currentUser();
    followingList.innerHTML = '';
    if(!user) return;
    const u = loadUsers().find(x=>x.username===user.username);
    if(!u || !u.following) return;
    u.following.forEach(f=>{
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'btn secondary';
      btn.textContent = f;
      btn.addEventListener('click', ()=> openProfileFor(f));
      li.appendChild(btn);
      followingList.appendChild(li);
    });
  }

  function renderSuggestions(){
    suggestionsList.innerHTML = '';
    const users = loadUsers();
    const current = currentUser();
    const candidates = users.filter(u=>!current || u.username !== current.username).slice(0,5);
    candidates.forEach(u=>{
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escapeHtml(u.username)}</strong><div class="small">${escapeHtml(u.profile.bio||'')}</div></div>`;
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', ()=> openProfileFor(u.username));
      const followBtn = document.createElement('button');
      followBtn.className = 'btn secondary';
      followBtn.textContent = 'Follow';
      followBtn.addEventListener('click', ()=> toggleFollow(u.username));
      const wrap = document.createElement('div');
      wrap.style.marginTop = '6px';
      wrap.appendChild(viewBtn);
      wrap.appendChild(followBtn);
      li.appendChild(wrap);
      suggestionsList.appendChild(li);
    });
  }

  function doSearch(){
    const q = (searchInput.value||'').trim().toLowerCase();
    searchResults.innerHTML = '';
    if(!q) return;
    const users = loadUsers().filter(u=>u.username.toLowerCase().includes(q) || (u.profile && u.profile.bio && u.profile.bio.toLowerCase().includes(q)));
    const posts = loadPosts().filter(p=>p.text && p.text.toLowerCase().includes(q));
    if(users.length===0 && posts.length===0) searchResults.innerHTML = '<div class="small">No results</div>';
    if(users.length>0){
      const h = document.createElement('div'); h.innerHTML = '<h4>Users</h4>';
      searchResults.appendChild(h);
      users.forEach(u=>{
        const el = document.createElement('div'); el.className = 'card';
        el.innerHTML = `<div><strong>${escapeHtml(u.username)}</strong><div class="small">${escapeHtml(u.profile.bio||'')}</div></div>`;
        const view = document.createElement('button'); view.className = 'btn'; view.textContent = 'View'; view.addEventListener('click', ()=> openProfileFor(u.username));
        el.appendChild(view);
        searchResults.appendChild(el);
      });
    }
    if(posts.length>0){
      const h2 = document.createElement('div'); h2.innerHTML = '<h4>Posts</h4>'; searchResults.appendChild(h2);
      posts.forEach(p=>{
        const el = document.createElement('div'); el.className = 'post card';
        el.innerHTML = `<div><strong>${escapeHtml(p.author)}</strong> <span class="small">${new Date(p.createdAt).toLocaleString()}</span></div><div class="text">${escapeHtml(p.text||'')}</div>`;
        const viewAuthor = document.createElement('button'); viewAuthor.className = 'btn'; viewAuthor.textContent = 'View author'; viewAuthor.addEventListener('click', ()=> openProfileFor(p.author));
        el.appendChild(viewAuthor);
        searchResults.appendChild(el);
      });
    }
  }

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSearch(); });

  function renderAll(){ renderAccountArea(); renderFeed(); renderSuggestions(); renderFollowingList(); updateBadges(); }

  function deletePost(postId){
    const user = currentUser(); if(!user) { openAuth(); return; }
    const posts = loadPosts();
    const ix = posts.findIndex(p=>p.id===postId);
    if(ix === -1) return;
    if(posts[ix].author !== user.username) return;
    posts.splice(ix,1);
    savePosts(posts);
    renderFeed();
  }

  function initEventBindings(){
    buildAttachUI();
    postCreateBtn.removeEventListener('click', createPost);
    postCreateBtn.addEventListener('click', createPost);
    newPostBtn.removeEventListener('click', ()=>{});
    newPostBtn.addEventListener('click', ()=>{ window.scrollTo({top:0,behavior:'smooth'}); if(postText) postText.focus(); });
  }

  function deleteUser(username){
    const users = loadUsers().filter(u=>u.username !== username);
    saveUsers(users);
    const posts = loadPosts().filter(p=>p.author !== username);
    savePosts(posts);
  }

  seed();
  initEventBindings();
  renderAll();

  window.openAuth = openAuth;
  window.openProfile = openProfile;
  window.openProfileFor = function(u){ openProfileFor(u); };
  window.toggleFollow = function(u){ toggleFollow(u); };
  window.openProfileEdit = function(u){ openProfileEdit(u); };

  document.addEventListener('click', (e)=>{
    if(!notificationsDrawer.contains(e.target) && e.target!==notifBtn) {}
  });

})();
