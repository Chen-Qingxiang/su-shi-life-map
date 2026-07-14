(function (app) {
  const config = window.suShiKnowledgeConfig || {};
  const certaintyLabels = config.certainty_levels || { high: "高可信", medium: "中可信", low: "待核" };
  const relationLabels = config.relation_statuses || {};
  const textStatusLabels = config.work_text_statuses || {};

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function flattenText(...values) {
    return values
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter((value) => value !== null && value !== undefined && value !== "")
      .join("\n");
  }

  function aliasesFor(person) {
    return [...new Set([
      person?.name,
      ...asArray(config.person_aliases?.[person?.person_id])
    ].filter(Boolean))];
  }

  function mentions(text, aliases) {
    const value = String(text || "");
    return aliases.some((alias) => alias && value.includes(alias));
  }

  function visitText(visit) {
    return flattenText(
      visit.stage,
      visit.event,
      visit.reading,
      visit.ancient_place,
      visit.modern,
      visit.visit_type_label,
      visit.travel_mode
    );
  }

  function workText(work) {
    return flattenText(
      work.title,
      work.summary,
      work.location_text,
      work.source_note,
      work.collection_label,
      work.time_text
    );
  }

  function eventText(event) {
    return flattenText(event.title, event.summary, event.type, event.chapter);
  }

  function certaintyRank(value) {
    return { low: 0, medium: 1, high: 2 }[value] ?? 1;
  }

  function weakestCertainty(items) {
    if (!items.length) return "medium";
    return items.reduce((weakest, item) => (
      certaintyRank(item.certainty) < certaintyRank(weakest) ? item.certainty : weakest
    ), "high");
  }

  function uniqueBy(items, keyFor) {
    const seen = new Set();
    return items.filter((item) => {
      const key = keyFor(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function phaseMapFor(journey) {
    return new Map(asArray(journey?.phases).map((phase) => [phase.phase_id, phase]));
  }

  function sourceRefsForJourney(journey) {
    return uniqueBy([
      journey?.source_note ? {
        source_id: `${journey.journey_id}:biography`,
        label: "章节整理依据",
        citation: journey.source_note,
        kind: "biography_note"
      } : null
    ].filter(Boolean), (item) => item.source_id);
  }

  function chapterSeedEvents(journey) {
    return asArray(app.getEvents?.()).filter((event) => event.chapter === journey?.chapter);
  }

  function curatedPeopleFor(journeyId) {
    return asArray(config.curated_chapter_people?.[journeyId]);
  }

  function getWorkTextStatus(work) {
    if (["local", "external", "pending"].includes(work?.text_status)) return work.text_status;
    if (work?.text) return "local";
    if (work?.text_source_url && !/Special:Search/i.test(work.text_source_url)) return "external";
    return "pending";
  }

  app.getWorkTextStatus = getWorkTextStatus;

  function buildPersonLinks(journey, visits, works, seedEvents) {
    const curated = new Map(curatedPeopleFor(journey.journey_id).map((item) => [item.person_id, item]));
    const seedPersonIds = new Set(seedEvents.flatMap((event) => asArray(event.people)));
    const links = [];

    asArray(app.getPeople?.()).forEach((person) => {
      const aliases = aliasesFor(person);
      const visitMatches = visits.filter((visit) => mentions(visitText(visit), aliases));
      const workMatches = works.filter((work) => mentions(workText(work), aliases));
      const eventMatches = seedEvents.filter((event) => (
        asArray(event.people).includes(person.person_id) || mentions(eventText(event), aliases)
      ));
      const curatedLink = curated.get(person.person_id);
      const isSuShi = person.person_id === "su_shi";
      const included = isSuShi || curatedLink || seedPersonIds.has(person.person_id)
        || visitMatches.length || workMatches.length || eventMatches.length;

      if (!included) return;

      let relationStatus = "text_match";
      if (isSuShi || curatedLink) relationStatus = "curated";
      else if (seedPersonIds.has(person.person_id)) relationStatus = "event_seed";

      links.push({
        link_id: `${journey.journey_id}:person:${person.person_id}`,
        journey_id: journey.journey_id,
        person_id: person.person_id,
        person,
        relation_status: relationStatus,
        role_in_chapter: curatedLink?.role || (
          isSuShi ? "本章叙事核心人物" : person.relation_to_su_shi || "章节相关人物"
        ),
        certainty: curatedLink?.certainty || (relationStatus === "text_match" ? "medium" : "high"),
        visit_ids: (isSuShi ? visits : visitMatches).map((visit) => visit.visit_id),
        work_ids: (isSuShi ? works : workMatches).map((work) => work.work_id),
        seed_event_ids: eventMatches.map((event) => event.event_id),
        source_refs: sourceRefsForJourney(journey),
        evidence_note: relationStatus === "curated"
          ? "本章人物关系已经作为明确章节关联记录。"
          : relationStatus === "event_seed"
            ? "关系来自已建档的章节事件。"
            : "关系来自人物姓名、字或号在章节节点及作品说明中的匹配，仍建议人工核对。"
      });
    });

    return links.sort((a, b) => {
      if (a.person_id === "su_shi") return -1;
      if (b.person_id === "su_shi") return 1;
      const groupOrder = String(a.person.group || "").localeCompare(String(b.person.group || ""), "zh-Hans-CN");
      return groupOrder || a.person.name.localeCompare(b.person.name, "zh-Hans-CN");
    });
  }

  function buildEventGroups(journey, visits, works, personLinks) {
    const phases = phaseMapFor(journey);
    const grouped = new Map();

    visits.forEach((visit) => {
      const groupKey = `${visit.phase_id || "unphased"}::${visit.visit_type_label || "其他事件"}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          event_id: `${journey.journey_id}:event:${groupKey.replace(/[^a-zA-Z0-9_\u4e00-\u9fff-]+/g, "_")}`,
          journey_id: journey.journey_id,
          phase_id: visit.phase_id || "unphased",
          phase_title: phases.get(visit.phase_id)?.title || "未分阶段",
          title: visit.visit_type_label || "其他事件",
          type: visit.visit_type || "other",
          visits: [],
          works: [],
          people: [],
          source_refs: sourceRefsForJourney(journey)
        });
      }
      grouped.get(groupKey).visits.push(visit);
    });

    grouped.forEach((group) => {
      const visitIds = new Set(group.visits.map((visit) => visit.visit_id));
      group.works = works.filter((work) => visitIds.has(work.visit_id));
      group.people = personLinks.filter((link) => (
        link.person_id === "su_shi" || link.visit_ids.some((visitId) => visitIds.has(visitId))
      ));
      group.year_start = journey.year_start;
      group.year_end = journey.year_end;
      group.time_start = group.visits[0]?.time || "";
      group.time_end = group.visits[group.visits.length - 1]?.time || "";
      group.certainty = weakestCertainty(group.visits);
      group.summary = group.visits.length === 1
        ? group.visits[0].event
        : `本组汇集 ${group.visits.length} 个相互关联的行程节点：${group.visits.slice(0, 4).map((visit) => visit.stage).join("、")}${group.visits.length > 4 ? "等" : ""}。`;
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const orderA = a.visits[0]?.order || 0;
      const orderB = b.visits[0]?.order || 0;
      return orderA - orderB;
    });
  }

  function buildVisitLinks(journey, visits, works, personLinks, eventGroups) {
    const eventByVisit = new Map();
    eventGroups.forEach((event) => event.visits.forEach((visit) => eventByVisit.set(visit.visit_id, event)));

    return visits.map((visit) => {
      const linkedWorks = works.filter((work) => work.visit_id === visit.visit_id);
      const linkedPeople = personLinks.filter((link) => (
        link.person_id === "su_shi" || link.visit_ids.includes(visit.visit_id)
      ));
      const event = eventByVisit.get(visit.visit_id);
      return {
        link_id: `${journey.journey_id}:visit:${visit.visit_id}`,
        journey_id: journey.journey_id,
        visit_id: visit.visit_id,
        person_ids: linkedPeople.map((link) => link.person_id),
        work_ids: linkedWorks.map((work) => work.work_id),
        event_ids: event ? [event.event_id] : [],
        source_refs: sourceRefsForJourney(journey),
        certainty: visit.certainty || "medium",
        relation_status: "derived"
      };
    });
  }

  const baseGetJourneyContext = app.getJourneyContext;
  app.getJourneyContext = function getJourneyContext(journey) {
    const base = baseGetJourneyContext?.(journey) || {};
    if (!journey) return {
      ...base,
      visits: [],
      works: [],
      people: [],
      personLinks: [],
      events: [],
      eventGroups: [],
      visitLinks: [],
      sourceRefs: []
    };

    const mapData = app.getJourneyMapData?.(journey.journey_id) || { visits: [] };
    const visits = asArray(mapData.visits);
    const works = asArray(app.getJourneyWorks?.(journey.journey_id));
    const seedEvents = chapterSeedEvents(journey);
    const personLinks = buildPersonLinks(journey, visits, works, seedEvents);
    const eventGroups = buildEventGroups(journey, visits, works, personLinks);
    const visitLinks = buildVisitLinks(journey, visits, works, personLinks, eventGroups);

    return {
      ...base,
      journey,
      visits,
      works,
      people: personLinks.map((link) => link.person),
      personLinks,
      events: eventGroups,
      eventGroups,
      chapterEvents: seedEvents,
      visitLinks,
      sourceRefs: sourceRefsForJourney(journey),
      personLinkById: new Map(personLinks.map((link) => [link.person_id, link])),
      eventById: new Map(eventGroups.map((event) => [event.event_id, event])),
      visitLinkById: new Map(visitLinks.map((link) => [link.visit_id, link]))
    };
  };

  function createBadge(text, className = "") {
    const badge = document.createElement("span");
    badge.className = `evidence-badge ${className}`.trim();
    badge.textContent = text;
    return badge;
  }

  function appendBadgeRow(container, badges) {
    const row = document.createElement("div");
    row.className = "evidence-badges";
    badges.filter(Boolean).forEach((badge) => row.appendChild(badge));
    container.appendChild(row);
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

  function appendParagraph(container, text, className = "knowledge-summary") {
    if (!text) return;
    const paragraph = document.createElement("p");
    paragraph.className = className;
    paragraph.textContent = text;
    container.appendChild(paragraph);
  }

  function appendSourceRefs(container, sourceRefs) {
    const refs = asArray(sourceRefs);
    if (!refs.length) return;
    const details = document.createElement("details");
    details.className = "source-details";
    const summary = document.createElement("summary");
    summary.textContent = `出处与编辑依据（${refs.length}）`;
    details.appendChild(summary);
    const list = document.createElement("ul");
    refs.forEach((source) => {
      const item = document.createElement("li");
      item.textContent = `${source.label || "来源"}：${source.citation || source.source_note || "待补"}`;
      list.appendChild(item);
    });
    details.appendChild(list);
    container.appendChild(details);
  }

  function appendChipSection(container, title, items, emptyText, labelFor, onClick) {
    const section = document.createElement("section");
    section.className = "knowledge-section";
    const heading = document.createElement("h4");
    heading.textContent = title;
    section.appendChild(heading);
    if (!items.length) {
      appendParagraph(section, emptyText, "muted-line");
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

  function createBrowserButton(title, meta, summary, onClick, dataset = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "browser-item";
    Object.entries(dataset).forEach(([key, value]) => {
      if (value !== undefined && value !== null) button.dataset[key] = String(value);
    });
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
    return button;
  }

  app.renderJourneyPeopleBrowser = function renderJourneyPeopleBrowser(container, detailPanel, journey, context) {
    if (!container) return;
    container.innerHTML = "";
    const grouped = new Map();
    asArray(context?.personLinks).forEach((link) => {
      const group = link.person.group || "未分组";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(link);
    });

    if (!grouped.size) {
      appendParagraph(container, "本章尚未建立人物关联。", "muted-line");
      return;
    }

    grouped.forEach((links, groupName) => {
      const section = document.createElement("section");
      section.className = "browser-group";
      const heading = document.createElement("h3");
      heading.textContent = groupName;
      section.appendChild(heading);
      links.forEach((link) => {
        const evidenceText = `${relationLabels[link.relation_status] || link.relation_status} · ${link.visit_ids.length} 个节点 · ${link.work_ids.length} 篇作品`;
        section.appendChild(createBrowserButton(
          link.person.name,
          `${link.person.birth_year || "？"}—${link.person.death_year || "？"} · ${link.role_in_chapter}`,
          evidenceText,
          () => app.renderJourneyPersonCard(detailPanel, link.person, journey, context),
          { entityType: "person", entityId: link.person_id, certainty: link.certainty }
        ));
      });
      container.appendChild(section);
    });
  };

  function collectPersonAppearances(personId) {
    const appearances = [];
    asArray(app.getJourneys?.()).forEach((journey) => {
      const visits = asArray(app.getJourneyMapData?.(journey.journey_id)?.visits);
      const works = asArray(app.getJourneyWorks?.(journey.journey_id));
      const person = app.getPersonById?.(personId);
      if (!person) return;
      const aliases = aliasesFor(person);
      const curated = curatedPeopleFor(journey.journey_id).some((item) => item.person_id === personId);
      const mentioned = personId === "su_shi"
        || curated
        || visits.some((visit) => mentions(visitText(visit), aliases))
        || works.some((work) => mentions(workText(work), aliases))
        || chapterSeedEvents(journey).some((event) => asArray(event.people).includes(personId));
      if (mentioned) appearances.push(journey);
    });
    return appearances;
  }

  app.renderJourneyPersonCard = function renderJourneyPersonCard(container, person, journey, context) {
    if (!container || !person) return;
    container.innerHTML = "";
    const link = context?.personLinkById?.get(person.person_id);
    appendHeader(
      container,
      "本章人物",
      person.name,
      `${journey.chapter} · ${person.group || "分组待核"}`
    );
    appendBadgeRow(container, [
      createBadge(relationLabels[link?.relation_status] || "章节关联", `status-${link?.relation_status || "derived"}`),
      createBadge(certaintyLabels[link?.certainty] || link?.certainty || "待核", `certainty-${link?.certainty || "medium"}`)
    ]);
    appendParagraph(container, person.role_summary || "暂无简介。");
    appendParagraph(container, person.relation_to_su_shi || "与苏轼关系待核。");
    appendParagraph(container, `本章作用：${link?.role_in_chapter || "待补"}`, "chapter-role");

    const linkedVisits = asArray(link?.visit_ids)
      .map((visitId) => context.visits.find((visit) => visit.visit_id === visitId))
      .filter(Boolean);
    const linkedWorks = asArray(link?.work_ids)
      .map((workId) => context.works.find((work) => work.work_id === workId))
      .filter(Boolean);
    const linkedEvents = asArray(context?.eventGroups).filter((event) => (
      event.people.some((personLink) => personLink.person_id === person.person_id)
    ));

    appendChipSection(
      container,
      "本章关联行程",
      linkedVisits.slice(0, 24),
      "本章暂无可定位的关联节点。",
      (visit) => `${visit.order}. ${visit.stage}`,
      (visit) => app.selectJourneyVisit?.(visit.visit_id)
    );
    appendChipSection(
      container,
      "本章关联事件",
      linkedEvents,
      "本章暂无独立事件组关联。",
      (event) => `${event.title}（${event.visits.length}）`,
      (event) => app.renderJourneyEventCard(container, event, journey, context)
    );
    appendChipSection(
      container,
      "本章关联作品",
      linkedWorks,
      "本章暂无直接关联作品。",
      (work) => work.title,
      (work) => app.renderJourneyWorkCard?.(container, work)
    );
    appendChipSection(
      container,
      "全书出现章节",
      collectPersonAppearances(person.person_id),
      "尚未发现其他章节关联。",
      (item) => item.chapter,
      (item) => {
        const url = new URL(window.location.href);
        url.searchParams.set("mode", "journey");
        url.searchParams.set("journey", item.journey_id);
        url.searchParams.set("tab", "people");
        url.searchParams.set("person", person.person_id);
        window.location.assign(url.toString());
      }
    );
    appendParagraph(container, link?.evidence_note, "evidence-note");
    appendSourceRefs(container, link?.source_refs);
    if (person.source_note) appendParagraph(container, person.source_note, "knowledge-source");
  };

  app.renderJourneyEventBrowser = function renderJourneyEventBrowser(container, detailPanel, journey, context) {
    if (!container) return;
    container.innerHTML = "";
    const grouped = new Map();
    asArray(context?.eventGroups).forEach((event) => {
      if (!grouped.has(event.phase_title)) grouped.set(event.phase_title, []);
      grouped.get(event.phase_title).push(event);
    });

    if (!grouped.size) {
      appendParagraph(container, "本章尚无事件组数据。", "muted-line");
      return;
    }

    grouped.forEach((events, phaseTitle) => {
      const section = document.createElement("section");
      section.className = "browser-group";
      const heading = document.createElement("h3");
      heading.textContent = phaseTitle;
      section.appendChild(heading);
      events.forEach((event) => {
        section.appendChild(createBrowserButton(
          `${event.title} · ${event.visits.length} 个节点`,
          event.time_start === event.time_end ? event.time_start : `${event.time_start}—${event.time_end}`,
          event.summary,
          () => app.renderJourneyEventCard(detailPanel, event, journey, context),
          { entityType: "event", entityId: event.event_id, certainty: event.certainty }
        ));
      });
      container.appendChild(section);
    });
  };

  app.renderJourneyEventCard = function renderJourneyEventCard(container, event, journey, context) {
    if (!container || !event) return;
    container.innerHTML = "";
    appendHeader(
      container,
      "本章事件",
      event.title,
      `${journey.chapter} · ${event.phase_title} · ${event.visits.length} 个节点`
    );
    appendBadgeRow(container, [
      createBadge("聚合事件", "status-derived"),
      createBadge(certaintyLabels[event.certainty] || event.certainty, `certainty-${event.certainty}`)
    ]);
    appendParagraph(container, event.summary);
    appendChipSection(
      container,
      "事件进程",
      event.visits,
      "暂无节点。",
      (visit) => `${visit.order}. ${visit.time} · ${visit.stage}`,
      (visit) => app.selectJourneyVisit?.(visit.visit_id)
    );
    appendChipSection(
      container,
      "相关人物",
      event.people,
      "暂无已建档人物。",
      (link) => link.person.name,
      (link) => app.renderJourneyPersonCard(container, link.person, journey, context)
    );
    appendChipSection(
      container,
      "相关作品",
      event.works,
      "暂无关联作品。",
      (work) => work.title,
      (work) => app.renderJourneyWorkCard?.(container, work)
    );
    appendSourceRefs(container, event.source_refs);
  };

  const baseRenderJourneyVisitDetail = app.renderJourneyVisitDetail;
  app.renderJourneyVisitDetail = function renderJourneyVisitDetail(container, visit) {
    baseRenderJourneyVisitDetail?.(container, visit);
    if (!container || !visit) return;
    const journey = app.getJourneyById?.(visit.journey_id);
    const context = journey ? app.getJourneyContext?.(journey) : null;
    const link = context?.visitLinkById?.get(visit.visit_id);
    const event = context?.eventGroups?.find((item) => item.event_id === link?.event_ids?.[0]);
    appendBadgeRow(container, [
      createBadge(certaintyLabels[visit.certainty] || visit.certainty || "待核", `certainty-${visit.certainty || "medium"}`),
      createBadge(`${asArray(link?.person_ids).length} 人 · ${asArray(link?.work_ids).length} 作`, "status-derived")
    ]);
    if (event) {
      appendChipSection(
        container,
        "所属事件组",
        [event],
        "",
        (item) => `${item.phase_title} · ${item.title}`,
        (item) => app.renderJourneyEventCard(container, item, journey, context)
      );
    }
    appendSourceRefs(container, link?.source_refs || sourceRefsForJourney(journey));
  };

  const baseRenderJourneyWorkCard = app.renderJourneyWorkCard;
  app.renderJourneyWorkCard = function renderJourneyWorkCard(container, work) {
    baseRenderJourneyWorkCard?.(container, work);
    if (!container || !work) return;
    const status = getWorkTextStatus(work);
    const header = container.querySelector(".knowledge-header");
    if (header) {
      const row = document.createElement("div");
      row.className = "evidence-badges";
      row.appendChild(createBadge(textStatusLabels[status] || status, `text-status-${status}`));
      header.insertAdjacentElement("afterend", row);
    }
  };

  const baseRenderJourneyIntro = app.renderJourneyIntro;
  app.renderJourneyIntro = function renderJourneyIntro(container, journey) {
    baseRenderJourneyIntro?.(container, journey);
    if (!container || !journey) return;
    const context = app.getJourneyContext?.(journey);
    const summary = document.createElement("p");
    summary.className = "scope-counts";
    summary.textContent = `章节知识范围：${context?.visits.length || 0} 个行程节点 · ${context?.personLinks.length || 0} 位人物 · ${context?.eventGroups.length || 0} 个事件组 · ${context?.works.length || 0} 篇作品。`;
    container.appendChild(summary);
    appendSourceRefs(container, context?.sourceRefs);
  };

  app.findJourneyEntity = function findJourneyEntity(journey, type, id) {
    const context = app.getJourneyContext?.(journey);
    if (!context) return null;
    if (type === "visit") return context.visits.find((visit) => visit.visit_id === id) || null;
    if (type === "person") return context.personLinkById?.get(id) || null;
    if (type === "event") return context.eventById?.get(id) || null;
    if (type === "work") return context.works.find((work) => work.work_id === id) || null;
    return null;
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
