(function (app) {
  app.stages = {
    "少年与家族": { color: "#1f77b4", label: "少年与家族" },
    "出蜀远行": { color: "#1f77b4", label: "出蜀远行" },
    "入仕与朝廷": { color: "#2ca02c", label: "入仕与朝廷" },
    "初仕": { color: "#2ca02c", label: "初仕" },
    "地方治理": { color: "#2ca02c", label: "地方治理" },
    "诗狱转折": { color: "#d62728", label: "诗狱转折" },
    "黄州与东坡": { color: "#d62728", label: "黄州与东坡" },
    "漂泊江淮": { color: "#9467bd", label: "漂泊江淮" },
    "元祐后期外任": { color: "#9467bd", label: "元祐后期外任" },
    "岭海贬谪": { color: "#ff7f0e", label: "岭海贬谪" },
    "北归": { color: "#ff7f0e", label: "北归" }
  };

  app.uniqueLegend = [
    ["少年与家族 / 出蜀远行", "#1f77b4"],
    ["入仕、初仕与地方治理", "#2ca02c"],
    ["诗狱与黄州", "#d62728"],
    ["漂泊江淮 / 元祐后期外任", "#9467bd"],
    ["岭海贬谪与北归", "#ff7f0e"]
  ];

  app.REGIME_COLORS = {
    northern_song: "#C0392B",
    liao: "#2E86C1",
    western_xia: "#F39C12",
    dali: "#27AE60",
    tufan_tribes: "#8E44AD",
    heihan: "#16A085",
    yutian: "#7F8C8D",
    liuqiu: "#34495E",
    abor: "#A04000"
  };

  app.geoOverlays = {
    rivers: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { name: "长江（示意）" }, geometry: { type: "LineString", coordinates: [[98.6,28.4],[101.8,30.7],[104.1,30.7],[106.5,29.6],[108.4,30.7],[111.3,30.7],[114.3,30.6],[117.2,31.3],[119.8,31.5],[121.8,31.2]] } },
        { type: "Feature", properties: { name: "黄河（示意）" }, geometry: { type: "LineString", coordinates: [[96.0,35.0],[100.5,36.0],[103.8,37.5],[106.8,38.3],[110.8,39.2],[112.7,37.7],[111.9,35.5],[113.7,34.8],[118.6,37.6]] } }
      ]
    },
    roads: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { name: "蜀道（剑门方向，示意）" }, geometry: { type: "LineString", coordinates: [[103.8,30.1],[104.7,31.4],[105.7,32.4],[106.2,33.2],[107.0,34.0]] } },
        { type: "Feature", properties: { name: "岭南北归古道（示意）" }, geometry: { type: "LineString", coordinates: [[109.6,19.5],[113.3,23.1],[113.6,24.8],[114.9,25.8],[119.9,31.8]] } }
      ]
    },
    mountains: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { name: "秦岭（示意）" }, geometry: { type: "LineString", coordinates: [[104.0,33.5],[106.0,34.0],[108.0,34.2],[110.5,34.3]] } },
        { type: "Feature", properties: { name: "横断山地（示意）" }, geometry: { type: "LineString", coordinates: [[98.5,24.5],[99.5,27.0],[100.0,29.0],[100.8,31.0]] } }
      ]
    }
  };
})(window.SuShiLifeMap = window.SuShiLifeMap || {});
