// app.js — simple FFConnect app
(function () {
  "use strict";

  // =========================
  // STORAGE KEYS
  // =========================
  const USERS_KEY = "ff_users_v2";
  const POSTS_KEY = "ff_posts_v2";
  const CURRENT_KEY = "ff_current_v2";
  const NOTIF_KEY = "ff_notifications_v2";

  // =========================
  // HELPERS
  // =========================
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

  const myProfileBtn = $("myProfileBtn");
  const newPostBtn = $("newPostBtn");

  const followingList = $("followingList");
  const suggestionsList = $("suggestionsList");

  const notificationsDrawer = $("notificationsDrawer");
  const notifBtn = $("notifBtn");
  const notifBadge = $("notifBadge");
  const notificationsList = $("notificationsList");

  const searchResults = $("searchResults");
  const profileDrawer = $("profileDrawer");
  const profileContent = $("profileContent");

  let authMode = "register";

  // =========================
  // STORAGE
  // =========================
  function getData(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadUsers() {
    return getData(USERS_KEY, []);
  }

  function saveUsers(users) {
    saveData(USERS_KEY, users);
  }

  function loadPosts() {
    return getData(POSTS_KEY, []);
  }

  function savePosts(posts) {
    saveData(POSTS_KEY, posts);
  }

  function loadNotifs() {
    return getData(NOTIF_KEY, []);
  }

  function saveNotifs(notifs) {
    saveData(NOTIF_KEY, notifs);
  }

  function currentUser() {
    return getData(CURRENT_KEY, null);
  }

  function setCurrentUser(user) {
    saveData(CURRENT_KEY, user);
    renderAll();
  }

  function logout() {
    localStorage.removeItem(CURRENT_KEY);
    renderAll();
  }

  function now() {
    return Date.now();
  }

  function uid() {
    return Date.now() + Math.floor(Math.random() * 100000);
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =========================
  // REFERRAL CODE
  // =========================
  function generateReferralCode(username) {
    const users = loadUsers();

    let code;

    do {
      const random = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const base = String(username || "USER")
        .substring(0, 4)
        .toUpperCase();

      code = base + "-" + random;
    } while (users.some(user => user.referralCode === code));

    return code;
  }

  function countReferrals(username) {
    return loadUsers().filter(
      user => user.referredBy === username
    ).length;
  }

  // =========================
  // STARTER DATA
  // =========================
  function seed() {
    if (!localStorage.getItem(USERS_KEY)) {
      saveUsers([
        {
          username: "alice",
          password: "alice",
          profile: {
            bio: "Welcome to FFConnect",
            location: "Lagos"
          },
          followers: [],
          following: [],
          referralCode: generateReferralCode("alice"),
          referredBy: null
        },
        {
          username: "bob",
          password: "bob",
          profile: {
            bio: "Building cool things",
            location: "Abuja"
          },
          followers: [],
          following: [],
          referralCode: generateReferralCode("bob"),
          referredBy: null
        }
      ]);
    }

    if (!localStorage.getItem(POSTS_KEY)) {
      savePosts([
        {
          id: uid(),
          author: "alice",
          text: "Welcome to FFConnect!",
          likes: [],
          comments: [],
          createdAt: now()
        },
        {
          id: uid(),
          author: "bob",
          text: "Follow someone and leave a comment.",
          likes: [],
          comments: [],
          createdAt: now()
        }
      ]);
    }

    if (!localStorage.getItem(NOTIF_KEY)) {
      saveNotifs([]);
    }
  }

  // =========================
  // AUTH
  // =========================
  function openAuth() {
    if (!authModal) return;

    authModal.style.display = "flex";
    authModal.setAttribute("aria-hidden", "false");

    if (authMsg) {
      authMsg.textContent = "";
    }
  }

  window.openAuth = openAuth;

  function closeAuth() {
    if (!authModal) return;

    authModal.style.display = "none";
    authModal.setAttribute("aria-hidden", "true");
  }

  function toggleAuthMode() {
    authMode = authMode === "register" ? "login" : "register";

    if (authTitle) {
      authTitle.textContent =
        authMode === "register" ? "Create an account" : "Log in";
    }

    if (authSubmit) {
      authSubmit.textContent =
        authMode === "register" ? "Create account" : "Log in";
    }

    if (authToggle) {
      authToggle.textContent =
        authMode === "register"
          ? "Switch to Log in"
          : "Switch to Create";
    }
  }

  function showAuthMessage(message, success = false) {
    if (!authMsg) return;

    authMsg.textContent = message;
    authMsg.style.color = success ? "#16a34a" : "#b91c1c";
  }

  function submitAuth() {
    if (!authUsername || !authPassword) return;

    const username = authUsername.value.trim();
    const password = authPassword.value;
    const bio = authBio ? authBio.value.trim() : "";
    const referral = authReferral
      ? authReferral.value.trim()
      : "";

    if (!username || !password) {
      showAuthMessage("Enter username and password.");
      return;
    }

    const users = loadUsers();

    // REGISTER
    if (authMode === "register") {
      const exists = users.some(
        user =>
          user.username.toLowerCase() === username.toLowerCase()
      );

      if (exists) {
        showAuthMessage("Username already exists.");
        return;
      }

      let referredBy = null;

      if (referral) {
        const owner = users.find(
          user =>
            user.referralCode &&
            user.referralCode.toLowerCase() ===
              referral.toLowerCase()
        );

        if (owner) {
          referredBy = owner.username;
        }
      }

      const newUser = {
        username: username,
        password: password,
        profile: {
          bio: bio,
          location: ""
        },
        followers: [],
        following: [],
        referralCode: generateReferralCode(username),
        referredBy: referredBy
      };

      users.push(newUser);
      saveUsers(users);

      setCurrentUser({
        username: username
      });

      closeAuth();

      alert("Account created successfully!");

      clearAuthInputs();
      return;
    }

    // LOGIN
    const found = users.find(
      user =>
        user.username.toLowerCase() === username.toLowerCase() &&
        user.password === password
    );

    if (!found) {
      showAuthMessage("Wrong username or password.");
      return;
    }

    setCurrentUser({
      username: found.username
    });

    closeAuth();

    clearAuthInputs();
  }

  function clearAuthInputs() {
    if (authUsername) authUsername.value = "";
    if (authPassword) authPassword.value = "";
    if (authBio) authBio.value = "";
    if (authReferral) authReferral.value = "";
  }

  // =========================
  // ACCOUNT
  // =========================
  function renderAccountArea() {
    if (!accountArea) return;

    const current = currentUser();

    if (!current) {
      accountArea.innerHTML = `
        <button class="btn" id="openAuthButton">
          Create account / Log in
        </button>
      `;

      const button = $("openAuthButton");

      if (button) {
        button.addEventListener("click", openAuth);
      }

      if (profileMenu) {
        profileMenu.innerHTML = `
          <button class="btn secondary" id="signInButton">
            Sign in
          </button>
        `;

        $("signInButton").addEventListener(
          "click",
          openAuth
        );
      }

      return;
    }

    const user = loadUsers().find(
      u => u.username === current.username
    );

    if (!user) {
      logout();
      return;
    }

    const referrals = countReferrals(user.username);

    accountArea.innerHTML = `
      <div>
        <strong>${escapeHtml(user.username)}</strong>
      </div>

      <div class="small">
        ${escapeHtml(user.profile?.bio || "")}
      </div>

      <div style="margin-top:8px">
        Referral code:
        <strong>${escapeHtml(user.referralCode)}</strong>
      </div>

      <div class="small">
        Successful referrals: ${referrals}
      </div>

      <div style="margin-top:8px">
        <button class="btn" id="logoutButton">
          Log out
        </button>

        <button class="btn secondary" id="editButton">
          Edit profile
        </button>
      </div>
    `;

    $("logoutButton").addEventListener("click", logout);

    $("editButton").addEventListener("click", () => {
      openProfileEdit(user.username);
    });

    if (profileMenu) {
      profileMenu.innerHTML = `
        <button class="btn secondary" id="profileButton">
          Profile
        </button>
      `;

      $("profileButton").addEventListener("click", () => {
        openProfileFor(user.username);
      });
    }

    renderFollowingList();
  }

  // =========================
  // POSTS
  // =========================
  function createPost() {
    if (!postText) return;

    const text = postText.value.trim();

    if (!text) {
      alert("Write something first.");
      return;
    }

    const current = currentUser();

    if (!current) {
      openAuth();
      return;
    }

    const posts = loadPosts();

    posts.unshift({
      id: uid(),
      author: current.username,
      text: text,
      likes: [],
      comments: [],
      createdAt: now()
    });

    savePosts(posts);

    postText.value = "";

    renderFeed();
  }

  function renderFeed() {
    if (!feedList) return;

    const posts = loadPosts();

    feedList.innerHTML = "";

    if (posts.length === 0) {
      feedList.innerHTML =
        '<div class="card small">No posts yet.</div>';
      return;
    }

    posts.forEach(post => {
      const element = document.createElement("div");

      element.className = "post card";

      element.innerHTML = `
        <div class="meta">
          <div>
            <strong>${escapeHtml(post.author)}</strong>

            <div class="small">
              ${new Date(post.createdAt).toLocaleString()}
            </div>
          </div>

          <button
            class="btn secondary"
            onclick="openProfileFor('${escapeHtml(post.author)}')"
          >
            View
          </button>
        </div>

        <div class="text">
          ${escapeHtml(post.text)}
        </div>

        <div class="actions">

          <button
            class="like-btn"
            data-id="${post.id}"
          >
            👍 ${post.likes.length}
          </button>

          <button
            class="btn secondary comment-toggle"
            data-id="${post.id}"
          >
            💬 Comment (${post.comments.length})
          </button>

        </div>

        <div
          class="comment-area"
          id="comments-${post.id}"
          style="display:none"
        ></div>
      `;

      feedList.appendChild(element);
    });

    document.querySelectorAll(".like-btn").forEach(button => {
      button.addEventListener("click", () => {
        toggleLike(Number(button.dataset.id));
      });
    });

    document
      .querySelectorAll(".comment-toggle")
      .forEach(button => {
        button.addEventListener("click", () => {
          toggleComments(Number(button.dataset.id));
        });
      });
  }

  // =========================
  // LIKES
  // =========================
  function toggleLike(postId) {
    const current = currentUser();

    if (!current) {
      openAuth();
      return;
    }

    const posts = loadPosts();

    const post = posts.find(p => p.id === postId);

    if (!post) return;

    post.likes = post.likes || [];

    const index = post.likes.indexOf(
      current.username
    );

    if (index === -1) {
      post.likes.push(current.username);

      if (post.author !== current.username) {
        addNotification(
          post.author,
          current.username + " liked your post."
        );
      }
    } else {
      post.likes.splice(index, 1);
    }

    savePosts(posts);

    renderFeed();
    updateBadges();
  }

  // =========================
  // COMMENTS
  // =========================
  function toggleComments(postId) {
    const area = $("comments-" + postId);

    if (!area) return;

    if (area.style.display === "none") {
      area.style.display = "block";
      renderComments(postId);
    } else {
      area.style.display = "none";
    }
  }

  function renderComments(postId) {
    const area = $("comments-" + postId);

    if (!area) return;

    const post = loadPosts().find(
      p => p.id === postId
    );

    if (!post) return;

    post.comments = post.comments || [];

    area.innerHTML = `
      <textarea
        id="commentInput-${postId}"
        placeholder="Write a comment..."
      ></textarea>

      <button
        class="btn"
        id="commentButton-${postId}"
      >
        Reply
      </button>

      <div class="comment-list">
        ${post.comments
          .map(
            comment => `
              <div class="comment">
                <strong>
                  ${escapeHtml(comment.author)}
                </strong>

                <div>
                  ${escapeHtml(comment.text)}
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    `;

    $("commentButton-" + postId).addEventListener(
      "click",
      () => submitComment(postId)
    );
  }

  function submitComment(postId) {
    const current = currentUser();

    if (!current) {
      openAuth();
      return;
    }

    const input = $("commentInput-" + postId);

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    const posts = loadPosts();

    const post = posts.find(
      p => p.id === postId
    );

    if (!post) return;

    post.comments = post.comments || [];

    post.comments.push({
      id: uid(),
      author: current.username,
      text: text,
      createdAt: now()
    });

    savePosts(posts);

    if (post.author !== current.username) {
      addNotification(
        post.author,
        current.username + " commented on your post."
      );
    }

    renderFeed();
    updateBadges();
  }

  // =========================
  // FOLLOW SYSTEM
  // =========================
  function toggleFollow(username) {
    const current = currentUser();

    if (!current) {
      openAuth();
      return;
    }

    if (current.username === username) return;

    const users = loadUsers();

    const me = users.find(
      u => u.username === current.username
    );

    const other = users.find(
      u => u.username === username
    );

    if (!me || !other) return;

    me.following = me.following || [];
    other.followers = other.followers || [];

    const index = me.following.indexOf(username);

    if (index === -1) {
      me.following.push(username);

      if (!other.followers.includes(me.username)) {
        other.followers.push(me.username);
      }

      addNotification(
        username,
        me.username + " started following you."
      );
    } else {
      me.following.splice(index, 1);

      const followerIndex =
        other.followers.indexOf(me.username);

      if (followerIndex !== -1) {
        other.followers.splice(followerIndex, 1);
      }
    }

    saveUsers(users);

    renderAll();
  }

  window.toggleFollow = toggleFollow;

  function renderFollowingList() {
    if (!followingList) return;

    const current = currentUser();

    followingList.innerHTML = "";

    if (!current) return;

    const user = loadUsers().find(
      u => u.username === current.username
    );

    if (!user) return;

    (user.following || []).forEach(username => {
      const li = document.createElement("li");

      li.innerHTML = `
        <button
          class="btn secondary"
          onclick="openProfileFor('${escapeHtml(username)}')"
        >
          ${escapeHtml(username)}
        </button>
      `;

      followingList.appendChild(li);
    });
  }

  function renderSuggestions() {
    if (!suggestionsList) return;

    const current = currentUser();
    const users = loadUsers();

    suggestionsList.innerHTML = "";

    users
      .filter(user =>
        current
          ? user.username !== current.username
          : true
      )
      .slice(0, 5)
      .forEach(user => {
        const li = document.createElement("li");

        li.innerHTML = `
          <div>
            <strong>
              ${escapeHtml(user.username)}
            </strong>

            <div class="small">
              ${escapeHtml(user.profile?.bio || "")}
            </div>

            <button
              class="btn"
              onclick="openProfileFor('${escapeHtml(user.username)}')"
            >
              View
            </button>

            ${
              current
                ? `
                  <button
                    class="btn secondary"
                    onclick="toggleFollow('${escapeHtml(user.username)}')"
                  >
                    Follow
                  </button>
                `
                : ""
            }
          </div>
        `;

        suggestionsList.appendChild(li);
      });
  }

  // =========================
  // PROFILES
  // =========================
  function openProfile() {
    if (!profileDrawer) return;

    profileDrawer.style.display = "block";
    profileDrawer.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  function closeProfile() {
    if (!profileDrawer) return;

    profileDrawer.style.display = "none";
    profileDrawer.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  function openProfileFor(username) {
    openProfile();
    renderProfile(username);
  }

  window.openProfileFor = openProfileFor;

  function openProfileEdit(username) {
    openProfile();
    renderProfile(username, true);
  }

  function renderProfile(username, edit = false) {
    if (!profileContent) return;

    const users = loadUsers();

    const user = users.find(
      u => u.username === username
    );

    if (!user) return;

    if (edit) {
      profileContent.innerHTML = `
        <h3>Edit profile</h3>

        <input
          id="editBio"
          placeholder="Bio"
          value="${escapeHtml(user.profile?.bio || "")}"
        >

        <input
          id="editLocation"
          placeholder="Location"
          value="${escapeHtml(user.profile?.location || "")}"
        >

        <button class="btn" id="saveProfile">
          Save
        </button>

        <button
          class="btn secondary"
          id="cancelProfile"
        >
          Cancel
        </button>
      `;
