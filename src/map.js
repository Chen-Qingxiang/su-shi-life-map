(function (app) {
  app.createLifeMap = function createLifeMap({ route, stops }) {
    const map = L.map("map", { scrollWheelZoom: true }).setView([30.5, 112.5], 5);
    const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" });
    const topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "&copy; OpenTopoMap" });
    const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18, attribution: "Tiles &copy; Esri" });
    map.createPane("historicalRegimes");
    map.getPane("historicalRegimes").style.zIndex = 320;
    map.createPane("lifeRoute");
    map.getPane("lifeRoute").style.zIndex = 430;
    map.createPane("lifeMarkers");
    map.getPane("lifeMarkers").style.zIndex = 440;
    osm.addTo(map);

    const historicalLayer = window.historicalRegimes1080 ? L.geoJSON(window.historicalRegimes1080, {
      pane: "historicalRegimes",
      style: (feature) => {
        const color = app.REGIME_COLORS[feature.properties.regime_key] || feature.properties.color || "#667085";
        return {
          color,
          weight: 0.7,
          opacity: 0.36,
          fillColor: color,
          fillOpacity: 0.14
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const unitName = props.unit_name || props.unit_name_short || props.regime_name_zh;
        const province = props.province_zh || props.province;
        const label = province ? `${unitName} · ${province} · ${props.regime_name_zh}` : `${unitName} · ${props.regime_name_zh}`;
        layer.bindTooltip(label, { sticky: true });
        layer.bindPopup(app.regimePopupHtml(feature), { maxWidth: 320 });
      }
    }).addTo(map) : null;

    const routeLine = L.polyline(route, {
      pane: "lifeRoute",
      color: "#475467",
      weight: 2,
      opacity: 0.72,
      dashArray: "6 7"
    }).addTo(map);

    const markers = new Map();
    const markerLayer = L.layerGroup().addTo(map);
    stops.forEach((stop) => {
      const color = app.stages[stop.stage]?.color || "#344054";
      const marker = L.circleMarker([stop.lat, stop.lon], {
        radius: 7,
        pane: "lifeMarkers",
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.92
      }).addTo(markerLayer).bindPopup(app.popupHtml(stop), { maxWidth: 320 });
      marker.bindTooltip(`${stop.order}. ${stop.name}`, { direction: "top", offset: [0, -8] });
      markers.set(stop.order, marker);
    });

    const adminBorderLayer = window.historicalRegimes1080 ? L.geoJSON(window.historicalRegimes1080, {
      pane: "historicalRegimes",
      style: (feature) => ({ color: app.REGIME_COLORS[feature.properties.regime_key] || "#344054", weight: 1.8, opacity: 0.95, fillOpacity: 0 }),
      interactive: false
    }) : null;

    const regimeBoundaryLayer = window.historicalRegimeBoundaries1080 ? L.geoJSON(window.historicalRegimeBoundaries1080, {
      pane: "historicalRegimes",
      style: (feature) => ({ color: app.REGIME_COLORS[feature.properties.regime_key] || "#111827", weight: 2.6, opacity: 0.95, fillOpacity: 0, dashArray: "10 6" }),
      onEachFeature: (f, l) => l.bindTooltip(`${f.properties.regime_name_zh}（政权外缘边界，栅格化近似）`, { sticky: true })
    }) : null;

    const riverLayer = L.geoJSON(app.geoOverlays.rivers, { style: { color: "#1f78b4", weight: 2.2, opacity: 0.85 }, onEachFeature: (f, l) => l.bindTooltip(f.properties.name, { sticky: true }) }).addTo(map);
    const roadLayer = L.geoJSON(app.geoOverlays.roads, { style: { color: "#8b5e3c", weight: 2, dashArray: "8 6", opacity: 0.9 }, onEachFeature: (f, l) => l.bindTooltip(f.properties.name, { sticky: true }) }).addTo(map);
    const mountainLayer = L.geoJSON(app.geoOverlays.mountains, { style: { color: "#6b7280", weight: 2.4, dashArray: "3 8", opacity: 0.8 }, onEachFeature: (f, l) => l.bindTooltip(f.properties.name, { sticky: true }) }).addTo(map);

    if (historicalLayer) {
      const overlayLayers = {
        "1080 年政权区域（Hartwell/CHGIS）": historicalLayer,
        "县级/行政区边界（Hartwell）": adminBorderLayer,
        "苏轼行迹路线": routeLine,
        "苏轼地点": markerLayer,
        "河流（示意）": riverLayer,
        "山脉（示意）": mountainLayer,
        "古道（示意）": roadLayer
      };
      if (regimeBoundaryLayer) {
        overlayLayers["政权外缘边界（栅格化近似）"] = regimeBoundaryLayer;
      }
      L.control.layers({"在线底图（OSM）": osm, "地形底图（OpenTopoMap）": topo, "卫星底图（Esri）": satellite}, overlayLayers, {
        collapsed: false
      }).addTo(map);
    }

    if (route.length) {
      const bounds = routeLine.getBounds();
      map.fitBounds(bounds.pad(0.15));
    }

    return { map, markers };
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
