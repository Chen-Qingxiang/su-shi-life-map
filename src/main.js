(function (app) {
  function init() {
    const { route, stops } = app.getLifeMapData();
    const params = new URLSearchParams(window.location.search);
    const journeys = app.getJourneys?.() || [];
    const requestedJourneyId = params.get("journey");
    const journey = app.getJourneyById?.(requestedJourneyId) || app.getJourneyById?.("nanxing_1059_1060") || journeys[0];
    const journeyData = journey ? app.getJourneyMapData?.(journey.journey_id) : { visits: [], segments: { type: "FeatureCollection", features: [] } };

    app.renderStageLegend(document.querySelector("#legend"), app.uniqueLegend);
    app.renderRegimeLegend(document.querySelector("#regimeLegend"), window.historicalRegimes1080, app.REGIME_COLORS);

    if (!window.L) {
      document.querySelector("#map").style.display = "none";
      document.querySelector("#fallback").style.display = "block";
      return;
    }

    const {
      map,
      markers,
      markersByPlaceKey,
      routeLine,
      markerLayer,
      journeySegmentLayer,
      journeyMarkerLayer,
      journeyMarkers
    } = app.createLifeMap({ route, stops, journey: journeyData, journeyMeta: journey });
    const detailPanel = document.querySelector("#detailPanel");
    const placeList = document.querySelector("#placeList");
    const workList = document.querySelector("#workList");
    const browserHeading = document.querySelector("#browserHeading");
    const journeyBanner = document.querySelector("#journeyBanner");
    const journeySelect = document.querySelector("#journeySelect");
    const journeyTitle = document.querySelector("#journeyTitle");
    const placeTab = document.querySelector('[data-tab="places"]');
    const stopsByPlaceKey = new Map(stops.filter((stop) => stop.place_key).map((stop) => [stop.place_key, stop]));
    const visitsById = new Map(journeyData.visits.map((visit) => [visit.visit_id, visit]));

    if (journeySelect) {
      journeys.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.journey_id;
        option.textContent = `${item.chapter} · ${item.short_title}`;
        option.selected = item.journey_id === journey?.journey_id;
        journeySelect.appendChild(option);
      });
      journeySelect.addEventListener("change", () => {
        const url = new URL(window.location.href);
        url.searchParams.set("journey", journeySelect.value);
        url.searchParams.set("mode", "journey");
        window.location.assign(url.toString());
      });
    }
    if (journeyTitle && journey) journeyTitle.textContent = `${journey.chapter} · ${journey.short_title}`;

    app.selectPlace = function selectPlace(placeKey, options = {}) {
      const { pan = true, openPopup = true, updateDetail = true } = options;
      const stop = stopsByPlaceKey.get(placeKey);
      const marker = markersByPlaceKey.get(placeKey);
      if (!stop) return;
      if (pan) map.setView([stop.lat, stop.lon], 8, { animate: true });
      markersByPlaceKey.forEach((item, key) => {
        item.setRadius(key === placeKey ? 10 : 7);
        item.setStyle({ color: key === placeKey ? "#111827" : "#ffffff", weight: key === placeKey ? 3 : 2 });
      });
      if (openPopup && marker) marker.openPopup();
      app.setActivePlaceButton?.(placeKey);
      if (updateDetail && detailPanel) app.renderPlaceKnowledgeDetail(detailPanel, stop);
    };

    app.selectJourneyVisit = function selectJourneyVisit(visitId, options = {}) {
      const { pan = true, openPopup = true, updateDetail = true } = options;
      const visit = visitsById.get(visitId);
      const marker = journeyMarkers.get(visitId);
      if (!visit) return;
      if (pan) map.setView([visit.lat, visit.lon], visit.certainty === "low" ? 7 : 9, { animate: true });
      journeyMarkers.forEach((item, key) => {
        item.setStyle({
          color: key === visitId ? "#111827" : (visitsById.get(key)?.certainty === "low" ? "#667085" : "#ffffff"),
          weight: key === visitId ? 3.5 : (visitsById.get(key)?.certainty === "low" ? 2.5 : 2)
        });
      });
      if (openPopup && marker) marker.openPopup();
      app.setActiveJourneyVisitButton?.(visitId);
      if (updateDetail) app.renderJourneyVisitDetail?.(detailPanel, visit);
    };

    function setMode(mode) {
      document.body.dataset.mode = mode;
      document.querySelectorAll(".mode-button").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.mode === mode);
      });
      if (mode === "journey" && journey) {
        map.removeLayer(routeLine);
        map.removeLayer(markerLayer);
        journeySegmentLayer.addTo(map);
        journeyMarkerLayer.addTo(map);
        if (journeySegmentLayer.getBounds().isValid()) map.fitBounds(journeySegmentLayer.getBounds().pad(0.12));
        app.renderJourneyList(placeList, journeyData.visits, journey);
        app.renderJourneyWorkBrowser(workList, detailPanel, journey.journey_id);
        app.renderJourneyIntro(detailPanel, journey);
        if (browserHeading) browserHeading.textContent = "旅程资料浏览";
        if (placeTab) placeTab.textContent = "行程";
        if (journeyBanner) journeyBanner.hidden = false;
      } else {
        map.removeLayer(journeySegmentLayer);
        map.removeLayer(journeyMarkerLayer);
        routeLine.addTo(map);
        markerLayer.addTo(map);
        if (routeLine.getBounds().isValid()) map.fitBounds(routeLine.getBounds().pad(0.15));
        placeList.innerHTML = "";
        app.renderPlaceList(placeList, stops, markers, map, app.stages);
        app.renderWorkBrowser(workList, detailPanel);
        app.renderDetailIntro(detailPanel);
        if (browserHeading) browserHeading.textContent = "资料浏览";
        if (placeTab) placeTab.textContent = "地点";
        if (journeyBanner) journeyBanner.hidden = true;
      }
      placeTab?.click();
    }

    document.querySelectorAll(".mode-button").forEach((button) => {
      button.addEventListener("click", () => setMode(button.dataset.mode));
    });

    app.setupKnowledgeTabs(document.querySelector("#knowledgeTabs"));
    app.renderPeopleBrowser(document.querySelector("#peopleList"), detailPanel);
    app.renderEventBrowser(document.querySelector("#eventList"), detailPanel);
    setMode(params.get("mode") === "journey" ? "journey" : "life");
  }

  init();
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
