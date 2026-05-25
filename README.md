# 苏轼生平行迹地图

一个用于阅读《苏东坡新传》时建立空间感的静态网页地图。

## 内容

- 苏轼生平主要地点与阶段路线。
- 1080 年前后北宋及周边政权 / 行政单元图层。
- 历史区域图层可开关，悬停或点击小块可查看名称、所属路、政权和源图层。

## 在线发布

本项目是纯静态站点，适合直接部署到 GitHub Pages。

发布前可在仓库设置中选择：

- `Settings` -> `Pages`
- `Build and deployment` -> `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

项目页地址通常会是：

```text
https://<github-user>.github.io/su-shi-life-map/
```

## 数据与许可

- 历史 GIS 数据：Hartwell China Historical GIS, Harvard Dataverse, DOI: <https://doi.org/10.7910/DVN/29302>。该数据集在 Harvard Dataverse 标注为 `CC0 1.0`。
- CHGIS 对 Hartwell 数据的说明：<https://chgis.fas.harvard.edu/data/hartwell/>
- 底图：OpenStreetMap、OpenTopoMap、Esri World Imagery；页面保留了可见 provider attribution。
- 地图库：Leaflet 1.9.4，BSD 2-Clause License。
- 本仓库中我方原创代码与整理文字见 `LICENSE`。

## 精度说明

Hartwell/CHGIS 图层比手绘示意更可靠，但仍是 historical GIS 近似。它使用现代县级空间单元作为 building blocks 来表示历史区域，部分边界经过人工调整，不应视为严格的宋代国界或行政边界考证。

地图中苏轼地点使用现代城市近似坐标，路线连线只表示人生阶段顺序，不代表真实古道、水路或驿路。

## 文件结构

```text
.
├── index.html
├── data/
│   ├── historical-regimes-1080.geojson
│   ├── historical-regimes-1080.js
│   ├── historical-regime-boundaries-1080.geojson
│   ├── historical-regime-boundaries-1080.js
│   ├── su-shi-life-locations.geojson
│   └── su-shi-life-locations.js
├── scripts/
│   ├── build_regime_boundaries_1080.py
│   ├── build_hartwell_1080_geojson.py
│   └── build_life_locations_js.py
├── ATTRIBUTION.md
├── LICENSE
└── README.md
```

`*.geojson` 是便于检查和再处理的数据文件；同名 `*.js` 是浏览器直接加载用的 wrapper。更新 `data/su-shi-life-locations.geojson` 后，运行：

```sh
python3 scripts/build_life_locations_js.py
```

更新 Hartwell 历史图层时，先下载 Hartwell V5 zip，再运行：

```sh
python3 scripts/build_hartwell_1080_geojson.py /path/to/v5_Hartwell_2010.zip data
```

重建政权外缘边界辅助线：

```sh
python3 scripts/build_regime_boundaries_1080.py
```

## 本地预览

可以直接打开 `index.html`。开发和调试时更推荐在仓库目录运行本地静态服务器：

```sh
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/
```
