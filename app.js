document.addEventListener("DOMContentLoaded", () => {
  const USERS = "ff_users_v3";
  const POSTS = "ff_posts_v3";
  const CURRENT = "ff_current_v3";
  const NOTIFS = "ff_notifs_v3";

  const $ = id => document.getElementById(id);

  const searchInput = $("searchInput");
  const searchBtn = $("searchBtn");
  const feedList = $("feedList");
  const postText = $("postText");
  const postCreateBtn = $("postCreateBtn");
  const accountArea = $("accountArea");
  const profileMenu = $("profileMenu");
  const authModal = $("authModal");
  const authSubmit = $("authSubmit");
  const authToggle = $("authToggle");
  const authTitle = $("authTitle");
  const authMsg = $("authMsg");
  const authUsername = $("authUsername");
  const authPassword = $("authPassword");
  const authBio = $("authBio");
  const authReferral = $("authReferral");
  const followingList = $("followingList");
  const suggestionsList = $("suggestionsList");
  const notificationsDrawer = $("notificationsDrawer");
  const notifBtn = $("notifBtn");
  const notifBadge = $("notifBadge");
  const notificationsList = $("notificationsList");
  const searchResults = $("searchResults");
  const profileDrawer = $("profileDrawer");
  const profileContent = $("profileContent");
  const newPostBtn = $("newPostBtn");
  const myProfileBtn = $("myProfileBtn");
  const createPostCard = $("createPostCard");

  let authMode = "register";
  let mediaFiles = [];

  function get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function users() {
    return get(USERS, []);
  }

  function posts() {
    return get(POSTS, []);
  }

  function current() {
    return get(CURRENT, null);
  }

  function notifications() {
    return get(NOTIFS, []);
  }

  function saveUsers(x) {
    set(USERS, x);
  }

  function savePosts(x) {
    set(POSTS, x);
  }

  function saveNotifications(x) {
    set(NOTIFS, x);
  }

  function id() {
    return Date.now() + Math.floor(Math.random() * 10000);
  }

  function safe(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function currentUser() {
    const c = current();
    if (!c) return null;
    return users().find(u => u.username === c.username) || null;
  }

  /* ---------------- AUTH ---------------- */

  function openAuth() {
    if (!authModal) return;
    authModal.style.display = "flex";
    authModal.setAttribute("aria-hidden", "false");
  }

  function closeAuth() {
    if (!authModal) return;
    authModal.style.display = "none";
    authModal.setAttribute("aria-hidden", "true");
  }

  function showAuth(message, good = false) {
    if (!authMsg) return;
    authMsg.textContent = message;
    authMsg.style.color = good ? "green" : "red";
  }

  function switchAuth() {
    authMode = authMode === "register" ? "login" : "register";

    if (authTitle)
      authTitle.textContent =
        authMode === "register" ? "Create an account" : "Log in";

    if (authSubmit)
      authSubmit.textContent =
        authMode === "register" ? "Create account" : "Log in";

    if (authToggle)
      authToggle.textContent =
        authMode === "register"
          ? "Switch to Log in"
          : "Switch to Create";

    showAuth("");
  }

  function registerOrLogin() {
    const username = (authUsername?.value || "").trim();
    const password = authPassword?.value || "";
    const bio = (authBio?.value || "").trim();
    const referral = (authReferral?.value || "").trim();

    if (!username || !password) {
      showAuth("Enter username and password.");
      return;
    }

    const list = users();

    if (authMode === "register") {
      if (
        list.some(
          u => u.username.toLowerCase() === username.toLowerCase()
        )
      ) {
        showAuth("Username already exists.");
        return;
      }

      let referredBy = null;

      if (referral) {
        const ref = list.find(
          u =>
            u.referralCode &&
            u.referralCode.toLowerCase() === referral.toLowerCase()
        );

        if (!ref) {
          showAuth("Referral code not found.");
          return;
        }

        referredBy = ref.username;
      }

      const newUser = {
        username,
        password,
        profile: {
          bio,
          location: ""
        },
        followers: [],
        following: [],
        referralCode:
          username.substring(0, 4).toUpperCase() +
          "-" +
          Math.random().toString(36).substring(2, 8).toUpperCase(),
        referredBy
      };

      list.push(newUser);
      saveUsers(list);

      set(CURRENT, { username });

      closeAuth();
      clearAuthFields();
      renderAll();

      alert("Account created successfully!");
    } else {
      const found = list.find(
        u =>
          u.username.toLowerCase() === username.toLowerCase() &&
          u.password === password
      );

      if (!found) {
        showAuth("Wrong username or password.");
        return;
      }

      set(CURRENT, { username: found.username });

      closeAuth();
      clearAuthFields();
      renderAll();

      alert("Logged in successfully!");
    }
  }

  function clearAuthFields() {
    if (authUsername) authUsername.value = "";
    if (authPassword) authPassword.value = "";
    if (authBio) authBio.value = "";
    if (authReferral) authReferral.value = "";
  }

  /* ---------------- ACCOUNT ---------------- */

  function logout() {
    localStorage.removeItem(CURRENT);
    renderAll();
  }

  function renderAccount() {
    if (!accountArea) return;

    const user = currentUser();

    if (!user) {
      accountArea.innerHTML = `
        <button class="btn" id="loginAccountBtn">
          Create account / Log in
        </button>
      `;

      const btn = $("loginAccountBtn");
      if (btn) btn.onclick = openAuth;

      if (profileMenu) {
        profileMenu.innerHTML = `
          <button class="btn secondary" id="menuLoginBtn">Sign in</button>
        `;
        $("menuLoginBtn").onclick = openAuth;
      }

      return;
    }

    const referralCount = users().filter(
      u => u.referredBy === user.username
    ).length;

    accountArea.innerHTML = `
      <div>
        <strong>${safe(user.username)}</strong>
        <div class="small">${safe(user.profile?.bio || "")}</div>

        <div style="margin-top:10px">
          Referral code:
          <strong>${safe(user.referralCode || "")}</strong>
        </div>

        <div class="small">
          Successful referrals: ${referralCount}
        </div>

        <div style="margin-top:10px">
          <button class="btn" id="logoutBtn">Log out</button>
          <button class="btn secondary" id="editAccountBtn">
            Edit profile
          </button>
        </div>
      </div>
    `;

    $("logoutBtn").onclick = logout;
    $("editAccountBtn").onclick = () =>
      openProfileFor(user.username, true);

    if (profileMenu) {
      profileMenu.innerHTML = `
        <button class="btn secondary" id="menuProfileBtn">
          Profile
        </button>
      `;
      $("menuProfileBtn").onclick = () =>
        openProfileFor(user.username);
    }
  }

  /* ---------------- POSTS ---------------- */

  function createPost() {
    const user = currentUser();

    if (!user) {
      openAuth();
      return;
    }

    const text = (postText?.value || "").trim();

    if (!text && mediaFiles.length === 0) {
      alert("Write something or add a photo/video.");
      return;
    }

    const newPost = {
      id: id(),
      author: user.username,
      text,
      media: mediaFiles,
      likes: [],
      comments: [],
      createdAt: Date.now()
    };

    const list = posts();
    list.unshift(newPost);
    savePosts(list);

    mediaFiles = [];

    if (postText) postText.value = "";

    const preview = $("mediaPreview");
    if (preview) preview.innerHTML = "";

    renderFeed();
  }

  function renderFeed() {
    if (!feedList) return;

    const list = posts();

    feedList.innerHTML = "";

    if (!list.length) {
      feedList.innerHTML =
        `<div class="card small">No posts yet. Be the first to post!</div>`;
      return;
    }

    list.forEach(post => {
      const article = document.createElement("div");
      article.className = "post card";

      article.innerHTML = `
        <div class="meta">
          <div>
            <strong>${safe(post.author)}</strong>
            <div class="small">
              ${new Date(post.createdAt).toLocaleString()}
            </div>
          </div>

          <button class="btn secondary view-user">
            Profile
          </button>
        </div>

        ${
          post.text
            ? `<div class="text">${safe(post.text)}</div>`
            : ""
        }

        <div class="post-media"></div>

        <div class="actions">
          <button class="like-btn">
            👍 ${post.likes?.length || 0}
          </button>

          <button class="btn secondary comment-btn">
            💬 Comment (${post.comments?.length || 0})
          </button>
        </div>

        <div class="comments" style="display:none"></div>
      `;

      article.querySelector(".view-user").onclick = () =>
        openProfileFor(post.author);

      article.querySelector(".like-btn").onclick = () =>
        toggleLike(post.id);

      article.querySelector(".comment-btn").onclick = () => {
        const area = article.querySelector(".comments");
        area.style.display =
          area.style.display === "none" ? "block" : "none";
        renderComments(post.id, area);
      };

      const mediaBox = article.querySelector(".post-media");

      (post.media || []).forEach(m => {
        if (m.type === "image") {
          const img = document.createElement("img");
          img.src = m.data;
          img.style.maxWidth = "100%";
          img.style.maxHeight = "400px";
          img.style.borderRadius = "10px";
          img.style.marginTop = "8px";
          mediaBox.appendChild(img);
        }

        if (m.type === "video") {
          const video = document.createElement("video");
          video.src = m.data;
          video.controls = true;
          video.style.maxWidth = "100%";
          video.style.maxHeight = "400px";
          video.style.borderRadius = "10px";
          video.style.marginTop = "8px";
          mediaBox.appendChild(video);
        }
      });

      feedList.appendChild(article);
    });
  }

  function toggleLike(postId) {
    const user = currentUser();

    if (!user) {
      openAuth();
      return;
    }

    const list = posts();
    const post = list.find(p => p.id === postId);

    if (!post) return;

    post.likes = post.likes || [];

    const index = post.likes.indexOf(user.username);

    if (index === -1) {
      post.likes.push(user.username);

      if (post.author !== user.username) {
        addNotification(
          post.author,
          `${user.username} liked your post.`
        );
      }
    } else {
      post.likes.splice(index, 1);
    }

    savePosts(list);
    renderFeed();
  }

  /* ---------------- COMMENTS ---------------- */

  function renderComments(postId, area) {
    const post = posts().find(p => p.id === postId);

    if (!post || !area) return;

    area.innerHTML = `
      <textarea
        class="comment-input"
        placeholder="Write a comment..."
        style="width:100%;min-height:50px"
      ></textarea>

      <button class="btn comment-send">
        Reply
      </button>

      <div class="comment-list"></div>
    `;

    area.querySelector(".comment-send").onclick = () => {
      const input = area.querySelector(".comment-input");
      const text = input.value.trim();

      if (!text) return;

      const user = currentUser();

      if (!user) {
        openAuth();
        return;
      }

      const list = posts();
      const target = list.find(p => p.id === postId);

      target.comments = target.comments || [];

      target.comments.push({
        id: id(),
        author: user.username,
        text,
        createdAt: Date.now()
      });

      savePosts(list);

      if (target.author !== user.username) {
        addNotification(
          target.author,
          `${user.username} commented on your post.`
        );
      }

      renderFeed();
    };

    const commentList = area.querySelector(".comment-list");

    (post.comments || []).forEach(comment => {
      const div = document.createElement("div");
      div.className = "comment";
      div.style.marginTop = "8px";

      div.innerHTML = `
        <strong>${safe(comment.author)}</strong>
        <div>${safe(comment.text)}</div>
        <div class="small">
          ${new Date(comment.createdAt).toLocaleString()}
        </div>
      `;

      commentList.appendChild(div);
    });
  }

  /* ---------------- FOLLOW ---------------- */

  function followUser(username) {
    const me = currentUser();

    if (!me) {
      openAuth();
      return;
    }

    if (me.username === username) return;

    const list = users();
    const myself = list.find(u => u.username === me.username);
    const target = list.find(u => u.username === username);

    if (!myself || !target) return;

    myself.following = myself.following || [];
    target.followers = target.followers || [];

    const index = myself.following.indexOf(username);

    if (index === -1) {
      myself.following.push(username);

      if (!target.followers.includes(myself.username)) {
        target.followers.push(myself.username);
      }

      addNotification(
        username,
        `${myself.username} started following you.`
      );
    } else {
      myself.following.splice(index, 1);

      const followerIndex =
        target.followers.indexOf(myself.username);

      if (followerIndex !== -1) {
        target.followers.splice(followerIndex, 1);
      }
    }

    saveUsers(list);

    renderAll();
    openProfileFor(username);
  }

  function renderFollowing() {
    if (!followingList) return;

    followingList.innerHTML = "";

    const user = currentUser();

    if (!user) return;

    (user.following || []).forEach(name => {
      const li = document.createElement("li");

      const btn = document.createElement("button");
      btn.className = "btn secondary";
      btn.textContent = name;
      btn.onclick = () => openProfileFor(name);

      li.appendChild(btn);
      followingList.appendChild(li);
    });
  }

  function renderSuggestions() {
    if (!suggestionsList) return;

    suggestionsList.innerHTML = "";

    const me = currentUser();

    users()
      .filter(u => !me || u.username !== me.username)
      .slice(0, 5)
      .forEach(user => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
          <strong>${safe(user.username)}</strong>
          <div class="small">${safe(user.profile?.bio || "")}</div>
        `;

        const view = document.createElement("button");
        view.className = "btn";
        view.textContent = "View";
        view.onclick = () => openProfileFor(user.username);

        const follow = document.createElement("button");
        follow.className = "btn secondary";
        follow.textContent =
          me && user.followers?.includes(me.username)
            ? "Unfollow"
            : "Follow";

        follow.onclick = () => followUser(user.username);

        div.appendChild(view);
        div.appendChild(follow);

        suggestionsList.appendChild(div);
      });
  }

  /* ---------------- PROFILE ---------------- */

  function openProfileFor(username, edit = false) {
    if (!profileDrawer || !profileContent) return;

    profileDrawer.style.display = "block";
    profileDrawer.setAttribute("aria-hidden", "false");

    renderProfile(username, edit);
  }

  function closeProfile() {
    if (!profileDrawer) return;

    profileDrawer.style.display = "none";
    profileDrawer.setAttribute("aria-hidden", "true");
  }

  function renderProfile(username, edit = false) {
    const user = users().find(u => u.username === username);

    if (!user || !profileContent) return;

    if (edit) {
      profileContent.innerHTML = `
        <h3>Edit profile</h3>

        <input
          id="editBio"
          placeholder="Bio"
          value="${safe(user.profile?.bio || "")}"
        >

        <input
          id="editLocation"
          placeholder="Location"
          value="${safe(user.profile?.location || "")}"
        >

        <button class="btn" id="saveProfileBtn">
          Save
        </button>

        <button class="btn secondary" id="cancelProfileBtn">
          Cancel
        </button>
      `;

      $("saveProfileBtn").onclick = () => {
        const list = users();
        const u = list.find(x => x.username === username);

        u.profile.bio = $("editBio").value;
        u.profile.location = $("editLocation").value;

        saveUsers(list);

        renderAll();
        renderProfile(username);
      };

      $("cancelProfileBtn").onclick = () =>
        renderProfile(username);

      return;
    }

    const me = currentUser();
    const following =
      me && user.followers?.includes(me.username);

    profileContent.innerHTML = `
      <h3>${safe(user.username)}</h3>

      <div class="small">
        ${safe(user.profile?.bio || "No bio yet.")}
      </div>

      <div class="small">
        ${safe(user.profile?.location || "")}
      </div>

      <p>
        Followers: ${user.followers?.length || 0}
        · Following: ${user.following?.length || 0}
      </p>

      <div id="profileActionArea"></div>

      <hr>

      <h4>Posts</h4>

      <div id="profilePosts"></div>
    `;

    const actions = $("profileActionArea");

    if (me && me.username === username) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn";
      editBtn.textContent = "Edit profile";
      editBtn.onclick = () => renderProfile(username, true);
      actions.appendChild(editBtn);
    } else if (me) {
      const followBtn = document.createElement("button");
      followBtn.className = "btn";
      followBtn.textContent = following ? "Unfollow" : "Follow";
      followBtn.onclick = () => followUser(username);
      actions.appendChild(followBtn);
    } else {
      const login = document.createElement("button");
      login.className = "btn";
      login.textContent = "Sign in to follow";
      login.onclick = openAuth;
      actions.appendChild(login);
    }

    const profilePosts = $("profilePosts");

    posts()
      .filter(p => p.author === username)
      .forEach(post => {
        const div = document.createElement("div");
        div.className = "post card";

        div.innerHTML = `
          <div class="small">
            ${new Date(post.createdAt).toLocaleString()}
          </div>

          <div>${safe(post.text || "")}</div>

          <div>
            👍 ${post.likes?.length || 0}
          </div>
        `;

        profilePosts.appendChild(div);
      });
  }

  /* ---------------- SEARCH ---------------- */

  function search() {
    if (!searchResults || !searchInput) return;

    const q = searchInput.value.trim().toLowerCase();

    searchResults.innerHTML = "";

    if (!q) return;

    const foundUsers = users().filter(u =>
      u.username.toLowerCase().includes(q) ||
      (u.profile?.bio || "").toLowerCase().includes(q)
    );

    const foundPosts = posts().filter(p =>
      (p.text || "").toLowerCase().includes(q)
    );

    if (!foundUsers.length && !foundPosts.length) {
      searchResults.innerHTML =
        `<div class="small">No results found.</div>`;
      return;
    }

    foundUsers.forEach(user => {
      const div = docu
