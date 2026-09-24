Inventory (Yachts For Sale)
===========================

The catalogue as https://jb.apdstack.com/yachts serves it, rebuilt as a page this
repository can edit. The markup, the stylesheets and the class names are the
deployed page's own, so anything changed here can go back there as a diff.

What is in here
---------------
index.html                     the deployed page, with the server-only parts taken out
assets/css/*.css               the deployed stylesheets, unchanged
assets/css/jby-chrome.css      the prototype's chrome: blue header, band, blue footer
assets/css/vessel-card.css     the home page's listing card
assets/js/yacht_catalog.js     the deployed filter panels, unchanged
assets/js/inventory.js         what the server used to do — filtering, sorting, paging
assets/js/listings.js          the 65 listings, harvested 2026-09-24
assets/js/band.js              the band's drift, from tools/site-blocks
assets/fonts, assets/img       the five fonts the CSS asks for, the brand marks, the logo

The chrome is the prototype's, not the deployed page's
------------------------------------------------------
Four things were brought into line with the rest of this repository:

  header   the locations page's .nav, blue from the first frame. The deployed
           header-v2 and the mega menu that hung off it are gone; the CTA keeps
           data-open-expert, so it still opens the contact modal.
  cards    the home page's .vessel-card — photograph, navy veil, brand mark, the
           panel with city, name and price, the View button that widens on hover.
           The catalogue's own card and its hover video are no longer used.
  band     tools/site-blocks/band.html, the photograph band, keeping this page's
           own words: Get Expert Guidance.
  footer   tools/site-blocks/footer.html, the blue one.

jby-system.css — the repository's shared system — is carried here too, and is
what gives the View button and the header buttons their fill.

jby-chrome.css and vessel-card.css are copies of those sources, loaded after the
deployed stylesheets. Re-copy rather than edit, so the two cannot drift.

Two things to know when a rule of yours does not take:

  - the deployed stylesheet writes its rules as `#jb_body .price`, an id, so a
    plain class selector loses to it whatever the order. vessel-card.css carries
    #jb_body on every selector for that reason; match the shape of the rule you
    are fighting, not just its length.
  - fonts.css defines the deployed names (Mesmerize-ex-lt, Myriad-Pro-Regular)
    and, at the end, the names the rest of this repository uses ('Mesmerize',
    'Myriad Pro') over the same files. Without the second set the band, the
    footer and the card fall back to the system sans.

How it works
------------
The deployed page filters on the server: every panel ends in updateUrlAndReload(),
which sets query parameters and reloads. inventory.js replaces that function with
one that changes the URL and re-renders in place, and answers the two endpoints
yacht_catalog.js fetches (locations, make/model suggestions) out of listings.js.
The parameter names are the deployed page's own, so ?vesselCondition=new&minLength=40
means here what it means there.

Photographs and card videos are still served from files.yachtway.com, as they are
on the deployed page. Nothing else leaves this folder.

What is deliberately not here
-----------------------------
- the Crisp chat widget
- jby-search.js and jby-intro.js: the header's search overlay and the opening
  curtain, both of which want the site around them. The search icon is inert.
- a listing page: a card opens the deployed listing in a new tab.

Refreshing the listings
-----------------------
    cd tools
    python3 harvest.py       # reads the deployed catalogue -> listings.json
    python3 make_data.py     # listings.json -> assets/js/listings.js
    python3 build_index.py   # the deployed page -> index.html

build_index.py reads yachts.html beside it, which harvest.py leaves there. Bump the
?v= on listings.js and inventory.js in build_index.py when either changes, or a
browser will hold the old copy.
