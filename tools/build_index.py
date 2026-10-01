#!/usr/bin/env python3
"""Turn the deployed /yachts page into the prototype's Inventory page.

The markup, the stylesheets and the two bits of behaviour that are not tied to a
server (the header's drill-down and the card's hover video) are the page's own.
What the server used to do — filtering, sorting, paging — is done in the browser
here, over the 65 listings harvested into assets/js/listings.js.
"""
import io, re, os

SRC = "yachts.html"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "index.html")
SITE = "https://jb.apdstack.com"

t = io.open(SRC, encoding="utf-8").read()

# 1. the chat widget has no business in a prototype
t = re.sub(r'<script type="text/javascript">window\.\$crisp.*?</script>\s*', "", t, flags=re.S)

# 2. the scripts that talk to the server go; the two that do not, stay
for js in ("jby-search.js", "jby-intro.js", "yacht_script.js"):
    t = re.sub(r'\s*<script src="[^"]*%s"></script>' % re.escape(js), "", t)
t = re.sub(r'\s*<link rel="stylesheet" href="[^"]*jby-intro\.css">', "", t)
t = re.sub(r'\s*<link rel="stylesheet" href="[^"]*jby-leaflet-map\.css">', "", t)

# 2b. the intro curtain paints the page navy until jby-intro.js lifts it, and that
#     script is one of the ones that went — so the curtain goes with it
i = t.find("<style>\n  html.jby-intro-lock")
if i >= 0:
    j = t.index("</script>", t.index("jby-intro-lock", i + 40)) + len("</script>")
    t = t[:i] + t[j:]

# 3. every asset is local now, and this page's own stylesheets carry a version:
#    a browser that has held fonts.css since the first build would keep serving
#    it without the faces added later

t = t.replace(SITE + "/assets/", "assets/")
t = t.replace('href="/assets/', 'href="assets/').replace('src="/assets/', 'src="assets/')
for sheet in ("fonts.css", "yacht_catalog.css", "custom_yacht_style.css"):
    t = t.replace('href="assets/css/%s"' % sheet, 'href="assets/css/%s?v=46"' % sheet)

# 4. the page's own links still point at the deployed site, which is where they go
t = re.sub(r'href="/(?!/)(?!assets)', 'href="%s/' % SITE, t)
t = t.replace('href="%s/"' % SITE, 'href="%s/"' % SITE)

# 5. the grid and the pagination are filled in by the browser
gi = t.index('<div class="yacht-catalog-v2__grid">')
pi = t.index('<nav class="catalog-pagination"')
t = t[:gi] + '<div class="yacht-catalog-v2__grid" id="catalogGrid"></div>\n\n                ' + t[pi:]
pi = t.index('<nav class="catalog-pagination"')
pe = t.index('</nav>', pi) + len('</nav>')
t = t[:pi] + '<nav class="catalog-pagination" id="catalogPagination" aria-label="Pagination"></nav>' + t[pe:]

# 8. the prototype's chrome in place of the deployed page's
#    -------------------------------------------------------------------------
#    header: the locations page's .nav, blue from the first frame. The CTA keeps
#    data-open-expert so it still opens the contact modal that ships with the page.
NAV = """<nav class="nav" id="site-nav" aria-label="Primary">
  <div class="left"><button class="burger" aria-label="Menu"><span></span><span></span><span></span></button></div>
  <a class="logo" href="index.html" aria-label="Jeff Brown Yachts, Inventory"><img src="assets/img/jby-home-v2/jby_logo.svg" alt="Jeff Brown Yachts"/></a>
  <div class="right">
    <button class="icon" aria-label="Search"><svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="9" cy="9" r="6.25" stroke="currentColor" stroke-width="1.3"/><line x1="13.6" y1="13.6" x2="17.5" y2="17.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>
    <a class="cta magnetic" href="#" data-open-expert role="button">Contact an expert</a>
  </div>
</nav>"""
hi = t.index('<header class="header-v2')
he = t.index("</header>", hi) + len("</header>")
#    the mega menu that hung off that header goes with it: its stylesheet is gone,
#    and without one it is 2000px of menu standing in the page
mi = re.search(r'<div[^>]*id="headerV2Mega"[^>]*>', t[he:]).start() + he
depth, me = 0, mi
for m in re.finditer(r"<div\b[^>]*>|</div>", t[mi:]):
    depth += 1 if m.group(0).startswith("<div") else -1
    if depth == 0:
        me = mi + m.end()
        break
t = t[:hi] + NAV + t[me:]
for f in ("header-v2-mega-menu.css",):
    t = re.sub(r'\s*<link rel="stylesheet" href="[^"]*%s">' % re.escape(f), "", t)
t = re.sub(r'\s*<script src="[^"]*header-v2-drilldown\.js"></script>', "", t)

#    band + footer: tools/site-blocks, the block every other page carries. The
#    band keeps this page's own words.
BLOCKS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "tools", "site-blocks")
band = (io.open(os.path.join(BLOCKS, "band.html"), encoding="utf-8").read().rstrip("\n")
        .replace("{ASSETS}", "./assets/img")
        .replace("{TITLE}", "Get Expert Guidance")
        .replace("{LEAD}", "Tell us what the water means to you. We&#039;ll take it from there.")
        .replace("{CTA}", "Book a Consultation"))
footer = (io.open(os.path.join(BLOCKS, "footer.html"), encoding="utf-8").read().rstrip("\n")
          .replace("{LOGO}", "assets/img/jby-home-v2/jby_logo.svg"))
fi = t.index('<footer class="site-foot')
fe = t.index("</footer>", fi) + len("</footer>")
t = t[:fi] + band + "\n\n" + footer + t[fe:]

#    the stylesheets for all of it, last so they outrank the deployed ones

# 5b. Make or Model becomes a two-column menu — brands on the left, that brand's
#     ranges on the right — and the typed search leaves it for a field of its own,
#     to the right of the filter row. inventory.js fills both.
MM_PANEL = """<div id="makeModelFilter" class="filter-dropdown make-model-filter-panel hidden">
            <div class="condition-filter-header">
                <button type="button" class="mm-back" aria-label="Back to all makes">
                    <span class="mm-back-chev" aria-hidden="true"></span>
                </button>
                <span class="condition-filter-title" id="mmTitle">Make or Model</span>
                <button type="button" class="condition-filter-close" onclick="toggleFilterDropdown('makeModelFilter')" aria-label="Close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            <div class="mm-browse">
                <div class="mm-makes" id="mmMakes" role="listbox" aria-label="Makes"></div>
                <div class="mm-models" id="mmModels" aria-live="polite"></div>
            </div>
            <div class="condition-filter-footer make-model-filter-footer">
                <button type="button" class="condition-filter-btn-clear" onclick="clearMakeModelFilterPanel()">Clear</button>
                <button type="button" class="condition-filter-btn-apply" onclick="applyMakeModelFilter()">Show results</button>
            </div>
        </div>"""
mi = t.index('<div id="makeModelFilter"')
me = t.index('</div>\n    </div>\n\n    \n        <div class="filter-group relative">', mi)
t = t[:mi] + MM_PANEL + t[me + len("</div>"):]

SEARCH = """<div class="faq-search catalog-search">
                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="9" cy="9" r="6.25" stroke="currentColor" stroke-width="1.3"/><line x1="13.6" y1="13.6" x2="17.5" y2="17.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                    <input id="catalogSearchInput" type="search" placeholder="Search the listings" autocomplete="off" aria-label="Search the listings"/>
                    <div class="catalog-suggest" id="catalogSuggest" role="listbox" aria-label="Matching vessels" hidden></div>
                </div>"""
# 5d. the sort panel is a sheet on a phone, and a sheet is closed by its own ✕
SORT_HEAD = '''<div class="catalog-sort-dropdown-header">
            <span>Sort by:</span>
            <button type="button" class="catalog-sort-close" onclick="closeSortDropdown()" aria-label="Close">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        </div>'''
assert t.count('<div class="catalog-sort-dropdown-header">Sort by:</div>') == 1
t = t.replace('<div class="catalog-sort-dropdown-header">Sort by:</div>', SORT_HEAD, 1)

CLEAR_ALL = '<button type="button" id="clearAllFiltersBtn" class="filter-clear-all" hidden onclick="clearAllFilters()">Clear all filters</button>'
assert t.count(CLEAR_ALL) == 1
t = t.replace(CLEAR_ALL, CLEAR_ALL + "\n                " + SEARCH)

# 5c. Availability — the sixth filter the brief asks for, between Location and the
#     search field, built on the Condition panel's own markup so it inherits every
#     rule that panel has.
AVAIL = """<div class="filter-group relative">
        <button type="button" class="filter-button" onclick="toggleFilterDropdown('availabilityFilter')" aria-expanded="false" aria-controls="availabilityFilter">
            <span class="filter-button-label">Availability</span>
            <span class="filter-button-divider" id="availabilityDivider" hidden></span>
            <span id="availabilityActive" class="filter-button-values"></span>
            <i class="fas fa-chevron-down filter-chevron" aria-hidden="true"></i>
        </button>
        <div id="availabilityFilter" class="filter-dropdown condition-filter-panel hidden">
            <div class="condition-filter-header">
                <span class="condition-filter-title">Availability</span>
                <button type="button" class="condition-filter-close" onclick="closeAvailabilityFilter()" aria-label="Close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            <div class="condition-filter-options">
                <label class="condition-filter-option">
                    <input type="radio" name="availabilityRadio" value="" checked>
                    <span class="condition-filter-radio"></span>
                    <span class="condition-filter-label">All vessels</span>
                </label>
                <label class="condition-filter-option">
                    <input type="radio" name="availabilityRadio" value="inStock">
                    <span class="condition-filter-radio"></span>
                    <span class="condition-filter-label">In-Stock</span>
                </label>
                <label class="condition-filter-option">
                    <input type="radio" name="availabilityRadio" value="comingSoon">
                    <span class="condition-filter-radio"></span>
                    <span class="condition-filter-label">Coming Soon</span>
                </label>
                <label class="condition-filter-option">
                    <input type="radio" name="availabilityRadio" value="toOrder">
                    <span class="condition-filter-radio"></span>
                    <span class="condition-filter-label">To-Order</span>
                </label>
            </div>
            <div class="condition-filter-footer">
                <button type="button" class="condition-filter-btn-clear" onclick="clearAvailabilityFilter()">Clear</button>
                <button type="button" class="condition-filter-btn-apply" onclick="applyAvailabilityFilter()">Show results</button>
            </div>
        </div>
    </div>"""
t = t.replace(CLEAR_ALL, AVAIL + "\n                " + CLEAR_ALL, 1)

# 6. the count is the filtered count
t = re.sub(r'(<p class="catalog-results-count">\s*All vessels:\s*)<strong>\d+</strong>',
           r'\1<strong id="catalogCount">65</strong>', t)

# 7. the data and the behaviour, ahead of the catalogue's own script: the fetch
#    shim has to exist before its DOMContentLoaded handler asks for the locations
CAT = '<script src="assets/js/yacht_catalog.js"></script>'
assert t.count(CAT) == 1
t = t.replace(CAT,
              '<link rel="stylesheet" href="./jby-system.css?v=46">\n'
              '<link rel="stylesheet" href="assets/css/jby-chrome.css?v=46">\n'
              '<link rel="stylesheet" href="assets/css/vessel-card.css?v=46">\n'
              '<link rel="stylesheet" href="assets/css/filter-sheet.css?v=46">\n'
              '<script src="assets/js/band.js"></script>\n'
              '<script src="assets/js/listings.js?v=46"></script>\n'
              '<script src="assets/js/inventory.js?v=46"></script>\n'
              + CAT.replace('.js"', '.js?v=46"'))

io.open(OUT, "w", encoding="utf-8").write(t)
print("wrote", OUT, len(t), "bytes")
