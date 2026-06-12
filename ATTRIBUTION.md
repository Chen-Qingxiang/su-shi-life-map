# Attribution

## Hartwell China Historical GIS

Historical polygon data in `data/historical-regimes-1080.geojson` and `data/historical-regimes-1080.js` is derived from:

> Hartwell, Robert, 2015, Hartwell China Historical GIS, Harvard Dataverse, DOI: 10.7910/DVN/29302.

Dataset DOI: <https://doi.org/10.7910/DVN/29302>

CHGIS description of the Hartwell data: <https://chgis.fas.harvard.edu/data/hartwell/>

The Harvard Dataverse metadata lists the dataset license as `CC0 1.0`.

Important accuracy note: Hartwell/CHGIS uses a co-location method, approximating historical areas with modern county-level spatial units and adjusted boundaries. It is suitable for heuristic reading and spatial orientation, not for exact historical boundary claims.

## Online basemaps

Base map tiles can be loaded from OpenStreetMap, OpenTopoMap, Esri World Imagery, and Esri World Hillshade:

<https://www.openstreetmap.org/>

<https://opentopomap.org/>

<https://www.esri.com/>

Esri World Hillshade item:

<https://www.arcgis.com/home/item.html?id=1b243539f4514b6ba35e7d995890db1d>

The map keeps visible provider attribution in the Leaflet attribution control.

OpenStreetMap tile usage policy:

<https://operations.osmfoundation.org/policies/tiles/>

OpenTopoMap credits OpenStreetMap and SRTM data in its visible attribution.

## Physical waterways

`data/physical-waterways.geojson` and `data/physical-waterways.js` contain current named river geometry downloaded from OpenStreetMap through Overpass API. OpenStreetMap data is licensed under ODbL 1.0:

<https://www.openstreetmap.org/copyright>

<https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ>

These modern river geometries provide physical-geography reference only. They are not reconstructions of Song-era channels.

## HydroRIVERS river network

`data/hydrorivers-major.*`, `data/hydrorivers-tributaries.*`, and `data/hydrorivers-regional.*` are derived from HydroRIVERS v1.0 / HydroSHEDS:

<https://www.hydrosheds.org/products/hydrorivers>

HydroRIVERS represents a global vectorized river network derived from HydroSHEDS elevation-based hydrology. This project displays Strahler orders 6—9 in separate switchable layers for geographic reading.

## Natural Earth named rivers

`data/named-rivers.geojson` and `data/named-rivers.js` are derived from Natural Earth 1:10m Rivers + lake centerlines:

<https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/>

Natural Earth data is public domain. This layer supplies river names, multilingual names, scale rank, and Wikidata identifiers that are not included in HydroRIVERS. Short reading-oriented profiles added by this project are general geographic summaries, not hydrological reference entries.

## Mountain systems and ridges

`data/major-mountain-systems.*` is derived from the standard `300 selection` of GMBA Mountain Inventory v2.0, licensed CC BY 4.0:

<https://www.earthenv.org/mountains>

Snethlage, M.A. et al. (2022), GMBA Mountain Inventory v2. DOI: <https://doi.org/10.48601/earthenv-t9k2-1407>

The displayed lines are generalized outlines of mountain-system polygons, not exact ridge axes.

`data/named-mountain-ridges.*` contains named `natural=ridge` ways from OpenStreetMap. Coverage completeness varies by region; OSM attribution and ODbL terms apply.

## Public-domain poem texts

The chapter-journey work cards use public-domain Su Shi texts transcribed by Chinese Wikisource:

<https://zh.wikisource.org/wiki/東坡全集>

Each work record keeps its individual source page URL and a collation warning. The poems themselves are public-domain works; the Wikisource transcription should still be checked against a reliable punctuated critical edition before being used for textual scholarship.

Two works not available as Su Shi pages on Wikisource currently use the public online `诗歌库《苏轼诗全集》` page as a fallback, and are marked for stronger collation:

<https://www.shigeku.org/xlib/lingshidao/gushi/sushi3.htm>

## Leaflet

The interactive map uses Leaflet 1.9.4:

<https://leafletjs.com/>

Leaflet is distributed under the BSD 2-Clause License:

<https://github.com/Leaflet/Leaflet/blob/main/LICENSE>
