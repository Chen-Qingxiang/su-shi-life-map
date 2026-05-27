(function (app) {
  app.renderStageLegend = function renderStageLegend(container, legendItems) {
    legendItems.forEach(([label, color]) => {
      const row = document.createElement("span");
      row.innerHTML = `<i class="dot" style="background:${color}"></i>${label}`;
      container.appendChild(row);
    });
  };

  app.renderRegimeLegend = function renderRegimeLegend(container, historicalRegimes, regimeColors) {
    if (historicalRegimes?.features?.length) {
      const regimes = new Map();
      historicalRegimes.features.forEach((feature) => {
        const props = feature.properties;
        if (!regimes.has(props.regime_key)) {
          regimes.set(props.regime_key, {
            label: props.regime_name_zh,
            color: regimeColors[props.regime_key] || props.color
          });
        }
      });
      regimes.forEach(({ label, color }) => {
        const row = document.createElement("span");
        row.innerHTML = `<i class="swatch" style="background:${color}"></i>${label}`;
        container.appendChild(row);
      });
    } else {
      container.innerHTML = `<span class="muted-line">历史区域数据未加载。</span>`;
    }
  };

  app.renderPlaceList = function renderPlaceList(container, stops, markers, map, stages) {
    if (!stops.length) {
      container.innerHTML = `<p class="muted-line">地点数据未加载。</p>`;
    }

    stops.forEach((stop) => {
      const color = stages[stop.stage]?.color || "#344054";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "place";
      button.innerHTML = `
        <strong><span class="dot" style="background:${color}"></span>${stop.order}. ${stop.name}</strong>
        <small>${stop.age_detail || `${stop.years}（约 ${stop.age} 岁）`} · ${stop.stage}</small>
        <small>${stop.event}</small>
      `;
      button.addEventListener("click", () => {
        map.setView([stop.lat, stop.lon], 8, { animate: true });
        markers.get(stop.order).openPopup();
      });
      container.appendChild(button);
    });
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
