(function (app) {
  const API_URL = "https://zh.wikisource.org/w/api.php";
  const SITE_URL = "https://zh.wikisource.org/wiki/";
  const resultCache = new Map();
  const baseRenderJourneyWorkCard = app.renderJourneyWorkCard;
  const baseRenderWorkCard = app.renderWorkCard;

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
    if (!container || !work || (!work.text && !work.text_source_url)) return;
    container.querySelector(".work-reader")?.remove();
    const section = document.createElement("section");
    section.className = "work-reader";

    const heading = document.createElement("div");
    heading.className = "work-reader-heading";
    const title = document.createElement("h4");
    title.textContent = "阅读原文";
    const status = document.createElement("span");
    status.className = "work-reader-status";
    status.textContent = work.text
      ? `本地已保存${work.text_scope ? ` · ${work.text_scope}` : ""}`
      : "本地暂无全文";
    heading.append(title, status);
    section.appendChild(heading);

    const actions = document.createElement("div");
    actions.className = "work-reader-actions";

    let body = null;
    if (work.text) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "work-reader-toggle";
      toggle.textContent = "阅读原文";
      toggle.setAttribute("aria-expanded", "false");
      actions.appendChild(toggle);

      body = document.createElement("div");
      body.className = "work-reader-body";
      body.hidden = true;
      const text = document.createElement("pre");
      text.className = "poem-text";
      text.textContent = work.text;
      body.appendChild(text);

      toggle.addEventListener("click", () => {
        const expanded = body.hidden;
        body.hidden = !expanded;
        toggle.textContent = expanded ? "收起原文" : "阅读原文";
        toggle.setAttribute("aria-expanded", String(expanded));
      });
    }

    if (work.text_source_url) {
      const openLink = document.createElement("a");
      openLink.className = "work-reader-open";
      openLink.href = work.text_source_url;
      openLink.target = "_blank";
      openLink.rel = "noopener noreferrer";
      openLink.textContent = work.text ? "在维基文库核对" : (work.text_source_label || "在维基文库阅读");
      actions.appendChild(openLink);
    }

    section.appendChild(actions);
    if (body) section.appendChild(body);
    if (work.text_status_note) {
      const note = document.createElement("p");
      note.className = "work-reader-note";
      note.textContent = work.text_status_note;
      section.appendChild(note);
    }

    const summary = container.querySelector(".knowledge-summary");
    if (summary) summary.insertAdjacentElement("afterend", section);
    else container.appendChild(section);
  }

  app.renderJourneyWorkCard = function renderJourneyWorkCard(container, work) {
    baseRenderJourneyWorkCard?.(container, work);
    createReader(container, work);
  };

  app.renderWorkCard = function renderWorkCard(container, work) {
    baseRenderWorkCard?.(container, work);
    createReader(container, work);
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
