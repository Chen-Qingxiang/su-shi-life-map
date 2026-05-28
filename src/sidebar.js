(function (app) {
  function formatYearRange(start, end) {
    if (start && end && start !== end) return `${start}-${end}`;
    return start || end || "年代待核";
  }

  function formatLifeYears(person) {
    if (person.birth_year && person.death_year) return `${person.birth_year}-${person.death_year}`;
    if (person.birth_year) return `${person.birth_year}-？`;
    if (person.death_year) return `？-${person.death_year}`;
    return "生卒年待核";
  }

  function placeLabel(placeKey) {
    const place = app.getPlaceByKey?.(placeKey);
    return place ? place.name : placeKey;
  }

  function renderEmpty(container, text) {
    const line = document.createElement("p");
    line.className = "muted-line";
    line.textContent = text;
    container.appendChild(line);
  }

  function renderButtonList(container, items, className, getLabel, onClick) {
    const list = document.createElement("div");
    list.className = className;
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = getLabel(item);
      button.addEventListener("click", () => onClick(item));
      list.appendChild(button);
    });
    container.appendChild(list);
  }

  function renderKnowledgeSection(container, title, items, emptyText, getLabel, onClick) {
    const section = document.createElement("section");
    section.className = "knowledge-section";

    const heading = document.createElement("h4");
    heading.textContent = title;
    section.appendChild(heading);

    if (items.length) {
      renderButtonList(section, items, "knowledge-chips", getLabel, onClick);
    } else {
      renderEmpty(section, emptyText);
    }

    container.appendChild(section);
  }

  function renderBrowserButton(container, title, meta, summary, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "browser-item";

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;
    button.appendChild(titleEl);

    if (meta) {
      const metaEl = document.createElement("small");
      metaEl.textContent = meta;
      button.appendChild(metaEl);
    }

    if (summary) {
      const summaryEl = document.createElement("small");
      summaryEl.textContent = summary;
      button.appendChild(summaryEl);
    }

    button.addEventListener("click", onClick);
    container.appendChild(button);
  }

  function renderGroupedBrowserList(container, groups) {
    groups.forEach(({ title, items }) => {
      const group = document.createElement("section");
      group.className = "browser-group";

      const heading = document.createElement("h3");
      heading.textContent = title;
      group.appendChild(heading);

      items.forEach((renderItem) => renderItem(group));
      container.appendChild(group);
    });
  }

  function renderSourceNote(container, sourceNote) {
    if (!sourceNote) return;
    const note = document.createElement("p");
    note.className = "knowledge-source";
    note.textContent = sourceNote;
    container.appendChild(note);
  }

  function setPanelHeader(container, eyebrow, title, meta) {
    const header = document.createElement("div");
    header.className = "knowledge-header";

    const eyebrowEl = document.createElement("span");
    eyebrowEl.textContent = eyebrow;
    header.appendChild(eyebrowEl);

    const titleEl = document.createElement("h3");
    titleEl.textContent = title;
    header.appendChild(titleEl);

    if (meta) {
      const metaEl = document.createElement("p");
      metaEl.textContent = meta;
      header.appendChild(metaEl);
    }

    container.appendChild(header);
  }

  app.renderStageLegend = function renderStageLegend(container, legendItems) {
    legendItems.forEach(([label, color]) => {
      const row = document.createElement("span");
      row.innerHTML = `<i class="dot" style="background:${color}"></i>${label}`;
      container.appendChild(row);
    });
  };

  app.renderRegimeLegend = function renderRegimeLegend(container, historicalRegimes, regimeColors) {
    if (historicalRegimes?.features?.length) {
      const regimes = new Map();
      historicalRegimes.features.forEach((feature) => {
        const props = feature.properties;
        if (!regimes.has(props.regime_key)) {
          regimes.set(props.regime_key, {
            label: props.regime_name_zh,
            color: regimeColors[props.regime_key] || props.color
          });
        }
      });
      regimes.forEach(({ label, color }) => {
        const row = document.createElement("span");
        row.innerHTML = `<i class="swatch" style="background:${color}"></i>${label}`;
        container.appendChild(row);
      });
    } else {
      container.innerHTML = `<span class="muted-line">历史区域数据未加载。</span>`;
    }
  };

  app.renderPlaceList = function renderPlaceList(container, stops, markers, map, stages) {
    if (!stops.length) {
      container.innerHTML = `<p class="muted-line">地点数据未加载。</p>`;
    }

    stops.forEach((stop) => {
      const color = stages[stop.stage]?.color || "#344054";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "place";
      button.dataset.placeKey = stop.place_key || "";
      button.innerHTML = `
        <strong><span class="dot" style="background:${color}"></span>${stop.order}. ${stop.name}</strong>
        <small>${stop.age_detail || `${stop.years}（约 ${stop.age} 岁）`} · ${stop.stage}</small>
        <small>${stop.event}</small>
      `;
      button.addEventListener("click", () => {
        if (app.selectPlace && stop.place_key) {
          app.selectPlace(stop.place_key);
        } else {
          map.setView([stop.lat, stop.lon], 8, { animate: true });
          markers.get(stop.order).openPopup();
        }
      });
      container.appendChild(button);
    });
  };

  app.setupKnowledgeTabs = function setupKnowledgeTabs(container) {
    if (!container) return;
    const tabs = Array.from(container.querySelectorAll(".tab"));
    const panels = Array.from(document.querySelectorAll(".tab-panel"));

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const selected = tab.dataset.tab;
        tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
        panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === selected));
      });
    });
  };

  app.renderPeopleBrowser = function renderPeopleBrowser(container, detailPanel) {
    if (!container) return;
    container.innerHTML = "";
    const grouped = new Map();

    app.getPeople().forEach((person) => {
      const group = person.group || "未分组";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push((groupContainer) => {
        renderBrowserButton(
          groupContainer,
          person.name,
          `${formatLifeYears(person)} · ${person.group || "分组待核"}`,
          person.relation_to_su_shi,
          () => app.renderPersonCard(detailPanel, person)
        );
      });
    });

    renderGroupedBrowserList(container, Array.from(grouped, ([title, items]) => ({ title, items })));
  };

  app.renderEventBrowser = function renderEventBrowser(container, detailPanel) {
    if (!container) return;
    container.innerHTML = "";
    const events = app.getEvents().slice().sort((a, b) => (a.year_start || 0) - (b.year_start || 0));

    events.forEach((event) => {
      renderBrowserButton(
        container,
        event.title,
        `${formatYearRange(event.year_start, event.year_end)} · ${event.type || "类型待核"} · ${placeLabel(event.place_key)}`,
        event.summary,
        () => {
          app.renderEventCard(detailPanel, event);
          if (event.place_key) app.selectPlace?.(event.place_key, { updateDetail: false });
        }
      );
    });
  };

  app.renderWorkBrowser = function renderWorkBrowser(container, detailPanel) {
    if (!container) return;
    container.innerHTML = "";
    const works = app.getWorks().slice().sort((a, b) => {
      const yearA = a.year || 9999;
      const yearB = b.year || 9999;
      if (yearA !== yearB) return yearA - yearB;
      return a.title.localeCompare(b.title, "zh-Hans-CN");
    });

    works.forEach((work) => {
      renderBrowserButton(
        container,
        work.title,
        `${work.year || "年代待核"} · ${work.genre || "体裁待核"} · ${placeLabel(work.place_key)}`,
        work.summary,
        () => {
          app.renderWorkCard(detailPanel, work);
          if (work.place_key) app.selectPlace?.(work.place_key, { updateDetail: false });
        }
      );
    });
  };

  app.setActivePlaceButton = function setActivePlaceButton(placeKey) {
    document.querySelectorAll(".place").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.placeKey === placeKey);
    });
  };

  app.renderDetailIntro = function renderDetailIntro(container) {
    if (!container) return;
    container.innerHTML = "";
    setPanelHeader(container, "阅读联动", "选择一个地点", "点击地图点位或左侧地点列表，查看相关人物、事件和作品。");
  };

  app.renderPlaceKnowledgeDetail = function renderPlaceKnowledgeDetail(container, stop) {
    if (!container || !stop) return;
    container.innerHTML = "";
    const people = app.getPeopleForPlace?.(stop.place_key) || [];
    const events = app.getEventsForPlace?.(stop.place_key) || [];
    const works = app.getWorksForPlace?.(stop.place_key) || [];

    setPanelHeader(container, "地点", stop.name, `${stop.age_detail || stop.years} · ${stop.stage}`);

    const summary = document.createElement("p");
    summary.className = "knowledge-summary";
    summary.textContent = stop.event;
    container.appendChild(summary);

    renderKnowledgeSection(container, "相关人物", people, "暂无人物 seed data。", (person) => person.name, (person) => app.renderPersonCard(container, person));
    renderKnowledgeSection(container, "相关事件", events, "暂无事件 seed data。", (event) => `${formatYearRange(event.year_start, event.year_end)} · ${event.title}`, (event) => {
      app.renderEventCard(container, event);
      if (event.place_key) app.selectPlace?.(event.place_key, { openPopup: true, updateDetail: false });
    });
    renderKnowledgeSection(container, "相关作品", works, "暂无作品 seed data。", (work) => `${work.year || "年代待核"} · ${work.title}`, (work) => {
      app.renderWorkCard(container, work);
      if (work.place_key) app.selectPlace?.(work.place_key, { openPopup: true, updateDetail: false });
    });
  };

  app.renderPersonCard = function renderPersonCard(container, person) {
    if (!container || !person) return;
    container.innerHTML = "";
    setPanelHeader(container, "人物", person.name, `${formatLifeYears(person)} · ${person.group || "分组待核"}`);

    const role = document.createElement("p");
    role.className = "knowledge-summary";
    role.textContent = person.role_summary || "暂无简介。";
    container.appendChild(role);

    const relation = document.createElement("p");
    relation.className = "knowledge-summary";
    relation.textContent = person.relation_to_su_shi || "与苏轼关系待核。";
    container.appendChild(relation);

    const nativePlace = document.createElement("p");
    nativePlace.className = "muted-line";
    nativePlace.textContent = `籍贯：${person.native_place || "待核"}`;
    container.appendChild(nativePlace);

    renderKnowledgeSection(container, "相关地点", person.related_place_keys || [], "暂无关联地点。", placeLabel, (placeKey) => app.selectPlace?.(placeKey));

    const relations = app.getRelationsForPerson?.(person.person_id) || [];
    renderKnowledgeSection(container, "相关关系", relations, "暂无关系 seed data。", (item) => {
      const otherId = item.source_person_id === person.person_id ? item.target_person_id : item.source_person_id;
      const other = app.getPersonById?.(otherId);
      return `${other?.name || otherId} · ${item.relation_type}`;
    }, (item) => {
      const otherId = item.source_person_id === person.person_id ? item.target_person_id : item.source_person_id;
      const other = app.getPersonById?.(otherId);
      if (other) app.renderPersonCard(container, other);
    });

    renderSourceNote(container, person.source_note);
  };

  app.renderEventCard = function renderEventCard(container, event) {
    if (!container || !event) return;
    container.innerHTML = "";
    setPanelHeader(container, "事件", event.title, `${formatYearRange(event.year_start, event.year_end)} · ${event.type || "类型待核"}`);

    const summary = document.createElement("p");
    summary.className = "knowledge-summary";
    summary.textContent = event.summary || "暂无简介。";
    container.appendChild(summary);

    const chapter = document.createElement("p");
    chapter.className = "muted-line";
    chapter.textContent = `章节：${event.chapter || "待核"}`;
    container.appendChild(chapter);

    renderKnowledgeSection(container, "地点", [event.place_key].filter(Boolean), "暂无关联地点。", placeLabel, (placeKey) => app.selectPlace?.(placeKey));
    renderKnowledgeSection(container, "人物", (event.people || []).map((personId) => app.getPersonById?.(personId)).filter(Boolean), "暂无关联人物。", (person) => person.name, (person) => app.renderPersonCard(container, person));
    renderKnowledgeSection(container, "作品", (event.works || []).map((workId) => app.getWorkById?.(workId)).filter(Boolean), "暂无关联作品。", (work) => work.title, (work) => app.renderWorkCard(container, work));
    renderSourceNote(container, event.source_note);
  };

  app.renderWorkCard = function renderWorkCard(container, work) {
    if (!container || !work) return;
    container.innerHTML = "";
    setPanelHeader(container, "作品", work.title, `${work.year || "年代待核"} · ${work.genre || "体裁待核"}`);

    const summary = document.createElement("p");
    summary.className = "knowledge-summary";
    summary.textContent = work.summary || "暂无简介。";
    container.appendChild(summary);

    renderKnowledgeSection(container, "地点", [work.place_key].filter(Boolean), "暂无关联地点。", placeLabel, (placeKey) => app.selectPlace?.(placeKey));

    const event = work.event_id ? app.getEventById?.(work.event_id) : null;
    renderKnowledgeSection(container, "事件", event ? [event] : [], "暂无关联事件。", (item) => item.title, (item) => app.renderEventCard(container, item));
    renderSourceNote(container, work.source_note);
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
