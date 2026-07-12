(function (app) {
  const PERSON_ALIASES = {
    su_shi: ["苏轼", "蘇軾", "东坡", "東坡", "子瞻"],
    su_xun: ["苏洵", "蘇洵", "老泉"],
    su_zhe: ["苏辙", "蘇轍", "子由"],
    wang_fu: ["王弗"],
    wang_runzhi: ["王闰之", "王閏之", "闰之", "閏之"],
    chaoyun: ["朝云", "朝雲"],
    ouyang_xiu: ["欧阳修", "歐陽修", "六一居士"],
    wang_anshi: ["王安石", "介甫", "半山"],
    sima_guang: ["司马光", "司馬光", "君实", "君實"],
    zhang_dun: ["章惇", "子厚"],
    huang_tingjian: ["黄庭坚", "黃庭堅", "鲁直", "魯直"],
    qin_guan: ["秦观", "秦觀", "少游"],
    chao_buzhi: ["晁补之", "晁補之", "无咎", "無咎"],
    zhang_lei: ["张耒", "張耒", "文潜", "文潛"],
    chen_zao: ["陈慥", "陳慥", "季常"],
    foyin: ["佛印", "了元"],
    canliao: ["参寥", "參寥", "道潜", "道潛"]
  };

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function textOf(...values) {
    return values.flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean).join("\n");
  }

  function aliasesFor(person) {
    return [...new Set([person.name, ...asArray(PERSON_ALIASES[person.person_id])].filter(Boolean))];
  }

  function mentions(text, aliases) {
    return aliases.some((alias) => alias && text.includes(alias));
  }

  function chapterEventsFor(journey) {
    return app.getEvents().filter((event) => event.chapter === journey.chapter);
  }

  function visitText(visit) {
    return textOf(visit.stage, visit.event, visit.reading, visit.ancient_place, visit.modern, visit.visit_type_label);
  }

  function workText(work) {
    return textOf(work.title, work.summary, work.location_text, work.source_note, work.collection_label);
  }

  function eventText(event) {
    return textOf(event.title, event.summary, event.type, event.chapter);
  }

  function sortPeople(people) {
    return people.slice().sort((a, b) => {
      if (a.person_id === "su_shi") return -1;
      if (b.person_id === "su_shi") return 1;
      const groupOrder = String(a.group || "").localeCompare(String(b.group || ""), "zh-Hans-CN");
      return groupOrder || a.name.localeCompare(b.name, "zh-Hans-CN");
    });
  }

  app.getJourneyContext = function getJourneyContext(journey) {
    if (!journey) return { visits: [], works: [], people: [], events: [], chapterEvents: [], evidenceByPersonId: new Map() };
    const mapData = app.getJourneyMapData?.(journey.journey_id) || { visits: [] };
    const visits = asArray(mapData.visits);
    const works = asArray(app.getJourneyWorks?.(journey.journey_id));
    const chapterEvents = chapterEventsFor(journey);
    const explicitPersonIds = new Set(chapterEvents.flatMap((event) => asArray(event.people)));
    const evidenceByPersonId = new Map();

    const people = sortPeople(app.getPeople().filter((person) => {
      const aliases = aliasesFor(person);
      const relatedVisits = visits.filter((visit) => mentions(visitText(visit), aliases));
      const relatedWorks = works.filter((work) => mentions(workText(work), aliases));
      const relatedEvents = chapterEvents.filter((event) => asArray(event.people).includes(person.person_id) || mentions(eventText(event), aliases));
      const included = person.person_id === "su_shi" || explicitPersonIds.has(person.person_id) || relatedVisits.length || relatedWorks.length || relatedEvents.length;
      if (included) {
        evidenceByPersonId.set(person.person_id, {
          visits: person.person_id === "su_shi" ? visits : relatedVisits,
          works: person.person_id === "su_shi" ? works : relatedWorks,
          events: relatedEvents
        });
      }
      return included;
    }));

    const events = visits.map((visit) => ({
      event_id: `journey_${visit.visit_id}`,
      visit_id: visit.visit_id,
      title: visit.stage,
      type: visit.visit_type_label || "行程事件",
      time: visit.time,
      place: visit.ancient_place,
      modern: visit.modern,
      summary: visit.event,
      reading: visit.reading,
      phase_id: visit.phase_id,
      order: visit.order
    }));

    return { visits, works, people, events, chapterEvents, evidenceByPersonId };
  };

  function formatLifeYears(person) {
    if (person.birth_year && person.death_year) return `${person.birth_year}-${person.death_year}`;
    if (person.birth_year) return `${person.birth_year}-？`;
    if (person.death_year) return `？-${person.death_year}`;
    return "生卒年待核";
  }

  function appendHeader(container, eyebrow, title, meta) {
    const header = document.createElement("div");
    header.className = "knowledge-header";
    const eyebrowEl = document.createElement("span");
    eyebrowEl.textContent = eyebrow;
    const titleEl = document.createElement("h3");
    titleEl.textContent = title;
    header.append(eyebrowEl, titleEl);
    if (meta) {
      const metaEl = document.createElement("p");
      metaEl.textContent = meta;
      header.appendChild(metaEl);
    }
    container.appendChild(header);
  }

  function appendSummary(container, text, className = "knowledge-summary") {
    if (!text) return;
    const paragraph = document.createElement("p");
    paragraph.className = className;
    paragraph.textContent = text;
    container.appendChild(paragraph);
  }

  function appendBrowserButton(container, title, meta, summary, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "browser-item";
    const strong = document.createElement("strong");
    strong.textContent = title;
    button.appendChild(strong);
    if (meta) {
      const small = document.createElement("small");
      small.textContent = meta;
      button.appendChild(small);
    }
    if (summary) {
      const small = document.createElement("small");
      small.textContent = summary;
      button.appendChild(small);
    }
    button.addEventListener("click", onClick);
    container.appendChild(button);
  }

  function appendChipSection(container, title, items, emptyText, labelFor, onClick) {
    const section = document.createElement("section");
    section.className = "knowledge-section";
    const heading = document.createElement("h4");
    heading.textContent = title;
    section.appendChild(heading);
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "muted-line";
      empty.textContent = emptyText;
      section.appendChild(empty);
    } else {
      const chips = document.createElement("div");
      chips.className = "knowledge-chips";
      items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = labelFor(item);
        button.addEventListener("click", () => onClick(item));
        chips.appendChild(button);
      });
      section.appendChild(chips);
    }
    container.appendChild(section);
  }

  app.renderJourneyPeopleBrowser = function renderJourneyPeopleBrowser(container, detailPanel, journey, context) {
    if (!container) return;
    container.innerHTML = "";
    const grouped = new Map();
    context.people.forEach((person) => {
      const group = person.group || "未分组";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(person);
    });
    if (!context.people.length) {
      appendSummary(container, "本章尚未匹配到已录入人物。", "muted-line");
      return;
    }
    grouped.forEach((people, group) => {
      const section = document.createElement("section");
      section.className = "browser-group";
      const heading = document.createElement("h3");
      heading.textContent = group;
      section.appendChild(heading);
      people.forEach((person) => {
        const evidence = context.evidenceByPersonId.get(person.person_id) || { visits: [], works: [], events: [] };
        const evidenceText = person.person_id === "su_shi"
          ? `本章核心人物 · ${context.visits.length} 个行程节点 · ${context.works.length} 篇作品`
          : `本章关联 ${evidence.visits.length} 个节点 · ${evidence.works.length} 篇作品 · ${evidence.events.length} 项总览事件`;
        appendBrowserButton(
          section,
          person.name,
          `${formatLifeYears(person)} · ${person.group || "分组待核"}`,
          evidenceText,
          () => app.renderJourneyPersonCard(detailPanel, person, journey, context)
        );
      });
      container.appendChild(section);
    });
  };

  app.renderJourneyPersonCard = function renderJourneyPersonCard(container, person, journey, context) {
    if (!container || !person) return;
    container.innerHTML = "";
    const evidence = context.evidenceByPersonId.get(person.person_id) || { visits: [], works: [], events: [] };
    appendHeader(container, "本章人物", person.name, `${journey.chapter} · ${formatLifeYears(person)} · ${person.group || "分组待核"}`);
    appendSummary(container, person.role_summary || "暂无简介。");
    appendSummary(container, person.relation_to_su_shi || "与苏轼关系待核。");
    if (person.person_id === "su_shi") {
      appendSummary(container, "本章全部行程、事件和作品都以苏轼为中心。", "muted-line");
    }
    appendChipSection(
      container,
      "本章关联行程",
      evidence.visits.slice(0, 18),
      "本章暂无可定位的关联节点。",
      (visit) => `${visit.order}. ${visit.stage}`,
      (visit) => app.selectJourneyVisit?.(visit.visit_id)
    );
    appendChipSection(
      container,
      "本章关联作品",
      evidence.works,
      "本章暂无直接提及此人的作品索引。",
      (work) => work.title,
      (work) => {
        app.renderJourneyWorkCard?.(container, work);
        app.selectJourneyVisit?.(work.visit_id, { updateDetail: false });
      }
    );
    if (person.source_note) appendSummary(container, person.source_note, "knowledge-source");
  };

  app.renderJourneyEventBrowser = function renderJourneyEventBrowser(container, detailPanel, journey, context) {
    if (!container) return;
    container.innerHTML = "";
    const grouped = new Map();
    context.events.forEach((event) => {
      const group = event.type || "其他事件";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(event);
    });
    if (!context.events.length) {
      appendSummary(container, "本章尚无事件数据。", "muted-line");
      return;
    }
    grouped.forEach((events, group) => {
      const section = document.createElement("section");
      section.className = "browser-group";
      const heading = document.createElement("h3");
      heading.textContent = group;
      section.appendChild(heading);
      events.sort((a, b) => a.order - b.order).forEach((event) => {
        appendBrowserButton(
          section,
          `${event.order}. ${event.title}`,
          `${event.time} · ${event.place}`,
          event.summary,
          () => app.selectJourneyVisit?.(event.visit_id)
        );
      });
      container.appendChild(section);
    });
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
