# 苏轼生平行迹地图

一个用于阅读《苏东坡新传》时建立空间感的静态网页地图。

本项目把苏轼一生的重要地点、阶段路线、1080 年前后北宋及周边政权/行政单元背景叠加在一张 Leaflet 地图上。它的定位是“读书辅助工具”：帮助读者在阅读传记时快速理解苏轼人生轨迹的空间变化，而不是制作精确的历史地理考证图。

## 当前功能

- 展示苏轼生平主线地点：眉州眉山、成都、汴京、杭州、密州、徐州、黄州、惠州、儋州、常州等。
- 按人生阶段给地点着色，包括少年与家族、入仕与朝廷、地方治理、乌台诗狱、黄州、岭海贬谪、北归等。
- 点击地图点位或左侧地点列表，可查看对应地点的时间、年龄、章节、事件和说明。
- 展示 1080 年前后北宋及周边政权 / 行政单元图层。
- 可开关历史区域、行政边界、政权外缘边界、苏轼路线、地点、河流、山脉、古道等图层。
- 支持 OpenStreetMap、OpenTopoMap、Esri World Imagery 等在线底图。
- 项目为纯静态网页，可直接部署到 GitHub Pages。

## 在线发布

本项目适合直接部署到 GitHub Pages。

在仓库设置中选择：

```text
Settings -> Pages
Build and deployment -> Deploy from a branch
Branch: main
Folder: / (root)
```

项目页地址通常是：

```text
https://<github-user>.github.io/su-shi-life-map/
```

本仓库对应的地址通常是：

```text
https://chen-qingxiang.github.io/su-shi-life-map/
```

## 本地预览

可以直接双击打开 `index.html`，但开发和调试时更推荐启动一个本地静态服务器。

在仓库根目录运行：

```sh
python3 -m http.server 8000
```

然后在浏览器访问：

```text
http://localhost:8000/
```

如果你使用 Windows，也可以在 PowerShell 或 WSL 里进入仓库目录后运行同样的命令。

## 文件结构

```text
.
├── index.html
├── src/
│   ├── config.js
│   ├── data.js
│   ├── main.js
│   ├── map.js
│   ├── popups.js
│   ├── sidebar.js
│   └── styles.css
├── data/
│   ├── su-shi-life-locations.geojson
│   ├── su-shi-life-locations.js
│   ├── historical-regimes-1080.geojson
│   ├── historical-regimes-1080.js
│   ├── historical-regime-boundaries-1080.geojson
│   └── historical-regime-boundaries-1080.js
├── scripts/
│   ├── build_life_locations_js.py
│   ├── build_hartwell_1080_geojson.py
│   ├── build_regime_boundaries_1080.py
│   └── validate_life_locations.py
├── docs/
│   └── data-notes.md
├── ATTRIBUTION.md
├── LICENSE
└── README.md
```

## 代码结构说明

### `index.html`

页面入口。它只负责组织页面骨架，并按顺序加载 Leaflet、数据文件和 `src/` 里的功能模块。

加载顺序很重要：

```html
<script src="data/su-shi-life-locations.js"></script>
<script src="data/historical-regimes-1080.js"></script>
<script src="data/historical-regime-boundaries-1080.js"></script>
<script src="src/config.js"></script>
<script src="src/data.js"></script>
<script src="src/popups.js"></script>
<script src="src/sidebar.js"></script>
<script src="src/map.js"></script>
<script src="src/main.js"></script>
```

前面的数据文件会先把 GeoJSON 暴露为 `window.suShiLifeLocations`、`window.historicalRegimes1080` 和 `window.historicalRegimeBoundaries1080`，后面的模块再读取这些全局数据。

### `src/config.js`

项目配置层。主要放：

- 人生阶段颜色；
- 左侧人生阶段图例；
- 1080 年政权配色；
- 河流、山脉、古道等示意性辅助图层。

如果只是调整颜色、图例名称、示意河流或古道，通常优先改这个文件。

### `src/data.js`

数据转换层。它从 `window.suShiLifeLocations` 读取 GeoJSON，并转换成地图渲染需要的两个对象：

- `stops`：地点列表；
- `route`：苏轼行迹路线。

如果 `data/su-shi-life-locations.geojson` 里没有显式路线，它会退回到按地点顺序自动连线。

### `src/popups.js`

弹窗模板层。负责生成：

- 苏轼地点 popup；
- 历史政权 / 行政单元 popup。

地点 popup 会展示现代地名、时间、年龄、人生阶段、章节、事件和说明。

### `src/sidebar.js`

左侧栏渲染层。负责生成：

- 人生阶段图例；
- 政权图例；
- 地点按钮列表。

点击左侧地点按钮时，地图会移动到对应地点并打开 popup。

### `src/map.js`

地图核心层。负责创建 Leaflet 地图和所有图层，包括：

- 在线底图；
- 1080 年历史政权区域；
- 行政区边界；
- 政权外缘边界；
- 苏轼路线；
- 苏轼地点 marker；
- 河流、山脉、古道等辅助图层；
- 右上角图层控制器。

这是项目中最适合学习 Leaflet 的文件。

### `src/main.js`

初始化入口。负责把所有模块串起来：读取数据、渲染图例、检查 Leaflet 是否加载、创建地图、渲染地点列表。

## 数据说明

### 苏轼地点数据

源文件：

```text
data/su-shi-life-locations.geojson
```

浏览器加载文件：

```text
data/su-shi-life-locations.js
```

`geojson` 文件便于人工检查和再处理；`js` 文件是浏览器直接加载用的 wrapper。

地点数据采用 GeoJSON `FeatureCollection`。其中：

- `kind: "route"` 表示路线；
- `kind: "stop"` 表示地点。

典型地点属性如下：

```json
{
  "kind": "stop",
  "order": 10,
  "place_key": "huangzhou",
  "name": "黄州",
  "modern": "湖北省黄冈市黄州区",
  "years": "1080-1084",
  "age": "44-48",
  "age_detail": "1080-1084（44-48 岁）",
  "stage": "黄州与东坡",
  "chapter": "06 黄州五年",
  "event": "乌台诗狱后贬黄州，躬耕东坡，临皋、雪堂、赤壁诸作集中出现。",
  "note": "“东坡”身份形成的关键地点。"
}
```

其中 `place_key` 是地点的稳定连接键。后续如新增历史地名 / 行政语境、人物、事件、作品等独立数据层，应优先通过 `place_key` 连接，而不是依赖地点名称或展示顺序。更详细的数据边界和未来分层原则见 `docs/data-notes.md`。

更新地点数据后，需要重新生成对应的 JS 文件：

```sh
python3 scripts/build_life_locations_js.py
```

可选校验地点数据：

```sh
python3 scripts/validate_life_locations.py
```

### 1080 年历史区域数据

源文件：

```text
data/historical-regimes-1080.geojson
```

浏览器加载文件：

```text
data/historical-regimes-1080.js
```

这部分数据由 Hartwell China Historical GIS 转换而来，用来提供 1080 年前后北宋及周边政权/行政单元背景。

如需重新生成，先下载 Hartwell V5 zip，然后运行：

```sh
python3 scripts/build_hartwell_1080_geojson.py /path/to/v5_Hartwell_2010.zip data
```

### 政权外缘边界数据

源文件：

```text
data/historical-regime-boundaries-1080.geojson
```

浏览器加载文件：

```text
data/historical-regime-boundaries-1080.js
```

它由 `historical-regimes-1080.geojson` 进一步生成，用于提供更醒目的政权外缘边界。生成方式是把原始多边形栅格化成 union mask 后抽取边界线，因此它是读图辅助线，不是严格的历史边界考证。

重新生成命令：

```sh
python3 scripts/build_regime_boundaries_1080.py
```

## 常见修改任务

### 增加一个苏轼地点

1. 修改 `data/su-shi-life-locations.geojson`。
2. 在 `features` 中增加一个 `kind: "stop"` 的 `Point`。
3. 补齐 `order`、`name`、`modern`、`years`、`age`、`stage`、`chapter`、`event`、`note` 等字段。
4. 如需路线经过该点，也更新 `kind: "route"` 的 `LineString` 坐标。
5. 运行：

```sh
python3 scripts/build_life_locations_js.py
```

6. 本地预览检查。

### 修改人生阶段颜色

修改 `src/config.js` 里的 `app.stages` 和 `app.uniqueLegend`。

### 修改地图默认图层或显示顺序

修改 `src/map.js`。

重点看：

- `L.tileLayer(...)`：底图；
- `L.geoJSON(...)`：历史区域、边界、河流、山脉、古道；
- `L.polyline(...)`：路线；
- `L.circleMarker(...)`：地点；
- `L.control.layers(...)`：右上角图层控制器。

### 修改左侧地点列表

修改 `src/sidebar.js` 里的 `renderPlaceList()`。

### 修改 popup 显示内容

修改 `src/popups.js`。

## 数据与许可

- 历史 GIS 数据：Hartwell China Historical GIS, Harvard Dataverse, DOI: <https://doi.org/10.7910/DVN/29302>。该数据集在 Harvard Dataverse 标注为 `CC0 1.0`。
- CHGIS 对 Hartwell 数据的说明：<https://chgis.fas.harvard.edu/data/hartwell/>
- 在线底图：OpenStreetMap、OpenTopoMap、Esri World Imagery；页面保留 provider attribution。
- 地图库：Leaflet 1.9.4，BSD 2-Clause License。
- 本仓库中原创代码与整理文字见 `LICENSE`。

更详细的来源说明见 `ATTRIBUTION.md`。

## 精度说明

本项目是读书辅助地图，不是严格历史地理考证图。

需要特别注意：

- 苏轼地点使用现代城市近似坐标。
- 路线连线表示人生阶段顺序，不代表真实古道、水路或驿路。
- Hartwell/CHGIS 图层比手绘示意更可靠，但仍是 historical GIS 近似。
- Hartwell/CHGIS 使用现代县级空间单元作为 building blocks 来表示历史区域，部分边界经过人工调整，不应视为严格的宋代国界或行政边界考证。
- 河流、山脉、古道等图层是阅读辅助示意，不等于精确考据。

## 推荐学习路线

这个项目适合作为一个小型前端地图项目来学习。

建议顺序：

1. 先读 `index.html`，理解页面入口和脚本加载顺序。
2. 再读 `src/main.js`，理解项目如何初始化。
3. 读 `src/data.js`，理解 GeoJSON 如何变成 `route` 和 `stops`。
4. 读 `src/map.js`，学习 Leaflet 地图、图层、marker、popup 和 layer control。
5. 读 `src/sidebar.js` 和 `src/popups.js`，学习 DOM 渲染和事件绑定。
6. 最后读 `scripts/`，理解历史 GIS 数据是如何被转换成网页可用格式的。

如果只是想继续扩展内容，优先从 `data/su-shi-life-locations.geojson` 开始；如果想学习地图交互，优先从 `src/map.js` 开始。
