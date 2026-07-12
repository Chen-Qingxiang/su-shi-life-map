(function (app) {
  const params = new URLSearchParams(window.location.search);
  const journeys = Array.isArray(app.getJourneys?.()) ? app.getJourneys() : [];
  const journey = app.getJourneyById?.(params.get("journey"))
    || app.getJourneyById?.("nanxing_1059_1060")
    || journeys[0]
    || null;
  const context = journey ? app.getJourneyContext?.(journey) : null;
  const detailPanel = document.querySelector("#detailPanel");
  const timelineShell = document.querySelector("#timelineShell");
  const timelineList = document.querySelector("#timelineList");
  const chapterProgress = document.querySelector("#chapterProgress");
  const historicalContextNote = document.querySelector("#historicalContextNote");
  const scopeSearch = document.querySelector("#scopeSearch");
  const scopeFilter = document.querySelector("#scopeFilter");
  const qualityFilter = document.querySelector("#qualityFilter");
  const searchResults = document.querySelector("#searchResults");
  const scopeSummary = document.querySelector("#scopeSummary");
  const detailBack = document.querySelector("#detailBack");
  const detailCopy = document.querySelector("#detailCopy");
  const sidebarToggle = document.querySelector("#sidebarToggle");
  const tabs = new Map(Array.from(document.querySelectorAll(".tab")).map((tab) => [tab.dataset.tab, tab]));
  let suppressHistory = false;
  let currentEntity = null;

  function activeMode() {
    return document.body.dataset.mode === "journey" ? "journey" : "life";
  }

  function activateTab(name) {
    tabs.get(name)?.click();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function escapeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function certaintyLabel(value) {
    return window.suShiKnowledgeConfig?.certainty_levels?.[value] || value || "待核";
  }

  function qualityForWork(work) {
    const status = app.getWorkTextStatus?.(work) || (work.text ? "local" : "search");
    return {
      status,
      certainty: status === "local" ? "high" : status === "external" ? "medium" : "low"
    };
  }

  function setEntityUrl(type, id, options = {}) {
    if (suppressHistory) return;
    const url = new URL(window.location.href);
    ["place", "visit", "person", "event", "work"].forEach((key) => url.searchParams.delete(key));
    if (type && id) url.searchParams.set(type, id);
    const state = { type: type || null, id: id || null };
    if (options.replace) window.history.replaceState(state, "", url);
    else window.history.pushState(state, "", url);
    currentEntity = state.type ? state : null;
    updateDetailActions();
  }

  function clearEntityUrl() {
    const url = new URL(window.location.href);
    ["place", "visit", "person", "event", "work"].forEach((key) => url.searchParams.delete(key));
    window.history.pushState({ type: null, id: null }, "", url);
    currentEntity = null;
    updateDetailActions();
  }

  function updateDetailActions() {
    if (detailBack) {
      detailBack.hidden = !currentEntity;
      detailBack.textContent = activeMode() === "journey" ? "返回章节概览" : "返回总览";
    }
    if (detailCopy) detailCopy.disabled = !detailPanel?.textContent?.trim();
  }

  async function copyCurrentReference() {
    const title = detailPanel?.querySelector(".knowledge-header h3")?.textContent?.trim() || document.title;
    const sources = Array.from(detailPanel?.querySelectorAll(".source-details li, .knowledge-source") || [])
      .map((node) => escapeText(node.textContent)).filter(Boolean).join("\n");
    const text = [title, sources, window.location.href].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    if (detailCopy) {
      detailCopy.textContent = "已复制";
      window.setTimeout(() => { detailCopy.textContent = "复制引用"; }, 1200);
    }
  }

  function renderJourneyOverview() {
    if (!journey || !detailPanel) return;
    suppressHistory = true;
    app.renderJourneyIntro?.(detailPanel, journey);
    suppressHistory = false;
    clearEntityUrl();
  }

  function renderLifeOverview() {
    if (!detailPanel) return;
    suppressHistory = true;
    app.renderDetailIntro?.(detailPanel);
    suppressHistory = false;
    clearEntityUrl();
  }

  function timelinePhaseTitle(phaseId) {
    return journey?.phases?.find((phase) => phase.phase_id === phaseId)?.title || "未分阶段";
  }

  function renderTimeline() {
    if (!timelineShell || !timelineList) return;
    const isJourney = activeMode() === "journey" && journey && context;
    timelineShell.hidden = !isJourney;
    if (!isJourney) return;
    timelineList.innerHTML = "";
    let currentPhase = null;
    context.visits.forEach((visit) => {
      if (visit.phase_id !== currentPhase) {
        currentPhase = visit.phase_id;
        const heading = document.createElement("h3");
        heading.className = "timeline-phase";
        heading.textContent = timelinePhaseTitle(visit.phase_id);
        timelineList.appendChild(heading);
      }
      const item = document.createElement("button");
      item.type = "button";
      item.className = "timeline-item";
      item.dataset.visitId = visit.visit_id;
      item.dataset.certainty = visit.certainty || "medium";
      item.innerHTML = `<span class="timeline-order">${visit.order}</span><span class="timeline-copy"><strong>${visit.stage}</strong><small>${visit.time} · ${visit.ancient_place}</small><small>${visit.visit_type_label || "行程事件"} · ${certaintyLabel(visit.certainty)}</small></span>`;
      item.addEventListener("click", () => {
        activateTab("places");
        app.selectJourneyVisit?.(visit.visit_id);
      });
      timelineList.appendChild(item);
    });
  }

  function setActiveTimelineVisit(visitId) {
    const safeId = window.CSS?.escape ? CSS.escape(visitId) : String(visitId).replace(/["\\]/g, "\\$&");
    const item = timelineList?.querySelector(`[data-visit-id="${safeId}"]`);
    timelineList?.querySelectorAll(".timeline-item").forEach((button) => button.classList.toggle("is-active", button === item));
    item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function updateChapterProgress() {
    if (!chapterProgress) return;
    if (activeMode() !== "journey" || !journey || !context) {
      chapterProgress.textContent = "全书总览";
      return;
    }
    const index = journeys.findIndex((item) => item.journey_id === journey.journey_id);
    chapterProgress.textContent = `第 ${index + 1} / ${journeys.length} 章 · ${context.visits.length} 行程 · ${context.personLinks.length} 人物 · ${context.eventGroups.length} 事件 · ${context.works.length} 作品`;
  }

  function setHistoricalPaneVisible(visible) {
    const pane = app.mapContext?.map?.getPane?.("historicalRegimes");
    if (pane) pane.style.display = visible ? "" : "none";
  }

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (_error) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (_error) { /* Private mode may reject storage. */ }
  }

  function updateHistoricalContext() {
    if (!historicalContextNote) return;
    const availableYear = window.suShiKnowledgeConfig?.historical_context?.available_slice_years?.[0] || 1080;
    const threshold = window.suShiKnowledgeConfig?.historical_context?.auto_hide_distance_years || 10;
    if (activeMode() !== "journey" || !journey) {
      historicalContextNote.innerHTML = `<strong>历史背景：</strong>${availableYear} 年切片用于全书空间参照。`;
      setHistoricalPaneVisible(true);
      return;
    }
    const midpoint = (Number(journey.year_start) + Number(journey.year_end)) / 2;
    const distance = Math.round(Math.abs(midpoint - availableYear));
    const storageKey = `sushi-map:show-historical:${journey.journey_id}`;
    const userChoice = storageGet(storageKey);
    const visible = userChoice === null ? distance <= threshold : userChoice === "true";
    setHistoricalPaneVisible(visible);
    historicalContextNote.innerHTML = "";
    const text = document.createElement("span");
    text.innerHTML = `<strong>历史背景：</strong>当前只有 ${availableYear} 年切片；本章为 ${journey.year_start}—${journey.year_end}，相差约 ${distance} 年。`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "inline-control";
    button.textContent = visible ? "隐藏 1080 背景" : "仍显示 1080 背景";
    button.addEventListener("click", () => {
      storageSet(storageKey, String(!visible));
      updateHistoricalContext();
    });
    historicalContextNote.append(text, button);
  }

  function currentJourneyResults() {
    if (!context) return [];
    return [
      ...context.visits.map((visit) => ({
        type: "visit", id: visit.visit_id, title: visit.stage,
        meta: `${visit.time} · ${visit.ancient_place}`, summary: visit.event,
        certainty: visit.certainty || "medium",
        searchText: escapeText(`${visit.stage} ${visit.time} ${visit.ancient_place} ${visit.modern} ${visit.event} ${visit.reading}`)
      })),
      ...context.personLinks.map((link) => ({
        type: "person", id: link.person_id, title: link.person.name,
        meta: link.role_in_chapter, summary: link.person.relation_to_su_shi,
        certainty: link.certainty || "medium",
        searchText: escapeText(`${link.person.name} ${link.role_in_chapter} ${link.person.role_summary} ${link.person.relation_to_su_shi}`)
      })),
      ...context.eventGroups.map((event) => ({
        type: "event", id: event.event_id, title: `${event.phase_title} · ${event.title}`,
        meta: `${event.visits.length} 个节点`, summary: event.summary,
        certainty: event.certainty || "medium",
        searchText: escapeText(`${event.phase_title} ${event.title} ${event.summary} ${event.visits.map((visit) => visit.stage).join(" ")}`)
      })),
      ...context.works.map((work) => {
        const quality = qualityForWork(work);
        return {
          type: "work", id: work.work_id, title: work.title,
          meta: `${work.time_text || work.year || "年代待核"} · ${work.location_text || ""}`,
          summary: work.summary, certainty: quality.certainty, textStatus: quality.status,
          searchText: escapeText(`${work.title} ${work.summary} ${work.location_text} ${work.collection_label}`)
        };
      })
    ];
  }

  function currentLifeResults() {
    const stops = app.getLifeMapData?.().stops || [];
    return [
      ...stops.map((stop) => ({
        type: "place", id: stop.place_key, title: stop.name,
        meta: stop.age_detail || stop.years, summary: stop.event, certainty: "medium",
        searchText: escapeText(`${stop.name} ${stop.modern} ${stop.event} ${stop.note}`)
      })),
      ...asArray(app.getPeople?.()).map((person) => ({
        type: "person", id: person.person_id, title: person.name,
        meta: person.group || "", summary: person.relation_to_su_shi, certainty: "medium",
        searchText: escapeText(`${person.name} ${person.group} ${person.role_summary} ${person.relation_to_su_shi}`)
      })),
      ...asArray(app.getEvents?.()).map((event) => ({
        type: "event", id: event.event_id, title: event.title,
        meta: `${event.year_start || ""} · ${event.type || ""}`, summary: event.summary, certainty: "medium",
        searchText: escapeText(`${event.title} ${event.type} ${event.summary} ${event.chapter}`)
      })),
      ...asArray(app.getWorks?.()).map((work) => {
        const quality = qualityForWork(work);
        return {
          type: "work", id: work.work_id, title: work.title,
          meta: `${work.year || ""} · ${work.genre || ""}`, summary: work.summary,
          certainty: quality.certainty, textStatus: quality.status,
          searchText: escapeText(`${work.title} ${work.genre} ${work.summary}`)
        };
      })
    ];
  }

  function typeLabel(type) {
    return { place: "地点", visit: "行程", person: "人物", event: "事件", work: "作品" }[type] || type;
  }

  function openSearchResult(result) {
    if (activeMode() === "journey") {
      if (result.type === "visit") {
        activateTab("places");
        app.selectJourneyVisit?.(result.id);
      } else if (result.type === "person") {
        const link = context?.personLinkById?.get(result.id);
        if (link) {
          activateTab("people");
          app.renderJourneyPersonCard?.(detailPanel, link.person, journey, context);
        }
      } else if (result.type === "event") {
        const event = context?.eventById?.get(result.id);
        if (event) {
          activateTab("events");
          app.renderJourneyEventCard?.(detailPanel, event, journey, context);
        }
      } else if (result.type === "work") {
        const work = context?.works.find((item) => item.work_id === result.id);
        if (work) {
          activateTab("works");
          app.renderJourneyWorkCard?.(detailPanel, work);
          if (work.visit_id) app.selectJourneyVisit?.(work.visit_id, { updateDetail: false });
        }
      }
    } else if (result.type === "place") {
      activateTab("places");
      app.selectPlace?.(result.id);
    } else if (result.type === "person") {
      const person = app.getPersonById?.(result.id);
      if (person) {
        activateTab("people");
        app.renderPersonCard?.(detailPanel, person);
      }
    } else if (result.type === "event") {
      const event = app.getEventById?.(result.id);
      if (event) {
        activateTab("events");
        app.renderEventCard?.(detailPanel, event);
      }
    } else if (result.type === "work") {
      const work = app.getWorkById?.(result.id);
      if (work) {
        activateTab("works");
        app.renderWorkCard?.(detailPanel, work);
      }
    }
    scopeSearch?.blur();
  }

  function renderSearchResults() {
    if (!searchResults || !scopeSearch) return;
    const query = scopeSearch.value.trim().toLocaleLowerCase("zh-Hans-CN");
    const type = scopeFilter?.value || "all";
    const quality = qualityFilter?.value || "all";
    if (!query && type === "all" && quality === "all") {
      searchResults.hidden = true;
      searchResults.innerHTML = "";
      if (scopeSummary) scopeSummary.textContent = activeMode() === "journey" ? "搜索当前章节" : "搜索全书资料";
      return;
    }
    const source = activeMode() === "journey" ? currentJourneyResults() : currentLifeResults();
    const matches = source.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (quality !== "all" && item.certainty !== quality && item.textStatus !== quality) return false;
      return !query || item.searchText.toLocaleLowerCase("zh-Hans-CN").includes(query);
    }).slice(0, 80);
    searchResults.hidden = false;
    searchResults.innerHTML = "";
    if (scopeSummary) scopeSummary.textContent = `找到 ${matches.length} 项${matches.length === 80 ? "（仅显示前 80 项）" : ""}`;
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "muted-line";
      empty.textContent = "当前范围没有匹配内容。";
      searchResults.appendChild(empty);
      return;
    }
    matches.forEach((result) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.innerHTML = `<span class="search-result-type">${typeLabel(result.type)}</span><strong>${result.title}</strong><small>${result.meta || ""}</small><small>${result.summary || ""}</small><span class="search-result-quality">${certaintyLabel(result.certainty)}</span>`;
      button.addEventListener("click", () => openSearchResult(result));
      searchResults.appendChild(button);
    });
  }

  function applyDeepLink() {
    if (!journey && activeMode() === "journey") return;
    const ordered = ["visit", "person", "event", "work", "place"];
    const type = ordered.find((key) => params.get(key));
    const id = type ? params.get(type) : null;
    if (!type || !id) {
      currentEntity = null;
      updateDetailActions();
      return;
    }
    suppressHistory = true;
    if (activeMode() === "journey") {
      if (type === "visit") {
        activateTab("places");
        app.selectJourneyVisit?.(id);
      } else if (type === "person") {
        const link = context?.personLinkById?.get(id);
        if (link) {
          activateTab("people");
          app.renderJourneyPersonCard?.(detailPanel, link.person, journey, context);
        }
      } else if (type === "event") {
        const event = context?.eventById?.get(id);
        if (event) {
          activateTab("events");
          app.renderJourneyEventCard?.(detailPanel, event, journey, context);
        }
      } else if (type === "work") {
        const work = context?.works.find((item) => item.work_id === id);
        if (work) {
          activateTab("works");
          app.renderJourneyWorkCard?.(detailPanel, work);
          if (work.visit_id) app.selectJourneyVisit?.(work.visit_id, { updateDetail: false });
        }
      }
    } else if (type === "place") {
      activateTab("places");
      app.selectPlace?.(id);
    } else if (type === "person") {
      const person = app.getPersonById?.(id);
      if (person) {
        activateTab("people");
        app.renderPersonCard?.(detailPanel, person);
      }
    } else if (type === "event") {
      const event = app.getEventById?.(id);
      if (event) {
        activateTab("events");
        app.renderEventCard?.(detailPanel, event);
      }
    } else if (type === "work") {
      const work = app.getWorkById?.(id);
      if (work) {
        activateTab("works");
        app.renderWorkCard?.(detailPanel, work);
      }
    }
    suppressHistory = false;
    currentEntity = { type, id };
    updateDetailActions();
  }

  function wrapEntityMethods() {
    const baseSelectJourneyVisit = app.selectJourneyVisit;
    if (typeof baseSelectJourneyVisit === "function") {
      app.selectJourneyVisit = function selectJourneyVisitWithWorkbench(visitId, options = {}) {
        const result = baseSelectJourneyVisit(visitId, options);
        setActiveTimelineVisit(visitId);
        if (options.updateDetail !== false) setEntityUrl("visit", visitId);
        return result;
      };
    }
    const baseSelectPlace = app.selectPlace;
    if (typeof baseSelectPlace === "function") {
      app.selectPlace = function selectPlaceWithWorkbench(placeKey, options = {}) {
        const result = baseSelectPlace(placeKey, options);
        if (options.updateDetail !== false) setEntityUrl("place", placeKey);
        return result;
      };
    }
    [
      ["renderJourneyPersonCard", "person", (args) => args[1]?.person_id],
      ["renderJourneyEventCard", "event", (args) => args[1]?.event_id],
      ["renderJourneyWorkCard", "work", (args) => args[1]?.work_id],
      ["renderPersonCard", "person", (args) => args[1]?.person_id],
      ["renderEventCard", "event", (args) => args[1]?.event_id],
      ["renderWorkCard", "work", (args) => args[1]?.work_id]
    ].forEach(([methodName, type, getId]) => {
      const base = app[methodName];
      if (typeof base !== "function") return;
      app[methodName] = function renderEntityWithWorkbench(...args) {
        const result = base.apply(app, args);
        const id = getId(args);
        if (id) setEntityUrl(type, id);
        return result;
      };
    });
  }

  function setupDetailObserver() {
    if (!detailPanel) return;
    const observer = new MutationObserver(() => updateDetailActions());
    observer.observe(detailPanel, { childList: true, subtree: true, characterData: true });
  }

  function setupMobileDrawer() {
    if (!sidebarToggle) return;
    sidebarToggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("sidebar-open");
      sidebarToggle.setAttribute("aria-expanded", String(open));
      sidebarToggle.textContent = open ? "收起资料" : "打开资料";
    });
    const wide = !window.matchMedia("(max-width: 820px)").matches;
    document.body.classList.toggle("sidebar-open", wide);
    sidebarToggle.setAttribute("aria-expanded", String(wide));
  }

  function setupKeyboard() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && document.activeElement !== scopeSearch) {
        event.preventDefault();
        scopeSearch?.focus();
      }
      if (event.key === "Escape" && document.activeElement === scopeSearch) {
        scopeSearch.value = "";
        renderSearchResults();
        scopeSearch.blur();
      }
    });
  }

  function setup() {
    wrapEntityMethods();
    renderTimeline();
    updateChapterProgress();
    updateHistoricalContext();
    setupDetailObserver();
    setupMobileDrawer();
    setupKeyboard();
    [scopeSearch, scopeFilter, qualityFilter].forEach((control) => control?.addEventListener(control === scopeSearch ? "input" : "change", renderSearchResults));
    detailBack?.addEventListener("click", () => (activeMode() === "journey" ? renderJourneyOverview() : renderLifeOverview()));
    detailCopy?.addEventListener("click", copyCurrentReference);
    document.querySelectorAll(".mode-button").forEach((button) => button.addEventListener("click", () => window.setTimeout(() => {
      renderTimeline();
      updateChapterProgress();
      updateHistoricalContext();
      renderSearchResults();
    }, 0)));
    window.addEventListener("popstate", () => window.location.reload());
    applyDeepLink();
    renderSearchResults();
    updateDetailActions();
  }

  setup();
})(window.SuShiLifeMap = window.SuShiLifeMap || {});