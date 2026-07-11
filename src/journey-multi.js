(function (app) {
  const asArray = (value) => Array.isArray(value) ? value : [];
  const baseGetJourneys = app.getJourneys;
  const baseGetJourneyWorks = app.getJourneyWorks;
  const baseGetJourneyWorksForVisit = app.getJourneyWorksForVisit;
  const baseGetJourneyVisitById = app.getJourneyVisitById;

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
      if (phase) marker.setStyle({ fillColor: phase.color });
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

  app.renderJourneyWorkCard = function renderJourneyWorkCard(container, work) {
    if (!container || !work) return;
    container.innerHTML = `<div class="knowledge-header"><span>章节作品</span><h3>${work.title}</h3><p>${work.time_text || work.year} · ${work.location_text}</p></div><p class="knowledge-summary">${work.summary}</p>`;
    if (work.text) {
      const text = document.createElement("pre");
      text.className = "poem-text";
      text.textContent = work.text;
      container.appendChild(text);
    }
    const collection = document.createElement("p");
    collection.className = "muted-line";
    collection.textContent = `作品集关联：${work.collection_label || work.collection_id || "章节作品"} · 作者：苏轼`;
    container.appendChild(collection);
    if (work.text_source_url) {
      const source = document.createElement("p");
      source.className = "knowledge-source";
      source.innerHTML = `文本来源：<a href="${work.text_source_url}" target="_blank" rel="noopener noreferrer">${work.text_source_label || "查看公开文本来源"}</a>。${work.text_status || ""}`;
      container.appendChild(source);
    }
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
