(function (app) {
  function init() {
    const { route, stops } = app.getLifeMapData();

    app.renderStageLegend(document.querySelector("#legend"), app.uniqueLegend);
    app.renderRegimeLegend(document.querySelector("#regimeLegend"), window.historicalRegimes1080, app.REGIME_COLORS);

    if (!window.L) {
      document.querySelector("#map").style.display = "none";
      document.querySelector("#fallback").style.display = "block";
      return;
    }

    const { map, markers, markersByPlaceKey } = app.createLifeMap({ route, stops });
    const detailPanel = document.querySelector("#detailPanel");
    const stopsByPlaceKey = new Map(stops.filter((stop) => stop.place_key).map((stop) => [stop.place_key, stop]));

    app.selectPlace = function selectPlace(placeKey, options = {}) {
      const { pan = true, openPopup = true, updateDetail = true } = options;
      const stop = stopsByPlaceKey.get(placeKey);
      const marker = markersByPlaceKey.get(placeKey);

      if (!stop) return;

      if (pan) {
        map.setView([stop.lat, stop.lon], 8, { animate: true });
      }

      markersByPlaceKey.forEach((item, key) => {
        item.setRadius(key === placeKey ? 10 : 7);
        item.setStyle({
          color: key === placeKey ? "#111827" : "#ffffff",
          weight: key === placeKey ? 3 : 2
        });
      });

      if (openPopup && marker) {
        marker.openPopup();
      }

      app.setActivePlaceButton?.(placeKey);
      if (updateDetail && detailPanel) {
        app.renderPlaceKnowledgeDetail(detailPanel, stop);
      }
    };

    app.renderPlaceList(document.querySelector("#placeList"), stops, markers, map, app.stages);
    app.renderDetailIntro(detailPanel);
  }

  init();
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
