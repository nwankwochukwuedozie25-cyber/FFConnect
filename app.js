(function () {
  "use strict";

  // =========================
  // FFConnect - Simple App
  // =========================

  const USERS_KEY = "ff_users";
  const POSTS_KEY = "ff_posts";
  const CURRENT_KEY = "ff_current";

  // ---------- Helpers ----------

  function getData(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function currentUser() {
    return getData(CURRENT_KEY, null);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function makeId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  // ---------- Get HTML elements ----------

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const searchResults = document.getElementById("searchResults");

  const feedList = document.getElementById("feedList");
  const postText = document.getElementById("postText");
  const postCreateBtn = document.getElementById("postCreateBtn");

  const accountArea = document.getElementById("accountArea");
  const profileMenu = document.getElementById("profileMenu");

  const authModal = document.getElementById("authModal");
  const authSubmit = document.getElementById("authSubmit");
  const authToggle = document.getElementById("authToggle");
  const authTitle = document.getElementById("authTitle");
  const authMsg = document.getElementById("authMsg");

  const authUsername = document.getElementById("authUsername");
  const authPassword = document.getElementById("authPassword");
  const authBio = document.getElementById("authBio");

  const profileDrawer = document.getElementById("profileDrawer");
  const profileContent = document.getElementById("profileContent");

  const myProfileBtn = document.getElementById("myProfileBtn");
  const newPostBtn = document.getElementById("newPostBtn");

  let authMode = "register";

  // ---------- Users ----------

  function getUsers() {
    return getData(USERS_KEY, []);
  }

  function saveUsers(users) {
    saveData(USERS_KEY, users);
  }

  // ---------- Posts ----------

  function getPosts() {
    return getData(POSTS_KEY, []);
  }

  function savePosts(posts) {
    saveData(POSTS_KEY, posts);
  }

  // ---------- Demo users ----------

  function setupDemoData() {
    if (!localStorage.getItem(USERS_KEY)) {
      saveUsers([
        {
          username: "alice",
          password: "alice",
          bio: "Welcome to FFConnect!",
          followers: [],
          following: []
        },
        {
          username: "bob",
          password: "bob",
          bio: "Building cool things.",
          followers: [],
          following: []
        }
      ]);
    }

    if (!localStorage.getItem(POSTS_KEY)) {
      savePosts([
        {
          id: makeId(),
          author: "alice",
          text: "Welcome to FFConnect!",
          likes: [],
          comments: [],
          createdAt: Date.now()
        },
        {
          id: makeId(),
          author: "bob",
          text: "Hello everyone 👋",
          likes: [],
          comments: [],
          createdAt: Date.now()
        }
      ]);
    }
  }

  // ---------- Authentication ----------

  function openAuth() {
    if (!authModal) return;

    authModal.style.display = "flex";
    authModal.setAttribute("aria-hidden", "false");

    if (authMsg) {
      authMsg.textContent = "";
    }
  }

  function closeAuth() {
    if (!authModal) return;

    authModal.style.display = "none";
    authModal.setAttribute("aria-hidden", "true");
  }

  function showMessage(message, success) {
    if (!authMsg) return;

    authMsg.textContent = message;
    authMsg.style.color = success ? "green" : "red";
  }

  function toggleAuth() {
    authMode =
      authMode === "register"
        ? "login"
        : "register";

    if (authTitle) {
      authTitle.textContent =
        authMode === "register"
          ? "Create an account"
          : "Log in";
    }

    if (authSubmit) {
      authSubmit.textContent =
        authMode === "register"
          ? "Create account"
          : "Log in";
    }

    if (authToggle) {
      authToggle.textContent =
        authMode === "register"
          ? "Switch to Log in"
          : "Switch to Create";
    }

    showMessage("", true);
  }

  function submitAuth() {
    if (!authUsername || !authPassword) return;

    const username = authUsername.value.trim();
    const password = authPassword.value;
    const bio = authBio ? authBio.value.trim() : "";

    if (!username || !password) {
      showMessage("Enter a username and password.", false);
      return;
    }

    const users = getUsers();

    if (authMode === "register") {

      const exists = users.some(
        user =>
          user.username.toLowerCase() === username.toLowerCase()
      );

      if (exists) {
        showMessage("Username already exists.", false);
        return;
      }

      const newUser = {
        username: username,
        password: password,
        bio: bio,
        followers: [],
        following: []
      };

      users.push(newUser);
      saveUsers(users);

      saveData(CURRENT_KEY, {
        username: username
      });

      closeAuth();
      renderAccount();
      renderFeed();

    } else {

      const user = users.find(
        item =>
          item.username.toLowerCase() === username.toLowerCase() &&
          item.password === password
      );

      if (!user) {
        showMessage("Wrong username or password.", false);
        return;
      }

      saveData(CURRENT_KEY, {
        username: user.username
      });

      closeAuth();
      renderAccount();
      renderFeed();
    }

    authUsername.value = "";
    authPassword.value = "";

    if (authBio) {
      authBio.value = "";
    }
  }

  // ---------- Account ----------

  function logout() {
    localStorage.removeItem(CURRENT_KEY);
    renderAccount();
    renderFeed();
  }

  function renderAccount() {
    if (!accountArea) return;

    const current = currentUser();

    if (!current) {
      accountArea.innerHTML = `
        <button class="btn" id="openLoginButton">
          Create account / Log in
        </button>
      `;

      const button = document.getElementById("openLoginButton");

      if (button) {
        button.addEventListener("click", openAuth);
      }

      return;
    }

    const users = getUsers();

    const user = users.find(
      item => item.username === current.username
    );

    if (!user) return;

    accountArea.innerHTML = `
      <div>
        <strong>${escapeHtml(user.username)}</strong>
      </div>

      <div class="small">
        ${escapeHtml(user.bio || "")}
      </div>

      <br>

      <button class="btn" id="logoutButton">
        Log out
      </button>
    `;

    const logoutButton =
      document.getElementById("logoutButton");

    if (logoutButton) {
      logoutButton.addEventListener("click", logout);
    }

    if (profileMenu) {
      profileMenu.innerHTML = `
        <button class="btn secondary" id="profileButton">
          My Profile
        </button>
      `;

      document
        .getElementById("profileButton")
        ?.addEventListener("click", function () {
          openProfileFor(user.username);
        });
    }
  }

  // ---------- Create Post ----------

  function createPost() {
    const current = currentUser();

    if (!current) {
      openAuth();
      return;
    }

    if (!postText) return;

    const text = postText.value.trim();

    if (!text) {
      alert("Write something first.");
      return;
    }

    const posts = getPosts();

    posts.unshift({
      id: makeId(),
      author: current.username,
      text: text,
      likes: [],
      comments: [],
      createdAt: Date.now()
    });

    savePosts(posts);

    postText.value = "";

    renderFeed();
  }

  // ---------- Feed ----------

  function renderFeed() {
    if (!feedList) return;

    const posts = getPosts();

    feedList.innerHTML = "";

    if (posts.length === 0) {
      feedList.innerHTML = `
        <div class="card">
          No posts yet.
        </div>
      `;
      return;
    }

    posts.forEach(post => {

      const div = document.createElement("div");

      div.className = "post card";

      div.innerHTML = `
        <div>
          <strong>${escapeHtml(post.author)}</strong>
        </div>

        <div class="small">
          ${new Date(post.createdAt).toLocaleString()}
        </div>

        <p>
          ${escapeHtml(post.text)}
        </p>

        <div class="actions">

          <button
            class="btn secondary likeButton"
            data-id="${post.id}">
            👍 ${post.likes.length}
          </button>

          <button
            class="btn secondary profileButton"
            data-user="${escapeHtml(post.author)}">
            Profile
          </button>

        </div>
      `;

      feedList.appendChild(div);
    });

    document
      .querySelectorAll(".likeButton")
      .forEach(button => {

        button.addEventListener("click", function () {
          likePost(Number(this.dataset.id));
        });

      });

    document
      .querySelectorAll(".profileButton")
      .forEach(button => {

        button.addEventListener("click", function () {
          openProfileFor(this.dataset.user);
        });

      });
  }

  // ---------- Likes ----------

  function likePost(postId) {
    const current = currentUser();

    if (!current) {
      openAuth();
      return;
    }

    const posts = getPosts();

    const post = posts.find(
      item => item.id === postId
    );

    if (!post) return;

    post.likes = post.likes || [];

    const index =
      post.likes.indexOf(current.username);

    if (index === -1) {
      post.likes.push(current.username);
    } else {
      post.likes.splice(index, 1);
    }

    savePosts(posts);

    renderFeed();
  }

  // ---------- Profiles ----------

  function openProfileFor(username) {
    const users = getUsers();

    const user = users.find(
      item => item.username === username
    );

    if (!user || !profileDrawer || !profileContent) {
      return;
    }

    const posts = getPosts().filter(
      post => post.author === username
    );

    profileContent.innerHTML = `
      <h2>${escapeHtml(user.username)}</h2>

      <p>
        ${escapeHtml(user.bio || "No bio yet.")}
      </p>

      <p>
        Followers: ${user.followers.length}
      </p>

      <p>
        Following: ${user.following.length}
      </p>

      <hr>

      <h3>Posts</h3>

      <div>
        ${
          posts.length
            ? posts.map(post => `
                <div class="card">
                  ${escapeHtml(post.text)}
                </div>
              `).join("")
            : "<p>No posts yet.</p>"
        }
      </div>
    `;

    profileDrawer.style.display = "block";
    profileDrawer.setAttribute("aria-hidden", "false");
  }

  window.openProfileFor = openProfileFor;

  // ---------- Search ----------

  function searchUsers() {
    if (!searchInput || !searchResults) return;

    const query =
      searchInput.value.trim().toLowerCase();

    if (!query) {
      searchResults.innerHTML = "";
      return;
    }

    const users = getUsers();

    const results = users.filter(user =>
      user.username.toLowerCase().includes(query)
    );

    searchResults.innerHTML = "";

    if (results.length === 0) {
      searchResults.innerHTML =
        "<p>No users found.</p>";
      return;
    }

    results.forEach(user => {

      const div = document.createElement("div");

      div.className = "card";

      div.innerHTML = `
        <strong>${escapeHtml(user.username)}</strong>
        <div class="small">
          ${escapeHtml(user.bio || "")}
        </div>
        <br>
        <button
          class="btn secondary"
          data-user="${escapeHtml(user.username)}">
          View profile
        </button>
      `;

      div
        .querySelector("button")
        .addEventListener("click", function () {
          openProfileFor(this.dataset.user);
        });

      searchResults.appendChild(div);
    });
  }

  // ---------- Buttons ----------

  if (authSubmit) {
    authSubmit.addEventListener(
      "click",
      submitAuth
    );
  }

  if (authToggle) {
    authToggle.addEventListener(
      "click",
      toggleAuth
    );
  }

  if (postCreateBtn) {
    postCreateBtn.addEventListener(
      "click",
      createPost
    );
  }

  if (searchBtn) {
    searchBtn.addEventListener(
      "click",
      searchUsers
    );
  }

  if (searchInput) {
    searchInput.addEventListener(
      "keydown",
      function (event) {
        if (event.key === "Enter") {
          searchUsers();
        }
      }
    );
  }

  if (newPostBtn) {
    newPostBtn.addEventListener(
      "click",
      function () {
        postText?.focus();
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    );
  }

  if (myProfileBtn) {
    myProfileBtn.addEventListener(
      "click",
      function () {
        const current = currentUser();

        if (!current) {
          openAuth();
          return;
        }

        openProfileFor(current.username);
      }
    );
  }

  // ---------- Start App ----------

  setupDemoData();
  renderAccount();
  renderFeed();

})();
