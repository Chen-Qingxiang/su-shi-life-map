(function (app) {
  const baseCreateLifeMap = app.createLifeMap;
  if (typeof baseCreateLifeMap === "function") {
    app.createLifeMap = function createLifeMapWithWorkbenchContext(options) {
      const result = baseCreateLifeMap(options);
      app.mapContext = result;
      return result;
    };
  }
})(window.SuShiLifeMap = window.SuShiLifeMap || {});