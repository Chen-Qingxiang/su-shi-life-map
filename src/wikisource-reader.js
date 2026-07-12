(function (app) {
  const API_URL = "https://zh.wikisource.org/w/api.php";
  const SITE_URL = "https://zh.wikisource.org/wiki/";
  const resultCache = new Map();
  const baseRenderJourneyWorkCard = app.renderJourneyWorkCard;

  function apiUrl(params) {
    const url = new URL(API_URL);
    const allParams = { format: "json", formatversion: "2", origin: "*", ...params };
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    });
    return url.toString();
  }

  async function fetchJson(params) {
    const response = await fetch(apiUrl(params), {
      method: "GET",
      credentials: "omit",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`维基文库请求失败（HTTP ${response.status}）`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.info || data.error.code || "维基文库返回错误");
    return data;
  }

  function normalizedTitle(value) {
    return String(value || "")
      .replace(/[《》〈〉「」『』“”‘’]/g, "")
      .replace(/[\s·・—–_（）()，,。.!！?？:：；;]/g, "")
      .replace(/臺/g, "台")
      .replace(/蘇/g, "苏")
      .trim();
  }

  function scoreCandidate(candidate, title) {
    const expected = normalizedTitle(title);
    const actual = normalizedTitle(candidate.title);
    let score = 0;
    if (actual === expected) score += 1000;
    if (actual.includes(expected) || expected.includes(actual)) score += 300;
    if (/蘇軾|苏轼|東坡|东坡/.test(candidate.title)) score += 80;
    if (/作者:|分類:|Category:|Portal:|Template:/.test(candidate.title)) score -= 500;
    score -= Math.abs(actual.length - expected.length);
    return score;
  }

  async function parsePage(params) {
    const data = await fetchJson({
      action: "parse",
      prop: "text|displaytitle|revid",
      redirects: "1",
      disableeditsection: "1",
      disabletoc: "1",
      ...params
    });
    if (!data.parse?.text) throw new Error("维基文库页面没有可显示的正文");
    return {
      pageTitle: data.parse.title,
      displayTitle: data.parse.displaytitle || data.parse.title,
      revisionId: data.parse.revid,
      html: data.parse.text,
      url: `${SITE_URL}${encodeURIComponent(data.parse.title.replace(/ /g, "_"))}`
    };
  }

  function sourcePageTitle(work) {
    try {
      const url = new URL(work.text_source_url || "");
      if (url.hostname !== "zh.wikisource.org" || !url.pathname.startsWith("/wiki/")) return null;
      const title = decodeURIComponent(url.pathname.slice(6)).replace(/_/g, " ");
      return title.startsWith("Special:") ? null : title;
    } catch (_error) {
      return null;
    }
  }

  async function resolveWikisourcePage(work) {
    const requestedTitle = work.wikisource_title || work.title;
    const directTitles = [...new Set([work.wikisource_title, sourcePageTitle(work), work.title].filter(Boolean))];

    for (const directTitle of directTitles) {
      try {
        const exact = await parsePage({ page: directTitle });
        return {
          ...exact,
          matchType: normalizedTitle(directTitle) === normalizedTitle(requestedTitle) ? "exact" : "direct"
        };
      } catch (_error) {
        // Continue with alternate titles and the search API.
      }
    }

    const queries = [
      `intitle:\"${requestedTitle}\"`,
      `\"${requestedTitle}\" 蘇軾`,
      requestedTitle
    ];
    const candidates = [];
    const seen = new Set();

    for (const query of queries) {
      const data = await fetchJson({
        action: "query",
        list: "search",
        srsearch: query,
        srnamespace: "0",
        srlimit: "10",
        srprop: "snippet|wordcount|redirecttitle|sectiontitle"
      });
      (data.query?.search || []).forEach((candidate) => {
        if (!seen.has(candidate.pageid)) {
          seen.add(candidate.pageid);
          candidates.push(candidate);
        }
      });
      if (candidates.length >= 5) break;
    }

    candidates.sort((a, b) => scoreCandidate(b, requestedTitle) - scoreCandidate(a, requestedTitle));
    if (!candidates.length) throw new Error("维基文库暂未检索到相符页面");

    let lastError = null;
    for (const candidate of candidates.slice(0, 4)) {
      try {
        const parsed = await parsePage({ pageid: candidate.pageid });
        return {
          ...parsed,
          matchType: normalizedTitle(candidate.title) === normalizedTitle(requestedTitle) ? "exact" : "search",
          searchTitle: candidate.title
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("检索到了页面，但无法读取正文");
  }

  function sanitizeWikisourceHtml(html) {
    const documentNode = new DOMParser().parseFromString(`<main>${html}</main>`, "text/html");
    const root = documentNode.body.firstElementChild;
    root.querySelectorAll([
      "script", "style", "link", "meta", "iframe", "object", "embed", "form", "input", "button", "textarea", "select",
      ".mw-editsection", ".mw-empty-elt", ".noprint", ".printfooter", ".catlinks", ".navbox", ".metadata", ".authority-control",
      "#toc", ".toc", ".mw-jump-link", ".ws-noexport"
    ].join(",")).forEach((node) => node.remove());

    root.querySelectorAll("*").forEach((element) => {
      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (name.startsWith("on") || ["style", "srcdoc", "srcset", "poster"].includes(name)) {
          element.removeAttribute(attribute.name);
          return;
        }
        if (name === "href" || name === "src") {
          try {
            const absolute = new URL(attribute.value, "https://zh.wikisource.org/");
            if (!/^https?:$/.test(absolute.protocol)) throw new Error("unsupported protocol");
            element.setAttribute(attribute.name, absolute.href);
            if (name === "href") {
              element.setAttribute("target", "_blank");
              element.setAttribute("rel", "noopener noreferrer");
            }
          } catch (_error) {
            element.removeAttribute(attribute.name);
          }
        }
      });
    });

    const plainText = root.textContent.replace(/\s+/g, " ").trim();
    if (plainText.length < 20) throw new Error("匹配页面没有足够的正文内容");
    return root.innerHTML;
  }

  function cachedLoad(work) {
    const key = work.wikisource_title || work.title;
    if (!resultCache.has(key)) {
      resultCache.set(key, resolveWikisourcePage(work).then((result) => ({
        ...result,
        safeHtml: sanitizeWikisourceHtml(result.html)
      })).catch((error) => {
        resultCache.delete(key);
        throw error;
      }));
    }
    return resultCache.get(key);
  }

  function createReader(container, work) {
    const token = Symbol(work.work_id || work.title);
    container.dataset.workReaderState = "loading";
    container._workReaderToken = token;

    const section = document.createElement("section");
    section.className = "work-reader";
    section.innerHTML = `
      <div class="work-reader-heading">
        <h4>原文</h4>
        <span class="work-reader-status">正在从维基文库检索并载入原文……</span>
      </div>
      <div class="work-reader-actions">
        <button type="button" class="work-reader-retry" hidden>重新加载</button>
        <a class="work-reader-open" href="${work.text_source_url || `https://zh.wikisource.org/wiki/Special:Search?search=${encodeURIComponent(work.title)}`}" target="_blank" rel="noopener noreferrer">在维基文库打开</a>
      </div>
      <div class="work-reader-body" aria-live="polite"></div>
    `;

    const summary = container.querySelector(".knowledge-summary");
    if (summary) summary.insertAdjacentElement("afterend", section);
    else container.appendChild(section);

    const status = section.querySelector(".work-reader-status");
    const body = section.querySelector(".work-reader-body");
    const retry = section.querySelector(".work-reader-retry");
    const openLink = section.querySelector(".work-reader-open");

    async function load() {
      status.textContent = "正在从维基文库检索并载入原文……";
      body.innerHTML = '<p class="work-reader-loading">正在加载，请稍候。</p>';
      retry.hidden = true;
      body.classList.remove("is-collapsed");
      section.querySelector(".work-reader-toggle")?.remove();
      try {
        const result = await cachedLoad(work);
        if (container._workReaderToken !== token) return;
        container.dataset.workReaderState = "loaded";
        status.textContent = result.matchType === "exact"
          ? `已载入：${result.pageTitle}`
          : `已载入最相近页面：${result.pageTitle}（请结合题名核对）`;
        openLink.href = result.url;
        body.innerHTML = `<div class="work-reader-source">${result.safeHtml}</div>`;

        if (body.textContent.length > 1200) {
          body.classList.add("is-collapsed");
          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "work-reader-toggle";
          toggle.textContent = "展开阅读全文";
          toggle.addEventListener("click", () => {
            const collapsed = body.classList.toggle("is-collapsed");
            toggle.textContent = collapsed ? "展开阅读全文" : "收起全文";
          });
          section.querySelector(".work-reader-actions").prepend(toggle);
        }
      } catch (error) {
        if (container._workReaderToken !== token) return;
        container.dataset.workReaderState = "error";
        status.textContent = "未能在页面内载入原文";
        body.innerHTML = "";
        const message = document.createElement("p");
        message.className = "work-reader-error";
        message.textContent = `${String(error.message || error)}。可以使用右侧链接查看维基文库搜索结果；这通常表示题名存在异名、作品只收在总集卷次中，或当前网络无法访问维基文库。`;
        body.appendChild(message);
        retry.hidden = false;
      }
    }

    retry.addEventListener("click", load);
    load();
  }

  app.renderJourneyWorkCard = function renderJourneyWorkCard(container, work) {
    baseRenderJourneyWorkCard?.(container, work);
    if (!container || !work || work.text) return;
    createReader(container, work);
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
