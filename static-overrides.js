function staticModeInit() {
  const run = async () => {
    try {
      await loadItemMapping();
      const cnWorldCount = Array.isArray(state.dataCenters)
        ? state.dataCenters.reduce((sum, entry) => sum + entry.worlds.length, 0)
        : 0;
      setBootStatus(`Static mode ready: ${cnWorldCount} worlds, ${state.itemMappingEntries?.length || 0} mapping rows`);
    } catch (error) {
      console.error(error);
      setBootStatus("Static mode failed to load item mapping");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

async function performSearch(keyword, { replace = false } = {}) {
  if (!keyword) {
    return;
  }

  dom.searchButton.disabled = true;
  dom.searchButton.textContent = "Search";
  setLoadingState(keyword);

  try {
    const exactAlias = resolveKnownItemAlias(keyword);
    if (exactAlias) {
      const fastResults = searchEntitiesFromKnownAlias(keyword, exactAlias);
      renderSearchResults(fastResults);
      const preferred = fastResults[0];
      dom.searchInput.value = preferred.name;
      saveSearchHistory(keyword);
      await loadItemPage(preferred.id, { replace });
      return;
    }

    const questIntent = parseQuestSearchIntent(keyword);
    if (questIntent.directQuestId) {
      await loadQuestPage(questIntent.directQuestId, { replace });
      return;
    }

    if (questIntent.forceQuestKeyword) {
      const forcedQuestResults = await searchQuests(questIntent.forceQuestKeyword);
      const mappedQuestResults = forcedQuestResults.map((entry) => ({
        type: "quest",
        id: entry.ID,
        name: entry.Name || entry.Name_en || `Quest #${entry.ID}`,
        subtitle: `${entry.JournalGenre?.Name || "Quest"} / Lv.${entry.ClassJobLevel0 || 0} / ${entry.Name_en || "No English name"}`,
        icon: entry.Icon,
        raw: entry,
      }));
      renderSearchResults(mappedQuestResults);
      if (!mappedQuestResults.length) {
        renderQuestSearchNotFound(questIntent.forceQuestKeyword);
        return;
      }
      dom.searchInput.value = mappedQuestResults[0].name;
      saveSearchHistory(`quest:${mappedQuestResults[0].name}`);
      await loadQuestPage(mappedQuestResults[0].id, { replace });
      return;
    }

    const results = await searchEntities(keyword, { allowDeepFallback: false });
    renderSearchResults(results);

    if (!results.length) {
      renderNoSearchResult(keyword);
      return;
    }

    const preferred = pickPreferredSearchResult(results, keyword);
    if (!preferred || !preferred.shouldAutoOpen) {
      dom.searchInput.value = keyword;
      saveSearchHistory(keyword);
      setBootStatus(`Found ${results.length} related results`);
      renderAmbiguousSearchResult(keyword, results);
      return;
    }

    const selected = preferred.entry;
    dom.searchInput.value = selected.name;
    saveSearchHistory(keyword);

    if (selected.type === "quest") {
      await loadQuestPage(selected.id, { replace });
    } else {
      if (selected.raw?.__mappingAlias) {
        rememberResolvedAlias(keyword, selected.raw.__mappingAlias);
      }
      await loadItemPage(selected.id, { replace });
    }
  } catch (error) {
    console.error(error);
    renderLoadError(error);
  } finally {
    dom.searchButton.disabled = false;
    dom.searchButton.textContent = "Search";
  }
}

async function searchItems(keyword, { allowDeepFallback = true } = {}) {
  const exactAlias = resolveKnownItemAlias(keyword);
  if (exactAlias) {
    debugLog(`[searchItems:mapping-exact] keyword=${keyword} itemId=${exactAlias.itemId}`);
    return buildResolvedAliasItems(keyword, exactAlias);
  }

  const mapped = searchItemsFromMapping(keyword);
  if (mapped.length) {
    debugLog(`[searchItems:mapping-fuzzy] keyword=${keyword} count=${mapped.length}`);
    return mapped;
  }

  debugLog(`[searchItems:start] keyword=${keyword}`);
  const encoded = encodeURIComponent(keyword);
  const columns = encodeURIComponent("ID,Name,Name_en,Name_ja,Icon,LevelItem,ItemUICategory.Name");
  const primaryUrl = `${ENCYCLOPEDIA_API}/search?indexes=Item&string=${encoded}&language=chs&limit=50&columns=${columns}`;
  const primary = await fetchJson(primaryUrl);
  const results = primary.Results || [];
  debugLog(`[searchItems:primary] keyword=${keyword} count=${results.length}`);
  if (results.length > 0) {
    return results;
  }

  const fallbackUrl = `${ENCYCLOPEDIA_API}/search?indexes=Item&string=${encoded}&language=en&limit=50&columns=${columns}`;
  const fallback = await fetchJson(fallbackUrl);
  const fallbackResults = fallback.Results || [];
  debugLog(`[searchItems:fallback-en] keyword=${keyword} count=${fallbackResults.length}`);
  if (fallbackResults.length > 0) {
    return fallbackResults;
  }

  debugLog(`[searchItems:no-result] keyword=${keyword} allowDeepFallback=${allowDeepFallback}`);
  return [];
}

function resolveItemViaWikiFallback(keyword) {
  debugLog(`[wikiFallback:disabled] keyword=${keyword}`);
  return Promise.resolve(null);
}

async function tryResolveAmbiguousViaWiki(keyword) {
  const query = String(keyword || "").trim();
  if (!query) {
    return null;
  }

  return {
    type: "wiki",
    id: 0,
    name: query,
    subtitle: "Open CN Wiki search in a new tab",
    icon: "",
    raw: {
      wikiUrl: buildWikiSearchUrl(query),
    },
  };
}

function debugLog(message) {
  try {
    const current = loadDebugLog();
    current.push(`[${new Date().toLocaleString("zh-CN", { hour12: false })}] ${message}`);
    localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(current.slice(-200)));
  } catch {
    // Ignore local debug log failures in static mode.
  }
}

function renderNoSearchResult(keyword) {
  const safeKeyword = escapeHtml(keyword);
  const wikiUrl = buildWikiSearchUrl(keyword);
  const markup = `
    <div class="notice notice--warn">
      No exact result was found for "${safeKeyword}".
      Try the full Chinese name, the English name, or open CN Wiki search directly.
    </div>
    <div class="link-row">
      ${renderExternalButton(wikiUrl, "Open CN Wiki Search")}
    </div>
  `;
  dom.itemOverview.innerHTML = wrapCard("Search Result", "No Direct Match", markup);
  dom.marketOverview.innerHTML = wrapCard("Details", "No Data", markup);
  dom.obtainPanel.innerHTML = wrapCard("How To Obtain", "No Data", markup);
  dom.craftPanel.innerHTML = wrapCard("Crafting", "No Data", markup);
  dom.usagePanel.innerHTML = wrapCard("Usage", "No Data", markup);
  dom.priceTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">No market data</td></tr>`;
}

function renderSearchResults(results) {
  if (!results.length) {
    dom.searchResults.classList.add("hidden");
    dom.searchResults.innerHTML = "";
    return;
  }

  dom.searchResults.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const entry of results) {
    const node = dom.resultTemplate.content.firstElementChild.cloneNode(true);
    const icon = node.querySelector(".result-item__icon");
    const name = node.querySelector(".result-item__name");
    const meta = node.querySelector(".result-item__meta");
    const typeLabel = entry.type === "quest" ? "Quest" : entry.type === "wiki" ? "Wiki" : "Item";

    icon.style.backgroundImage = `url(${toIconUrl(entry.icon)})`;
    name.textContent = entry.name;
    meta.textContent = `${typeLabel} / ${entry.subtitle}`;

    node.addEventListener("click", async () => {
      dom.searchResults.classList.add("hidden");
      dom.searchInput.value = entry.name;
      if (entry.type === "quest") {
        await loadQuestPage(entry.id);
      } else if (entry.type === "wiki") {
        openWikiSearch(entry.raw?.wikiUrl || entry.name);
      } else {
        await loadItemPage(entry.id);
      }
    });

    fragment.appendChild(node);
  }

  dom.searchResults.appendChild(fragment);
  dom.searchResults.classList.remove("hidden");
}

function renderAmbiguousSearchResult(keyword, results) {
  const topResults = results.slice(0, 8);
  const itemsMarkup = topResults.map((entry) => {
    const typeLabel = entry.type === "quest" ? "Quest" : entry.type === "wiki" ? "Wiki" : "Item";
    const nameMarkup = entry.type === "wiki"
      ? `<button type="button" class="link-button" data-wiki-search="${escapeHtml(entry.raw?.wikiUrl || entry.name)}">${escapeHtml(entry.name)}</button>`
      : (renderRouteLink(entry.id, entry.name, entry.type === "quest" ? "quest" : "item") || escapeHtml(entry.name));
    return `
      <div class="ingredient">
        <span class="ingredient__name">${nameMarkup}</span>
        <span class="ingredient__amount">${escapeHtml(typeLabel)}</span>
      </div>
    `;
  }).join("");

  const markup = `
    <div class="notice notice--soft">
      Multiple related results were found for "${escapeHtml(keyword)}". Select a candidate below or open CN Wiki search.
    </div>
    <div class="subsection">
      <h3 class="subsection__title">Candidates</h3>
      <div class="ingredient-list">${itemsMarkup}</div>
    </div>
    <div class="link-row">
      ${renderExternalButton(buildWikiSearchUrl(keyword), "Open CN Wiki Search")}
    </div>
  `;

  dom.itemOverview.innerHTML = wrapCard("Search Result", "Need Confirmation", markup);
  dom.marketOverview.innerHTML = wrapCard("Details", "Waiting For Selection", `<div class="notice notice--soft">Choose an item from the candidate list or continue in CN Wiki.</div>`);
  dom.obtainPanel.innerHTML = wrapCard("How To Obtain", "Waiting For Selection", `<div class="notice notice--soft">Select an exact item first.</div>`);
  dom.craftPanel.innerHTML = wrapCard("Crafting", "Waiting For Selection", `<div class="notice notice--soft">Select an exact item first.</div>`);
  dom.usagePanel.innerHTML = wrapCard("Usage", "Waiting For Selection", `<div class="notice notice--soft">Select an exact item first.</div>`);
  dom.priceTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">Select an item first</td></tr>`;
}

staticModeInit();
