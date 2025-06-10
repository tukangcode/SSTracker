// ==UserScript==
// @name         Shopee Advanced Order Parser - v3.5 
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Parsed shop name,item buy and total pesanan then calculate it and you can export it as markdown or csv for further analysis or edit
// @author       You
// @match        https://*shopee.co.id/*
// @grant        none
// @license MIT
// ==/UserScript==
 
(function () {
    'use strict';
 
    let isVisible = JSON.parse(localStorage.getItem('parserGuiVisible')) ?? true;
    let autoShow = JSON.parse(localStorage.getItem('parserAutoShow')) ?? true;
    let useDiscountPrice = JSON.parse(localStorage.getItem('parserUseDiscount')) ?? true;
 
    const guiStyle = `
        <style>
            #order-parser-ui {
                position: fixed; top: 20px; right: 20px; width: 550px; background: white;
                border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.2); z-index: 99999;
                font-family: sans-serif; padding: 20px; max-height: 90vh; overflow-y: auto;
                display: ${isVisible ? 'block' : 'none'};
                transition: opacity 0.3s ease;
            }
            #order-parser-ui h2 { margin-top: 0; font-size: 1.2rem; color: #4f46e5; }
            .btn { display: inline-block; padding: 8px 12px; margin-right: 10px; margin-bottom: 10px;
                background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer;
                font-size: 0.9rem;
            }
            .btn:hover { background: #3730a3; }
            .btn.disabled { background: #ccc; cursor: not-allowed; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85rem; }
            th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
            .truncate { max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: help; }
            pre { margin-top: 10px; background: #f5f5f5; padding: 10px; border-radius: 6px; overflow-x: auto; }
            .setting-label { font-size: 0.85rem; margin-top: 10px; display: block; }
            textarea#raw-output { width: 100%; height: 150px; margin-top: 10px; font-family: monospace; font-size: 0.9rem;
                padding: 10px; border: 1px solid #ccc; border-radius: 6px; resize: vertical; white-space: pre-wrap;
            }
        </style>
    `;
 
    const guiHTML = `
        <div id="order-parser-ui">
            ${guiStyle}
            <h2>Shopee Order Parser</h2>
            <button class="btn" id="parse-btn">Parse Orders</button>
            <button class="btn disabled" id="calc-btn" disabled>Calculate Grand Total</button>
            <button class="btn disabled" id="clean-btn" disabled>Clean</button>
            <button class="btn disabled" id="export-md-btn" disabled>Export Markdown</button>
            <button class="btn disabled" id="export-csv-btn" disabled>Export CSV</button>
            <label class="setting-label">
                <input type="checkbox" id="use-discount-toggle" ${useDiscountPrice ? 'checked' : ''}>
                Use Discounted Price if Available
            </label>
            <label class="setting-label">
                <input type="checkbox" id="auto-show-toggle" ${autoShow ? 'checked' : ''}>
                Show GUI Automatically on Page Load
            </label>
            <table id="result-table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Shop Name</th>
                        <th>Item Name</th>
                        <th>Total Order</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <pre id="grand-total" style="display:none;"></pre>
            <h3 style="margin-top: 20px;">Raw Parsed Output</h3>
            <textarea id="raw-output" readonly placeholder="Parsed shop name, item, and total will appear here..."></textarea>
        </div>
    `;
 
    const container = document.createElement('div');
    container.innerHTML = guiHTML;
    document.body.appendChild(container);
 
    // DOM References
    const parseBtn = document.getElementById('parse-btn');
    const calcBtn = document.getElementById('calc-btn');
    const cleanBtn = document.getElementById('clean-btn');
    const exportMdBtn = document.getElementById('export-md-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const resultTable = document.getElementById('result-table').querySelector('tbody');
    const grandTotalEl = document.getElementById('grand-total');
    const useDiscountToggle = document.getElementById('use-discount-toggle');
    const autoShowToggle = document.getElementById('auto-show-toggle');
    const rawOutput = document.getElementById('raw-output');
 
    let results = [];
 
    // Settings
    useDiscountToggle.addEventListener('change', function () {
        useDiscountPrice = this.checked;
        localStorage.setItem('parserUseDiscount', useDiscountPrice);
    });
 
    autoShowToggle.addEventListener('change', function () {
        autoShow = this.checked;
        localStorage.setItem('parserAutoShow', autoShow);
    });
 
    function toggleGUI() {
        isVisible = !isVisible;
        document.getElementById('order-parser-ui').style.display = isVisible ? 'block' : 'none';
        localStorage.setItem('parserGuiVisible', isVisible);
    }
 
    window.addEventListener('keydown', e => {
        if (e.key === 'm' && e.ctrlKey) toggleGUI();
    });
 
    if (!autoShow && !isVisible) {
        document.getElementById('order-parser-ui').style.display = 'none';
    }
 
    function enableButton(btn) {
        btn.disabled = false;
        btn.classList.remove('disabled');
        btn.style.background = '#4f46e5';
    }
 
    function disableButton(btn) {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.style.background = '#ccc';
    }
 
    function parseAllOrders() {
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
 
                    if (useDiscountPrice && discountedEl) {
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
            enableButton(calcBtn);
            enableButton(exportMdBtn);
            enableButton(exportCsvBtn);
            enableButton(cleanBtn); // Enable Clean after parsing
            disableButton(parseBtn);
        } else {
            alert("No matching elements found.");
        }
    }
 
    function updateUI() {
        resultTable.innerHTML = '';
        results.forEach((item, i) => {
            const row = document.createElement('tr');
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
            resultTable.appendChild(row);
        });
    }
 
    function updateRawOutput() {
        let output = '';
        results.forEach(item => {
            output += `${item.shopName}\n`;
            output += `${item.itemName}\n`;
            output += `Rp${item.totalOrder.toLocaleString()}\n`;
        });
        rawOutput.value = output.trim();
    }
 
    function calculateGrandTotal() {
        const total = results.reduce((sum, item) => sum + item.totalOrder, 0);
        grandTotalEl.style.display = 'block';
        grandTotalEl.textContent = `Grand Total: Rp${total.toLocaleString()}`;
    }
 
    function cleanResults() {
        // Clear data
        results = [];
 
        // Clear UI
        resultTable.innerHTML = '';
        grandTotalEl.style.display = 'none';
        rawOutput.value = '';
 
        // Reset buttons
        disableButton(calcBtn);
        disableButton(exportMdBtn);
        disableButton(exportCsvBtn);
        disableButton(cleanBtn); // Disable Clean again
        enableButton(parseBtn);   // Re-enable Parse
    }
 
    function exportMarkdown() {
        let md = "# Order Summary\n";
        md += "| No | Shop Name         | Item Name | Total Order |\n";
        md += "|----|-------------------|-----------|-------------|\n";
        results.forEach((item, index) => {
            md += `| ${index + 1} | ${item.shopName} | ${item.itemName.replace('|', '\\|')} | Rp${item.totalOrder.toLocaleString()} |\n`;
        });
        md += `\n## Grand Total: Rp${results.reduce((sum, item) => sum + item.totalOrder, 0).toLocaleString()}\n`;
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'order_summary.md';
        a.click();
        URL.revokeObjectURL(url);
    }
 
    function exportCSV() {
        let csv = 'No,Shop Name,Item Name,Total Order\n';
        results.forEach((item, index) => {
            csv += `"${index + 1}","${item.shopName.replace(/"/g, '""')}",`;
            csv += `"${item.itemName.replace(/"/g, '""')}",`;
            csv += `"Rp${item.totalOrder.toLocaleString()}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'order_summary.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
 
    // Event listeners
    parseBtn.addEventListener('click', parseAllOrders);
    calcBtn.addEventListener('click', calculateGrandTotal);
    cleanBtn.addEventListener('click', cleanResults);
    exportMdBtn.addEventListener('click', exportMarkdown);
    exportCsvBtn.addEventListener('click', exportCSV);
 
})();
