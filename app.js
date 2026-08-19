// app.js — complete FFConnect client-side logic
(function(){
  // Storage keys
  const USERS_KEY = 'ff_users_v2';
  const POSTS_KEY = 'ff_posts_v2';
  const CURRENT_KEY = 'ff_current_v2';
  const NOTIF_KEY = 'ff_notifications_v2';

  // DOM element references
  let searchInput;
  let searchBtn;
  let feedList;
  let postText;
  let postCreateBtn;
  let accountArea;
  let profileMenu;
  let authModal;
  let authSubmit;
  let authToggle;
  let authTitle;
  let authMsg;
  let authUsername;
  let authPassword;
  let authBio;
  let authReferral;
  let myProfileBtn;
  let newPostBtn;
  let followingList;
  let suggestionsList;
  let notificationsDrawer;
  let notifBtn;
  let notifBadge;
  let notificationsList;
  let searchResults;
  let profileDrawer;
  let profileContent;
  let createPostCard;

  // State
  let authMode = 'register';
  let attachedMedia = [];

  // Utilities
  function lsGet(key, def){
    try {
      return JSON.parse(localStorage.getItem(key)) || def;
    } catch(e) {
      return def;
    }
  }

  function lsSet(key, val){
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch(e){}
  }

  function now(){
    return Date.now();
  }

  function uid(){
    return Math.floor(Math.random() * 1e9);
  }

  function escapeHtml(s){
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  // Data helpers
  function loadUsers(){
    return lsGet(USERS_KEY, []);
  }

  function saveUsers(u){
    lsSet(USERS_KEY, u);
  }

  function loadPosts(){
    return lsGet(POSTS_KEY, []);
  }

  function savePosts(p){
    lsSet(POSTS_KEY, p);
  }

  function loadNotifs(){
    return lsGet(NOTIF_KEY, []);
  }

  function saveNotifs(n){
    lsSet(NOTIF_KEY, n);
  }

  function currentUser(){
    return lsGet(CURRENT_KEY, null);
  }

  function setCurrentUser(u){
    lsSet(CURRENT_KEY, u);
    renderAccountArea();
    updateBadges();
  }

  function clearCurrentUser(){
    localStorage.removeItem(CURRENT_KEY);
    renderAccountArea();
    updateBadges();
  }

  // Referral helpers
  function generateReferralCode(username){
    const users = loadUsers();
    let code;

    do {
      const rand = Math.random().toString(36).slice(2,8).toUpperCase();
      const base = (username || 'USER').toString().slice(0,4).toUpperCase();
      code = `${base}-${rand}`;
    } while(users.some(x => x.referralCode === code));

    return code;
  }

  function countReferrals(username){
    return loadUsers().filter(u => u.referredBy === username).length;
  }

  // Seed demo data
  function seed(){
    if(!localStorage.getItem(USERS_KEY)){
      const users = [
        {
          username:'alice',
          password:'alice',
          profile:{
            bio:'Loves decentralized social',
            location:'Lagos'
          },
          following:[],
          followers:[],
          referralCode:generateReferralCode('alice'),
          referredBy:null
        },
        {
          username:'bob',
          password:'bob',
          profile:{
            bio:'Build fast things',
            location:'Abuja'
          },
          following:[],
          followers:[],
          referralCode:generateReferralCode('bob'),
          referredBy:null
        }
      ];

      saveUsers(users);
    }

    if(!localStorage.getItem(POSTS_KEY)){
      const posts = [
        {
          id:uid(),
          author:'alice',
          text:'Welcome to FFConnect — an original social space!',
          media:[],
          likes:[],
          comments:[],
          createdAt:now()
        },
        {
          id:uid(),
          author:'bob',
          text:'Try following someone and leaving a comment.',
          media:[],
          likes:[],
          comments:[],
          createdAt:now()
        }
      ];

      savePosts(posts);
    }

    if(!localStorage.getItem(NOTIF_KEY)){
      saveNotifs([]);
    }
  }

  // Auth modal controls
  function openAuth(){
    if(!authModal) return;

    authModal.setAttribute('aria-hidden','false');
    authModal.style.display = 'flex';

    if(authMsg){
      authMsg.textContent = '';
    }
  }

  function closeAuth(){
    if(!authModal) return;

    authModal.setAttribute('aria-hidden','true');
    authModal.style.display = 'none';
  }

  function toggleAuthMode(){
    authMode = authMode === 'register' ? 'login' : 'register';

    if(authTitle){
      authTitle.textContent =
        authMode === 'register'
          ? 'Create an account'
          : 'Log in';
    }

    if(authSubmit){
      authSubmit.textContent =
        authMode === 'register'
          ? 'Create account'
          : 'Log in';
    }

    if(authToggle){
      authToggle.textContent =
        authMode === 'register'
          ? 'Switch to Log in'
          : 'Switch to Create';
    }

    if(authMsg){
      authMsg.textContent = '';
    }
  }

  function showAuthMsg(msg, ok){
    if(!authMsg) return;

    authMsg.textContent = msg;
    authMsg.style.color = ok ? '#16a34a' : '#b91c1c';
  }

  function submitAuth(){
    const u = (authUsername && authUsername.value || '').trim();
    const p = (authPassword && authPassword.value) || '';
    const bio = (authBio && authBio.value) || '';
    const referralInput =
      (authReferral && authReferral.value)
        ? authReferral.value.trim()
        : '';

    if(!u || !p){
      showAuthMsg('Please provide both username and password.');
      return;
    }

    const users = loadUsers();

    if(authMode === 'register'){
      if(users.find(x => x.username.toLowerCase() === u.toLowerCase())){
        showAuthMsg('Username already taken.');
        return;
      }

      let referredBy = null;

      if(referralInput){
        const refOwner = users.find(
          x =>
            x.referralCode &&
            x.referralCode.toLowerCase() === referralInput.toLowerCase()
        );

        if(refOwner){
          if(refOwner.username.toLowerCase() === u.toLowerCase()){
            showAuthMsg('You cannot use your own referral code.');
            return;
          }

          referredBy = refOwner.username;
        } else {
          showAuthMsg(
            'Referral code not found. Proceeding without a referrer.',
            false
          );
        }
      }

      const newUser = {
        username:u,
        password:p,
        profile:{
          bio,
          location:''
        },
        followers:[],
        following:[],
        referralCode:generateReferralCode(u),
        referredBy:referredBy || null
      };

      users.push(newUser);
      saveUsers(users);

      setCurrentUser({
        username:u
      });

      showAuthMsg('Account created.', true);
      closeAuth();
      renderAll();

    } else {
      const found = users.find(
        x =>
          x.username.toLowerCase() === u.toLowerCase() &&
          x.password === p
      );

      if(!found){
        showAuthMsg('Invalid username or password.');
        return;
      }

      setCurrentUser({
        username:found.username
      });

      showAuthMsg('Logged in.', true);
      closeAuth();
      renderAll();
    }

    if(authUsername) authUsername.value = '';
    if(authPassword) authPassword.value = '';
    if(authBio) authBio.value = '';
    if(authReferral) authReferral.value = '';
  }

  function logout(){
    clearCurrentUser();
    renderAll();
  }

  // Account area
  function renderAccountArea(){
    if(!accountArea) return;

    accountArea.innerHTML = '';

    const user = currentUser();

    if(user){
      const users = loadUsers();
      const u = users.find(x => x.username === user.username) || {};
      const referrals = countReferrals(user.username);

      const code =
        u && u.referralCode
          ? u.referralCode
          : generateReferralCode(user.username);

      const top = document.createElement('div');

      top.innerHTML =
        `<div style="font-weight:700">${escapeHtml(user.username)}</div>` +
        `<div class="small">${escapeHtml((u.profile && u.profile.bio) || '')}</div>`;

      accountArea.appendChild(top);

      const refWrap = document.createElement('div');
      refWrap.style.marginTop = '8px';
      refWrap.innerHTML =
        `Referral: <strong>${escapeHtml(code)}</strong> `;

      const shareBtn = document.createElement('button');
      shareBtn.className = 'btn secondary';
      shareBtn.textContent = 'Share my referral code';
      shareBtn.addEventListener(
        'click',
        () => shareReferral(user.username)
      );

      refWrap.appendChild(shareBtn);

      const rc = document.createElement('div');
      rc.className = 'small';
      rc.style.marginTop = '6px';
      rc.textContent = `Successful referrals: ${referrals}`;

      refWrap.appendChild(rc);
      accountArea.appendChild(refWrap);

      const actions = document.createElement('div');
      actions.style.marginTop = '8px';

      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'btn';
      logoutBtn.textContent = 'Log out';
      logoutBtn.addEventListener('click', logout);

      const editBtn = document.createElement('button');
      editBtn.className = 'btn secondary';
      editBtn.textContent = 'Edit profile';
      editBtn.addEventListener(
        'click',
        () => openProfileEdit(user.username)
      );

      actions.appendChild(logoutBtn);
      actions.appendChild(editBtn);
      accountArea.appendChild(actions);

      if(profileMenu){
        profileMenu.innerHTML =
          `<button class="btn secondary" onclick="openProfileFor('${escapeHtml(user.username)}')">Profile</button>`;
      }

    } else {
      accountArea.innerHTML =
        `<div><button class="btn" id="openAuthBtn">Create account / Log in</button></div>`;

      const openAuthBtn =
        document.getElementById('openAuthBtn');

      if(openAuthBtn){
        openAuthBtn.addEventListener('click', openAuth);
      }

      if(profileMenu){
        profileMenu.innerHTML =
          `<button class="btn" id="openAuthBtn2">Sign in</button>`;
      }

      const openAuthBtn2 =
        document.getElementById('openAuthBtn2');

      if(openAuthBtn2){
        openAuthBtn2.addEventListener('click', openAuth);
      }
    }

    renderFollowingList();
  }

  // Notifications
  function addNotification(username, text){
    const notifs = loadNotifs();

    notifs.unshift({
      id:uid(),
      owner:username,
      text,
      read:false,
      createdAt:now()
    });

    saveNotifs(notifs);
    updateBadges();
  }

  function getMyNotifications(){
    const user = currentUser();

    if(!user) return [];

    return loadNotifs().filter(
      n => n.owner === user.username
    );
  }

  function renderNotifications(){
    if(!notificationsList) return;

    notificationsList.innerHTML = '';

    const my = getMyNotifications();

    if(my.length === 0){
      notificationsList.innerHTML =
        '<div class="small">No notifications</div>';
      return;
    }

    my.forEach(n => {
      const d = document.createElement('div');
      d.className = 'card';

      const h = document.createElement('div');
      h.className = 'small';
      h.textContent =
        new Date(n.createdAt).toLocaleString();

      const b = document.createElement('div');
      b.innerHTML = escapeHtml(n.text);

      d.appendChild(h);
      d.appendChild(b);
      notificationsList.appendChild(d);
    });
  }

  function openNotifications(){
    if(!notificationsDrawer) return;

    notificationsDrawer.setAttribute('aria-hidden','false');
    notificationsDrawer.style.display = 'block';

    markAllNotifsRead();
    renderNotifications();
  }

  function closeNotifications(){
    if(!notificationsDrawer) return;

    notificationsDrawer.setAttribute('aria-hidden','true');
    notificationsDrawer.style.display = 'none';
  }

  function markAllNotifsRead(){
    const user = currentUser();

    if(!user) return;

    const notifs = loadNotifs();
    let changed = false;

    for(const n of notifs){
      if(n.owner === user.username && !n.read){
        n.read = true;
        changed = true;
      }
    }

    if(changed){
      saveNotifs(notifs);
    }

    updateBadges();
  }

  function updateBadges(){
    const user = currentUser();

    if(!notifBadge) return;

    if(!user){
      notifBadge.style.display = 'none';
      return;
    }

    const my =
      getMyNotifications().filter(n => !n.read);

    if(my.length > 0){
      notifBadge.style.display = 'inline-block';
      notifBadge.textContent = my.length;
    } else {
      notifBadge.style.display = 'none';
    }
  }

  // Profiles
  function openProfileFor(username){
    openProfile();
    renderProfile(username);
  }

  window.openProfileFor = openProfileFor;

  function openProfile(){
    if(!profileDrawer) return;

    profileDrawer.setAttribute('aria-hidden','false');
    profileDrawer.style.display = 'block';
  }

  function closeProfile(){
    if(!profileDrawer) return;

    profileDrawer.setAttribute('aria-hidden','true');
    profileDrawer.style.display = 'none';
  }

  function openProfileEdit(username){
    openProfile();
    renderProfile(username, { edit:true });
  }

  // Post creation
  function createPost(){
    const text =
      (postText && postText.value || '').trim();

    const user = currentUser();

    if(!user){
      openAuth();
      return;
    }

    if(!text && attachedMedia.length === 0){
      alert(
        'Please write something or attach a photo/video.'
      );
      return;
    }

    const posts = loadPosts();

    const p = {
      id:uid(),
      author:user.username,
      text,
      media:attachedMedia.slice(),
      likes:[],
      comments:[],
      createdAt:now()
    };

    attachedMedia = [];

    posts.unshift(p);
    savePosts(posts);

    if(postText){
      postText.value = '';
    }

    const preview =
      document.getElementById('attachPreview');

    if(preview){
      preview.innerHTML = '';
    }

    renderFeed();
    updateBadges();
  }

  function buildAttachUI(){
    if(!createPostCard) return;

    if(document.getElementById('attachWrap')){
      return;
    }

    const row =
      createPostCard.querySelector('.row') ||
      createPostCard.appendChild(
        document.createElement('div')
      );

    const wrap = document.createElement('div');

    wrap.id = 'attachWrap';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';
    wrap.style.marginTop = '8px';

    const topRow = document.createElement('div');

    topRow.style.display = 'flex';
    topRow.style.gap = '8px';

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

    attachBtn.addEventListener(
      'click',
      () => fileInput.click()
    );

    fileInput.addEventListener(
      'change',
      handleFilesSelected
    );

    topRow.appendChild(attachBtn);
    topRow.appendChild(fileInput);

    wrap.appendChild(topRow);

    const preview = document.createElement('div');

    preview.id = 'attachPreview';
    preview.style.display = 'flex';
    preview.style.flexWrap = 'wrap';
    preview.style.gap = '8px';

    wrap.appendChild(preview);

    createPostCard.appendChild(wrap);
  }

  function handleFilesSelected(e){
    const files =
      Array.from(e.target.files || []);

    const preview =
      document.getElementById('attachPreview');

    if(!preview) return;

    for(const f of files){
      if(
        !f.type.startsWith('image/') &&
        !f.type.startsWith('video/')
      ){
        continue;
      }

      const reader = new FileReader();

      reader.onload = function(ev){
        const dataUrl = ev.target.result;

        const type =
          f.type.startsWith('image/')
            ? 'image'
            : 'video';

        attachedMedia.push({
          type,
          data:dataUrl,
          name:f.name
        });

        const container =
          document.createElement('div');

        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.width = '140px';
        container.style.gap = '6px';

        const box =
          document.createElement('div');

        box.style.width = '140px';
        box.style.height = '100px';
        box.style.overflow = 'hidden';
        box.style.borderRadius = '8px';
        box.style.border = '1px solid #e6f2ec';

        if(type === 'image'){
          const img =
            document.createElement('img');

          img.src = dataUrl;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';

          box.appendChild(img);

        } else {
          const vid =
            document.createElement('video');

          vid.src = dataUrl;
          vid.controls = true;
          vid.style.width = '100%';
          vid.style.height = '100%';
          vid.style.objectFit = 'cover';

          box.appendChild(vid);
        }

        const removeBtn =
          document.createElement('button');

        removeBtn.className = 'btn secondary';
        removeBtn.textContent = 'Remove';

        removeBtn.addEventListener('click', () => {
          const children =
            Array.from(preview.children);

          const index =
            children.indexOf(container);

          if(index > -1){
            attachedMedia.splice(index, 1);
          }

          container.remove();
        });

        container.appendChild(box);
        container.appendChild(removeBtn);
        preview.appendChild(container);
      };

      reader.readAsDataURL(f);
    }

    e.target.value = '';
  }

  // Feed
  function renderFeed(){
    if(!feedList) return;

    const posts = loadPosts();

    feedList.innerHTML = '';

    if(posts.length === 0){
      feedList.innerHTML =
        '<div class="card small">No posts yet.</div>';
      return;
    }

    posts.forEach(p => {
      const card =
        document.createElement('div');

      card.className = 'post card';

      const meta =
        document.createElement('div');

      meta.className = 'meta';

      const left =
        document.createElement('div');

      left.innerHTML =
        `<strong>${escapeHtml(p.author)}</strong>
         <div class="small">${new Date(p.createdAt).toLocaleString()}</div>`;

      const right =
        document.createElement('div');

      const viewBtn =
        document.createElement('button');

      viewBtn.className = 'btn secondary';
      viewBtn.textContent = 'View';

      viewBtn.addEventListener(
        'click',
        () => openProfileFor(p.author)
      );

      right.appendChild(viewBtn);

      meta.appendChild(left);
      meta.appendChild(right);

      card.appendChild(meta);

      if(p.text){
        const text =
          document.createElement('div');

        text.className = 'text';
        text.innerHTML = escapeHtml(p.text);

        card.appendChild(text);
      }

      if(p.media && p.media.length){
        const mediaWrap =
          document.createElement('div');

        mediaWrap.style.display = 'flex';
        mediaWrap.style.flexWrap = 'wrap';
        mediaWrap.style.gap = '8px';
        mediaWrap.style.marginTop = '8px';

        p.media.forEach(m => {
          const box =
            document.createElement('div');

          box.style.width = '160px';
          box.style.height = '120px';
          box.style.overflow = 'hidden';
          box.style.borderRadius = '8px';
          box.style.border = '1px solid #e6f2ec';

          if(m.type === 'image'){
            const img =
              document.createElement('img');

            img.src = m.data;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';

            box.appendChild(img);

          } else {
            const vid =
              document.createElement('video');

            vid.src = m.data;
            vid.controls = true;
            vid.style.width = '100%';
            vid.style.height = '100%';
            vid.style.objectFit = 'cover';

            box.appendChild(vid);
          }

          mediaWrap.appendChild(box);
        });

        card.appendChild(mediaWrap);
      }

      const actions =
        document.createElement('div');

      actions.className = 'actions';

      const likeBtn =
        document.createElement('button');

      likeBtn.className = 'like-btn';
      likeBtn.dataset.id = p.id;

      likeBtn.innerHTML =
        `👍 <span class="like-count">${(p.likes || []).length}</span>`;

      likeBtn.addEventListener(
        'click',
        () => toggleLike(p.id)
      );

      const commentBtn =
        document.createElement('button');

      commentBtn.className = 'btn secondary';
      commentBtn.dataset.id = p.id;
      commentBtn.textContent =
        `💬 Comment (${(p.comments || []).length})`;

      commentBtn.addEventListener(
        'click',
        () => toggleComments(p.id)
      );

      actions.appendChild(likeBtn);
      actions.appendChild(commentBtn);

      card.appendChild(actions);

      const commentArea =
        document.createElement('div');

      commentArea.className = 'comment-area';
      commentArea.id = `comments-${p.id}`;
      commentArea.style.display = 'none';

      card.appendChild(commentArea);
      feedList.appendChild(card);
    });
  }

  // Likes
  function toggleLike(postId){
    const user = currentUser();

    if(!user){
      openAuth();
      return;
    }

    const posts = loadPosts();

    const p =
      posts.find(x => x.id === postId);

    if(!p) return;

    p.likes = p.likes || [];

    const ix =
      p.likes.indexOf(user.username);

    if(ix === -1){
      p.likes.push(user.username);

      addNotification(
        p.author,
        `${user.username} liked your post.`
      );
    } else {
      p.likes.splice(ix, 1);
    }

    savePosts(posts);
    renderFeed();
    updateBadges();
  }

  // Comments
  function toggleComments(postId){
    const area =
      document.getElementById(
        `comments-${postId}`
      );

    if(!area) return;

    area.style.display =
      area.style.display === 'none'
        ? 'block'
        : 'none';

    renderComments(postId);
  }

  function renderComments(postId){
    const posts = loadPosts();

    const p =
      posts.find(x => x.id === postId);

    if(!p) return;

    const area =
      document.getElementById(
        `comments-${postId}`
      );

    if(!area) return;

    area.innerHTML = '';

    const form =
      document.createElement('div');

    form.className = 'comment-form';

    const ta =
      document.createElement('textarea');

    ta.id = `comment-input-${postId}`;
    ta.placeholder = 'Write a comment...';
    ta.style.width = '100%';
    ta.style.minHeight = '48px';

    const row =
      document.createElement('div');

    row.className = 'row';
    row.style.marginTop = '8px';

    const submit =
      document.createElement('button');

    submit.className = 'btn';
    submit.textContent = 'Reply';

    submit.addEventListener(
      'click',
      () => submitComment(postId)
    );

    row.appendChild(submit);
    form.appendChild(ta);
    form.appendChild(row);

    area.appendChild(form);

    const list =
      document.createElement('div');

    list.className = 'comment-list';

    (p.comments || []).forEach(c => {
      const ce =
        document.createElement('div');

      ce.className = 'comment';

      const meta =
        document.createElement('div');

      meta.innerHTML =
        `<strong>${escapeHtml(c.author)}</strong>
         <span class="small">${new Date(c.createdAt).toLocaleString()}</span>`;

      const body =
        document.createElement('div');

      body.innerHTML =
        escapeHtml(c.text);

      ce.appendChild(meta);
      ce.appendChild(body);

      const controls =
        document.createElement('div');

      controls.style.marginTop = '6px';

      const user = currentUser();

      if(user && user.username === c.author){
        const del =
          document.createElement('button');

        del.className = 'btn secondary';
        del.textContent = 'Delete';

        del.addEventListener(
          'click',
          () => deleteComment(postId, c.id)
        );

        controls.appendChild(del);
      }

      ce.appendChild(controls);
      list.appendChild(ce);
    });

    area.appendChild(list);
  }

  function submitComment(postId){
    const user = currentUser();

    if(!user){
      openAuth();
      return;
    }

    const input =
      document.getElementById(
        `comment-input-${postId}`
      );

    if(!input) return;

    const text =
      (input.value || '').trim();

    if(!text) return;

    const posts = loadPosts();

    const p =
      posts.find(x => x.id === postId);

    if(!p) return;

    p.comments = p.comments || [];

    const comment = {
      id:uid(),
      author:user.username,
      text,
      createdAt:now()
    };

    p.comments.push(comment);

    savePosts(posts);

    addNotification(
      p.author,
      `${user.username} commented on your post.`
    );

    renderComments(postId);
    renderFeed();
    updateBadges();
  }

  function deleteComment(postId, commentId){
    const user = currentUser();

    if(!user){
      openAuth();
      return;
    }

    const posts = loadPosts();

    const p =
      posts.find(x => x.id === postId);

    if(!p) return;

    const ix =
      (p.comments || []).findIndex(
        c => c.id === commentId
      );

    if(ix === -1) return;

    if(p.comments[ix].author !== user.username){
      return;
    }

    p.comments.splice(ix, 1);

    savePosts(posts);
    renderComments(postId);
    renderFeed();
  }

  // Profiles
  function renderProfile(username, opts = {}){
    const users = loadUsers();

    const u =
      users.find(x => x.username === username);

    if(!u) return;

    const posts =
      loadPosts().filter(
        p => p.author === username
      );

    const referrals =
      countReferrals(username);

    if(!profileContent) return;

    profileContent.innerHTML = '';

    const header =
      document.createElement('div');

    header.innerHTML =
      `<h3>${escapeHtml(u.username)}</h3>
       <div class="small">${escapeHtml(u.profile.bio || '')}</div>
       <div class="small">${escapeHtml(u.profile.location || '')}</div>`;

    const refWrap =
      document.createElement('div');

    refWrap.style.marginTop = '8px';

    refWrap.innerHTML =
      `Referral code: <strong>${escapeHtml(u.referralCode || '')}</strong> `;

    const shareBtn =
      document.createElement('button');

    shareBtn.className = 'btn secondary';
    shareBtn.textContent = 'Share';

    shareBtn.addEventListener(
      'click',
      () => shareReferral(username)
    );

    refWrap.appendChild(shareBtn);

    const rc =
      document.createElement('div');

    rc.className = 'small';
    rc.textContent =
      `Successful referrals: ${referrals}`;

    refWrap.appendChild(rc);
    header.appendChild(refWrap);
    profileContent.appendChild(header);

    const actions =
      document.createElement('div');

    actions.id = 'profileActions';
    actions.style.marginTop = '10px';

    const current = currentUser();

    if(current && current.username === username){
      const edit =
        document.createElement('button');

      edit.className = 'btn';
      edit.textContent = 'Edit profile';

      edit.addEventListener(
        'click',
        () => renderProfile(username, { edit:true })
      );

      actions.appendChild(edit);

    } else if(current){
      const isFollowing =
        u.followers &&
        u.followers.includes(current.username);

      const followBtn =
        document.createElement('button');

      followBtn.className = 'btn';

      followBtn.textContent =
        isFollowing
          ? 'Unfollow'
          : 'Follow';

      followBtn.addEventListener(
        'click',
        () => {
          toggleFollow(username);
          renderProfile(username);
          renderAll();
        }
      );

      actions.appendChild(followBtn);

    } else {
      const sign =
        document.createElement('button');

      sign.className = 'btn';
      sign.textContent = 'Sign in to follow';

      sign.addEventListener(
        'click',
        openAuth
      );

      actions.appendChild(sign);
    }

    profileContent.appendChild(actions);

    if(opts.edit){
      profileContent.innerHTML = '';

      const form =
        document.createElement('div');

      form.innerHTML =
        '<h3>Edit profile</h3>';

      const bioInput =
        document.createElement('input');

      bioInput.id = 'editBio';
      bioInput.placeholder = 'Bio';
      bioInput.value =
        u.profile.bio || '';

      const locInput =
        document.createElement('input');

      locInput.id = 'editLocation';
      locInput.placeholder = 'Location';
      locInput.value =
        u.profile.location || '';

      const row =
        document.createElement('div');

      row.className = 'row';
      row.style.marginTop = '8px';

      const save =
        document.createElement('button');

      save.className = 'btn';
      save.textContent = 'Save';

      const cancel =
        document.createElement('button');

      cancel.className = 'btn secondary';
      cancel.textContent = 'Cancel';

      save.addEventListener('click', () => {
        u.profile.bio =
          document.getElementById('editBio').value;

        u.profile.location =
          document.getElementById('editLocation').value;

        saveUsers(users);
        renderProfile(username);
        renderAll();
      });

      cancel.addEventListener(
        'click',
        () => renderProfile(username)
      );

      row.appendChild(save);
      row.appendChild(cancel);

      form.appendChild(bioInput);
      form.appendChild(locInput);
      form.appendChild(row);

      profileContent.appendChild(form);
      return;
    }

    const postsWrap =
      document.createElement('div');

    postsWrap.style.marginTop = '12px';
    postsWrap.innerHTML = '<h4>Posts</h4>';

    const profilePosts =
      document.createElement('div');

    profilePosts.id = 'profilePosts';

    posts.forEach(p => {
      const el =
        document.createElement('div');

      el.className = 'post';

      const head =
        document.createElement('div');

      head.innerHTML =
        `<div><strong>${escapeHtml(p.author)}</strong>
         <span class="small">${new Date(p.createdAt).toLocaleString()}</span></div>`;

      el.appendChild(head);

      if(p.text){
        const t =
          document.createElement('div');

        t.className = 'text';
        t.innerHTML = escapeHtml(p.text);

        el.appendChild(t);
      }

      if(p.media && p.media.length){
        const mediaWrap =
          document.createElement('div');

        mediaWrap.style.display = 'flex';
        mediaWrap.style.gap = '8px';
        mediaWrap.style.marginTop = '8px';

        p.media.forEach(m => {
          const box =
            document.createElement('div');

          box.style.width = '160px';
          box.style.height = '120px';
          box.style.overflow = 'hidden';
          box.style.borderRadius = '8px';
          box.style.border = '1px solid #e6f2ec';

          if(m.type === 'image'){
            const img =
              document.createElement('img');

            img.src = m.data;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';

            box.appendChild(img);

          } else {
            const vid =
              document.createElement('video');

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

      const act =
        document.createElement('div');

      act.className = 'actions';

      const like =
        document.createElement('button');

      like.className = 'like-btn';
      like.dataset.id = p.id;

      like.innerHTML =
        `👍 <span class="like-count">${(p.likes || []).length}</span>`;

      like.addEventListener(
        'click',
        () => toggleLike(p.id)
      );

      act.appendChild(like);

      profilePosts.appendChild(el);
    });

    postsWrap.appendChild(profilePosts);
    profileContent.appendChild(postsWrap);
  }

  function toggleFollow(target){
    const user = currentUser();

    if(!user){
      openAuth();
      return;
    }

    const users = loadUsers();

    const me =
      users.find(
        x => x.username === user.username
      );

    const them =
      users.find(
        x => x.username === target
      );

    if(!me || !them) return;

    me.following = me.following || [];
    them.followers = them.followers || [];

    const i =
      me.following.indexOf(target);

    if(i === -1){
      me.following.push(target);

      if(!them.followers.includes(me.username)){
        them.followers.push(me.username);
      }

      addNotification(
        target,
        `${me.username} started following you.`
      );

    } else {
      me.following.splice(i, 1);

      const j =
        them.followers.indexOf(me.username);

      if(j > -1){
        them.followers.splice(j, 1);
      }
    }

    saveUsers(users);
    renderFollowingList();
  }

  function renderFollowingList(){
    if(!followingList) return;

    followingList.innerHTML = '';

    const user = currentUser();

    if(!user) return;

    const u =
      loadUsers().find(
        x => x.username === user.username
      );

    if(!u || !u.following) return;

    u.following.forEach(f => {
      const li =
        document.createElement('li');

      const btn =
        document.createElement('button');

      btn.className = 'btn secondary';
      btn.textContent = f;

      btn.addEventListener(
        'click',
        () => openProfileFor(f)
      );

      li.appendChild(btn);
      followingList.appendChild(li);
    });
  }

  function renderSuggestions(){
    if(!suggestionsList) return;

    suggestionsList.innerHTML = '';

    const users = loadUsers();
    const current = currentUser();

    const candidates =
      users
        .filter(
          x => !current ||
               x.username !== current.username
        )
        .slice(0,5);

    candidates.forEach(u => {
      const li =
        document.createElement('li');

      const info =
        document.createElement('div');

      info.innerHTML =
        `<strong>${escapeHtml(u.username)}</strong>
         <div class="small">${escapeHtml(u.profile.bio || '')}</div>`;

      const viewBtn =
        document.createElement('button');

      viewBtn.className = 'btn';
      viewBtn.textContent = 'View';

      viewBtn.addEventListener(
        'click',
        () => openProfileFor(u.username)
      );

      const followBtn =
        document.createElement('button');

      followBtn.className = 'btn secondary';
      followBtn.textContent = 'Follow';

      followBtn.addEventListener(
        'click',
        () => toggleFollow(u.username)
      );

      const wrap =
        document.createElement('div');

      wrap.style.marginTop = '6px';

      wrap.appendChild(viewBtn);
      wrap.appendChild(followBtn);

      li.appendChild(info);
      li.appendChild(wrap);

      suggestionsList.appendChild(li);
    });
  }

  // Search
  function doSearch(){
    if(!searchResults) return;

    const q =
      (searchInput && searchInput.value || '')
        .trim()
        .toLowerCase();

    searchResults.innerHTML = '';

    if(!q) return;

    const users =
      loadUsers().filter(
        u =>
          u.username.toLowerCase().includes(q) ||
          (
            u.profile &&
            u.profile.bio &&
            u.profile.bio.toLowerCase().includes(q)
          )
      );

    const posts =
      loadPosts().filter(
        p =>
          p.text &&
          p.text.toLowerCase().includes(q)
      );

    if(users.length === 0 && posts.length === 0){
      searchResults.innerHTML =
        '<div class="small">No results</div>';

      return;
    }

    if(users.length > 0){
      const h =
        document.createElement('div');

      h.innerHTML = '<h4>Users</h4>';

      searchResults.appendChild(h);

      users.forEach(u => {
        const el =
          document.createElement('div');

        el.className = 'card';

        el.innerHTML =
          `<div>
             <strong>${escapeHtml(u.username)}</strong>
             <div class="small">${escapeHtml(u.profile.bio || '')}</div>
           </div>`;

        const view =
          document.createElement('button');

        view.className = 'btn';
        view.textContent = 'View';

        view.addEventListener(
          'click',
          () => openProfileFor(u.username)
        );

        el.appendChild(view);
        searchResults.appendChild(el);
      });
    }

    if(posts.length > 0){
      const h2 =
        document.createElement('div');

      h2.innerHTML = '<h4>Posts</h4>';

      searchResults.appendChild(h2);

      posts.forEach(p => {
        const el =
          document.createElement('div');

        el.className = 'post card';

        el.innerHTML =
          `<div>
             <strong>${escapeHtml(p.author)}</strong>
             <span class="small">${new Date(p.createdAt).toLocaleString()}</span>
           </div>
           <div class="text">${escapeHtml(p.text || '')}</div>`;

        const viewAuthor =
          document.createElement('button');

        viewAuthor.className = 'btn';
        viewAuthor.textContent = 'View author';

        viewAuthor.addEventListener(
          'click',
          () => openProfileFor(p.author)
        );

        el.appendChild(viewAuthor);
        searchResults.appendChild(el);
      });
    }
  }

  // Share referral
  function shareReferral(username){
    const users = loadUsers();

    const u =
      users.find(
        x => x.username === username
      );

    if(!u) return;

    const code = u.referralCode || '';

    const shareText =
      `Join me on FFConnect! Use my referral code ${code} to sign up.`;

    const url =
      location.origin + location.pathname;

    if(navigator.share){
      navigator.share({
        title:'Join FFConnect',
        text:shareText,
        url
      }).catch(()=>{});

    } else if(navigator.clipboard){
      navigator.clipboard
        .writeText(`${shareText} ${url}`)
        .then(() => {
          alert('Referral code copied to clipboard');
        })
        .catch(() => {
          prompt(
            'Copy this referral info',
            `${shareText} ${url}`
          );
        });

    } else {
      prompt(
        'Copy this referral info',
        `${shareText} ${url}`
      );
    }
  }

  // Delete post/user
  function deletePost(postId){
    const user = currentUser();

    if(!user){
      openAuth();
      return;
    }

    const posts = loadPosts();

    const ix =
      posts.findIndex(
        p => p.id === postId
      );

    if(ix === -1) return;

    if(posts[ix].author !== user.username){
      return;
    }

    posts.splice(ix, 1);
    savePosts(posts);
    renderFeed();
  }

  function deleteUser(username){
    const users =
      loadUsers().filter(
        u => u.username !== username
      );

    saveUsers(users);

    const posts =
      loadPosts().filter(
        p => p.author !== username
      );

    savePosts(posts);
  }

  // Initialization
  function init(){

    // Get DOM elements only after DOM is ready
    searchInput =
      document.getElementById('searchInput');

    searchBtn =
      document.getElementById('searchBtn');

    feedList =
      document.getElementById('feedList');

    postText =
      document.getElementById('postText');

    postCreateBtn =
      document.getElementById('postCreateBtn');

    accountArea =
      document.getElementById('accountArea');

    profileMenu =
      document.getElementById('profileMenu');

    authModal =
      document.getElementById('authModal');

    authSubmit =
      document.getElementById('authSubmit');

    authToggle =
      document.getElementById('authToggle');

    authTitle =
      document.getElementById('authTitle');

    authMsg =
      document.getElementById('authMsg');

    authUsername =
      document.getElementById('authUsername');

    authPassword =
      document.getElementById('authPassword');

    authBio =
      document.getElementById('authBio');

    authReferral =
      document.getElementById('authReferral');

    myProfileBtn =
      document.getElementById('myProfileBtn');

    newPostBtn =
      document.getElementById('newPostBtn');

    followingList =
      document.getElementById('followingList');

    suggestionsList =
      document.getElementById('suggestionsList');

    notificationsDrawer =
      document.getElementById('notificationsDrawer');

    notifBtn =
      document.getElementById('notifBtn');

    notifBadge =
      document.getElementById('notifBadge');

    notificationsList =
      document.getElementById('notificationsList');
