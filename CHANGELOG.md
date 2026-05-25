# Changelog

## v1.0.5 - 2026-05-25

- Added CN data-center filters for market prices: `陆行鸟`, `莫古力`, `猫小胖`, and `豆豆柴`
- Added NPC shop source cards with vendor price, NPC name, map, and precise `X/Y` coordinates when available
- Resolved shop NPCs from `GilShopItem` links through XIVAPI and supplemented missing NPC coordinates through Garland Tools search data
- Hid unresolved or coordinate-less shop records from the NPC source list to avoid showing misleading `待确认 NPC` entries
- Bumped static asset version parameters so GitHub Pages clients load the updated script

## v1.0.3 - 2026-05-12

- Added `全部 / HQ / 非 HQ` market quality filters to the static web version
- Split market summary and world price table statistics by selected quality mode
- Kept the static web runtime on the `app.js + static-overrides.js` path while consolidating the latest market-quality overrides into the shared static override layer
- Bumped static asset version parameters again to force GitHub Pages clients onto the post-fix market-price scripts
- Fixed sorting under `HQ / 非 HQ` mode so both the market summary and the world price table sort by the currently selected quality price

## v1.0.2 - 2026-05-10

- Fixed Chinese numeral normalization in item search so queries like `神眼魔晶石三型` correctly match mapped names such as `神眼魔晶石叁型`
- Improved static web search matching for common Chinese variant numerals including `壹贰叁` and `拾`
- Bumped static asset version parameters in `index.html` and `item_mapping.min.json` to force GitHub Pages and browser clients to refresh cached scripts and mapping data

## v1.0.1 - 2026-05-08

- Added built-in bilingual tradable item mapping generated from local CN client data and XIVAPI English data
- Integrated `data/item_mapping.min.json` into the desktop app package
- Switched search priority to `中文 -> 映射表 -> ItemID/英文名 -> Universalis`
- Fixed missing entries caused by batched XIVAPI row fetches by adding single-row retry fallback
- Fixed item detail descriptions to prefer Chinese descriptions from the local mapping table
- Fixed some mapped items reverting to English names after opening detail pages
- Removed temporary GarlandTools scratch files from the repo
