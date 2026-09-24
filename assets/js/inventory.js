/* =====================================================================
   Inventory — what the server used to do, done in the browser.

   The deployed catalogue filters, sorts and pages on the server: every panel
   ends in updateUrlAndReload(), which sets query parameters and reloads. The
   prototype has no server, so this file:

     - answers the two endpoints yacht_catalog.js fetches (locations and
       make/model suggestions) out of listings.js;
     - replaces updateUrlAndReload() with one that changes the URL and
       re-renders in place — the parameter names are the deployed page's own,
       so a link with ?vesselCondition=new&minLength=40 behaves the same here;
     - renders the grid, the count and the pagination, in the deployed page's
       markup, so the stylesheet needs no changes at all.

   Loaded BEFORE yacht_catalog.js: the fetch shim has to be in place before its
   DOMContentLoaded handler asks for the locations. Everything else waits for
   that handler to have run.
   ===================================================================== */
(function () {
  "use strict";

  var PER_PAGE = 12;
  var listings = window.JBY_LISTINGS || [];

  /* ---------- the two endpoints ---------- */
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  function asJson(obj) {
    return Promise.resolve(new Response(JSON.stringify(obj), {
      status: 200, headers: { "Content-Type": "application/json" }
    }));
  }
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.indexOf("/yachts/locations") === 0) {
      return asJson({ locations: window.JBY_LOCATIONS || [] });
    }
    if (url.indexOf("/yachts/make-model-suggestions") === 0) {
      var q = decodeURIComponent((url.split("q=")[1] || "")).toLowerCase().trim();
      var items = (window.JBY_SUGGESTIONS || []).filter(function (s) {
        return !q || s.label.toLowerCase().indexOf(q) >= 0;
      }).slice(0, 25);
      return asJson({ items: items });
    }
    return realFetch ? realFetch(input, init) : Promise.reject(new Error("no fetch"));
  };

  /* ---------- state, read from the URL the way the deployed page reads it ---------- */
  function params() { return new URLSearchParams(window.location.search); }
  function num(v) { var n = parseFloat(String(v || "").replace(/[^\d.]/g, "")); return isNaN(n) ? null : n; }
  function list(v) { return v ? v.split(",").filter(Boolean) : []; }

  function filtered() {
    var p = params();
    var condition = p.get("vesselCondition");
    var availability = p.get("availability");
    var minPrice = num(p.get("minPrice")), maxPrice = num(p.get("maxPrice"));
    var minLength = num(p.get("minLength")), maxLength = num(p.get("maxLength"));
    var city = p.get("locationCity"), country = p.get("locationCountry");
    /* Locations are a list now — "City|Country,City|Country" — and a vessel
       need only be in one of them. locationCity is the old single-place param,
       still honoured so an old link keeps working. */
    var places = list(p.get("locations"));
    var search = (p.get("search") || "").toLowerCase().trim();
    var makeIds = list(p.get("makeIds")), modelIds = list(p.get("modelIds"));

    return listings.filter(function (v) {
      if (condition && v.condition !== condition) return false;
      if (availability && v.availability !== availability) return false;
      /* Contact for Price has no number to compare; a price filter excludes it,
         as it does on the deployed page. */
      if ((minPrice !== null || maxPrice !== null)) {
        if (v.priceValue === null) return false;
        if (minPrice !== null && v.priceValue < minPrice) return false;
        if (maxPrice !== null && v.priceValue > maxPrice) return false;
      }
      if (minLength !== null && !(v.length >= minLength)) return false;
      if (maxLength !== null && !(v.length <= maxLength)) return false;
      if (places.length && places.indexOf(v.city + "|" + v.country) < 0) return false;
      if (city && v.city !== city) return false;
      if (country && v.country !== country) return false;
      /* Makes and ranges add up rather than override each other: All Models on
         Axopar and one Riva range means both, which is what ticking them says.
         The deployed page could not be asked this — it sent one list or the
         other — so this is ours. */
      if (makeIds.length || modelIds.length) {
        var byMake = makeIds.indexOf("make:" + v.make) >= 0;
        var byModel = modelIds.indexOf("model:" + v.make + "|" + family(v)) >= 0;
        if (!byMake && !byModel) return false;
      }
      if (search && (v.name + " " + v.location).toLowerCase().indexOf(search) < 0) return false;
      return true;
    });
  }

  function sorted(rows) {
    var p = params();
    var by = p.get("orderBy") || "Date Added";
    var dir = (p.get("order") || "DESC").toUpperCase() === "ASC" ? 1 : -1;
    var key = {
      "Price": function (v) { return v.priceValue === null ? -1 : v.priceValue; },
      "Year": function (v) { return v.year || 0; },
      "Length": function (v) { return v.length || 0; },
      "Date Added": function (v) { return v.added; }
    }[by] || function (v) { return v.added; };
    return rows.slice().sort(function (a, b) {
      var x = key(a), y = key(b);
      return x === y ? 0 : (x > y ? dir : -dir);
    });
  }

  /* ---------- the card, as the deployed page writes it ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function cardHTML(v) {
    /* The home page's listing card: photograph behind, the navy veil, the brand
       mark at the top, the panel with city, name and price, and the View button
       that widens on hover. An <a> rather than the home page's <article>,
       because here the card goes somewhere. */
    return '' +
      '<a class="vessel-card" href="' + esc(v.href) + '" target="_blank" rel="noopener">' +
        '<div class="v-img" style="background-image:url(\'' + esc(v.image) + '\')"></div>' +
        '<div class="v-img-veil"></div>' +
        (v.brand ? '<div class="brand"><img src="' + esc(v.brand) + '" alt="' + esc(v.brandAlt) + '" loading="lazy"/></div>' : '') +
        '<div class="info">' +
          '<div class="chip-loc">' + esc(v.location) + '</div>' +
          '<p class="name">' + esc(v.name) + '</p>' +
          '<p class="price">' + esc(v.price) + '</p>' +
        '</div>' +
        '<span class="v-cta" aria-hidden="true">' +
          '<span class="v-cta-text">View</span>' +
          '<span class="v-cta-icon"><i class="fas fa-chevron-right"></i></span>' +
        '</span>' +
      '</a>';
  }

  /* ---------- pagination, likewise ---------- */
  function pageHref(n) {
    var url = new URL(window.location.href);
    url.searchParams.set("page", n);
    return url.pathname + url.search;
  }

  function paginationHTML(page, pages) {
    if (pages <= 1) return "";
    var back = page > 1
      ? '<a href="' + pageHref(page - 1) + '" class="catalog-pagination-nav" data-page="' + (page - 1) + '">' +
        '<span class="catalog-pagination-chevron" aria-hidden="true">&lt;</span> BACK</a>'
      : '<span class="catalog-pagination-nav is-disabled" aria-disabled="true">' +
        '<span class="catalog-pagination-chevron" aria-hidden="true">&lt;</span> BACK</span>';
    var next = page < pages
      ? '<a href="' + pageHref(page + 1) + '" class="catalog-pagination-nav" data-page="' + (page + 1) + '">' +
        'NEXT <span class="catalog-pagination-chevron" aria-hidden="true">&gt;</span></a>'
      : '<span class="catalog-pagination-nav is-disabled" aria-disabled="true">' +
        'NEXT <span class="catalog-pagination-chevron" aria-hidden="true">&gt;</span></span>';

    var nums = "";
    for (var n = 1; n <= pages; n++) {
      nums += n === page
        ? '<span class="catalog-pagination-page is-active" aria-current="page">' + n + '</span>'
        : '<a href="' + pageHref(n) + '" class="catalog-pagination-page" data-page="' + n + '">' + n + '</a>';
    }

    return '<div class="catalog-pagination-back">' + back + '</div>' +
           '<div class="catalog-pagination-pages">' + nums + '</div>' +
           '<div class="catalog-pagination-next">' + next + '</div>';
  }

  /* ---------- sort button label ---------- */
  var SORT_LABELS = {
    "Price|DESC": "Price: High to Low", "Price|ASC": "Price: Low to High",
    "Year|DESC": "Year: Newest to Oldest", "Year|ASC": "Year: Oldest to Newest",
    "Date Added|ASC": "Date added: Ascending", "Date Added|DESC": "Recently Listed",
    "Length|DESC": "Length: Longest to Shortest", "Length|ASC": "Length: Shortest to Longest"
  };

  function syncSort() {
    var p = params();
    var key = (p.get("orderBy") || "Date Added") + "|" + (p.get("order") || "DESC").toUpperCase();
    var label = SORT_LABELS[key] || "Recently Listed";
    var strong = document.querySelector(".catalog-sort-text strong");
    if (strong) strong.textContent = label;
    document.querySelectorAll(".catalog-sort-option").forEach(function (a) {
      var u = new URL(a.getAttribute("href"), window.location.origin);
      var k = (u.searchParams.get("orderBy") || "") + "|" + (u.searchParams.get("order") || "");
      a.classList.toggle("is-active", k === key);
    });
  }

  /* ---------- render ---------- */
  /* ---- nothing matched ----
     A bare line of text in the first cell of a three-column grid read as a
     listing that had failed to draw. It spans the grid instead and sits on the
     page's centre line: the mark, the navy title, the line that says what to
     do, and the button that does it. clearAllFilters is the catalogue's own —
     the same one behind "Clear all filters" above the grid. */
  function emptyHTML() {
    return '' +
      '<div class="catalog-empty">' +
        /* A hull on an empty stretch of water. A magnifier with a boat inside
           it was two marks fighting over 64px and read as neither. */
        '<svg class="catalog-empty-mark" viewBox="0 0 64 64" fill="none" ' +
             'stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" ' +
             'stroke-linecap="round" aria-hidden="true">' +
          '<path d="M11 33h42l-6.6 11.4a4 4 0 0 1-3.5 2H21.1a4 4 0 0 1-3.5-2L11 33Z"/>' +
          '<path d="M24 32.5V22h12l6.5 10.5"/>' +
          '<path d="M8 54c4.5-3.6 9-3.6 13.5 0s9 3.6 13.5 0 9-3.6 13.5 0"/>' +
        '</svg>' +
        '<p class="catalog-empty-title">No vessels match these filters</p>' +
        '<p class="catalog-empty-note">Try widening the price or length range, or clear the filters to see the whole fleet.</p>' +
        '<button type="button" class="catalog-empty-btn" onclick="clearAllFilters()">Clear all filters</button>' +
      '</div>';
  }

  function render() {
    var rows = sorted(filtered());
    var pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    var page = Math.min(Math.max(parseInt(params().get("page"), 10) || 1, 1), pages);

    var grid = document.getElementById("catalogGrid");
    if (grid) {
      var slice = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
      grid.innerHTML = slice.length
        ? slice.map(cardHTML).join("")
        : emptyHTML();
    }

    var count = document.getElementById("catalogCount");
    if (count) count.textContent = rows.length;

    var nav = document.getElementById("catalogPagination");
    if (nav) nav.innerHTML = paginationHTML(page, pages);

    syncSort();
    /* The deployed page reloads, which redraws the pills and the panels from the
       URL; here the same job is done by the functions that already exist. */
    if (typeof window.updateAllActiveDisplays === "function") window.updateAllActiveDisplays();
    if (typeof window.syncLocationCheckboxesFromUrl === "function") window.syncLocationCheckboxesFromUrl();

    /* The deployed page keeps the typed query inside Make or Model and shows it
       as a pill on that button. The field stands on its own here, so the button
       speaks for makes and models only. */
    var mmValues = document.getElementById("makeModelActive");
    if (mmValues && !params().get("makeIds") && !params().get("modelIds")) {
      mmValues.innerHTML = "";
      var divider = document.getElementById("makeModelDivider");
      if (divider) divider.hidden = true;
      var trigger = document.getElementById("makeModelTrigger");
      if (trigger) trigger.classList.remove("has-values");
    }

    /* Availability's own pill and radio, since yacht_catalog.js does not know it */
    (function () {
      var value = params().get("availability") || "";
      var labels = { inStock: "In-Stock", comingSoon: "Coming Soon", toOrder: "To-Order" };
      var holder = document.getElementById("availabilityActive");
      var divider = document.getElementById("availabilityDivider");
      var trigger = holder && holder.closest(".filter-button");
      document.querySelectorAll('input[name="availabilityRadio"]').forEach(function (r) {
        r.checked = r.value === value;
      });
      if (!holder) return;
      holder.innerHTML = "";
      if (value && labels[value]) {
        var pill = document.createElement("span");
        pill.className = "filter-value-pill";
        pill.appendChild(document.createTextNode(labels[value]));
        var x = document.createElement("button");
        x.type = "button";
        x.className = "filter-value-pill-remove";
        x.setAttribute("aria-label", "Remove availability filter");
        x.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
        x.addEventListener("click", function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          setParams({ availability: "" });
        });
        pill.appendChild(x);
        holder.appendChild(pill);
        if (divider) divider.hidden = false;
        if (trigger) trigger.classList.add("has-values");
      } else {
        if (divider) divider.hidden = true;
        if (trigger) trigger.classList.remove("has-values");
      }
    })();

    /* every Apply says what it would leave behind, against the filters now in force */
    if (typeof refreshApplyLabels === "function") refreshApplyLabels();
  }

  /* ---------- the sort dropdown ----------
     Its onclick is in the markup, but the function lived in yacht_script.js, which
     is the site's general script and has no business here. Same behaviour: the
     panel takes .show, the button .is-open. */
  window.toggleSortDropdown = function () {
    var dd = document.getElementById("sortDropdown");
    var btn = document.querySelector(".catalog-sort-button");
    if (!dd) return;
    var open = dd.classList.toggle("show");
    if (btn) {
      btn.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
  };
  window.closeSortDropdown = function () {
    var dd = document.getElementById("sortDropdown");
    var btn = document.querySelector(".catalog-sort-button");
    if (dd) dd.classList.remove("show");
    if (btn) { btn.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); }
  };
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest("#sortContainer")) window.closeSortDropdown();
  });

  /* =====================================================================
     Make or Model — the two-column menu

     Brands down the left, that brand's ranges on the right, both of them
     tickable and both multiple. Hovering a brand only changes what the right
     column shows; ticking is what filters.

     The ranges are read off the listings' own names, with the leading size
     taken out: "29 XC Cross Cabin" and "38 XC Cross Cabin" are one range, XC
     Cross Cabin. That is a guess at what the client means by a model, and it is
     only as tidy as the names are — Sirena's listings are named "Sirena Yachts
     118", which reads as a range called Yachts. A list of the real ranges, per
     brand, would replace this function and nothing else.
     ===================================================================== */
  function family(v) {
    var m = String(v.model || "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
    var words = m.split(" ").filter(function (w) { return !/^\d+('|ft)?$/.test(w); });
    return words.join(" ") || m || v.model;
  }

  function makesIndex() {
    var out = {}, order = [];
    listings.forEach(function (v) {
      if (!out[v.make]) { out[v.make] = { name: v.make, count: 0, fams: {}, order: [] }; order.push(v.make); }
      var e = out[v.make];
      e.count++;
      var f = family(v);
      if (!e.fams[f]) { e.fams[f] = 0; e.order.push(f); }
      e.fams[f]++;
    });
    order.sort(function (a, b) { return out[b].count - out[a].count || a.localeCompare(b); });
    return order.map(function (k) {
      out[k].order.sort(function (a, b) { return out[k].fams[b] - out[k].fams[a] || a.localeCompare(b); });
      return out[k];
    });
  }

  /* what the panel has ticked, before Apply */
  var mmPending = { makes: [], models: [] };

  /* A make is a way into its ranges, not a tick of its own: ticking Axopar on
     the left while its ranges sat unticked on the right read as a contradiction.
     The choosing happens in the right column, where All Models stands for the
     whole make. The dot marks a make that has something chosen inside it, so it
     is visible while another make's ranges are on screen. */
  function mmRenderMakes(active) {
    var wrap = document.getElementById("mmMakes");
    if (!wrap) return;
    var idx = makesIndex();
    wrap.innerHTML = idx.map(function (m) {
      var chosen = mmPending.makes.indexOf(m.name) >= 0 ||
        mmPending.models.some(function (id) { return id.indexOf(m.name + "|") === 0; });
      return '<button type="button" class="mm-make' + (m.name === active ? " is-active" : "") +
               (chosen ? " is-chosen" : "") + '" data-make="' + esc(m.name) + '">' +
               '<span class="mm-label">' + esc(m.name) + '</span>' +
               '<span class="mm-n">' + m.count + '</span>' +
               '<span class="mm-chev" aria-hidden="true"></span>' +
             '</button>';
    }).join("");
  }

  function mmRenderModels(make) {
    var wrap = document.getElementById("mmModels");
    if (!wrap) return;
    var m = makesIndex().filter(function (x) { return x.name === make; })[0];
    if (!m) { wrap.innerHTML = '<p class="mm-hint">Hover a make to see its ranges.</p>'; return; }
    /* nothing else: the head, the way back, and the rows follow */
    var all = mmPending.makes.indexOf(m.name) >= 0;
    wrap.innerHTML = '<p class="mm-models-head">' + esc(m.name) + '</p>' +
      '<label class="mm-model mm-all">' +
        '<input type="checkbox" name="mmMake" value="' + esc(m.name) + '"' + (all ? " checked" : "") + '>' +
        '<span class="mm-box" aria-hidden="true"></span>' +
        '<span class="mm-label">All Models</span>' +
        '<span class="mm-n">' + m.count + '</span>' +
      '</label>' +
      m.order.map(function (f) {
        var id = m.name + "|" + f;
        /* with the whole make chosen the ranges are all in it, and say so */
        var on = all || mmPending.models.indexOf(id) >= 0;
        return '<label class="mm-model' + (all ? " is-implied" : "") + '">' +
                 '<input type="checkbox" name="mmModel" value="' + esc(id) + '"' +
                   (on ? " checked" : "") + (all ? " disabled" : "") + '>' +
                 '<span class="mm-box" aria-hidden="true"></span>' +
                 '<span class="mm-label">' + esc(f) + '</span>' +
                 '<span class="mm-n">' + m.fams[f] + '</span>' +
               '</label>';
      }).join("");
  }

  function mmReadPending() {
    /* The make's box lives in the right column now, as All Models, and only the
       make on screen is there — the others keep what they had. */
    var shown = [].map.call(document.querySelectorAll('input[name="mmMake"]'), function (i) { return i.value; });
    var onNow = [].map.call(document.querySelectorAll('input[name="mmMake"]:checked'), function (i) { return i.value; });
    mmPending.makes = mmPending.makes.filter(function (m) { return shown.indexOf(m) < 0; }).concat(onNow);
    var shownModels = [].map.call(document.querySelectorAll('input[name="mmModel"]'), function (i) { return i.value; });
    var modelsNow = [].map.call(document.querySelectorAll('input[name="mmModel"]:checked:not(:disabled)'), function (i) { return i.value; });
    mmPending.models = mmPending.models.filter(function (m) { return shownModels.indexOf(m) < 0; }).concat(modelsNow);
  }

  function mmSyncFromUrl() {
    var p = params();
    mmPending.makes = list(p.get("makeIds")).map(function (s) { return s.replace(/^make:/, ""); });
    mmPending.models = list(p.get("modelIds")).map(function (s) { return s.replace(/^model:/, ""); });
  }

  /* =====================================================================
     "Show N results" — every panel's Apply says what it would leave on the page

     The count is the filter the panel is holding, not the one in the URL, so it
     answers while the ticking is going on. previewCount takes the same shape
     the URL does, with whatever the open panel has instead.
     ===================================================================== */
  function previewCount(over) {
    var p = params();
    var q = {
      vesselCondition: over.vesselCondition !== undefined ? over.vesselCondition : p.get("vesselCondition"),
      availability: over.availability !== undefined ? over.availability : p.get("availability"),
      minPrice: over.minPrice !== undefined ? over.minPrice : p.get("minPrice"),
      maxPrice: over.maxPrice !== undefined ? over.maxPrice : p.get("maxPrice"),
      minLength: over.minLength !== undefined ? over.minLength : p.get("minLength"),
      maxLength: over.maxLength !== undefined ? over.maxLength : p.get("maxLength"),
      locationCity: over.locationCity !== undefined ? over.locationCity : p.get("locationCity"),
      locations: over.locations !== undefined ? over.locations : p.get("locations"),
      makeIds: over.makeIds !== undefined ? over.makeIds : p.get("makeIds"),
      modelIds: over.modelIds !== undefined ? over.modelIds : p.get("modelIds"),
      search: over.search !== undefined ? over.search : p.get("search")
    };
    var minPrice = num(q.minPrice), maxPrice = num(q.maxPrice);
    var minLength = num(q.minLength), maxLength = num(q.maxLength);
    var makeIds = list(q.makeIds), modelIds = list(q.modelIds);
    var places = list(q.locations);
    var search = (q.search || "").toLowerCase().trim();
    return listings.filter(function (v) {
      if (q.vesselCondition && v.condition !== q.vesselCondition) return false;
      if (q.availability && v.availability !== q.availability) return false;
      if (minPrice !== null || maxPrice !== null) {
        if (v.priceValue === null) return false;
        if (minPrice !== null && v.priceValue < minPrice) return false;
        if (maxPrice !== null && v.priceValue > maxPrice) return false;
      }
      if (minLength !== null && !(v.length >= minLength)) return false;
      if (maxLength !== null && !(v.length <= maxLength)) return false;
      if (places.length && places.indexOf(v.city + "|" + v.country) < 0) return false;
      if (q.locationCity && v.city !== q.locationCity) return false;
      /* Makes and ranges add up rather than override each other: All Models on
         Axopar and one Riva range means both, which is what ticking them says.
         The deployed page could not be asked this — it sent one list or the
         other — so this is ours. */
      if (makeIds.length || modelIds.length) {
        var byMake = makeIds.indexOf("make:" + v.make) >= 0;
        var byModel = modelIds.indexOf("model:" + v.make + "|" + family(v)) >= 0;
        if (!byMake && !byModel) return false;
      }
      if (search && (v.name + " " + v.location).toLowerCase().indexOf(search) < 0) return false;
      return true;
    }).length;
  }

  function setApplyLabel(panel, n) {
    var btn = panel && panel.querySelector(".condition-filter-btn-apply");
    if (btn) btn.textContent = "Show " + n + " result" + (n === 1 ? "" : "s");
  }

  /* what each panel is holding at this moment */
  function pendingOf(panel) {
    if (!panel) return {};
    if (panel.id === "conditionFilter") {
      var r = panel.querySelector('input[name="conditionRadio"]:checked');
      return { vesselCondition: r ? r.value : "" };
    }
    if (panel.id === "availabilityFilter") {
      var a = panel.querySelector('input[name="availabilityRadio"]:checked');
      return { availability: a ? a.value : "" };
    }
    if (panel.id === "priceFilter") {
      return sliderRange("priceSlider", "minPrice", "maxPrice");
    }
    if (panel.id === "lengthFilter") {
      return sliderRange("lengthSlider", "minLength", "maxLength");
    }
    if (panel.id === "locationFilter") {
      var ticked = [].map.call(
        panel.querySelectorAll('input[name="locationCheckbox"]:checked:not([data-all="true"])'),
        function (i) { return i.value; }
      );
      return { locations: ticked.join(","), locationCity: "" };
    }
    if (panel.id === "makeModelFilter") {
      mmReadPending();
      return {
        makeIds: mmPending.makes.map(function (m) { return "make:" + m; }).join(","),
        modelIds: mmPending.models.map(function (m) { return "model:" + m; }).join(",")
      };
    }
    return {};
  }

  /* The panel's two fields read $1K and $18.3M+, which is a label rather than a
     number; the slider beside them holds the real ones. At either extreme the
     filter is off, which is how the deployed page treats it too. */
  function sliderRange(sliderId, minKey, maxKey) {
    var out = {};
    var el = document.getElementById(sliderId);
    if (!el || !el.noUiSlider) return out;
    var v = el.noUiSlider.get();
    var lo = parseFloat(v[0]), hi = parseFloat(v[1]);
    var range = el.noUiSlider.options.range || {};
    var floor = Array.isArray(range.min) ? range.min[0] : range.min;
    var ceil = Array.isArray(range.max) ? range.max[0] : range.max;
    out[minKey] = (floor !== undefined && lo <= floor) ? "" : String(Math.round(lo));
    out[maxKey] = (ceil !== undefined && hi >= ceil) ? "" : String(Math.round(hi));
    return out;
  }

  function refreshApplyLabels() {
    ["conditionFilter", "availabilityFilter", "priceFilter", "lengthFilter", "locationFilter", "makeModelFilter"].forEach(function (id) {
      var panel = document.getElementById(id);
      if (panel) setApplyLabel(panel, previewCount(pendingOf(panel)));
    });
  }

  /* ---------- the search field, which is its own control now ---------- */
  window.applyCatalogSearch = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    var input = document.getElementById("catalogSearchInput");
    /* The field stands beside the filters rather than inside them, so it narrows
       what they leave rather than replacing it. */
    setParams({ search: input ? input.value.trim() : "" });
    return false;
  };

  /* ---------- what the panels call ---------- */
  function setParams(set, del) {
    var url = new URL(window.location.href);
    (del || []).forEach(function (k) { url.searchParams.delete(k); });
    Object.keys(set || {}).forEach(function (k) {
      var v = set[k];
      if (v === null || v === undefined || v === "") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    });
    url.searchParams.set("page", "1");
    window.history.pushState({}, "", url.pathname + url.search);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function takeOver() {
    window.updateUrlAndReload = setParams;

    /* Sort and pagination are ordinary links on the deployed page. */
    document.addEventListener("click", function (e) {
      var sort = e.target.closest && e.target.closest(".catalog-sort-option");
      if (sort) {
        e.preventDefault();
        var u = new URL(sort.getAttribute("href"), window.location.origin);
        setParams({ orderBy: u.searchParams.get("orderBy"), order: u.searchParams.get("order") });
        if (typeof window.closeSortDropdown === "function") window.closeSortDropdown();
        var dd = document.getElementById("sortDropdown");
        if (dd) dd.classList.remove("is-open", "show", "open");
        return;
      }
      var pg = e.target.closest && e.target.closest("[data-page]");
      if (pg) {
        e.preventDefault();
        var url = new URL(window.location.href);
        url.searchParams.set("page", pg.dataset.page);
        window.history.pushState({}, "", url.pathname + url.search);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    /* ---- Make or Model: the panel's own behaviour, in place of the type-ahead
            yacht_catalog.js binds. Defined here rather than at the top of this
            file because that script loads after it and would take the names
            back. ---- */
    window.applyMakeModelFilter = function () {
      mmReadPending();
      setParams({
        makeIds: mmPending.makes.map(function (m) { return "make:" + m; }).join(","),
        modelIds: mmPending.models.map(function (m) { return "model:" + m; }).join(",")
      }, ["search"]);
      if (typeof window.closeAllFilterDropdowns === "function") window.closeAllFilterDropdowns();
    };
    window.clearMakeModelFilterPanel = function () {
      mmPending = { makes: [], models: [] };
      mmRenderMakes(mmActive);
      mmRenderModels(mmActive);
      refreshApplyLabels();
    };

    var mmActive = null;
    mmSyncFromUrl();
    mmRenderMakes(null);
    mmRenderModels(null);

    var mmWrap = document.getElementById("makeModelFilter");

    /* Both columns are on screen at once on the desktop, so choosing a make is
       just a matter of which ranges the right one shows. In the phone's sheet
       the two are stacked and the ranges land a screen and a half below the
       fold: tapping a make looked like it did nothing at all. The sheet goes
       one level in instead — .mm-drilled hides the makes, the ranges take the
       sheet, and the row's own chevron finally means what it looks like. */
    function mmShow(make) {
      mmActive = make;
      mmRenderMakes(make);
      mmRenderModels(make);
      if (mmWrap) {
        mmWrap.classList.toggle("mm-drilled", !!make);
        mmWrap.scrollTop = 0;
        /* the title bar carries the way back and says where back is from */
        var title = document.getElementById("mmTitle");
        if (title) title.textContent = make || "Make or Model";
      }
    }

    if (mmWrap) {
      /* Hovering a make only changes what the right column shows — and only
         where there are two columns. In the sheet a make is a step, taken by
         tapping; a cursor that happens to be resting where the list comes
         back after Back would otherwise take that step again by itself. */
      mmWrap.addEventListener("mouseover", function (e) {
        if (window.matchMedia("(max-width:760px)").matches) return;
        var row = e.target.closest && e.target.closest(".mm-make");
        if (!row || row.dataset.make === mmActive) return;
        mmShow(row.dataset.make);
      });
      /* a tap does the same thing on a phone, where there is no hover */
      mmWrap.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest(".mm-back")) { mmShow(null); return; }
        var row = e.target.closest && e.target.closest(".mm-make");
        if (row && !e.target.closest("input")) {
          if (row.dataset.make !== mmActive) mmShow(row.dataset.make);
        }
      });
      mmWrap.addEventListener("change", function (e) {
        mmReadPending();
        /* All Models carries the ranges with it, so the column is redrawn */
        if (e.target && e.target.name === "mmMake") mmRenderModels(mmActive);
        mmRenderMakes(mmActive);
        refreshApplyLabels();
      });
    }

    /* every panel's Apply carries the count it would leave behind */
    ["conditionFilter", "availabilityFilter", "priceFilter", "lengthFilter", "locationFilter"].forEach(function (id) {
      var panel = document.getElementById(id);
      if (panel) panel.addEventListener("change", refreshApplyLabels);
      if (panel) panel.addEventListener("input", refreshApplyLabels);
    });
    /* the two sliders move without firing either, so ask again while one is dragged */
    ["lengthSlider", "priceSlider"].forEach(function (id) {
      var s = document.getElementById(id);
      if (s && s.noUiSlider) s.noUiSlider.on("update", refreshApplyLabels);
    });

    /* The field is the FAQ page's, and that one filters as you type rather than
       waiting for a submit; the same here, with a breath between keystrokes so
       the grid is not redrawn on every letter.

       Under it, the vessels the query names — the site's search overlay drops a
       list the same way. A row goes to that listing; the last one hands the
       query to the grid. */
    var searchInput = document.getElementById("catalogSearchInput");
    var drop = document.getElementById("catalogSuggest");

    function suggestions(q) {
      q = q.toLowerCase().trim();
      if (!q) return [];
      return listings.filter(function (v) {
        return (v.name + " " + v.location).toLowerCase().indexOf(q) >= 0;
      });
    }

    function drawSuggest() {
      if (!drop || !searchInput) return;
      var q = searchInput.value;
      var hits = suggestions(q);
      if (!q.trim() || !hits.length) {
        drop.innerHTML = q.trim()
          ? '<p class="cs-empty">Nothing matches &ldquo;' + esc(q.trim()) + '&rdquo;.</p>'
          : "";
        drop.hidden = !q.trim();
        return;
      }
      drop.innerHTML = hits.slice(0, 6).map(function (v) {
        return '<a class="cs-row" href="' + esc(v.href) + '" target="_blank" rel="noopener">' +
                 '<span class="cs-name">' + esc(v.name) + '</span>' +
                 '<span class="cs-meta">' + esc(v.location) + '</span>' +
               '</a>';
      }).join("") +
      '<button type="button" class="cs-all" data-search-all>Show all ' + hits.length +
        ' result' + (hits.length === 1 ? "" : "s") + '</button>';
      drop.hidden = false;
    }

    function closeSuggest() { if (drop) { drop.hidden = true; } }

    if (searchInput) {
      searchInput.value = params().get("search") || "";
      var typing = null;
      searchInput.addEventListener("input", function () {
        drawSuggest();
        clearTimeout(typing);
        typing = setTimeout(function () { window.applyCatalogSearch(); }, 250);
      });
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); clearTimeout(typing); closeSuggest(); window.applyCatalogSearch(); }
        if (e.key === "Escape") closeSuggest();
      });
      searchInput.addEventListener("focus", drawSuggest);
      document.addEventListener("click", function (e) {
        if (!e.target.closest || !e.target.closest(".catalog-search")) closeSuggest();
      });
      if (drop) {
        drop.addEventListener("click", function (e) {
          if (e.target.closest("[data-search-all]")) {
            clearTimeout(typing);
            closeSuggest();
            window.applyCatalogSearch();
          }
        });
      }
      /* the native clear (the X) fires input with an empty value, which the
         handler above already answers */
    }

    /* Availability is ours — the deployed page has no such filter, so nothing in
       yacht_catalog.js knows these three names. */
    var AVAIL_LABEL = { inStock: "In-Stock", comingSoon: "Coming Soon", toOrder: "To-Order" };
    window.applyAvailabilityFilter = function () {
      var r = document.querySelector('input[name="availabilityRadio"]:checked');
      setParams({ availability: r ? r.value : "" });
      if (typeof window.closeAllFilterDropdowns === "function") window.closeAllFilterDropdowns();
    };
    window.clearAvailabilityFilter = function () {
      var all = document.querySelector('input[name="availabilityRadio"][value=""]');
      if (all) all.checked = true;
      setParams({ availability: "" });
    };
    window.closeAvailabilityFilter = function () {
      if (typeof window.closeAllFilterDropdowns === "function") window.closeAllFilterDropdowns();
    };

    /* The deployed clearAllFilters() names the parameters it knows; availability
       is not among them, so it is added on top of whatever that does. */
    var theirClearAll = window.clearAllFilters;
    window.clearAllFilters = function () {
      var url = new URL(window.location.href);
      url.searchParams.delete("availability");
      window.history.replaceState({}, "", url.pathname + url.search);
      if (typeof theirClearAll === "function") theirClearAll();
      else setParams({}, ["availability"]);
    };

    window.addEventListener("popstate", render);
    render();
    refreshApplyLabels();
  }

  /* yacht_catalog.js sets its panels up on DOMContentLoaded; this runs after it. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(takeOver, 0); });
  } else {
    setTimeout(takeOver, 0);
  }
})();
