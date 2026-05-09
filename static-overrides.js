function staticModeInit() {
  // The main app bootstrap already loads the item mapping.
  // Keep static overrides side-effect free to avoid duplicate JSON fetches.
}

async function performSearch(keyword, { replace = false } = {}) {
  if (!keyword) {
    return;
  }

  dom.searchButton.disabled = true;
  dom.searchButton.textContent = "搜索";
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
        name: entry.Name || entry.Name_en || `任务 #${entry.ID}`,
        subtitle: `${entry.JournalGenre?.Name || "任务"} / 等级 ${entry.ClassJobLevel0 || 0} / ${entry.Name_en || "无英文名"}`,
        icon: entry.Icon,
        raw: entry,
      }));
      renderSearchResults(mappedQuestResults);
      if (!mappedQuestResults.length) {
        renderQuestSearchNotFound(questIntent.forceQuestKeyword);
        return;
      }
      dom.searchInput.value = mappedQuestResults[0].name;
      saveSearchHistory(`任务:${mappedQuestResults[0].name}`);
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
      setBootStatus(`找到 ${results.length} 条相关结果`);
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
    dom.searchButton.textContent = "搜索";
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
    subtitle: "在新标签页打开国服 Wiki 搜索",
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
      没有找到“${safeKeyword}”的精确结果。
      可以尝试完整中文名、英文名，或直接打开国服 Wiki 搜索。
    </div>
    <div class="link-row">
      ${renderExternalButton(wikiUrl, "打开国服 Wiki 搜索")}
    </div>
  `;
  dom.itemOverview.innerHTML = wrapCard("搜索结果", "未找到精确匹配", markup);
  dom.marketOverview.innerHTML = wrapCard("详情面板", "暂无数据", markup);
  dom.obtainPanel.innerHTML = wrapCard("获取方式", "暂无数据", markup);
  dom.craftPanel.innerHTML = wrapCard("制作配方", "暂无数据", markup);
  dom.usagePanel.innerHTML = wrapCard("用途", "暂无数据", markup);
  dom.priceTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">暂无市场数据</td></tr>`;
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
    const typeLabel = entry.type === "quest" ? "任务" : entry.type === "wiki" ? "Wiki" : "物品";

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
    const typeLabel = entry.type === "quest" ? "任务" : entry.type === "wiki" ? "Wiki" : "物品";
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
      “${escapeHtml(keyword)}”命中了多个相关结果。请先从下方候选中选择，或直接打开国服 Wiki 搜索。
    </div>
    <div class="subsection">
      <h3 class="subsection__title">候选条目</h3>
      <div class="ingredient-list">${itemsMarkup}</div>
    </div>
    <div class="link-row">
      ${renderExternalButton(buildWikiSearchUrl(keyword), "打开国服 Wiki 搜索")}
    </div>
  `;

  dom.itemOverview.innerHTML = wrapCard("搜索结果", "需要确认具体条目", markup);
  dom.marketOverview.innerHTML = wrapCard("详情面板", "等待选择", `<div class="notice notice--soft">请先选择准确条目，或继续在国服 Wiki 中确认。</div>`);
  dom.obtainPanel.innerHTML = wrapCard("获取方式", "等待选择", `<div class="notice notice--soft">请先选择准确条目。</div>`);
  dom.craftPanel.innerHTML = wrapCard("制作配方", "等待选择", `<div class="notice notice--soft">请先选择准确条目。</div>`);
  dom.usagePanel.innerHTML = wrapCard("用途", "等待选择", `<div class="notice notice--soft">请先选择准确条目。</div>`);
  dom.priceTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">请先选择准确条目</td></tr>`;
}

staticModeInit();
