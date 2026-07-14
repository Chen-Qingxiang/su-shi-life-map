(function (app) {
  const asArray = (value) => Array.isArray(value) ? value : [];
  const baseGetJourneys = app.getJourneys;
  const baseGetJourneyWorks = app.getJourneyWorks;
  const baseGetJourneyWorksForVisit = app.getJourneyWorksForVisit;
  const baseGetJourneyVisitById = app.getJourneyVisitById;

  const style = document.createElement("style");
  style.textContent = ".journey-select-label{display:grid;gap:5px;margin-bottom:9px}.journey-select-label span{margin:0}.journey-select-label select{width:100%;border:1px solid #93c5fd;border-radius:7px;background:#fff;color:#1e3a8a;padding:7px;font:inherit}";
  document.head.appendChild(style);

  function supplementalVisits() {
    return window.suShiJourneyVisitsChapters23?.features || [];
  }

  app.getJourneys = function getJourneys() {
    return [...asArray(baseGetJourneys?.()), ...asArray(window.suShiJourneysChapters23)];
  };

  app.getJourneyWorks = function getJourneyWorks(journeyId) {
    return [
      ...asArray(baseGetJourneyWorks?.(journeyId)),
      ...asArray(window.suShiJourneyWorksChapters23).filter((work) => work.journey_id === journeyId)
    ];
  };

  app.getJourneyWorksForVisit = function getJourneyWorksForVisit(visitId) {
    return [
      ...asArray(baseGetJourneyWorksForVisit?.(visitId)),
      ...asArray(window.suShiJourneyWorksChapters23).filter((work) => work.visit_id === visitId)
    ];
  };

  app.getJourneyVisitById = function getJourneyVisitById(visitId) {
    const base = baseGetJourneyVisitById?.(visitId);
    if (base) return base;
    const feature = supplementalVisits().find((item) => item.properties?.visit_id === visitId);
    if (!feature) return null;
    const [lon, lat] = feature.geometry.coordinates;
    return { ...feature.properties, lat, lon };
  };

  const baseGetJourneyMapData = app.getJourneyMapData;
  app.getJourneyMapData = function getJourneyMapData(journeyId) {
    const base = baseGetJourneyMapData?.(journeyId) || { visits: [], segments: { type: "FeatureCollection", features: [] } };
    const visits = supplementalVisits()
      .filter((feature) => feature.geometry?.type === "Point" && feature.properties?.journey_id === journeyId)
      .map((feature) => {
        const [lon, lat] = feature.geometry.coordinates;
        return { ...feature.properties, lat, lon };
      })
      .sort((a, b) => a.order - b.order);
    const segments = (window.suShiJourneySegmentsChapters23?.features || [])
      .filter((feature) => feature.properties?.journey_id === journeyId);
    return visits.length ? { visits, segments: { type: "FeatureCollection", features: segments } } : base;
  };

  app.getJourneyPhase = function getJourneyPhase(journeyId, phaseId) {
    return app.getJourneys().find((journey) => journey.journey_id === journeyId)?.phases?.find((phase) => phase.phase_id === phaseId) || null;
  };

  app.journeyVisitPopupHtml = function journeyVisitPopupHtml(visit) {
    const works = app.getJourneyWorksForVisit(visit.visit_id);
    return `<div class="popup journey-popup"><h2>${visit.order}. ${visit.stage}</h2><p><strong>时间：</strong>${visit.time}</p><p><strong>地点：</strong>${visit.ancient_place}</p><p><strong>今地：</strong>${visit.modern}</p><p><strong>性质：</strong>${visit.visit_type_label} · ${visit.travel_mode}</p><p>${visit.event}</p><p class="popup-note">${visit.reading}</p><p><strong>关联作品：</strong>${works.length} 篇</p></div>`;
  };

  const baseCreateLifeMap = app.createLifeMap;
  app.createLifeMap = function createLifeMap(options) {
    const result = baseCreateLifeMap(options);
    const journey = options.journeyMeta;
    if (!journey) return result;
    const phases = new Map((journey.phases || []).map((phase) => [phase.phase_id, phase]));
    result.journeySegmentLayer.eachLayer((layer) => {
      const phase = phases.get(layer.feature?.properties?.phase_id);
      if (phase) layer.setStyle({ color: phase.color, dashArray: phase.dash_array || null, weight: 4, opacity: 0.86 });
    });
    const visits = new Map((options.journey?.visits || []).map((visit) => [visit.visit_id, visit]));
    result.journeyMarkers.forEach((marker, visitId) => {
      const visit = visits.get(visitId);
      const phase = phases.get(visit?.phase_id);
      const worksCount = app.getJourneyWorksForVisit(visitId).length;
      if (phase) marker.setStyle({ fillColor: phase.color });
      marker.setTooltipContent(`${visit.order}. ${visit.stage} · ${worksCount} 篇作品`);
    });
    document.querySelectorAll(".leaflet-control-layers-overlays span").forEach((label) => {
      if (label.textContent.includes("章节旅程路线")) label.childNodes[label.childNodes.length - 1].textContent = ` 章节旅程路线：${journey.short_title}`;
      if (label.textContent.includes("章节旅程节点")) label.childNodes[label.childNodes.length - 1].textContent = ` 章节旅程节点：${journey.short_title}`;
    });
    return result;
  };

  app.renderJourneyList = function renderJourneyList(container, visits, journey) {
    if (!container) return;
    container.innerHTML = "";
    const phases = new Map((journey?.phases || []).map((phase) => [phase.phase_id, phase]));
    let currentPhase = "";
    visits.forEach((visit) => {
      const phase = phases.get(visit.phase_id) || { title: visit.phase_id, color: "#9a5b32" };
      if (visit.phase_id !== currentPhase) {
        currentPhase = visit.phase_id;
        const heading = document.createElement("h3");
        heading.className = "itinerary-phase";
        heading.textContent = phase.title;
        container.appendChild(heading);
      }
      const worksCount = app.getJourneyWorksForVisit(visit.visit_id).length;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "place journey-stop";
      button.dataset.visitId = visit.visit_id;
      button.innerHTML = `<strong><span class="dot" style="background:${phase.color}"></span>${visit.order}. ${visit.stage}</strong><small>${visit.time} · ${visit.visit_type_label} · ${visit.travel_mode}</small><small>${visit.ancient_place} · 关联作品 ${worksCount} 篇${visit.certainty === "low" ? " · 位置待核" : ""}</small>`;
      button.addEventListener("click", () => app.selectJourneyVisit?.(visit.visit_id));
      container.appendChild(button);
    });
  };

  app.renderJourneyIntro = function renderJourneyIntro(container, journey) {
    if (!container || !journey) return;
    container.innerHTML = `<div class="knowledge-header"><span>章节旅程</span><h3>${journey.short_title}</h3><p>${journey.chapter} · ${journey.year_start}-${journey.year_end}</p></div><p class="knowledge-summary">${journey.summary}</p>`;
    const data = app.getJourneyMapData(journey.journey_id);
    const counts = document.createElement("p");
    counts.className = "muted-line";
    counts.textContent = `本版收录 ${data.visits.length} 个行程节点、${data.segments.features.length} 段路线和 ${app.getJourneyWorks(journey.journey_id).length} 篇代表作品。`;
    container.appendChild(counts);
  };

  app.renderJourneyVisitDetail = function renderJourneyVisitDetail(container, visit) {
    if (!container || !visit) return;
    const works = app.getJourneyWorksForVisit(visit.visit_id);
    container.innerHTML = `<div class="knowledge-header"><span>${visit.visit_type_label}</span><h3>${visit.order}. ${visit.stage}</h3><p>${visit.time} · ${visit.travel_mode} · ${visit.ancient_place}</p></div><p class="knowledge-summary">${visit.event}</p><p class="knowledge-summary journey-reading">${visit.reading}</p><p class="muted-line">今地参照：${visit.modern} · 坐标可信度：${visit.certainty}</p>`;
    const section = document.createElement("section");
    section.className = "knowledge-section";
    section.innerHTML = "<h4>关联作品</h4>";
    if (!works.length) {
      section.innerHTML += '<p class="muted-line">此节点暂无已关联作品。</p>';
    } else {
      const chips = document.createElement("div");
      chips.className = "knowledge-chips";
      works.forEach((work) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = work.title;
        button.addEventListener("click", () => app.renderJourneyWorkCard(container, work));
        chips.appendChild(button);
      });
      section.appendChild(chips);
    }
    container.appendChild(section);
  };

  app.renderJourneyWorkCard = function renderJourneyWorkCard(container, work) {
    if (!container || !work) return;
    container.innerHTML = `<div class="knowledge-header"><span>章节作品</span><h3>${work.title}</h3><p>${work.time_text || work.year} · ${work.location_text}</p></div><p class="knowledge-summary">${work.summary}</p>`;
    const collection = document.createElement("p");
    collection.className = "muted-line";
    collection.textContent = `作品集关联：${work.collection_label || work.collection_id || "章节作品"} · 作者：苏轼`;
    container.appendChild(collection);
    const visit = app.getJourneyVisitById(work.visit_id);
    if (visit) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "browser-item";
      button.innerHTML = `<strong>行程节点：${visit.order}. ${visit.stage}</strong><small>${visit.time} · ${visit.ancient_place}</small>`;
      button.addEventListener("click", () => app.selectJourneyVisit?.(visit.visit_id));
      container.appendChild(button);
    }
    if (work.source_note) {
      const note = document.createElement("p");
      note.className = "knowledge-source";
      note.textContent = work.source_note;
      container.appendChild(note);
    }
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
