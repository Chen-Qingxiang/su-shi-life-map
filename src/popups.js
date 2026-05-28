(function (app) {
  function relatedSummary(stop) {
    if (!stop.place_key || !app.getPeopleForPlace) return "";
    const peopleCount = app.getPeopleForPlace(stop.place_key).length;
    const eventCount = app.getEventsForPlace(stop.place_key).length;
    const workCount = app.getWorksForPlace(stop.place_key).length;

    if (!peopleCount && !eventCount && !workCount) return "";

    return `
      <p><strong>关联：</strong>${peopleCount} 人物 / ${eventCount} 事件 / ${workCount} 作品</p>
      <p class="popup-note">详细关联见左侧“地点关联”。</p>
    `;
  }

  app.popupHtml = function popupHtml(stop) {
    return `
      <div class="popup">
        <h2>${stop.order}. ${stop.name}</h2>
        <p><strong>现代地名：</strong>${stop.modern}</p>
        <p><strong>时间：</strong>${stop.age_detail || `${stop.years}（约 ${stop.age} 岁）`}</p>
        <p><strong>阶段：</strong>${stop.stage}</p>
        <p><strong>章节：</strong>${stop.chapter}</p>
        <p>${stop.event}</p>
        <p>${stop.note}</p>
        ${relatedSummary(stop)}
      </div>
    `;
  };

  app.regimePopupHtml = function regimePopupHtml(feature) {
    const props = feature.properties;
    const unitName = props.unit_name || props.unit_name_short || props.regime_name_zh;
    const province = props.province_zh || props.province || "无";
    const pinyin = props.unit_pinyin ? `<p><strong>拼音：</strong>${props.unit_pinyin}</p>` : "";
    return `
      <div class="popup">
        <h2>${unitName}</h2>
        <p><strong>年代：</strong>${props.year} 年前后</p>
        <p><strong>政权：</strong>${props.regime_name_zh} / ${props.regime_name}</p>
        <p><strong>行政类型：</strong>${props.admin_type_zh || props.admin_type || "未标明"}</p>
        <p><strong>所属上层区划：</strong>${province}</p>
        ${pinyin}
        <p><strong>源图层：</strong>${props.source_layer}</p>
        <p>${props.note}</p>
        <p><strong>说明：</strong>Hartwell/CHGIS 的 co-location 区域近似，已转换为网页地图坐标；不是严格国界考证。</p>
      </div>
    `;
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
