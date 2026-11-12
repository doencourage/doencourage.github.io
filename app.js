(function () {
  const pathName = decodeURIComponent(location.pathname.split("/").pop() || "index.html");
  const current = pathName === "index.html" || pathName === "a.html" || pathName === "b.html"
    ? "home"
    : pathName.replace(/\.html$/, "");
  const readingCurrent = location.pathname.startsWith("/guide/") || current === "reading" || current === "article" || current.startsWith("article-");
  const header = document.querySelector("[data-site-header]");
  const footer = document.querySelector("[data-site-footer]");

  if (header && !header.querySelector(".site-header")) {
    header.innerHTML = `
      <a class="skip-link" href="#main">본문으로 바로가기</a>
      <header class="site-header">
        <a class="wordmark" href="/" aria-label="마음기록소 홈">마음기록소</a>
        <nav class="site-menu" aria-label="주요 메뉴">
          <a href="/book" ${current === "book" ? 'aria-current="page"' : ""}>책</a>
          <a href="/reading" ${readingCurrent ? 'aria-current="page"' : ""}>읽을거리</a>
          <a href="/about" ${current === "about" ? 'aria-current="page"' : ""}>출판사 소개</a>
          <a class="assessment-menu-link" href="/assessment/" ${current === "assessment" ? 'aria-current="page"' : ""}>마음한권 <span aria-hidden="true">↗</span></a>
        </nav>
      </header>`;
  }

  if (footer && !footer.querySelector(".footer-legal")) {
    footer.innerHTML = `
      <footer class="site-footer">
        <div class="footer-legal">
          <p><span>상호 마음기록소</span> <span>대표자 안계훈</span> <span>사업자등록번호 557-13-02917</span></p>
          <p>사업장 주소 경기도 이천시 대월면 사동로176, 2층 202호</p>
          <p><span>이메일 <a href="mailto:hello@doencourage.com">hello@doencourage.com</a></span> <span>호스팅서비스제공자 Cloudflare, Inc.</span></p>
          <p><a href="https://doencourage.com/terms/">검사 서비스 이용약관</a> <a href="https://doencourage.com/privacy/">개인정보처리방침</a></p>
          <p class="copyright">© 2026 마음기록소</p>
        </div>
      </footer>`;
  }

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
    let suppressClick = false;

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
      suppressClick = !allowTurn || Math.hypot(dx, dy) > 8;
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
      suppressClick = false;
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
      // A touch starts with implicit capture on the cover image. Its release
      // bubbles here when capture transfers to the rotator; the swipe continues.
      if (event.target !== bookRotator) return;
      const lostPointerId = event.pointerId;
      window.setTimeout(() => {
        if (pointerId === lostPointerId && !bookRotator.hasPointerCapture?.(lostPointerId)) finishPointer(event, false);
      }, 0);
    });
    window.addEventListener("pointerup", (event) => finishPointer(event, true));
    window.addEventListener("pointercancel", (event) => finishPointer(event, false));
    bookRotator.addEventListener("dragstart", (event) => event.preventDefault());
    bookRotator.addEventListener("click", (event) => {
      // A completed swipe can also produce a click. Turn only once per gesture;
      // keyboard activation (detail 0) remains available after any cancellation.
      if (event.detail !== 0 && suppressClick) {
        suppressClick = false;
        return;
      }
      turnBook(1);
    });

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
  const filterButtons = [...document.querySelectorAll("button[data-topic]")];
  const formatSelect = document.querySelector("[data-reading-format]");
  const count = document.querySelector("[data-reading-count]");
  const error = document.querySelector("[data-reading-error]");
  const more = document.querySelector("[data-reading-more]");
  const featured = document.querySelector("[data-reading-featured]");
  const params = new URLSearchParams(location.search);
  const legacyTopics = {start:"assessment",jinro:"career",gijil:"temperament",yangyuk:"parenting",jineung:"intelligence"};
  const labels = Object.fromEntries(filterButtons.map(b => [b.dataset.topic, b.textContent.trim()]));
  const staticPosts = [...results.querySelectorAll("[data-post]")].map(item => ({
    id:item.dataset.id, title:item.dataset.title, description:item.dataset.description,
    category:item.dataset.category, topics:(item.dataset.topics || "").split(",").filter(Boolean),
    url:item.getAttribute("href"), source:item.dataset.source, publishedAt:item.dataset.publishedAt || "",
    book:item.dataset.bookTitle && item.dataset.bookImprint
      ? {title:item.dataset.bookTitle, imprint:item.dataset.bookImprint} : undefined
  }));
  const requestedTopic = params.get("topic") || legacyTopics[location.hash.slice(1)] || "all";
  const state = {posts:staticPosts, topic:labels[requestedTopic] ? requestedTopic : "all",
    category:["excerpt","psychology"].includes(params.get("kind")) ? params.get("kind") : "all",
    query:params.get("q") || "", limit:12};
  searchInput.value = state.query;
  formatSelect.value = state.category;
  const kindLabel = kind => kind === "excerpt" ? "책 발췌" : "심리학 해설";
  function safeUrl(raw) {
    try {
      const url = new URL(raw, location.href);
      return url.origin === location.origin && ["http:","https:"].includes(url.protocol) ? url : null;
    } catch (_) { return null; }
  }
  function createPost(post) {
    const url = safeUrl(post.url);
    if (!url) return null;
    const link = document.createElement("a");
    link.className = "reading-item";
    link.href = url.href;
    link.dataset.post = "";
    link.dataset.id = post.id;
    const meta = document.createElement("div");
    meta.className = "reading-meta";
    const classification = document.createElement("div");
    classification.className = "article-classification";
    const kind = document.createElement("span");
    kind.className = "kind-label";
    kind.textContent = kindLabel(post.category);
    classification.append(kind);
    (post.topics || []).map(key => labels[key]).filter(Boolean).forEach(label => {
      const topic = document.createElement("span");
      topic.className = "topic-label";
      topic.textContent = label;
      classification.append(topic);
    });
    meta.append(classification);
    if (post.book) {
      const book = document.createElement("span");
      book.className = "book-reference reading-book";
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      for (const [name,value] of Object.entries({class:"ui-icon",width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"1.6","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true",focusable:"false"})) icon.setAttribute(name,value);
      for (const d of ["M12 5.5C9.4 3.8 6.4 3.8 3 4.5v15c3.4-.7 6.4-.7 9 1 2.6-1.7 5.6-1.7 9-1v-15c-3.4-.7-6.4-.7-9 1Z","M12 5.5v15"]) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        icon.append(path);
      }
      const title = document.createElement("span");
      title.textContent = post.book.title;
      book.append(icon,title);
      meta.append(book);
    }
    const title = document.createElement("h2");
    title.textContent = post.title;
    const description = document.createElement("p");
    description.textContent = post.description;
    link.append(meta, title, description);
    return link;
  }
  function saveFilters() {
    const url = new URL(location.href);
    for (const [key,value] of [["q",state.query.trim()],["topic",state.topic],["kind",state.category]]) {
      if (!value || value === "all") url.searchParams.delete(key);
      else url.searchParams.set(key,value);
    }
    if (legacyTopics[url.hash.slice(1)]) url.hash = "";
    history.replaceState(null,"",url);
  }
  function render() {
    const needle = state.query.trim().normalize("NFC").toLocaleLowerCase("ko-KR");
    const filtered = state.posts.filter(post => {
      const subjectMatches = state.topic === "all" || (post.topics || []).includes(state.topic);
      const kindMatches = state.category === "all" || post.category === state.category;
      const text = [post.title,post.description,post.source,post.book?.title,post.book?.imprint,kindLabel(post.category),...(post.topics || []).map(t=>labels[t] || "")].join(" ").normalize("NFC").toLocaleLowerCase("ko-KR");
      return subjectMatches && kindMatches && (!needle || text.includes(needle));
    });
    results.replaceChildren();
    filtered.slice(0,state.limit).forEach(post => { const node=createPost(post); if(node)results.append(node); });
    if (!filtered.length) {
      const empty=document.createElement("p");
      empty.className="empty-state";
      empty.textContent="조건에 맞는 글이 없습니다. 검색어를 지우거나 다른 주제를 선택해 주세요.";
      results.append(empty);
    }
    const hasFilters = Boolean(needle || state.topic !== "all" || state.category !== "all");
    const shown = Math.min(state.limit, filtered.length);
    count.textContent = hasFilters
      ? "검색 결과 " + filtered.length + "편" + (shown < filtered.length ? " 중 " + shown + "편 표시" : "")
      : "전체 " + filtered.length + "편 중 " + shown + "편";
    more.hidden = state.limit >= filtered.length;
    more.textContent = "글 더 보기 (" + Math.min(state.limit,filtered.length) + "/" + filtered.length + ")";
    featured.hidden = hasFilters;
    filterButtons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.topic===state.topic)));
    saveFilters();
  }
  searchInput.addEventListener("input",()=>{state.query=searchInput.value;state.limit=12;render();});
  clearButton.addEventListener("click",()=>{searchInput.value="";state.query="";state.limit=12;searchInput.focus();render();});
  formatSelect.addEventListener("change",()=>{state.category=formatSelect.value;state.limit=12;render();});
  filterButtons.forEach(button=>button.addEventListener("click",()=>{state.topic=button.dataset.topic;state.limit=12;render();}));
  more.addEventListener("click",()=>{state.limit+=12;render();});
  function validPost(post) {
    return post && ["id","title","description","url","source","publishedAt"].every(key=>typeof post[key]==="string")
      && ["excerpt","psychology"].includes(post.category) && Array.isArray(post.topics)
      && post.topics.every(topic=>typeof topic==="string") && safeUrl(post.url)
      && (!post.book || (post.category === "excerpt" && typeof post.book.title === "string" && typeof post.book.imprint === "string"));
  }
  render();
  fetch("/reading-data.json",{headers:{Accept:"application/json"},cache:"no-store"})
    .then(response=>{if(!response.ok)throw Error("catalog unavailable");return response.json();})
    .then(payload=>{
      if(!payload || payload.version!==1 || !Array.isArray(payload.posts) || !payload.posts.every(validPost))throw Error("catalog invalid");
      state.posts=payload.posts;error.hidden=true;render();
    })
    .catch(()=>{error.hidden=false;error.textContent="최신 목록을 불러오지 못해 저장된 글 목록을 보여드립니다.";state.posts=staticPosts;render();});
})();
