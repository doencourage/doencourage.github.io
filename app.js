(function () {
  const UX_QUERY_VALUE = "8";
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
          <a href="/assessment/" ${current === "assessment" ? 'aria-current="page"' : ""}>맞춤 심리검사책</a>
        </nav>
      </header>`;
  }

  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <a class="footer-mark" href="index.html">마음기록소</a>
        <p>자기이해와 심리학을 일상의 언어로 펴냅니다.</p>
        <div class="footer-links">
          <a href="book.html">책</a>
          <a href="reading.html">읽을거리</a>
          <a href="about.html">출판사 소개</a>
          <a href="/assessment/">맞춤 심리검사책</a>
        </div>
        <p class="copyright">© 2026 마음기록소</p>
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

  const bookCoverToggle = document.querySelector(".book-cover-toggle");
  if (bookCoverToggle) {
    const setBookPointerMode = (event) => {
      bookCoverToggle.classList.toggle("uses-touch-input", event.pointerType !== "mouse");
    };
    const setBookCoverOpen = (open) => {
      bookCoverToggle.setAttribute("aria-pressed", String(open));
      bookCoverToggle.setAttribute("aria-label", open ? "책등 닫기" : "책등 보기");
      bookCoverToggle.classList.toggle("is-spine-visible", open);
    };

    bookCoverToggle.addEventListener("pointerdown", setBookPointerMode);
    bookCoverToggle.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") setBookPointerMode(event);
    });

    bookCoverToggle.addEventListener("click", () => {
      setBookCoverOpen(bookCoverToggle.getAttribute("aria-pressed") !== "true");
    });

    document.addEventListener("click", (event) => {
      if (
        bookCoverToggle.getAttribute("aria-pressed") === "true"
        && !bookCoverToggle.contains(event.target)
      ) {
        setBookCoverOpen(false);
      }
    });
  }

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
