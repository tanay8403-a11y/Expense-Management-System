// Load reports page
function loadReportsPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

            <!-- Left: Filters -->
            <div class="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                
                <div class="flex items-center gap-2">
                    <label class="text-xs font-semibold text-slate-500">Period</label>
                    <select id="reportPeriod"
                        class="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary">
                        <option value="current">Current</option>
                        <option value="1">Last Month</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="month">Custom</option>
                    </select>
                </div>

                <input id="reportMonth" type="month"
                    class="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border border-slate-300 dark:border-slate-700 hidden"/>

            </div>

            <!-- Right: Actions -->
            <div class="flex gap-2">
                <button id="generateReportBtn"
                    class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow hover:scale-105 transition">
                    Generate
                </button>

                <button id="downloadReportPdfBtn"
                    class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow hover:scale-105 transition">
                    Export PDF
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-semibold mb-3">Category Breakdown</h3>
                <div id="categoryReport" class="space-y-3 text-sm text-slate-800 dark:text-slate-200">
                    <p class="text-slate-500">Select a period and click Generate</p>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-semibold mb-3">Monthly Summary</h3>
                <div id="monthlyReport" class="space-y-3 text-sm text-slate-800 dark:text-slate-200">
                    <p class="text-slate-500">Select a period and click Generate</p>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-semibold mb-3">Month Analysis</h3>
                <div id="analysisReport" class="space-y-3 text-sm text-slate-800 dark:text-slate-200">
                    <p class="text-slate-500">Select a period and click Generate</p>
                </div>
            </div>
        </div>

        <!-- Graph Section -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 mt-4">
            <h3 class="text-lg font-semibold mb-3">Expense Trend</h3>
            <canvas id="expenseGraphChart" style="max-height: 300px;"></canvas>
        </div>

        <div class="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 mt-4">
            <h3 class="text-lg font-semibold mb-3">Expenses Table</h3>
            <div id="expensesReport" class="overflow-x-auto text-sm text-slate-800 dark:text-slate-200">
                <p class="text-slate-500">Generate report to view expense table</p>
            </div>
        </div>
    `;

    let cachedReport = null;

    const generateReport = () => {
        const reportPeriod = document.getElementById('reportPeriod').value;
        const monthInput = document.getElementById('reportMonth').value;

        fetch("http://127.0.0.1:5000/expenses", { headers: getHeaders() })
            .then(res => res.json())
            .then(data => {
                let startDate;
                let endDate;

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (reportPeriod === 'current') {
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today);
                } 
                else if (reportPeriod === '1') {
                    // ✅ FIXED: Last Month
                    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                } 
                else if (reportPeriod === 'month') {
                    if (!monthInput) {
                        alert('Please select a month to generate this report.');
                        return;
                    }
                    const [year, month] = monthInput.split('-').map(Number);
                    startDate = new Date(year, month - 1, 1);
                    endDate = new Date(year, month, 0);
                } 
                else {
                    // Last 6 / 12 months
                    const monthsBack = Number(reportPeriod);

                    startDate = new Date(today.getFullYear(), today.getMonth() - monthsBack + 1, 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                }

                const filtered = data.filter(exp => {
                    const expDate = new Date(exp.date + 'T00:00:00');
                    return expDate >= startDate && expDate <= endDate;
                });

                const categoryTotals = {};
                const monthTotals = {};
                let total = 0;

                filtered.forEach(exp => {
                    const amount = Number(exp.amount);
                    total += amount;

                    const cat = exp.category || 'Other';
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;

                    const d = new Date(exp.date + 'T00:00:00');
                    const monthKey = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    monthTotals[monthKey] = (monthTotals[monthKey] || 0) + amount;
                });

                const sortedMonths = Object.keys(monthTotals).sort((a, b) => {
                    const [amonth, ayear] = a.split(' ');
                    const [bmonth, byear] = b.split(' ');
                    const aDate = new Date(`${amonth} 1, ${ayear}`);
                    const bDate = new Date(`${bmonth} 1, ${byear}`);
                    return aDate - bDate;
                });

                const categoryHtml = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                    const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                    return `<div class="flex justify-between"><span>${cat}</span><span class="font-semibold">₹${val.toFixed(2)} (${percentage}%)</span></div>`;
                }).join('') || '<p class="text-slate-500">No data</p>';

                document.getElementById('categoryReport').innerHTML = categoryHtml;

                const monthsCount = Math.max(1, sortedMonths.length);
                const avgMonthly = total / monthsCount;
                const avgDaily = total / ((endDate - startDate) / (1000 * 60 * 60 * 24) + 1);
                const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
                const highestCategoryPercentage = total > 0 ? ((highestCategory[1] / total) * 100).toFixed(2) : 0;

                let analysisHtml = '';
                sortedMonths.forEach(month => {
                    const value = monthTotals[month];
                    analysisHtml += `<div class="flex justify-between"><span>${month}</span><strong>₹${value.toFixed(2)}</strong></div>`;
                });
                if (!analysisHtml) analysisHtml = '<p class="text-slate-500">No monthly data</p>';
                document.getElementById('analysisReport').innerHTML = analysisHtml;

                const expensesHtml = filtered.length > 0
                    ? `<table class="w-full text-left border-collapse">
                        <thead class="bg-slate-100 dark:bg-slate-800"><tr><th class="px-2 py-1 border">Date</th><th class="px-2 py-1 border">Category</th><th class="px-2 py-1 border">Description</th><th class="px-2 py-1 border text-right">Amount</th></tr></thead>
                        <tbody>${filtered.map(exp => `<tr><td class="px-2 py-1 border">${exp.date}</td><td class="px-2 py-1 border">${exp.category}</td><td class="px-2 py-1 border">${exp.description}</td><td class="px-2 py-1 border text-right">₹${Number(exp.amount).toFixed(2)}</td></tr>`).join('')}</tbody>
                    </table>`
                    : '<p class="text-slate-500">No expenses in this period.</p>';

                document.getElementById('expensesReport').innerHTML = expensesHtml;

                // ✅ Draw the expense graph
                drawExpenseGraph(filtered, startDate, endDate, monthTotals, sortedMonths);

                // ✅ FIX: cachedReport is now set INSIDE the savings fetch,
                // after savingsTotal is resolved — not before.
                fetch("http://127.0.0.1:5000/get-budget", { headers: getHeaders() })
                    .then(res => res.json())
                    .then(budget => {
                        const savingsTotal = budget.savings_total || 0;

                        const summaryHtml = `
                            <div class="space-y-2">
                                <div class="flex justify-between"><span>Total spent</span><strong>₹${total.toFixed(2)}</strong></div>
                                <div class="flex justify-between"><span>Average monthly</span><strong>₹${avgMonthly.toFixed(2)}</strong></div>
                                <div class="flex justify-between"><span>Average daily</span><strong>₹${avgDaily.toFixed(2)}</strong></div>
                                <div class="flex justify-between"><span>Highest category</span><strong>${highestCategory[0]} (${highestCategoryPercentage}%)</strong></div>
                                <div class="flex justify-between"><span>Total Savings Till Now</span><strong>₹${savingsTotal.toFixed(2)}</strong></div>
                                <div class="flex justify-between"><span>Period</span><strong>${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</strong></div>
                            </div>`;

                        document.getElementById('monthlyReport').innerHTML = summaryHtml;

                        cachedReport = {
                            period: reportPeriod === 'month' ? null : Number(reportPeriod),
                            month: reportPeriod === 'month' ? monthInput : null,
                            startDate: startDate.toISOString().split('T')[0],
                            endDate: endDate.toISOString().split('T')[0],
                            total,
                            monthsCount,
                            avgMonthly,
                            avgDaily,
                            savingsTotal,       // ✅ real value, not 0
                            categories: categoryTotals,
                            months: monthTotals,
                            expenses: filtered,
                            highestCategory,
                            highestCategoryPercentage,
                        };
                    })
                    .catch(err => {
                        console.error('Error fetching savings:', err);

                        const summaryHtml = `
                            <div class="space-y-2">
                                <div class="flex justify-between"><span>Total spent</span><strong>₹${total.toFixed(2)}</strong></div>
                                <div class="flex justify-between"><span>Average monthly</span><strong>₹${avgMonthly.toFixed(2)}</strong></div>
                                <div class="flex justify-between"><span>Average daily</span><strong>₹${avgDaily.toFixed(2)}</strong></div>
                                <div class="flex justify-between"><span>Highest category</span><strong>${highestCategory[0]}</strong></div>
                                <div class="flex justify-between"><span>Total Savings Till Now</span><strong>₹0.00</strong></div>
                                <div class="flex justify-between"><span>Period</span><strong>${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</strong></div>
                            </div>`;

                        document.getElementById('monthlyReport').innerHTML = summaryHtml;

                        // ✅ Also set cachedReport in catch so PDF still works,
                        // just with savingsTotal = 0 as a genuine fallback.
                        cachedReport = {
                            period: reportPeriod === 'month' ? null : Number(reportPeriod),
                            month: reportPeriod === 'month' ? monthInput : null,
                            startDate: startDate.toISOString().split('T')[0],
                            endDate: endDate.toISOString().split('T')[0],
                            total,
                            monthsCount,
                            avgMonthly,
                            avgDaily,
                            savingsTotal: 0,
                            categories: categoryTotals,
                            months: monthTotals,
                            expenses: filtered,
                            highestCategory,
                            highestCategoryPercentage,
                        };
                    });
            })
            .catch(err => {
                console.error('Error:', err);
                document.getElementById('categoryReport').innerHTML = '<p class="text-red-500">Failed to load category data</p>';
                document.getElementById('monthlyReport').innerHTML = '<p class="text-red-500">Failed to load summary</p>';
                document.getElementById('analysisReport').innerHTML = '<p class="text-red-500">Failed to load analysis</p>';
                cachedReport = null;
            });
    };

    const downloadReportPdf = async () => {
        if (!cachedReport) {
            alert('Generate the report first before downloading.');
            return;
        }

        const loadScript = (src) => new Promise((resolve, reject) => {
            const existing = Array.from(document.scripts).find(s => s.src === src);
            if (existing) {
                if (existing.dataset.loaded === 'true') return resolve();
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('Failed to load script')), { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => {
                script.dataset.loaded = 'true';
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load script'));
            document.head.appendChild(script);
        });

        try {
            if (!window.jspdf || !window.jspdf.jsPDF) {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            if (typeof window.jspdf?.jsPDF?.API?.autoTable !== 'function') {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
            }
        } catch (err) {
            console.error('PDF library load failed:', err);
            showPopup('Could not load PDF library. Please check internet and retry.', 'error', 5000);
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const left = 14;
        const right = 196;

        const username = localStorage.getItem('username') || 'Guest';
        const highestCategory = cachedReport.highestCategory?.[0] || 'N/A';
        const highestPercent = cachedReport.highestCategoryPercentage || 0;
        const generatedAt = new Date().toLocaleString();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('Expense Report', left, 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Generated: ${generatedAt}`, left, 22);
        doc.text(`User: ${username}`, left, 27);
        doc.text(`Period: ${cachedReport.startDate} to ${cachedReport.endDate}`, left, 32);

        doc.setDrawColor(220, 220, 220);
        doc.line(left, 35, right, 35);

        doc.setFontSize(11);
        doc.text(`Total Spent: INR ${cachedReport.total.toFixed(2)}`, left, 42);
        doc.text(`Total Savings Till Now: INR ${(cachedReport.savingsTotal || 0).toFixed(2)}`, left, 48);
        doc.text(`Average Monthly: INR ${cachedReport.avgMonthly.toFixed(2)}`, left, 54);
        doc.text(`Average Daily: INR ${cachedReport.avgDaily.toFixed(2)}`, left, 60);
        doc.text(`Highest Category: ${highestCategory} (${highestPercent}%)`, left, 66);

        let cursorY = 74;

        // Add chart snapshot if available
        const chartCanvas = document.getElementById('expenseGraphChart');
        if (chartCanvas && chartCanvas.offsetParent !== null) {
            try {
                const chartImage = chartCanvas.toDataURL('image/png');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text('Expense Trend', left, cursorY);
                cursorY += 3;
                doc.addImage(chartImage, 'PNG', left, cursorY, 182, 58);
                cursorY += 64;
            } catch (err) {
                console.warn('Chart image export failed:', err);
            }
        }

        const categoryRows = Object.entries(cachedReport.categories || {}).map(([cat, amt]) => {
            const percentage = cachedReport.total > 0 ? ((amt / cachedReport.total) * 100).toFixed(1) : '0.0';
            return [cat, `INR ${Number(amt).toFixed(2)}`, `${percentage}%`];
        });

        const monthRows = Object.entries(cachedReport.months || {}).map(([month, amt]) => [
            month,
            `INR ${Number(amt).toFixed(2)}`,
        ]);

        const expenseRows = (cachedReport.expenses || []).map(exp => [
            exp.date,
            exp.category,
            exp.description,
            `INR ${Number(exp.amount).toFixed(2)}`,
        ]);

        doc.autoTable({
            head: [['Category', 'Amount', 'Percent']],
            body: categoryRows.length ? categoryRows : [['No data', '-', '-']],
            startY: cursorY,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [37, 106, 244] },
        });

        doc.autoTable({
            head: [['Month', 'Amount']],
            body: monthRows.length ? monthRows : [['No data', '-']],
            startY: doc.lastAutoTable.finalY + 6,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [16, 185, 129] },
        });

        doc.autoTable({
            head: [['Date', 'Category', 'Description', 'Amount']],
            body: expenseRows.length ? expenseRows : [['No data', '-', '-', '-']],
            startY: doc.lastAutoTable.finalY + 6,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.8 },
            headStyles: { fillColor: [99, 102, 241] },
            columnStyles: {
                2: { cellWidth: 78 },
            },
        });

        const safeDate = new Date().toISOString().slice(0, 10);
        doc.save(`expense-report-${safeDate}.pdf`);
        showPopup('PDF downloaded successfully', 'success', 3500);
    };

    const reportPeriodSelect = document.getElementById('reportPeriod');
    const reportMonthInput = document.getElementById('reportMonth');

    reportPeriodSelect.addEventListener('change', () => {
        if (reportPeriodSelect.value === 'month') {
            reportMonthInput.classList.remove('hidden');
        } else {
            reportMonthInput.classList.add('hidden');
        }
    });

    document.getElementById('generateReportBtn').addEventListener('click', () => {
        generateReport();
    });

    document.getElementById('downloadReportPdfBtn').addEventListener('click', downloadReportPdf);

    // Auto-generate default report
    generateReport();
}

// ---------------- BUDGET MODAL ---------------- //

function openBudgetModal() {
    const modal = document.getElementById('budgetModal');
    if (!modal) return;

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('budgetMonth').value = month;

    document.getElementById('modalMonthlyBudget').value = '';
    document.getElementById('modalDailyLimit').value = '';
    const err = document.getElementById('budgetModalError');
    err.textContent = '';
    err.classList.add('hidden');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    setTimeout(() => document.getElementById('modalMonthlyBudget').focus(), 50);

    function onKey(e) {
        if (e.key === 'Escape') { closeBudgetModal(); document.removeEventListener('keydown', onKey); }
    }
    document.addEventListener('keydown', onKey);
}

function closeBudgetModal() {
    const modal = document.getElementById('budgetModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function submitBudget() {
    const btn = document.getElementById('saveBudgetBtn');
    const errEl = document.getElementById('budgetModalError');

    const month          = document.getElementById('budgetMonth').value;
    const monthly_budget = parseFloat(document.getElementById('modalMonthlyBudget').value);
    const daily_limit    = parseFloat(document.getElementById('modalDailyLimit').value);

    if (!month || isNaN(monthly_budget) || isNaN(daily_limit) ||
        monthly_budget <= 0 || daily_limit <= 0) {
        errEl.textContent = 'Please fill all fields with valid amounts.';
        errEl.classList.remove('hidden');
        return;
    }

    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    fetch('http://127.0.0.1:5000/set-budget', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ month, monthly_budget, daily_limit })
    })
    .then(res => res.json())
    .then(response => {
        btn.disabled = false;
        btn.textContent = 'Save Budget';

        if (response.message === 'saved') {
            if (response.budget_email === 'sent') {
                if (typeof showPopup === 'function') {
                    showPopup('Budget saved and notification email sent.', 'success', 4000);
                }
            } else if (response.budget_email) {
                if (typeof showPopup === 'function') {
                    showPopup('Budget saved, but email notification was not sent.', 'warning', 5000);
                }
                console.warn('Budget email status:', response.budget_email);
            }
            closeBudgetModal();
            loadExpenses();
            loadChartData();
        } else {
            errEl.textContent = 'Error: ' + (response.message || 'Unknown error');
            errEl.classList.remove('hidden');
        }
    })
    .catch(err => {
        btn.disabled = false;
        btn.textContent = 'Save Budget';
        errEl.textContent = 'Network error: ' + err.message;
        errEl.classList.remove('hidden');
    });
}



function checkMonthlyBudgetPopup() {
    fetch('http://127.0.0.1:5000/get-budget', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            if (!data.monthly_budget || data.monthly_budget === 0) {
                openBudgetModal();
            }
        })
        .catch(() => {
            openBudgetModal();
        });
}

const isNewMonth = checkMonthReset();
function checkMonthReset() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear  = now.getFullYear();

    const savedMonth = localStorage.getItem("app_month");
    const savedYear  = localStorage.getItem("app_year");

    if (
        savedMonth === null ||
        Number(savedMonth) !== currentMonth ||
        Number(savedYear) !== currentYear
    ) {
        // 🔥 New month detected
        localStorage.setItem("app_month", currentMonth);
        localStorage.setItem("app_year", currentYear);

        // Clear old cached values if any
        localStorage.removeItem("monthlyTotal");
        localStorage.removeItem("todayTotal");

        return true;
    }

    return false;
}

// ============================================================
// Draw Expense Graph
// ============================================================
function drawExpenseGraph(filteredExpenses, startDate, endDate, monthTotals, sortedMonths) {
    const canvas = document.getElementById('expenseGraphChart');
    if (!canvas) return;

    // Determine if we should show daily or monthly view
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    let labels = [];
    let values = [];

    if (daysDiff <= 31) {
        // Daily view (FIXED)
        const dailyTotals = {};

        // Fill only actual data
        filteredExpenses.forEach(exp => {
            const date = exp.date;
            if (!dailyTotals[date]) {
                dailyTotals[date] = 0;
            }
            dailyTotals[date] += Number(exp.amount);
        });

        // Sort only existing dates
        const sortedDates = Object.keys(dailyTotals).sort();

        sortedDates.forEach(date => {
            const dateObj = new Date(date + 'T00:00:00');
            labels.push(dateObj.getDate());  // 5, 6, 10, etc.
            values.push(dailyTotals[date]);
        });
    } else {
        // Monthly view for multiple months
        labels = sortedMonths.map(month => month.substring(0, 3)); // "Jan", "Feb", etc.
        values = sortedMonths.map(month => monthTotals[month] || 0);
    }

    // Destroy existing chart if any
    if (window.expenseChart instanceof Chart) {
        window.expenseChart.destroy();
    }

    // Create new chart
    const ctx = canvas.getContext('2d');
    window.expenseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: daysDiff <= 31 ? 'Daily Expenses' : 'Monthly Expenses',
                data: values,
                borderColor: '#256af4',
                backgroundColor: 'rgba(37, 106, 244, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#256af4',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#1e293b',
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toFixed(0);
                        },
                        color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#64748b'
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(100, 116, 139, 0.1)' : 'rgba(203, 213, 225, 0.5)'
                    }
                },
                x: {
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#64748b'
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(100, 116, 139, 0.1)' : 'rgba(203, 213, 225, 0.5)'
                    }
                }
            }
        }
    });
}