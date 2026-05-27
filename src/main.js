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

    const { map, markers } = app.createLifeMap({ route, stops });
    app.renderPlaceList(document.querySelector("#placeList"), stops, markers, map, app.stages);
  }

  init();
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
