# Changelog

## v1.1.0 - 2026-08-18

- Added real-time CN party finder browsing with search, data-center and category filters, pagination, refresh, and listing details
- Corrected the Variant & Criterion filter contract to `V&C Dungeon Finder` and mapped source aliases such as `AdventuringForays`
- Added request cancellation and generation guards so stale searches and filters cannot replace newer results
- Added batched page loading, listing ID deduplication, partial-failure warnings, and friendly fallbacks for unknown enum values
- Added deterministic tests for category contracts, aliases, detail mappings, pagination failures, deduplication, and request races

## v1.0.9 - 2026-08-13

- Added fast local-first fuzzy suggestions for Chinese and English item names, including `秘银` -> `秘银矿`
- Stopped fuzzy, quest-name, and duplicate-name searches from auto-opening a result; users now choose an entry with its entity ID visible
- Isolated item and quest failures with independent fallbacks and capped CafeMaker search requests at four seconds
- Prevented stale search and detail requests from replacing newer input or selections
- Added deterministic search-ranking tests against the real bilingual item mapping

## v1.0.8 - 2026-06-09

- Fixed newly added item icons by using the XIVAPI v2 asset endpoint when the legacy icon mirrors have not synced the image yet
- Added the same XIVAPI v2 fallback to the local static icon proxy
- Bumped the frontend script cache version so GitHub Pages and browser clients load the icon fallback fix

## v1.0.7 - 2026-06-09

- Updated the built-in bilingual item mapping with 45 newly tradable CN items from the latest local CN client data and XIVAPI
- Added missing search coverage for Auxesia and Cosmic Exploration items, including `奥克塞西亚能源包` / `Auxesia Drone Module`
- Bumped the item mapping cache version so GitHub Pages and browser clients refresh the updated data file

## v1.0.6 - 2026-05-29

- Added current-scope sales rankings for CN region, data center, and world scopes with top-30 price and quantity views
- Added click-triggered recipe cost and profit calculation with material prices, total cost, current lowest sale price, tax, net profit, and profit rate
- Optimized ranking loading with batched concurrent Universalis aggregated requests and short preview caching while still refreshing on click
- Fixed web ranking item names and icons by hydrating local mapping data and adding a local icon proxy/cache fallback

## v1.0.5 - 2026-05-25

- Added CN data-center filters for market prices: `陆行鸟`, `莫古力`, `猫小胖`, and `豆豆柴`
- Added NPC shop source cards with vendor price, NPC name, map, and precise `X/Y` coordinates when available
- Resolved shop NPCs from `GilShopItem` links through XIVAPI and supplemented missing NPC coordinates through Garland Tools search data
- Hid unresolved or coordinate-less shop records from the NPC source list to avoid showing misleading `待确认 NPC` entries
- Bumped static asset version parameters so GitHub Pages clients load the updated script

## v1.0.3 - 2026-05-12

- Added `全部 / HQ / 非 HQ` market quality filters to the static web version
- Split market summary and world price table statistics by selected quality mode
- At that release, kept the static web runtime on the `app.js + static-overrides.js` path while consolidating market-quality overrides; current releases load `app.js` directly
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
