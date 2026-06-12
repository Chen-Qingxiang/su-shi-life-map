(function (app) {
  app.createLifeMap = function createLifeMap({ route, stops, journey }) {
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));
    const map = L.map("map", { scrollWheelZoom: true }).setView([30.5, 112.5], 5);
    const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" });
    const topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "&copy; OpenTopoMap" });
    const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18, attribution: "Tiles &copy; Esri" });
    const hillshade = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}", { maxZoom: 13, attribution: "Terrain &copy; Esri" });
    const physicalRenderer = L.canvas({ padding: 0.5 });
    map.createPane("historicalRegimes");
    map.getPane("historicalRegimes").style.zIndex = 320;
    map.createPane("lifeRoute");
    map.getPane("lifeRoute").style.zIndex = 430;
    map.createPane("lifeMarkers");
    map.getPane("lifeMarkers").style.zIndex = 440;
    map.createPane("journeySegments");
    map.getPane("journeySegments").style.zIndex = 435;
    map.createPane("journeyMarkers");
    map.getPane("journeyMarkers").style.zIndex = 450;
    map.createPane("physicalGeography");
    map.getPane("physicalGeography").style.zIndex = 390;
    map.createPane("physicalLabels");
    map.getPane("physicalLabels").style.zIndex = 410;
    map.createPane("namedRiverInfo");
    map.getPane("namedRiverInfo").style.zIndex = 415;
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
    const markersByPlaceKey = new Map();
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
      marker.on("click", () => {
        if (stop.place_key) {
          app.selectPlace?.(stop.place_key, { pan: false, openPopup: false });
        }
      });
      markers.set(stop.order, marker);
      if (stop.place_key) {
        markersByPlaceKey.set(stop.place_key, marker);
      }
    });

    const journeySegmentLayer = L.geoJSON(journey?.segments || { type: "FeatureCollection", features: [] }, {
      pane: "journeySegments",
      style: (feature) => {
        const water = feature.properties.phase_id === "nanxing_water";
        return {
          color: water ? "#2563eb" : "#9a5b32",
          weight: 4,
          opacity: 0.86,
          dashArray: water ? null : "9 6"
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindTooltip(`${props.travel_mode} · ${props.from_visit_id} → ${props.to_visit_id}`, { sticky: true });
      }
    });

    const journeyMarkers = new Map();
    const journeyMarkerLayer = L.layerGroup();
    (journey?.visits || []).forEach((visit) => {
      const worksCount = app.getJourneyWorksForVisit?.(visit.visit_id).length || 0;
      const water = visit.phase_id === "nanxing_water";
      const marker = L.circleMarker([visit.lat, visit.lon], {
        radius: Math.min(11, 6 + Math.sqrt(worksCount)),
        pane: "journeyMarkers",
        color: visit.certainty === "low" ? "#667085" : "#ffffff",
        weight: visit.certainty === "low" ? 2.5 : 2,
        dashArray: visit.certainty === "low" ? "3 3" : null,
        fillColor: water ? "#2563eb" : "#9a5b32",
        fillOpacity: visit.visit_type === "observation" ? 0.55 : 0.94
      }).addTo(journeyMarkerLayer).bindPopup(app.journeyVisitPopupHtml(visit), { maxWidth: 360 });
      marker.bindTooltip(`${visit.order}. ${visit.stage} · ${worksCount} 首诗`, { direction: "top", offset: [0, -8] });
      marker.on("click", () => app.selectJourneyVisit?.(visit.visit_id, { pan: false, openPopup: false }));
      journeyMarkers.set(visit.visit_id, marker);
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

    const physicalWaterwayLayer = window.suShiPhysicalWaterways ? L.geoJSON(window.suShiPhysicalWaterways, {
      pane: "physicalGeography",
      renderer: physicalRenderer,
      style: (feature) => ({
        color: feature.properties.name === "长江" || feature.properties.name === "長江" ? "#075985" : "#0284c7",
        weight: feature.properties.name === "长江" || feature.properties.name === "長江" ? 3.2 : 2.2,
        opacity: 0.88
      }),
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindTooltip(`${escapeHtml(props.name)} · 东坡南行相关河流`, { sticky: true });
        layer.bindPopup(`
          <div class="popup">
            <h2>${escapeHtml(props.name)}</h2>
            <p><strong>类型：</strong>东坡南行相关的现代命名河流</p>
            <p>${escapeHtml(props.accuracy_note)}</p>
            <p><a href="${escapeHtml(props.source_url)}" target="_blank" rel="noopener noreferrer">查看 OpenStreetMap 河段</a></p>
          </div>
        `);
      }
    }).addTo(map) : null;

    function createHydroRiversLayer(data, color, weight, opacity) {
      return data ? L.geoJSON(data, {
        pane: "physicalGeography",
        renderer: physicalRenderer,
        interactive: false,
        style: { color, weight, opacity },
      }) : null;
    }

    const hydroMajorLayer = createHydroRiversLayer(window.hydroriversMajor, "#0369a1", 1.8, 0.78);
    const hydroTributaryLayer = createHydroRiversLayer(window.hydroriversTributaries, "#0284c7", 1.25, 0.62);
    const hydroRegionalLayer = createHydroRiversLayer(window.hydroriversRegional, "#38bdf8", 0.8, 0.46);
    hydroMajorLayer?.addTo(map);

    const namedRiverLayer = window.namedRivers ? L.geoJSON(window.namedRivers, {
      pane: "namedRiverInfo",
      renderer: physicalRenderer,
      style: (feature) => {
        const rank = Number(feature.properties.scale_rank ?? 9);
        return {
          color: "#0c4a6e",
          weight: rank <= 3 ? 3.4 : rank <= 6 ? 2.7 : 2.2,
          opacity: rank <= 3 ? 0.68 : 0.46
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const secondaryName = props.name_en && props.name_en !== props.name_zh ? ` · ${props.name_en}` : "";
        const referenceLinks = [
          props.wikipedia_url ? `<a href="${escapeHtml(props.wikipedia_url)}" target="_blank" rel="noopener noreferrer">中文百科检索</a>` : "",
          props.wikidata_url ? `<a href="${escapeHtml(props.wikidata_url)}" target="_blank" rel="noopener noreferrer">Wikidata</a>` : "",
          `<a href="${escapeHtml(props.source_url)}" target="_blank" rel="noopener noreferrer">Natural Earth 数据说明</a>`
        ].filter(Boolean).join(" · ");
        layer.bindTooltip(`${escapeHtml(props.name_zh)}${escapeHtml(secondaryName)}`, { sticky: true });
        layer.bindPopup(`
          <div class="popup river-popup">
            <h2>${escapeHtml(props.name_zh)}</h2>
            ${secondaryName ? `<p class="popup-subtitle">${escapeHtml(props.name_en)}</p>` : ""}
            <p>${escapeHtml(props.profile)}</p>
            <p><strong>地图分类：</strong>${escapeHtml(props.feature_class)} · Natural Earth scale rank ${escapeHtml(props.scale_rank)}</p>
            ${props.name_alt ? `<p><strong>别名：</strong>${escapeHtml(props.name_alt)}</p>` : ""}
            <p class="muted-line">${escapeHtml(props.accuracy_note)}</p>
            <p>${referenceLinks}</p>
          </div>
        `, { maxWidth: 360 });
      }
    }).addTo(map) : null;

    const mountainSystemOutlines = window.majorMountainSystems ? L.geoJSON(window.majorMountainSystems, {
      pane: "physicalGeography",
      renderer: physicalRenderer,
      style: {
        color: "#7c3f00",
        weight: 1.6,
        opacity: 0.72,
        dashArray: "5 5"
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindTooltip(`${escapeHtml(props.name_zh)} · 山系范围`, { sticky: true });
        layer.bindPopup(`
          <div class="popup">
            <h2>${escapeHtml(props.name_zh)}</h2>
            <p>${escapeHtml(props.name_en)}</p>
            <p><strong>GMBA 范围面积：</strong>${Math.round(props.area_sq_km || 0).toLocaleString()} km²</p>
            <p><strong>高程范围：</strong>${escapeHtml(props.elev_low_m)}—${escapeHtml(props.elev_high_m)} m</p>
            <p>${escapeHtml(props.accuracy_note)}</p>
            <p><a href="${escapeHtml(props.source_url)}" target="_blank" rel="noopener noreferrer">查看 GMBA Mountain Inventory</a></p>
          </div>
        `);
      }
    }) : null;
    const mountainSystemLabels = L.layerGroup();
    (window.majorMountainSystemLabels?.features || []).forEach((feature) => {
      const props = feature.properties;
      const [lon, lat] = feature.geometry.coordinates;
      L.marker([lat, lon], {
        pane: "physicalLabels",
        interactive: false,
        icon: L.divIcon({
          className: "mountain-system-label",
          html: escapeHtml(props.name_zh),
          iconSize: null
        })
      }).addTo(mountainSystemLabels);
    });
    const mountainSystemLayer = L.layerGroup([mountainSystemOutlines, mountainSystemLabels].filter(Boolean)).addTo(map);

    const mountainRidgeLayer = window.namedMountainRidges ? L.geoJSON(window.namedMountainRidges, {
      pane: "physicalGeography",
      renderer: physicalRenderer,
      style: {
        color: "#9a6700",
        weight: 1.15,
        opacity: 0.68
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const name = props.name_zh || props.name || props.name_en;
        layer.bindTooltip(`${escapeHtml(name)} · 命名山脊`, { sticky: true });
        layer.bindPopup(`
          <div class="popup">
            <h2>${escapeHtml(name)}</h2>
            <p>${escapeHtml(props.accuracy_note)}</p>
            <p><a href="${escapeHtml(props.source_url)}" target="_blank" rel="noopener noreferrer">查看 OpenStreetMap 山脊线</a></p>
          </div>
        `);
      }
    }) : null;

    if (historicalLayer) {
      const overlayLayers = {
        "1080 年政权区域（Hartwell/CHGIS）": historicalLayer,
        "县级/行政区边界（Hartwell）": adminBorderLayer,
        "苏轼行迹路线": routeLine,
        "苏轼地点": markerLayer,
        "章节旅程路线：1059—1060 南行": journeySegmentLayer,
        "章节旅程节点：1059—1060 南行": journeyMarkerLayer
      };
      if (physicalWaterwayLayer) {
        overlayLayers["水系 0 · 东坡相关命名河流（OSM）"] = physicalWaterwayLayer;
      }
      if (hydroMajorLayer) {
        overlayLayers["水系 1 · 大江干流骨架（HydroRIVERS）"] = hydroMajorLayer;
      }
      if (hydroTributaryLayer) {
        overlayLayers["水系 2 · ＋主要支流（HydroRIVERS）"] = hydroTributaryLayer;
      }
      if (hydroRegionalLayer) {
        overlayLayers["水系 3 · ＋区域河网（HydroRIVERS）"] = hydroRegionalLayer;
      }
      if (namedRiverLayer) {
        overlayLayers["水系信息 · 河名与简介（Natural Earth）"] = namedRiverLayer;
      }
      if (mountainSystemLayer) {
        overlayLayers["山地 1 · 主要山系范围轮廓（GMBA）"] = mountainSystemLayer;
      }
      if (mountainRidgeLayer) {
        overlayLayers["山地 2 · 命名山脊线（OSM）"] = mountainRidgeLayer;
      }
      if (regimeBoundaryLayer) {
        overlayLayers["政权外缘边界（栅格化近似）"] = regimeBoundaryLayer;
      }
      L.control.layers({"在线底图（OSM）": osm, "地形底图（OpenTopoMap）": topo, "地形晕渲（Esri World Hillshade）": hillshade, "卫星底图（Esri）": satellite}, overlayLayers, {
        collapsed: false
      }).addTo(map);
    }

    if (route.length) {
      const bounds = routeLine.getBounds();
      map.fitBounds(bounds.pad(0.15));
    }

    return {
      map,
      markers,
      markersByPlaceKey,
      routeLine,
      markerLayer,
      journeySegmentLayer,
      journeyMarkerLayer,
      journeyMarkers
    };
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
