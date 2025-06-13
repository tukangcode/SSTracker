// ==UserScript==
// @name         Shopee Advanced Order Parser - v4.0
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Parse shop details, calculate totals, and export data with an enhanced modern interface
// @author       tukangcode
// @match        https://*shopee.co.id/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11.7.5/dist/sweetalert2.all.min.js
// @require      https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js
// @license MIT
// ==/UserScript==

(function () {
    'use strict';

    // Configuration and state management
    const config = {
        isVisible: GM_getValue('parserGuiVisible', true),
        autoShow: GM_getValue('parserAutoShow', true),
        useDiscountPrice: GM_getValue('parserUseDiscount', true),
        darkMode: GM_getValue('parserDarkMode', false),
        history: GM_getValue('parserHistory', [])
    };

    let results = [];
    let isProcessing = false;

    // Add styles
    GM_addStyle(`
        #order-parser-ui {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 600px;
            background: ${config.darkMode ? '#1a1a1a' : 'white'};
            color: ${config.darkMode ? '#f0f0f0' : '#1a1a1a'};
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            max-height: 90vh;
            overflow-y: auto;
            display: ${config.isVisible ? 'block' : 'none'};
            transition: all 0.3s ease;
        }

        #order-parser-ui.dark-mode {
            background: #222;
            color: #eee;
        }

        #order-parser-ui h2 {
            margin-top: 0;
            font-size: 1.3rem;
            color: ${config.darkMode ? '#6366f1' : '#4f46e5'};
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 16px;
            margin-right: 10px;
            margin-bottom: 10px;
            background: #4f46e5;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .btn:hover, .btn:focus {
            background: #3730a3;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            outline: 2px solid #4f46e5;
            outline-offset: 2px;
        }

        .btn:active {
            transform: translateY(0px);
        }

        .btn:focus:not(:focus-visible) {
            outline: none;
        }

        .btn:focus-visible {
            outline: 2px solid #4f46e5;
            outline-offset: 2px;
        }

        .btn.disabled {
            background: #999;
            cursor: not-allowed;
            opacity: 0.7;
            box-shadow: none;
        }

        .btn.disabled:hover {
            transform: none;
            box-shadow: none;
            outline: none;
        }

        .btn.btn-danger {
            background: #dc2626;
        }

        .btn.btn-danger:hover {
            background: #b91c1c;
        }

        .btn.btn-success {
            background: #10b981;
        }

        .btn.btn-success:hover {
            background: #059669;
        }

        .btn-group {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .tabs {
            display: flex;
            margin-bottom: 15px;
            border-bottom: 1px solid ${config.darkMode ? '#444' : '#e5e7eb'};
        }

        .tab {
            padding: 8px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            position: relative;
        }

        .tab:hover, .tab:focus {
            color: #4f46e5;
            outline: none;
        }

        .tab:focus-visible {
            outline: 2px solid #4f46e5;
            outline-offset: 2px;
        }

        .tab.active {
            border-bottom: 2px solid #4f46e5;
            color: #4f46e5;
            font-weight: 500;
        }

        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 10px;
            font-size: 0.9rem;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        th {
            background: ${config.darkMode ? '#2a2a2a' : '#f3f4f6'};
            text-align: left;
            padding: 12px 15px;
            font-weight: 600;
            color: ${config.darkMode ? '#f0f0f0' : '#1a1a1a'};
            position: sticky;
            top: 0;
            cursor: pointer;
            border-bottom: 2px solid ${config.darkMode ? '#444' : '#e5e7eb'};
        }

        th:hover, th:focus {
            background: ${config.darkMode ? '#444' : '#e5e7eb'};
        }

        th:focus {
            outline: 2px solid #4f46e5;
            outline-offset: -2px;
        }

        td {
            padding: 12px 15px;
            border-bottom: 1px solid ${config.darkMode ? '#333' : '#e5e7eb'};
            vertical-align: top;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background: ${config.darkMode ? '#2a2a2a' : '#f9fafb'};
        }

        .truncate {
            max-width: 200px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: help;
        }

        pre {
            margin-top: 10px;
            background: ${config.darkMode ? '#333' : '#f5f5f5'};
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            color: ${config.darkMode ? '#eee' : 'inherit'};
        }

        .setting-group {
            margin: 15px 0;
            padding: 15px;
            background: ${config.darkMode ? '#333' : '#f9fafb'};
            border-radius: 8px;
        }

        .setting-label {
            display: flex;
            align-items: center;
            margin: 10px 0;
            font-size: 1rem;
            color: ${config.darkMode ? '#f0f0f0' : '#1a1a1a'};
        }

        .switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 22px;
            margin-right: 10px;
        }

        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .3s;
            border-radius: 22px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 2px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: #4f46e5;
        }

        input:focus + .slider {
            box-shadow: 0 0 1px #4f46e5;
        }

        input:checked + .slider:before {
            transform: translateX(20px);
        }

        textarea {
            width: 100%;
            height: 150px;
            margin-top: 10px;
            font-family: monospace;
            font-size: 0.9rem;
            padding: 10px;
            border: 1px solid ${config.darkMode ? '#444' : '#ccc'};
            border-radius: 8px;
            resize: vertical;
            white-space: pre-wrap;
            background: ${config.darkMode ? '#333' : 'white'};
            color: ${config.darkMode ? '#eee' : 'inherit'};
        }

        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
            background: #4f46e5;
            color: white;
        }

        .empty-state {
            padding: 30px;
            text-align: center;
            color: #6b7280;
        }

        .empty-state i {
            font-size: 3rem;
            margin-bottom: 15px;
            color: #d1d5db;
        }

        .search-box {
            width: 100%;
            padding: 10px 15px;
            border: 2px solid ${config.darkMode ? '#444' : '#e5e7eb'};
            border-radius: 8px;
            margin-bottom: 15px;
            background: ${config.darkMode ? '#2a2a2a' : 'white'};
            color: ${config.darkMode ? '#f0f0f0' : '#1a1a1a'};
            font-size: 1rem;
            transition: all 0.2s;
        }

        .search-box:focus {
            outline: none;
            border-color: #4f46e5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .search-box::placeholder {
            color: ${config.darkMode ? '#888' : '#9ca3af'};
        }

        .history-item {
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 8px;
            background: ${config.darkMode ? '#333' : '#f9fafb'};
            cursor: pointer;
            transition: all 0.2s;
        }

        .history-item:hover {
            background: ${config.darkMode ? '#444' : '#e5e7eb'};
        }

        .history-date {
            font-size: 0.8rem;
            color: #6b7280;
            margin-bottom: 5px;
        }

        .loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            z-index: 100000;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        #drag-handle {
            cursor: move;
            padding: 0 5px;
            color: #6b7280;
        }

        .tooltip {
            position: relative;
            display: inline-block;
            margin-left: 5px;
        }

        .tooltip .tooltip-text {
            visibility: hidden;
            width: 200px;
            background-color: ${config.darkMode ? '#2a2a2a' : '#1a1a1a'};
            color: ${config.darkMode ? '#f0f0f0' : 'white'};
            text-align: center;
            border-radius: 6px;
            padding: 8px;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0;
            transition: opacity 0.3s;
            font-size: 0.9rem;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .tooltip:hover .tooltip-text,
        .tooltip:focus .tooltip-text {
            visibility: visible;
            opacity: 1;
        }

        /* Accessibility improvements */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        [role="button"],
        [role="tab"] {
            cursor: pointer;
        }

        [role="button"]:focus,
        [role="tab"]:focus {
            outline: 2px solid #4f46e5;
            outline-offset: 2px;
        }
    `);

    // Create UI
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="order-parser-ui" class="${config.darkMode ? 'dark-mode' : ''}" role="dialog" aria-label="Shopee Order Parser">
            <div id="loading-overlay" class="loading" style="display: none;" role="alert" aria-busy="true">
                <div class="spinner" aria-label="Loading"></div>
            </div>

            <h2>
                <div>
                    <span id="drag-handle" role="button" aria-label="Drag to move">⋮⋮</span>
                    Shopee Order Parser
                </div>
                <div>
                    <button id="theme-toggle" class="btn" style="margin-right: 5px; padding: 5px 10px;" aria-label="Toggle dark mode">
                        <i class="fa ${config.darkMode ? 'fa-sun' : 'fa-moon'}"></i>
                    </button>
                    <button id="close-btn" class="btn" style="margin-right: 0; padding: 5px 10px;" aria-label="Close parser">×</button>
                </div>
            </h2>

            <div class="tabs" role="tablist">
                <div class="tab active" data-tab="parser" role="tab" aria-selected="true" aria-controls="parser-tab">Parser</div>
                <div class="tab" data-tab="history" role="tab" aria-selected="false" aria-controls="history-tab">History</div>
                <div class="tab" data-tab="settings" role="tab" aria-selected="false" aria-controls="settings-tab">Settings</div>
            </div>

            <div id="parser-tab" class="tab-content active" role="tabpanel" aria-labelledby="parser-tab">
                <div class="btn-group">
                    <button class="btn" id="parse-btn" aria-label="Parse orders">
                        <i class="fa fa-search" aria-hidden="true"></i> Parse Orders
                    </button>
                    <button class="btn disabled" id="calc-btn" disabled aria-label="Calculate total">
                        <i class="fa fa-calculator" aria-hidden="true"></i> Calculate Total
                    </button>
                    <button class="btn btn-danger disabled" id="clean-btn" disabled aria-label="Clear results">
                        <i class="fa fa-trash" aria-hidden="true"></i> Clear
                    </button>
                </div>

                <div class="btn-group">
                    <button class="btn btn-success disabled" id="export-md-btn" disabled aria-label="Export as Markdown">
                        <i class="fa fa-file-text" aria-hidden="true"></i> Export in Markdown
                    </button>
                    <button class="btn btn-success disabled" id="export-csv-btn" disabled aria-label="Export as CSV">
                        <i class="fa fa-file-excel" aria-hidden="true"></i> Export CSV
                    </button>
                    <button class="btn btn-success disabled" id="save-btn" disabled aria-label="Save to history">
                        <i class="fa fa-save" aria-hidden="true"></i> Save to History
                    </button>
                </div>

                <input type="text" id="search-box" class="search-box" placeholder="Search orders..." style="display: none;" aria-label="Search orders">

                <div id="results-container">
                    <div id="empty-state" class="empty-state">
                        <i class="fa fa-receipt" aria-hidden="true"></i>
                        <p>No orders parsed yet. Click "Parse Orders" to start.</p>
                    </div>

                    <table id="result-table" style="display: none;" role="grid">
                        <thead>
                            <tr>
                                <th data-sort="index" role="columnheader" scope="col">No</th>
                                <th data-sort="shop" role="columnheader" scope="col">Shop Name</th>
                                <th data-sort="item" role="columnheader" scope="col">Item Name</th>
                                <th data-sort="price" role="columnheader" scope="col">Total Order</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>

                <pre id="grand-total" style="display:none;" role="status" aria-live="polite"></pre>

                <div style="margin-top: 20px;">
                    <h3>Raw Parsed Output</h3>
                    <textarea id="raw-output" readonly placeholder="Parsed shop name, item, and total will appear here..." aria-label="Raw parsed output"></textarea>
                </div>
            </div>

            <div id="history-tab" class="tab-content" role="tabpanel" aria-labelledby="history-tab">
                <div id="history-list">
                    <div class="empty-state">
                        <i class="fa fa-history" aria-hidden="true"></i>
                        <p>No saved order history yet.</p>
                    </div>
                </div>
            </div>

            <div id="settings-tab" class="tab-content" role="tabpanel" aria-labelledby="settings-tab">
                <div class="setting-group">
                    <h3>Display Settings</h3>

                    <label class="setting-label">
                        <span class="switch">
                            <input type="checkbox" id="auto-show-toggle" ${config.autoShow ? 'checked' : ''} aria-label="Show GUI automatically on page load">
                            <span class="slider"></span>
                        </span>
                        Show GUI Automatically on Page Load
                    </label>

                    <label class="setting-label">
                        <span class="switch">
                            <input type="checkbox" id="dark-mode-toggle" ${config.darkMode ? 'checked' : ''} aria-label="Enable dark mode">
                            <span class="slider"></span>
                        </span>
                        Dark Mode
                    </label>
                </div>

                <div class="setting-group">
                    <h3>Parser Settings</h3>

                    <label class="setting-label">
                        <span class="switch">
                            <input type="checkbox" id="use-discount-toggle" ${config.useDiscountPrice ? 'checked' : ''} aria-label="Use discounted price if available">
                            <span class="slider"></span>
                        </span>
                        Use Discounted Price if Available
                        <div class="tooltip" role="tooltip" tabindex="0">
                            <span class="sr-only">Help</span>?
                            <span class="tooltip-text">When enabled, the parser will use the discounted price instead of the original price if available.</span>
                        </div>
                    </label>
                </div>

                <div class="setting-group">
                    <h3>Keyboard Shortcuts</h3>
                    <p><kbd>Ctrl+M</kbd> - Toggle parser visibility</p>
                    <p><kbd>Esc</kbd> - Hide parser</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // Add Font Awesome for icons
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
    document.head.appendChild(fontAwesome);

    // DOM References
    const parserUI = document.getElementById('order-parser-ui');
    const parseBtn = document.getElementById('parse-btn');
    const calcBtn = document.getElementById('calc-btn');
    const cleanBtn = document.getElementById('clean-btn');
    const exportMdBtn = document.getElementById('export-md-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const saveBtn = document.getElementById('save-btn');
    const closeBtn = document.getElementById('close-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const resultTable = document.getElementById('result-table');
    const tableBody = resultTable.querySelector('tbody');
    const emptyState = document.getElementById('empty-state');
    const grandTotalEl = document.getElementById('grand-total');
    const useDiscountToggle = document.getElementById('use-discount-toggle');
    const autoShowToggle = document.getElementById('auto-show-toggle');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const rawOutput = document.getElementById('raw-output');
    const searchBox = document.getElementById('search-box');
    const loadingOverlay = document.getElementById('loading-overlay');
    const historyList = document.getElementById('history-list');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Make the parser draggable
    Sortable.create(parserUI, {
        handle: '#drag-handle',
        animation: 150
    });

    // Tab functionality
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');

            if (tab.dataset.tab === 'history') {
                renderHistory();
            }
        });
    });

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        config.darkMode = !config.darkMode;
        GM_setValue('parserDarkMode', config.darkMode);

        parserUI.classList.toggle('dark-mode');
        themeToggle.innerHTML = `<i class="fa ${config.darkMode ? 'fa-sun' : 'fa-moon'}"></i>`;
    });

    // Close button
    closeBtn.addEventListener('click', toggleGUI);

    // Sort functionality
    const tableHeaders = resultTable.querySelectorAll('th');
    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            sortResults(sortKey);
        });
    });

    // Search functionality
    searchBox.addEventListener('input', () => {
        filterResults(searchBox.value.trim().toLowerCase());
    });

    // Settings
    useDiscountToggle.addEventListener('change', function () {
        config.useDiscountPrice = this.checked;
        GM_setValue('parserUseDiscount', config.useDiscountPrice);
    });

    autoShowToggle.addEventListener('change', function () {
        config.autoShow = this.checked;
        GM_setValue('parserAutoShow', config.autoShow);
    });

    darkModeToggle.addEventListener('change', function () {
        config.darkMode = this.checked;
        GM_setValue('parserDarkMode', config.darkMode);

        parserUI.classList.toggle('dark-mode');
        themeToggle.innerHTML = `<i class="fa ${config.darkMode ? 'fa-sun' : 'fa-moon'}"></i>`;
    });

    // Helper functions
    function toggleGUI() {
        config.isVisible = !config.isVisible;
        parserUI.style.display = config.isVisible ? 'block' : 'none';
        GM_setValue('parserGuiVisible', config.isVisible);
    }

    function showLoading() {
        isProcessing = true;
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        isProcessing = false;
        loadingOverlay.style.display = 'none';
    }

    function enableButton(btn) {
        btn.disabled = false;
        btn.classList.remove('disabled');
    }

    function disableButton(btn) {
        btn.disabled = true;
        btn.classList.add('disabled');
    }

    function updateButtonStates(hasResults) {
        if (hasResults) {
            enableButton(calcBtn);
            enableButton(exportMdBtn);
            enableButton(exportCsvBtn);
            enableButton(cleanBtn);
            enableButton(saveBtn);
            disableButton(parseBtn);
            searchBox.style.display = 'block';
        } else {
            disableButton(calcBtn);
            disableButton(exportMdBtn);
            disableButton(exportCsvBtn);
            disableButton(cleanBtn);
            disableButton(saveBtn);
            enableButton(parseBtn);
            searchBox.style.display = 'none';
        }
    }

    function parseAllOrders() {
        showLoading();

        // Use setTimeout to prevent UI freezing
        setTimeout(() => {
            try {
                const allElements = Array.from(document.querySelectorAll('.UDaMW3, .DWVWOJ, .ylYzwa'));
                let shopName = null;
                results = [];

                for (let i = 0; i < allElements.length; i++) {
                    const el = allElements[i];
                    if (el.classList.contains('UDaMW3')) {
                        shopName = el.textContent.trim();
                    } else if (el.classList.contains('DWVWOJ') && shopName) {
                        const itemName = el.textContent.trim();
                        let priceEl = null;

                        for (let j = i + 1; j < Math.min(i + 10, allElements.length); j++) {
                            if (allElements[j].classList.contains('ylYzwa')) {
                                priceEl = allElements[j];
                                break;
                            }
                        }

                        let totalOrder = 0;
                        if (priceEl) {
                            const priceContainer = priceEl.querySelector('.YRp1mm');
                            const discountedEl = priceContainer?.querySelector('.nW_6Oi, .PNlXhK');
                            const originalEl = priceContainer?.querySelector('.q6Gzj5');

                            if (config.useDiscountPrice && discountedEl) {
                                totalOrder = parseInt(discountedEl.textContent.replace(/\D+/g, ''), 10) || 0;
                            } else if (originalEl) {
                                totalOrder = parseInt(originalEl.textContent.replace(/\D+/g, ''), 10) || 0;
                            } else {
                                const anyPrice = priceEl.querySelector('span');
                                totalOrder = parseInt(anyPrice?.textContent.replace(/\D+/g, '') || '0', 10);
                            }
                        }

                        results.push({
                            shopName,
                            itemName,
                            totalOrder: isNaN(totalOrder) ? 0 : totalOrder
                        });
                    }
                }

                updateUI();
                updateRawOutput();

                if (results.length > 0) {
                    updateButtonStates(true);
                    Swal.fire({
                        title: 'Success!',
                        text: `${results.length} orders parsed successfully.`,
                        icon: 'success',
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire({
                        title: 'No Orders Found',
                        text: 'No matching elements found on this page.',
                        icon: 'warning'
                    });
                }
            } catch (error) {
                console.error('Error parsing orders:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'An error occurred while parsing orders.',
                    icon: 'error'
                });
            } finally {
                hideLoading();
            }
        }, 100);
    }

    function updateUI() {
        if (results.length === 0) {
            emptyState.style.display = 'block';
            resultTable.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        resultTable.style.display = 'table';
        tableBody.innerHTML = '';

        results.forEach((item, i) => {
            const row = document.createElement('tr');
            row.dataset.index = i;

            const cellShop = document.createElement('td');
            cellShop.className = 'truncate';
            cellShop.title = item.shopName;
            cellShop.textContent = item.shopName;

            const cellItem = document.createElement('td');
            cellItem.className = 'truncate';
            cellItem.title = item.itemName;
            cellItem.textContent = item.itemName;

            const displayPrice = item.totalOrder > 0
                ? `Rp${item.totalOrder.toLocaleString()}`
                : 'Price not found';

            row.innerHTML = `<td>${i + 1}</td>`;
            row.appendChild(cellShop);
            row.appendChild(cellItem);
            row.innerHTML += `<td>${displayPrice}</td>`;
            tableBody.appendChild(row);
        });
    }

    function sortResults(key) {
        switch (key) {
            case 'index':
                // No sorting needed, default order
                break;
            case 'shop':
                results.sort((a, b) => a.shopName.localeCompare(b.shopName));
                break;
            case 'item':
                results.sort((a, b) => a.itemName.localeCompare(b.itemName));
                break;
            case 'price':
                results.sort((a, b) => b.totalOrder - a.totalOrder);
                break;
        }

        updateUI();
    }

    function filterResults(query) {
        if (!query) {
            Array.from(tableBody.rows).forEach(row => {
                row.style.display = '';
            });
            return;
        }

        Array.from(tableBody.rows).forEach(row => {
            const index = parseInt(row.dataset.index);
            const item = results[index];

            if (item.shopName.toLowerCase().includes(query) ||
                item.itemName.toLowerCase().includes(query) ||
                `Rp${item.totalOrder.toLocaleString()}`.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    function updateRawOutput() {
        let output = '';
        results.forEach(item => {
            output += `${item.shopName}\n`;
            output += `${item.itemName}\n`;
            output += `Rp${item.totalOrder.toLocaleString()}\n\n`;
        });
        rawOutput.value = output.trim();
    }

    function calculateGrandTotal() {
        const total = results.reduce((sum, item) => sum + item.totalOrder, 0);
        grandTotalEl.style.display = 'block';
        grandTotalEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>Grand Total</h3>
                <span style="font-size: 1.2rem; font-weight: bold; color: #4f46e5;">Rp${total.toLocaleString()}</span>
            </div>
        `;

        Swal.fire({
            title: 'Total Calculated',
            html: `<h3>Grand Total: <span style="color: #4f46e5;">Rp${total.toLocaleString()}</span></h3>`,
            icon: 'info'
        });
    }

    function cleanResults() {
        Swal.fire({
            title: 'Are you sure?',
            text: "This will clear all parsed data.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, clear it!'
        }).then((result) => {
            if (result.isConfirmed) {
                // Clear data
                results = [];

                // Clear UI
                updateUI();
                grandTotalEl.style.display = 'none';
                rawOutput.value = '';

                // Reset buttons
                updateButtonStates(false);

                Swal.fire(
                    'Cleared!',
                    'All parsed data has been cleared.',
                    'success'
                );
            }
        });
    }

    function exportMarkdown() {
        let md = "# Shopee Order Summary\n\n";
        md += "| No | Shop Name | Item Name | Total Order |\n";
        md += "|:--:|:----------|:----------|:------------:|\n";
        results.forEach((item, index) => {
            md += `| ${index + 1} | ${item.shopName} | ${item.itemName.replace(/\|/g, '\\|')} | Rp${item.totalOrder.toLocaleString()} |\n`;
        });

        const total = results.reduce((sum, item) => sum + item.totalOrder, 0);
        md += `\n## Grand Total: Rp${total.toLocaleString()}\n`;
        md += `\n_Generated on ${new Date().toLocaleString()}_\n`;

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shopee_orders_${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);

        Swal.fire({
            title: 'Export Complete',
            text: 'Markdown file has been downloaded.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }

    function exportCSV() {
        let csv = 'No;Shop Name;Item Name;Total Order\n';
        results.forEach((item, index) => {
            const cleanTotal = item.totalOrder;
            csv += `"${index + 1}";"${item.shopName.replace(/"/g, '""')}";`;
            csv += `"${item.itemName.replace(/"/g, '""')}";`;
            csv += `"${cleanTotal}"\n`;
        });

        // Grand total row
        const total = results.reduce((sum, item) => sum + item.totalOrder, 0);
        csv += `;;Grand Total;"${total}"`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shopee_orders_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        Swal.fire({
            title: 'Export Complete',
            text: 'CSV file has been downloaded.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }

    function saveToHistory() {
        const date = new Date();
        const historyEntry = {
            date: date.toISOString(),
            results: [...results],
            totalAmount: results.reduce((sum, item) => sum + item.totalOrder, 0)
        };

        const history = [...config.history];
        history.unshift(historyEntry);

        // Limit history to 20 entries
        if (history.length > 20) {
            history.pop();
        }

        config.history = history;
        GM_setValue('parserHistory', history);

        Swal.fire({
            title: 'Saved!',
            text: 'This order session has been saved to history.',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }

    function renderHistory() {
        if (!config.history || config.history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fa fa-history" aria-hidden="true"></i>
                    <p>No saved order history yet.</p>
                </div>
            `;
            return;
        }
        historyList.innerHTML = '';
        config.history.forEach((entry, index) => {
            const date = new Date(entry.date);
            const formattedDate = date.toLocaleString();
            const itemCount = entry.results.length;
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-date">${formattedDate}</div>
                <div style="display: flex; justify-content: space-between;">
                    <div>${itemCount} items</div>
                    <div>Total: <strong>Rp${entry.totalAmount.toLocaleString()}</strong></div>
                </div>
            `;
            historyItem.addEventListener('click', () => {
                Swal.fire({
                    title: `Order History - ${formattedDate}`,
                    html: `
                        <div style="text-align: left;">
                            <p><strong>Items:</strong> ${itemCount}</p>
                            <p><strong>Total:</strong> Rp${entry.totalAmount.toLocaleString()}</p>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Load This Data',
                    cancelButtonText: 'Close',
                    showDenyButton: true,
                    denyButtonText: 'Delete'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Load this history data
                        results = [...entry.results];
                        updateUI();
                        updateRawOutput();
                        updateButtonStates(true);
                                                // Switch to parser tab
                        tabs.forEach(t => t.classList.remove('active'));
                        tabContents.forEach(c => c.classList.remove('active'));
                        tabs[0].classList.add('active');
                        document.getElementById('parser-tab').classList.add('active');

                        Swal.fire('Loaded!', 'Historical data has been loaded.', 'success');
                    } else if (result.isDenied) {
                        // Delete this history entry
                        Swal.fire({
                            title: 'Delete this entry?',
                            text: "You won't be able to revert this!",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete it!'
                        }).then((confirmResult) => {
                            if (confirmResult.isConfirmed) {
                                const history = [...config.history];
                                history.splice(index, 1);
                                config.history = history;
                                GM_setValue('parserHistory', history);
                                renderHistory();
                                Swal.fire('Deleted!', 'History entry has been removed.', 'success');
                            }
                        });
                    }
                });
            });
            historyList.appendChild(historyItem);
        });
    }

    // Event listeners
    parseBtn.addEventListener('click', parseAllOrders);
    calcBtn.addEventListener('click', calculateGrandTotal);
    cleanBtn.addEventListener('click', cleanResults);
    exportMdBtn.addEventListener('click', exportMarkdown);
    exportCsvBtn.addEventListener('click', exportCSV);
    saveBtn.addEventListener('click', saveToHistory);

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
        if (e.key === 'm' && e.ctrlKey) {
            e.preventDefault();
            toggleGUI();
        } else if (e.key === 'Escape' && config.isVisible) {
            toggleGUI();
        }
    });

    // Initialize UI
    if (!config.autoShow) {
        parserUI.style.display = 'none';
    }
})();