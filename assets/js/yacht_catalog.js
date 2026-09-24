/**
 * Yacht Catalog Module
 * Organized for easy maintenance and adding new filters
 */

// ============================================
// 1. UTILITIES
// ============================================

// Format price with K/M suffix
function formatPrice(price) {
    if (price >= 1000000) return '$' + (price / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (price >= 1000) return '$' + (price / 1000).toFixed(0) + 'K';
    return '$' + price;
}

// Format number with K/M suffix (without dollar sign)
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num;
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Get URL parameters
function getUrlParams() {
    return new URLSearchParams(window.location.search);
}

// Update URL and reload page
function updateUrlAndReload(paramsToSet, paramsToDelete = []) {
    const url = new URL(window.location.href);
    paramsToDelete.forEach(param => url.searchParams.delete(param));
    Object.entries(paramsToSet).forEach(([key, value]) => {
        if (value !== null && value !== undefined) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
    });
    url.searchParams.set('page', '1');
    window.location.href = url.toString();
}

// Check if value equals default
function isDefault(value, defaultValue) {
    return value === defaultValue;
}

// Parse price input
function parsePriceInput(value) {
    return parseFloat(value.replace(/[$,KMB+]/g, ''));
}

// Parse monthly input
function parseMonthlyInput(value) {
    return parseFloat(value.replace(/[$,M+]/g, ''));
}

// ============================================
// 2. SLIDER MANAGER
// ============================================

// Store all slider instances
const sliders = {};

// Generic slider creation function
function createSlider(config) {
    const element = document.getElementById(config.id);
    if (!element) return null;
    
    const urlParams = getUrlParams();
    const startMin = parseInt(urlParams.get(config.paramMin)) || config.defaultMin;
    const startMax = parseInt(urlParams.get(config.paramMax)) || config.defaultMax;
    
    const slider = noUiSlider.create(element, {
        start: [startMin, startMax],
        connect: true,
        range: { min: config.rangeMin, max: config.rangeMax },
        step: config.step,
        format: {
            to: (v) => Math.round(v),
            from: (v) => Number(v)
        }
    });
    
    // Update handler
    slider.on('update', (values) => {
        const minVal = Math.round(values[0]);
        const maxVal = Math.round(values[1]);
        
        const minDisplay = config.formatDisplay ? config.formatDisplay(minVal, 'min') : minVal;
        const maxDisplay = config.formatDisplay ? config.formatDisplay(maxVal, 'max', config.rangeMax) : maxVal;
        
        const minInput = document.getElementById(config.inputIds.min);
        const maxInput = document.getElementById(config.inputIds.max);
        const label = document.getElementById(config.labelId);
        
        if (minInput) minInput.value = minDisplay;
        if (maxInput) maxInput.value = maxDisplay;
        if (label) label.innerHTML = `${minDisplay} - ${maxDisplay}`;
    });
    
    // Input handlers
    const minInput = document.getElementById(config.inputIds.min);
    const maxInput = document.getElementById(config.inputIds.max);
    
    if (minInput) {
        minInput.addEventListener('change', () => {
            let val = config.parseInput ? config.parseInput(minInput.value) : parseFloat(minInput.value);
            if (isNaN(val)) val = config.defaultMin;
            val = Math.max(config.rangeMin, Math.min(config.rangeMax, val));
            slider.set([val, null]);
        });
    }
    
    if (maxInput) {
        maxInput.addEventListener('change', () => {
            let val = config.parseInput ? config.parseInput(maxInput.value) : parseFloat(maxInput.value);
            if (isNaN(val)) val = config.rangeMax;
            val = Math.max(config.rangeMin, Math.min(config.rangeMax, val));
            slider.set([null, val]);
        });
    }
    
    sliders[config.id] = slider;
    return slider;
}

// Slider configurations (only price, monthly, length)
const sliderConfigs = {
    price: {
        id: 'priceSlider',
        paramMin: 'minPrice', paramMax: 'maxPrice',
        defaultMin: window.yachtConfig?.priceMin || 1000,
        defaultMax: window.yachtConfig?.priceMax || 50000000,
        rangeMin: window.yachtConfig?.priceMin || 1000,
        rangeMax: window.yachtConfig?.priceMax || 50000000,
        step: (() => Math.ceil((window.yachtConfig?.priceMax || 50000000 - window.yachtConfig?.priceMin || 1000) / 100))(),
        formatDisplay: (val, type, maxVal) => {
            const formatted = formatPrice(val);
            return (type === 'max' && val === maxVal) ? formatted + '+' : formatted;
        },
        parseInput: parsePriceInput,
        inputIds: { min: 'minPriceInput', max: 'maxPriceInput' },
        labelId: 'priceRangeLabel'
    },
    monthly: {
        id: 'monthlySlider',
        paramMin: 'minMonthlyPayment', paramMax: 'maxMonthlyPayment',
        defaultMin: 0, defaultMax: 1000000,
        rangeMin: 0, rangeMax: 1000000,
        step: 1000,
        formatDisplay: (val) => val === 0 ? '$0' : '$' + val.toLocaleString(),
        parseInput: parseMonthlyInput,
        inputIds: { min: 'minMonthlyInput', max: 'maxMonthlyInput' },
        labelId: 'monthlyRangeLabel'
    },
    length: {
        id: 'lengthSlider',
        paramMin: 'minLength', paramMax: 'maxLength',
        defaultMin: 10, defaultMax: 600,
        rangeMin: 10, rangeMax: 600,
        step: 5,
        formatDisplay: (val, type, maxVal) => {
            if (type === 'max' && val >= maxVal) return `${val}+`;
            return String(val);
        },
        parseInput: (value) => parseFloat(String(value).replace(/\+/g, '')),
        inputIds: { min: 'minLengthInput', max: 'maxLengthInput' },
        labelId: 'lengthRangeLabel'
    }
};

// Initialize all sliders
function initAllSliders() {
    Object.values(sliderConfigs).forEach(config => createSlider(config));
}

// Get slider instance
function getSlider(id) {
    return sliders[id];
}

// ============================================
// 3. FILTER APPLICATION
// ============================================

let currentPriceType = 'full';

function togglePriceType(type) {
    currentPriceType = type;
    const fullTab = document.getElementById('fullPriceTab');
    const monthlyTab = document.getElementById('monthlyTab');
    const fullContent = document.getElementById('fullPriceContent');
    const monthlyContent = document.getElementById('monthlyContent');
    
    if (!fullTab || !monthlyTab) return;
    
    if (type === 'full') {
        fullTab.classList.add('bg-white', 'shadow-sm');
        monthlyTab.classList.remove('bg-white', 'shadow-sm');
        if (fullContent) fullContent.style.display = 'block';
        if (monthlyContent) monthlyContent.style.display = 'none';
    } else {
        monthlyTab.classList.add('bg-white', 'shadow-sm');
        fullTab.classList.remove('bg-white', 'shadow-sm');
        if (fullContent) fullContent.style.display = 'none';
        if (monthlyContent) monthlyContent.style.display = 'block';
    }
}

function applyPriceFilter() {
    const priceConfig = sliderConfigs.price;
    const slider = getSlider('priceSlider');
    if (!slider) return;

    const values = slider.get();
    const minVal = Math.round(values[0]);
    const maxVal = Math.round(values[1]);
    const minChanged = !isDefault(minVal, priceConfig.defaultMin);
    const maxChanged = !isDefault(maxVal, priceConfig.defaultMax);
    const params = {};

    if (minChanged || maxChanged) {
        params.minPrice = minVal;
        params.maxPrice = maxVal;
    }

    updateUrlAndReload(params, ['minPrice', 'maxPrice', 'minMonthlyPayment', 'maxMonthlyPayment']);
}

function syncPriceFromUrl() {
    const cfg = sliderConfigs.price;
    const slider = getSlider('priceSlider');
    if (!slider) return;

    const urlParams = getUrlParams();
    const startMin = parseInt(urlParams.get('minPrice'), 10) || cfg.defaultMin;
    const startMax = parseInt(urlParams.get('maxPrice'), 10) || cfg.defaultMax;

    slider.set([
        Math.max(cfg.rangeMin, Math.min(cfg.rangeMax, startMin)),
        Math.max(cfg.rangeMin, Math.min(cfg.rangeMax, startMax))
    ]);
}

function closePriceFilter() {
    closeAllFilterDropdowns();
}

function clearPriceFilter() {
    updateUrlAndReload({}, ['minPrice', 'maxPrice', 'minMonthlyPayment', 'maxMonthlyPayment']);
}

function applyLengthFilter() {
    const cfg = sliderConfigs.length;
    const slider = getSlider('lengthSlider');
    if (!slider) return;
    const values = slider.get();
    const minVal = Math.round(values[0]);
    const maxVal = Math.round(values[1]);
    const minChanged = !isDefault(minVal, cfg.defaultMin);
    const maxChanged = !isDefault(maxVal, cfg.defaultMax);
    const params = {};
    if (minChanged || maxChanged) {
        params.minLength = minVal;
        params.maxLength = maxVal;
    }
    updateUrlAndReload(params, ['minLength', 'maxLength']);
}

function syncLengthFromUrl() {
    const cfg = sliderConfigs.length;
    const slider = getSlider('lengthSlider');
    if (!slider) return;

    const urlParams = getUrlParams();
    const startMin = parseInt(urlParams.get('minLength'), 10) || cfg.defaultMin;
    const startMax = parseInt(urlParams.get('maxLength'), 10) || cfg.defaultMax;

    slider.set([
        Math.max(cfg.rangeMin, Math.min(cfg.rangeMax, startMin)),
        Math.max(cfg.rangeMin, Math.min(cfg.rangeMax, startMax))
    ]);
}

function closeLengthFilter() {
    closeAllFilterDropdowns();
}

/**
 * Set the full price slider to given min/max values.
 */
function setPriceRange(minPrice, maxPrice) {
    const slider = getSlider('priceSlider');
    if (!slider) return;
    const currentValues = slider.get();
    const currentMin = Math.round(currentValues[0]);
    const currentMax = Math.round(currentValues[1]);
    const cfg = sliderConfigs.price;

    const newMin = minPrice !== null ? minPrice : currentMin;
    const newMax = maxPrice !== null ? maxPrice : (maxPrice === null ? cfg.rangeMax : currentMax);

    const rangeMin = cfg.rangeMin;
    const rangeMax = cfg.rangeMax;
    const clampedMin = Math.max(rangeMin, Math.min(rangeMax, newMin));
    const clampedMax = Math.max(rangeMin, Math.min(rangeMax, newMax));

    slider.set([clampedMin, clampedMax]);
    togglePriceType('full');
}

/**
 * Set the monthly payment slider to given min/max values.
 */
function setMonthlyRange(minMonthly, maxMonthly) {
    const slider = getSlider('monthlySlider');
    if (!slider) return;
    const currentValues = slider.get();
    const currentMin = Math.round(currentValues[0]);
    const currentMax = Math.round(currentValues[1]);
    const cfg = sliderConfigs.monthly;

    const newMin = minMonthly !== null ? minMonthly : currentMin;
    const newMax = maxMonthly !== null ? maxMonthly : (maxMonthly === null ? cfg.rangeMax : currentMax);

    slider.set([
        Math.max(cfg.rangeMin, Math.min(cfg.rangeMax, newMin)),
        Math.max(cfg.rangeMin, Math.min(cfg.rangeMax, newMax))
    ]);

    togglePriceType('monthly');
}

/**
 * Set the length slider to given min/max values.
 */
function setLengthRange(minLength, maxLength) {
    const slider = getSlider('lengthSlider');
    if (!slider) return;
    const currentValues = slider.get();
    const currentMin = Math.round(currentValues[0]);
    const currentMax = Math.round(currentValues[1]);
    const cfg = sliderConfigs.length;

    const newMin = minLength !== null ? minLength : currentMin;
    const newMax = maxLength !== null ? maxLength : (maxLength === null ? cfg.rangeMax : currentMax);

    slider.set([
        Math.max(cfg.rangeMin, Math.min(cfg.rangeMax, newMin)),
        Math.max(cfg.rangeMin, Math.min(cfg.rangeMax, newMax))
    ]);
}

function clearLengthFilter() {
    updateUrlAndReload({}, ['minLength', 'maxLength']);
}

function clearLocationFilter() {
    updateUrlAndReload({}, ['locations', 'locationSearch', 'locationCity', 'locationCountry']);
}

/* the ✕ on one pill drops that place and leaves the others filtering */
function clearOneLocation(value) {
    const rest = chosenLocations().filter(v => v !== value);
    if (!rest.length) return clearLocationFilter();
    updateUrlAndReload({ locations: rest.join(',') }, ['locationSearch', 'locationCity', 'locationCountry']);
}

function clearMakeModelFilter() {
    updateUrlAndReload({}, ['search', 'makeIds', 'modelIds']);
}

function clearMakeModelFilterPanel() {
    const input = document.getElementById('makeModelInput');
    if (input) {
        input.value = '';
    }

    resetMakeModelOptions();
    hideMakeModelStatus();
}

function applyMakeModelFilter() {
    const input = document.getElementById('makeModelInput');
    const query = input ? input.value.trim() : '';
    const checked = document.querySelectorAll('input[name="makeModelCheckbox"]:checked:not([data-all="true"])');
    const modelIds = [];
    const makeIds = [];

    checked.forEach((checkbox) => {
        if (checkbox.dataset.modelId) {
            modelIds.push(checkbox.dataset.modelId);
        } else if (checkbox.dataset.makeId) {
            makeIds.push(checkbox.dataset.makeId);
        }
    });

    const params = {};
    const remove = ['search', 'makeIds', 'modelIds'];

    if (modelIds.length) {
        params.modelIds = [...new Set(modelIds)].join(',');
    } else if (makeIds.length) {
        params.makeIds = [...new Set(makeIds)].join(',');
    } else if (query) {
        params.search = query;
    }

    updateUrlAndReload(params, remove);
    closeAllFilterDropdowns();
}

// Generic clear function for single-param filters
function makeClearFilter(paramName) {
    return () => updateUrlAndReload({}, [paramName]);
}

// Condition filter clear (URL + UI reset on reload)
function clearConditionFilter() {
    updateUrlAndReload({}, ['vesselCondition']);
}

// Expose globally
window.clearLocationFilter = clearLocationFilter;
window.clearMakeModelFilter = clearMakeModelFilter;
window.clearMakeModelFilterPanel = clearMakeModelFilterPanel;
window.applyMakeModelFilter = applyMakeModelFilter;
window.clearConditionFilter = clearConditionFilter;

// ============================================
// 4. ACTIVE FILTERS DISPLAY (pills inside filter buttons)
// ============================================

function createFilterPill(text, onClear, ariaLabel) {
    const pill = document.createElement('span');
    pill.className = 'filter-value-pill';
    pill.appendChild(document.createTextNode(text));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'filter-value-pill-remove';
    removeBtn.setAttribute('aria-label', ariaLabel);
    removeBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
    removeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClear();
    });

    pill.appendChild(removeBtn);
    return pill;
}

function setFilterButtonState({ valuesId, dividerId, pills }) {
    const valuesContainer = document.getElementById(valuesId);
    if (!valuesContainer) return;

    const trigger = valuesContainer.closest('.filter-button')
        || valuesContainer.closest('.filter-group')?.querySelector('.filter-button');
    const divider = dividerId
        ? document.getElementById(dividerId)
        : trigger?.querySelector('.filter-button-divider');

    if (!trigger) return;

    valuesContainer.innerHTML = '';

    if (pills.length) {
        pills.forEach(pill => valuesContainer.appendChild(pill));
        if (divider) divider.hidden = false;
        trigger.classList.add('has-values');
    } else {
        if (divider) divider.hidden = true;
        trigger.classList.remove('has-values');
    }
}

function formatPricePillValue(num) {
    if (num >= 1000000) {
        const millions = num / 1000000;
        return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1).replace(/\.0$/, '')) + 'M';
    }
    if (num >= 1000) return Math.round(num / 1000) + 'k';
    return String(num);
}

function getPricePillText(minPrice, maxPrice) {
    if (minPrice && maxPrice) {
        return `$${formatPricePillValue(parseInt(minPrice, 10))}-$${formatPricePillValue(parseInt(maxPrice, 10))}`;
    }
    if (minPrice) return `$${formatPricePillValue(parseInt(minPrice, 10))}+`;
    if (maxPrice) return `Up to $${formatPricePillValue(parseInt(maxPrice, 10))}`;
    return '';
}

function hasActiveFilters() {
    const params = getUrlParams();
    return !!(
        params.get('search') ||
        params.get('makeIds') ||
        params.get('modelIds') ||
        params.get('vesselCondition') ||
        params.get('minPrice') ||
        params.get('maxPrice') ||
        params.get('minLength') ||
        params.get('maxLength') ||
        params.get('locations') ||
        params.get('locationSearch') ||
        params.get('locationCity')
    );
}

function updateClearAllVisibility() {
    const button = document.getElementById('clearAllFiltersBtn');
    if (!button) return;
    button.hidden = !hasActiveFilters();
}

function clearAllFilters() {
    updateUrlAndReload({}, [
        'search',
        'makeIds',
        'modelIds',
        'vesselCondition',
        'minPrice',
        'maxPrice',
        'minLength',
        'maxLength',
        'locations',
        'locationSearch',
        'locationCity',
        'locationCountry',
        'minMonthlyPayment',
        'maxMonthlyPayment'
    ]);
}

function updateMakeModelActiveDisplay() {
    const params = getUrlParams();
    const search = params.get('search');
    const modelIds = params.get('modelIds');
    const makeIds = params.get('makeIds');
    let pills = [];

    if (modelIds) {
        const count = modelIds.split(',').filter(Boolean).length;
        pills = [createFilterPill(
            count === 1 ? '1 model' : `${count} models`,
            clearMakeModelFilter,
            'Remove make or model filter'
        )];
    } else if (makeIds) {
        const count = makeIds.split(',').filter(Boolean).length;
        pills = [createFilterPill(
            count === 1 ? '1 make' : `${count} makes`,
            clearMakeModelFilter,
            'Remove make or model filter'
        )];
    } else if (search) {
        pills = [createFilterPill(search, clearMakeModelFilter, 'Remove make or model filter')];
    }

    setFilterButtonState({
        valuesId: 'makeModelActive',
        dividerId: 'makeModelDivider',
        pills
    });
}

function updateConditionActiveDisplay() {
    const condition = getUrlParams().get('vesselCondition');
    let pills = [];

    if (condition === 'new') {
        pills = [createFilterPill('New', clearConditionFilter, 'Remove condition filter')];
    } else if (condition === 'preOwned') {
        pills = [createFilterPill('Pre-owned', clearConditionFilter, 'Remove condition filter')];
    }

    setFilterButtonState({
        valuesId: 'conditionActive',
        dividerId: 'conditionDivider',
        pills
    });
}

function updatePriceActiveDisplay() {
    const minPrice = getUrlParams().get('minPrice');
    const maxPrice = getUrlParams().get('maxPrice');
    const text = getPricePillText(minPrice, maxPrice);
    const pills = text
        ? [createFilterPill(text, clearPriceFilter, 'Remove price filter')]
        : [];

    setFilterButtonState({
        valuesId: 'priceActive',
        dividerId: 'priceDivider',
        pills
    });
}

function updateLengthActiveDisplay() {
    const minLength = getUrlParams().get('minLength');
    const maxLength = getUrlParams().get('maxLength');
    let text = '';

    if (minLength && maxLength) text = `${minLength}-${maxLength} ft`;
    else if (minLength) text = `${minLength}+ ft`;
    else if (maxLength) text = `Up to ${maxLength} ft`;

    const pills = text
        ? [createFilterPill(text, clearLengthFilter, 'Remove length filter')]
        : [];

    setFilterButtonState({
        valuesId: 'lengthActive',
        dividerId: 'lengthDivider',
        pills
    });
}

function updateLocationActiveDisplay() {
    const labelOf = value => {
        const box = document.querySelector(
            'input[name="locationCheckbox"][value="' + (window.CSS && CSS.escape ? CSS.escape(value) : value) + '"]'
        );
        /* before the list has loaded there is no box to read the label off */
        return (box && box.dataset.label) || value.split('|')[0];
    };
    const pills = chosenLocations().map(value =>
        createFilterPill(labelOf(value), () => clearOneLocation(value), 'Remove ' + labelOf(value))
    );

    setFilterButtonState({
        valuesId: 'locationActive',
        dividerId: 'locationDivider',
        pills
    });
}

function updateAllActiveDisplays() {
    updateMakeModelActiveDisplay();
    updateConditionActiveDisplay();
    updatePriceActiveDisplay();
    updateLengthActiveDisplay();
    updateLocationActiveDisplay();
    updateClearAllVisibility();
}

// ============================================
// 5. CONDITION FILTER (Apply / Clear / Close)
// ============================================

function syncConditionRadiosFromUrl() {
    const condition = getUrlParams().get('vesselCondition') || '';
    document.querySelectorAll('input[name="conditionRadio"]').forEach(radio => {
        radio.checked = radio.value === condition;
    });
}

function applyConditionFilter() {
    const selected = document.querySelector('input[name="conditionRadio"]:checked');
    const value = selected ? selected.value : '';
    const params = {};

    if (value === 'new') {
        params.vesselCondition = 'new';
    } else if (value === 'preOwned') {
        params.vesselCondition = 'preOwned';
    }

    updateUrlAndReload(params, ['vesselCondition']);
}

function closeConditionFilter() {
    closeAllFilterDropdowns();
}

function closeAllFilterDropdowns() {
    document.querySelectorAll('.filter-dropdown').forEach(dropdown => {
        dropdown.classList.add('hidden');
    });

    document.querySelectorAll('.filter-button').forEach(button => {
        button.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
        const chevron = button.querySelector('.filter-chevron');
        if (chevron) {
            chevron.classList.remove('fa-chevron-up');
            chevron.classList.add('fa-chevron-down');
        }
    });
}

function openFilterDropdown(filterId) {
    const dropdown = document.getElementById(filterId);
    if (!dropdown) return;

    const filterGroup = dropdown.closest('.filter-group');
    const button = filterGroup ? filterGroup.querySelector('.filter-button') : null;

    closeAllFilterDropdowns();
    dropdown.classList.remove('hidden');

    if (button) {
        button.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
        const chevron = button.querySelector('.filter-chevron');
        if (chevron) {
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-up');
        }
    }

    if (filterId === 'conditionFilter') {
        syncConditionRadiosFromUrl();
    }

    if (filterId === 'lengthFilter') {
        syncLengthFromUrl();
    }

    if (filterId === 'priceFilter') {
        syncPriceFromUrl();
    }

    if (filterId === 'locationFilter') {
        if (!locationsLoaded) {
            loadLocations();
        } else {
            syncLocationCheckboxesFromUrl();
        }
    }

    if (filterId === 'makeModelFilter') {
        const input = document.getElementById('makeModelInput');
        if (input) {
            setTimeout(() => {
                input.focus();
                if (input.value.trim().length >= 2) {
                    fetchMakeModelSuggestions(input.value.trim());
                }
            }, 0);
        }
    }
}

// ============================================
// 6. MAKE/MODEL FILTER
// ============================================

let makeModelSearchTimer = null;
let makeModelSuggestionsRequest = null;

function hideMakeModelFooter() {
    const footer = document.getElementById('makeModelFooter');
    if (footer) {
        footer.classList.add('hidden');
    }
}

function showMakeModelFooter() {
    const footer = document.getElementById('makeModelFooter');
    if (footer) {
        footer.classList.remove('hidden');
    }
}

function hideMakeModelStatus() {
    const status = document.getElementById('makeModelStatus');
    if (status) {
        status.textContent = '';
        status.classList.add('hidden');
    }
}

function showMakeModelStatus(message) {
    const status = document.getElementById('makeModelStatus');
    const options = document.getElementById('makeModelOptions');

    if (status) {
        status.textContent = message;
        status.classList.remove('hidden');
    }

    if (options) {
        options.classList.add('hidden');
    }

    hideMakeModelFooter();
}

function resetMakeModelOptions() {
    const options = document.getElementById('makeModelOptions');
    const list = document.getElementById('makeModelOptionsList');

    if (list) {
        list.innerHTML = '';
    }

    if (options) {
        options.classList.add('hidden');
    }

    hideMakeModelFooter();
}

function createMakeModelOptionElement({ label, makeId = '', modelId = '', checked = false, isAll = false }) {
    const option = document.createElement('label');
    option.className = 'make-model-filter-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'makeModelCheckbox';
    input.checked = checked;

    if (isAll) {
        input.dataset.all = 'true';
    } else {
        input.dataset.label = label;
        if (modelId) input.dataset.modelId = modelId;
        if (makeId) input.dataset.makeId = makeId;
    }

    const checkbox = document.createElement('span');
    checkbox.className = 'make-model-filter-checkbox';

    const text = document.createElement('span');
    text.className = 'make-model-filter-label';
    text.textContent = label;

    option.appendChild(input);
    option.appendChild(checkbox);
    option.appendChild(text);

    return option;
}

function bindMakeModelCheckboxEvents() {
    const allCheckbox = document.querySelector('input[name="makeModelCheckbox"][data-all="true"]');
    const itemCheckboxes = document.querySelectorAll('input[name="makeModelCheckbox"]:not([data-all="true"])');

    if (allCheckbox) {
        allCheckbox.addEventListener('change', () => {
            if (allCheckbox.checked) {
                itemCheckboxes.forEach((item) => {
                    item.checked = true;
                });
            } else {
                itemCheckboxes.forEach((item) => {
                    item.checked = false;
                });
            }
        });
    }

    itemCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            if (!allCheckbox) return;

            const checkedCount = document.querySelectorAll('input[name="makeModelCheckbox"]:checked:not([data-all="true"])').length;
            allCheckbox.checked = checkedCount > 0 && checkedCount === itemCheckboxes.length;
        });
    });
}

function renderMakeModelSuggestions(items) {
    const options = document.getElementById('makeModelOptions');
    const list = document.getElementById('makeModelOptionsList');

    if (!options || !list) return;

    list.innerHTML = '';

    if (!items.length) {
        showMakeModelStatus('No models found. Try another search.');
        return;
    }

    hideMakeModelStatus();
    options.classList.remove('hidden');
    showMakeModelFooter();

    list.appendChild(createMakeModelOptionElement({
        label: 'Select all',
        isAll: true,
        checked: false,
    }));

    items.forEach((item) => {
        list.appendChild(createMakeModelOptionElement({
            label: item.label,
            makeId: item.makeId || '',
            modelId: item.modelId || '',
            checked: false,
        }));
    });

    bindMakeModelCheckboxEvents();
}

function fetchMakeModelSuggestions(query) {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
        resetMakeModelOptions();
        hideMakeModelStatus();
        return;
    }

    if (makeModelSuggestionsRequest) {
        makeModelSuggestionsRequest.abort();
    }

    showMakeModelStatus('Loading...');

    makeModelSuggestionsRequest = new AbortController();

    fetch(`/yachts/make-model-suggestions?q=${encodeURIComponent(trimmed)}`, {
        signal: makeModelSuggestionsRequest.signal,
    })
        .then((response) => response.json())
        .then((data) => {
            renderMakeModelSuggestions(data.items || []);
        })
        .catch((error) => {
            if (error.name === 'AbortError') return;
            console.error(error);
            showMakeModelStatus('Unable to load models. Please try again.');
        })
        .finally(() => {
            makeModelSuggestionsRequest = null;
        });
}

function initMakeModelFilter() {
    const input = document.getElementById('makeModelInput');
    if (!input) return;

    input.addEventListener('input', () => {
        clearTimeout(makeModelSearchTimer);
        const query = input.value.trim();

        makeModelSearchTimer = setTimeout(() => {
            fetchMakeModelSuggestions(query);
        }, 300);
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyMakeModelFilter();
        }
    });
}

function openMakeModelDropdown() {
    toggleFilterDropdown('makeModelFilter');
}

// Location filter (checkbox list from API)
let locationsLoaded = false;
let locationsCache = [];

function formatLocationLabel(loc) {
    const parts = [loc.city];
    if (loc.state) {
        parts.push(loc.state);
    } else if (loc.country) {
        parts.push(loc.country);
    }
    return parts.join(', ');
}

function renderLocationOptions(locations) {
    const container = document.getElementById('locationFilterOptions');
    if (!container) return;

    container.innerHTML = '';

    if (!locations.length) {
        container.innerHTML = '<div class="location-filter-status">No locations available</div>';
        return;
    }

    container.appendChild(createLocationOptionElement({
        label: 'All locations',
        isAll: true,
        checked: true
    }));

    locations.forEach(loc => {
        container.appendChild(createLocationOptionElement({
            label: formatLocationLabel(loc),
            city: loc.city || '',
            country: loc.country || '',
            checked: false
        }));
    });

    bindLocationCheckboxEvents();
    syncLocationCheckboxesFromUrl();
}

function createLocationOptionElement({ label, city = '', country = '', isAll = false, checked = false }) {
    const option = document.createElement('label');
    option.className = isAll
        ? 'location-filter-option location-filter-option--all'
        : 'location-filter-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'locationCheckbox';
    input.checked = checked;

    if (isAll) {
        input.value = '';
        input.dataset.all = 'true';
    } else {
        input.value = `${city}|${country}`;
        input.dataset.city = city;
        input.dataset.country = country;
        input.dataset.label = label;
    }

    const checkbox = document.createElement('span');
    checkbox.className = 'location-filter-checkbox';

    const text = document.createElement('span');
    text.className = 'location-filter-label';
    text.textContent = label;

    option.appendChild(input);
    option.appendChild(checkbox);
    option.appendChild(text);

    return option;
}

/* These are tick boxes and they add up: a buyer looking in San Diego is just as
   likely to look in Sausalito. Ticking one used to clear the rest, which made a
   column of boxes behave like a column of radios. The one exclusive tick is All
   locations, which means no filter at all and so cannot be held alongside a
   place; and unticking the last place falls back to it rather than leaving the
   panel with nothing chosen. */
function bindLocationCheckboxEvents() {
    document.querySelectorAll('input[name="locationCheckbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const allCheckbox = document.querySelector('input[name="locationCheckbox"][data-all="true"]');
            const locationCheckboxes = document.querySelectorAll('input[name="locationCheckbox"]:not([data-all="true"])');

            if (checkbox.dataset.all === 'true') {
                if (checkbox.checked) {
                    locationCheckboxes.forEach(item => {
                        item.checked = false;
                    });
                } else {
                    checkbox.checked = true;
                }
                return;
            }

            if (checkbox.checked) {
                if (allCheckbox) allCheckbox.checked = false;
            } else if (!document.querySelector('input[name="locationCheckbox"]:checked:not([data-all="true"])')) {
                if (allCheckbox) allCheckbox.checked = true;
            }
        });
    });
}

/* "City|Country,City|Country" — the same comma-separated shape makeIds and
   modelIds already use, because one locationCity could only ever hold one. */
function chosenLocations() {
    return (getUrlParams().get('locations') || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
}

function syncLocationCheckboxesFromUrl() {
    const chosen = chosenLocations();
    const allCheckbox = document.querySelector('input[name="locationCheckbox"][data-all="true"]');
    const locationCheckboxes = document.querySelectorAll('input[name="locationCheckbox"]:not([data-all="true"])');

    if (!locationCheckboxes.length) return;

    let matched = false;
    locationCheckboxes.forEach(checkbox => {
        const isSelected = chosen.indexOf(checkbox.value) >= 0;
        checkbox.checked = isSelected;
        if (isSelected) matched = true;
    });

    if (allCheckbox) {
        allCheckbox.checked = !matched;
    }
}

function loadLocations() {
    const container = document.getElementById('locationFilterOptions');
    if (!container || locationsLoaded) return;

    container.innerHTML = '<div class="location-filter-status">Loading locations...</div>';

    fetch('/yachts/locations')
        .then(res => res.json())
        .then(data => {
            locationsCache = data.locations || [];
            locationsLoaded = true;
            renderLocationOptions(locationsCache);
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = '<div class="location-filter-status">Error loading locations</div>';
        });
}

function applyLocationFilter() {
    const selected = [].slice.call(
        document.querySelectorAll('input[name="locationCheckbox"]:checked:not([data-all="true"])')
    );

    /* locationSearch / locationCity / locationCountry were the single-place
       shape and go with it, so a link carrying the old ones cannot leave a
       place filtering the grid that no box is ticked for. */
    const legacy = ['locationSearch', 'locationCity', 'locationCountry'];

    if (!selected.length) {
        updateUrlAndReload({}, legacy.concat(['locations']));
        return;
    }

    updateUrlAndReload({
        locations: selected.map(i => i.value).join(',')
    }, legacy);
}

function closeLocationFilter() {
    closeAllFilterDropdowns();
}

function initLocationFilter() {
    setTimeout(() => {
        if (!locationsLoaded) loadLocations();
    }, 500);
}

// ============================================
// 7. INITIALIZATION
// ============================================

document.addEventListener('click', (event) => {
    // A panel that redraws itself under the finger — the make list stepping into
    // a make's ranges, and back out of them — hands this listener a node that is
    // no longer in the document by the time the click reaches it. closest() then
    // walks a detached chain, finds no .filter-group, and reads a tap inside the
    // panel as a tap outside it, closing the panel the tap had just opened up.
    if (!event.target.isConnected) return;
    if (!event.target.closest('.filter-group')) {
        closeAllFilterDropdowns();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initAllSliders();
    initLocationFilter();
    initMakeModelFilter();

    // Update active chips under filters
    updateAllActiveDisplays();
});

// Search functionality
function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    const form = document.getElementById('searchForm');
    if (form) form.submit();
}

function removeFilter(paramName, valueToRemove) {
    const currentValue = getUrlParams().get(paramName);
    if (!currentValue) return;
    
    if (valueToRemove === undefined) {
        updateUrlAndReload({}, [paramName]);
        return;
    }
    
    const values = currentValue.split(',');
    const newValues = values.filter(v => v !== valueToRemove);
    
    if (newValues.length === 0) {
        updateUrlAndReload({}, [paramName]);
    } else {
        const params = {};
        params[paramName] = newValues.join(',');
        updateUrlAndReload(params, []);
    }
}

window.removeFilter = removeFilter;

document.getElementById('searchForm')?.addEventListener('submit', (e) => {
    const input = document.getElementById('searchInput');
    if (input && input.value.trim() === '') {
        e.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.delete('search');
        url.searchParams.set('page', '1');
        window.location.href = url.toString();
    }
});

// Expose global functions
window.toggleFilterDropdown = (filterId) => {
    const dropdown = document.getElementById(filterId);
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
        openFilterDropdown(filterId);
    } else {
        closeAllFilterDropdowns();
    }
};
window.togglePriceType = togglePriceType;
window.applyPriceFilter = applyPriceFilter;
window.clearPriceFilter = clearPriceFilter;
window.closePriceFilter = closePriceFilter;
window.applyLengthFilter = applyLengthFilter;
window.clearLengthFilter = clearLengthFilter;
window.closeLengthFilter = closeLengthFilter;
window.applyConditionFilter = applyConditionFilter;
window.closeConditionFilter = closeConditionFilter;
window.setPriceRange = setPriceRange;
window.setMonthlyRange = setMonthlyRange;
window.openMakeModelDropdown = openMakeModelDropdown;
window.applyLocationFilter = applyLocationFilter;
window.closeLocationFilter = closeLocationFilter;
window.clearAllFilters = clearAllFilters;