(function () {
  const UX_QUERY_VALUE = "11";
  const pathName = decodeURIComponent(location.pathname.split("/").pop() || "index.html");
  const current = pathName === "index.html" || pathName === "a.html" || pathName === "b.html"
    ? "home"
    : pathName.replace(/\.html$/, "");
  const readingCurrent = current === "reading" || current === "article" || current.startsWith("article-");
  const header = document.querySelector("[data-site-header]");
  const footer = document.querySelector("[data-site-footer]");

  if (header) {
    header.innerHTML = `
      <a class="skip-link" href="#main">본문으로 바로가기</a>
      <header class="site-header">
        <a class="wordmark" href="index.html" aria-label="마음기록소 홈">마음기록소</a>
        <nav class="site-menu" aria-label="주요 메뉴">
          <a href="book.html" ${current === "book" ? 'aria-current="page"' : ""}>책</a>
          <a href="reading.html" ${readingCurrent ? 'aria-current="page"' : ""}>읽을거리</a>
          <a href="about.html" ${current === "about" ? 'aria-current="page"' : ""}>마음기록소</a>
          <a class="assessment-menu-link" href="/assessment/" ${current === "assessment" ? 'aria-current="page"' : ""}>마음한권 <span aria-hidden="true">↗</span></a>
        </nav>
      </header>`;
  }

  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <div class="footer-main">
          <div>
            <a class="footer-mark" href="index.html">마음기록소</a>
            <p>자기이해와 심리학을 일상의 언어로 펴냅니다.</p>
          </div>
          <nav class="footer-links" aria-label="하단 메뉴">
            <a href="book.html">책</a>
            <a href="reading.html">읽을거리</a>
            <a href="about.html">출판사 소개</a>
            <a href="/assessment/">마음한권</a>
          </nav>
        </div>
        <div class="footer-legal">
          <p>상호 마음기록소 · 대표자 안계훈 · 사업자등록번호 557-13-02917</p>
          <p>사업장 주소 경기도 이천시 대월면 사동로176, 2층 202호</p>
          <p>이메일 <a href="mailto:hello@doencourage.com">hello@doencourage.com</a> · 호스팅서비스제공자 Cloudflare, Inc.</p>
          <p><a href="https://doencourage.com/terms/">검사 서비스 이용약관</a> · <a href="https://doencourage.com/privacy/">개인정보처리방침</a></p>
          <p class="copyright">© 2026 마음기록소</p>
        </div>
      </footer>`;
  }

  function preserveUxQuery(scope) {
    scope.querySelectorAll("a[href]").forEach((link) => {
      if (link.hasAttribute("download")) return;
      const rawHref = link.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;

      const url = new URL(rawHref, location.href);
      const isLocalFile = location.protocol === "file:" && url.protocol === "file:";
      const isSameOrigin = url.origin === location.origin;
      if ((!isLocalFile && !isSameOrigin) || !url.pathname.toLowerCase().endsWith(".html")) return;

      url.searchParams.set("ux", UX_QUERY_VALUE);
      if (isLocalFile) {
        link.href = url.href;
      } else {
        link.href = `${url.pathname}${url.search}${url.hash}`;
      }
    });
  }

  preserveUxQuery(document);

  const bookRotator = document.querySelector("[data-book-rotator]");
  if (bookRotator) {
    const bookObject = bookRotator.querySelector(".book-object");
    const rotationStatus = document.querySelector("#book-rotation-status");
    const stateLabels = {
      front: "앞표지",
      side: "책등 방향",
      back: "뒤표지"
    };
    let bookState = "front";
    let rotation = 0;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let horizontalLock = false;

    const updateBook = (nextRotation, nextState, announce) => {
      rotation = nextRotation;
      bookState = nextState;
      bookObject.style.setProperty("--book-rotation", `${rotation}deg`);
      bookRotator.dataset.bookState = bookState;
      if (announce && rotationStatus) {
        rotationStatus.textContent = `현재 ${stateLabels[bookState]}입니다.`;
      }
    };

    const turnBook = (direction) => {
      if (direction > 0) {
        if (bookState === "front") updateBook(rotation + 40, "side", true);
        else if (bookState === "side") updateBook(rotation + 140, "back", true);
        else updateBook(rotation + 180, "front", true);
      } else if (bookState === "front") {
        updateBook(rotation - 180, "back", true);
      } else if (bookState === "back") {
        updateBook(rotation - 140, "side", true);
      } else {
        updateBook(rotation - 40, "front", true);
      }
    };

    const finishPointer = (event, allowTurn) => {
      if (event.pointerId !== pointerId) return;
      if (Number.isFinite(event.clientX)) lastX = event.clientX;
      if (Number.isFinite(event.clientY)) lastY = event.clientY;
      const finishedPointerId = pointerId;
      const dx = lastX - startX;
      const dy = lastY - startY;
      pointerId = null;
      horizontalLock = false;
      bookRotator.classList.remove("is-gesturing");
      bookObject.getBoundingClientRect();
      if (bookRotator.hasPointerCapture?.(finishedPointerId)) {
        bookRotator.releasePointerCapture(finishedPointerId);
      }
      if (allowTurn && Math.abs(dx) >= 35 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        turnBook(dx > 0 ? 1 : -1);
      }
    };

    bookRotator.addEventListener("pointerdown", (event) => {
      if (pointerId !== null || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      horizontalLock = false;
      bookRotator.classList.add("is-gesturing");
    });

    bookRotator.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      lastX = event.clientX;
      lastY = event.clientY;
      const dx = lastX - startX;
      const dy = lastY - startY;
      if (!horizontalLock && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        horizontalLock = true;
        bookRotator.setPointerCapture?.(pointerId);
      }
    });

    bookRotator.addEventListener("pointerup", (event) => finishPointer(event, true));
    bookRotator.addEventListener("pointercancel", (event) => finishPointer(event, false));
    bookRotator.addEventListener("lostpointercapture", (event) => {
      const lostPointerId = event.pointerId;
      window.setTimeout(() => {
        if (pointerId === lostPointerId) finishPointer(event, false);
      }, 0);
    });
    window.addEventListener("pointerup", (event) => finishPointer(event, true));
    window.addEventListener("pointercancel", (event) => finishPointer(event, false));
    bookRotator.addEventListener("dragstart", (event) => event.preventDefault());

    bookRotator.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      bookRotator.classList.remove("is-gesturing");
      if (event.key === "ArrowRight") turnBook(1);
      else if (event.key === "ArrowLeft") turnBook(-1);
      else if (event.key === "Home") updateBook(0, "front", true);
      else updateBook(180, "back", true);
    });

    updateBook(0, "front", false);
  }

  document.querySelectorAll("[data-copy-text], [data-copy-source]").forEach((button) => {
    button.addEventListener("click", async () => {
      const sourceId = button.dataset.copySource;
      const source = sourceId ? document.getElementById(sourceId) : null;
      const value = button.dataset.copyText || source?.textContent?.trim() || "";
      const status = document.getElementById(button.dataset.copyStatus || "");
      try {
        if (!value || !navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
        await navigator.clipboard.writeText(value);
        if (status) status.textContent = button.dataset.copySuccess || "복사했습니다.";
      } catch (_error) {
        if (status) status.textContent = button.dataset.copyFailure || "복사하지 못했습니다. 직접 선택해 복사해 주세요.";
      }
    });
  });

  const results = document.querySelector("[data-reading-results]");
  if (!results) return;

  const searchInput = document.querySelector("[data-reading-search]");
  const clearButton = document.querySelector("[data-search-clear]");
  const filterButtons = Array.from(document.querySelectorAll("button[data-category]"));
  const count = document.querySelector("[data-reading-count]");
  const error = document.querySelector("[data-reading-error]");

  const staticPosts = Array.from(results.querySelectorAll("[data-post]")).map((item) => ({
    id: item.dataset.id,
    title: item.dataset.title,
    description: item.dataset.description,
    category: item.dataset.category,
    url: item.getAttribute("href"),
    source: item.dataset.source,
    publishedAt: item.dataset.publishedAt || ""
  }));

  const state = {
    posts: staticPosts,
    category: "all",
    query: ""
  };

  function categoryLabel(category) {
    return category === "psychology" ? "심리학 해설" : "책 발췌";
  }

  function formatPublishedAt(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }).format(date);
  }

  function safePostUrl(rawUrl) {
    try {
      const url = new URL(rawUrl, location.href);
      if (!["http:", "https:", "file:"].includes(url.protocol)) return null;
      return url;
    } catch (_) {
      return null;
    }
  }

  function createPost(post) {
    const safeUrl = safePostUrl(post.url);
    if (!safeUrl) return null;

    const link = document.createElement("a");
    link.className = "reading-item";
    link.href = safeUrl.href;
    link.dataset.post = "";
    link.dataset.id = post.id;

    const title = document.createElement("h2");
    title.textContent = post.title;

    const description = document.createElement("p");
    description.textContent = post.description;

    const meta = document.createElement("p");
    meta.className = "reading-meta";
    const parts = [categoryLabel(post.category)];
    if (post.category === "excerpt" && post.source) {
      parts.push(post.source);
    } else {
      const publishedAt = formatPublishedAt(post.publishedAt);
      if (publishedAt) parts.push(publishedAt);
      if (post.source && post.source.length <= 30) parts.push(post.source);
    }
    meta.textContent = parts.join(" · ");

    link.append(title, description, meta);
    return link;
  }

  function render() {
    const needle = state.query.trim().toLocaleLowerCase("ko-KR");
    const filtered = state.posts.filter((post) => {
      const categoryMatches = state.category === "all" || post.category === state.category;
      const searchable = `${post.title} ${post.description}`.toLocaleLowerCase("ko-KR");
      return categoryMatches && (!needle || searchable.includes(needle));
    });

    results.replaceChildren();
    filtered.forEach((post) => {
      const item = createPost(post);
      if (item) results.append(item);
    });

    if (!results.children.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "조건에 맞는 글이 없습니다. 검색어를 지우거나 다른 분류를 선택해 주세요.";
      results.append(empty);
    }

    count.textContent = `${filtered.length}편`;
    preserveUxQuery(results);
  }

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    render();
  });

  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    state.query = "";
    searchInput.focus();
    render();
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      filterButtons.forEach((candidate) => {
        candidate.setAttribute("aria-pressed", String(candidate === button));
      });
      render();
    });
  });

  function isValidPost(post) {
    return post
      && typeof post.id === "string"
      && typeof post.title === "string"
      && typeof post.description === "string"
      && (post.category === "excerpt" || post.category === "psychology")
      && typeof post.url === "string"
      && typeof post.source === "string"
      && typeof post.publishedAt === "string"
      && safePostUrl(post.url);
  }

  fetch("/reading-data.json", { headers: { Accept: "application/json" }, cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("reading-data unavailable");
      return response.json();
    })
    .then((payload) => {
      if (!payload || payload.version !== 1 || !Array.isArray(payload.posts) || !payload.posts.every(isValidPost)) {
        throw new Error("reading-data invalid");
      }
      state.posts = payload.posts;
      error.hidden = true;
      render();
    })
    .catch(() => {
      error.hidden = false;
      error.textContent = "새 글을 불러오지 못해 현재 저장된 4편을 보여드립니다.";
      state.posts = staticPosts;
      render();
    });
})();
