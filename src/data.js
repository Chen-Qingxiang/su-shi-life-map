(function (app) {
  function toLatLng(coordinates) {
    return [coordinates[1], coordinates[0]];
  }

  app.getLifeMapData = function getLifeMapData() {
    const lifeLocations = window.suShiLifeLocations || { type: "FeatureCollection", features: [] };
    const stops = lifeLocations.features
      .filter((feature) => feature.geometry?.type === "Point" && feature.properties?.kind === "stop")
      .map((feature) => {
        const [lon, lat] = feature.geometry.coordinates;
        return { ...feature.properties, lat, lon };
      })
      .sort((a, b) => a.order - b.order);

    const routeFeature = lifeLocations.features.find((feature) => feature.geometry?.type === "LineString" && feature.properties?.kind === "route");
    const route = routeFeature
      ? routeFeature.geometry.coordinates.map(toLatLng)
      : stops.map((stop) => [stop.lat, stop.lon]);

    return { route, stops };
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
