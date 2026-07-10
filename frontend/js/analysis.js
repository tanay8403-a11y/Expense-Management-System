
// Load analysis page (new, styled like dashboard)
function loadAnalysisPage() {
    const mainContent = document.getElementById("mainContent");

    mainContent.innerHTML = `
<!-- Dashboard Canvas -->
<div class="p-8 space-y-8 max-w-[1400px] mx-auto w-full">

<!-- Current Month Display — Hero Banner -->
<section class="relative overflow-hidden rounded-2xl" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f2847 100%);">
    <!-- Decorative background rings -->
    <div style="position:absolute;top:-60px;right:-60px;width:260px;height:260px;border-radius:50%;border:1.5px solid rgba(37,106,244,0.18);pointer-events:none;"></div>
    <div style="position:absolute;top:-30px;right:-30px;width:160px;height:160px;border-radius:50%;border:1.5px solid rgba(37,106,244,0.28);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-40px;left:180px;width:120px;height:120px;border-radius:50%;border:1px solid rgba(37,106,244,0.12);pointer-events:none;"></div>
    <!-- Glow blob -->
    <div style="position:absolute;top:0;right:60px;width:180px;height:100%;background:radial-gradient(ellipse at center, rgba(37,106,244,0.13) 0%, transparent 70%);pointer-events:none;"></div>

    <div class="relative flex flex-wrap items-center justify-between gap-6 px-8 py-6">
        <!-- Left: Month identity -->
        <div class="flex items-center gap-5">
            <!-- Calendar icon block -->
            <div style="width:56px;height:56px;border-radius:14px;background:rgba(37,106,244,0.18);border:1px solid rgba(37,106,244,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
                <div style="font-size:9px;font-weight:800;letter-spacing:0.12em;color:#6fa3ff;text-transform:uppercase;line-height:1;">month</div>
                <div style="font-size:22px;font-weight:900;color:#fff;line-height:1.1;" id="calendarDay">
                    <!-- filled by JS -->
                </div>
            </div>
            <!-- Month + year text -->
            <div>
                <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6fa3ff;margin-bottom:2px;">Viewing Period</div>
                <div style="display:flex;align-items:baseline;gap:10px;">
                    <span id="currentMonthDisplay" style="font-size:2rem;font-weight:900;color:#fff;letter-spacing:-0.02em;line-height:1;">April</span>
                    <span id="currentYearDisplay" style="font-size:1.1rem;font-weight:600;color:rgba(255,255,255,0.45);"></span>
                </div>
                <!-- Live date pill -->
                <div style="margin-top:5px;display:inline-flex;align-items:center;gap:6px;background:rgba(37,106,244,0.2);border:1px solid rgba(37,106,244,0.4);border-radius:999px;padding:2px 10px;">
                    <span style="width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80;display:inline-block;"></span>
                    <span id="liveDateLabel" style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.75);"></span>
                </div>
            </div>
        </div>
         <div class="flex items-center gap-3">
        <select id="monthSelector" class="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-800 text-sm font-medium text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition">
            <option value="current">This month</option>
            <option value="last">Last month</option>
            <option value="custom">Choose month</option>
        </select>
        <input id="customMonthInput" type="month" class="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-800 text-sm font-medium text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition hidden" />
    </div>
</section>

<!-- GRID -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-8">

<!-- LEFT METRICS -->
<div class="lg:col-span-4 space-y-8">

    <!-- AVG + PERFORMANCE -->
    <div class="bg-surface-container-lowest p-8 rounded-xl space-y-6">
        <div>
            <h3 class="text-sm text-on-surface-variant">Average Daily Expense</h3>
            <!-- ✅ FIX 1: id kept same, colour applied via JS inside Promise.all -->
            <div class="text-4xl font-bold transition-colors duration-300" id="avgDaily">₹0</div>
        </div>
        <div class="pt-6 border-t">
            <h3 class="text-sm text-on-surface-variant">Monthly Performance</h3>
            <div id="monthlyPerformance" class="text-lg font-bold mt-2">0%</div>
        </div>
    </div>

    <!-- HIGHEST -->
    <div class="bg-surface-container-lowest p-8 rounded-xl">
        <h3 class="text-sm text-on-surface-variant">Highest Expense</h3>
        <!-- ✅ FIX 2: amber highlight applied via JS -->
        <div class="text-4xl font-bold transition-colors duration-300" id="highestExpense">₹0</div>
        <p id="highestCategory" class="text-sm text-on-surface-variant mt-1"></p>
    </div>

    <!-- PROJECTED -->
    <div class="bg-surface-container-lowest p-8 rounded-xl">
        <h3 class="text-sm text-on-surface-variant">Projected Monthly</h3>
        <!-- ✅ FIX 3: red when > budget, applied via JS inside Promise.all -->
        <div class="text-4xl font-bold transition-colors duration-300" id="projectedExpense">₹0</div>
    </div>

</div>

<!-- RIGHT SECTION -->
<div class="lg:col-span-8 flex flex-col gap-8">

    <!-- TREND -->
    <div class="bg-surface-container-lowest p-8 rounded-xl">
        <h2 class="text-xl font-bold mb-4">Expense Trends</h2>
        <canvas id="trendChart" height="120"></canvas>
    </div>

    <!-- INSIGHT -->
<div class="bg-primary text-white p-6 rounded-xl flex flex-col" style="max-height: 220px;">
    <div class="flex items-center justify-between mb-3 shrink-0">
        <h3 class="text-lg font-bold">Intelligent Insights</h3>
    </div>
    <ul id="insightsList" class="text-sm space-y-1 overflow-y-auto flex-1 pr-1"
        style="scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.3) transparent;">
    </ul>
</div>

<!-- INSIGHTS POPUP MODAL -->
<div id="insightsPopup" class="fixed inset-0 z-50 hidden items-center justify-center p-4"
    style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">
    <div class="bg-surface-container-lowest rounded-2xl w-full max-w-lg flex flex-col"
        style="max-height: 85vh;">

        <!-- Popup Header -->
        <div class="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
            <div>
                <h2 class="text-xl font-bold">Intelligent Insights</h2>
                <p class="text-xs text-on-surface-variant mt-0.5">Full analysis for this month</p>
            </div>
            <button onclick="closeInsightsPopup()"
                class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition text-on-surface-variant text-lg font-bold">
                ✕
            </button>
        </div>

        <!-- Popup Body -->
        <ul id="insightsListFull"
            class="text-sm space-y-1 overflow-y-auto flex-1 p-6"
            style="scrollbar-width: thin;">
        </ul>

        <!-- Popup Footer -->
        <div class="p-4 border-t border-white/10 shrink-0 text-center">
            <button onclick="closeInsightsPopup()"
                class="px-6 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition">
                Close
            </button>
        </div>
    </div>
</div>

</div>

<!-- CATEGORY -->
<div class="lg:col-span-7 bg-surface-container-lowest p-8 rounded-xl">
    <h2 class="text-xl font-bold mb-6">Category Breakdown</h2>
    <div id="categoryBreakdown" class="space-y-4"></div>
</div>

<!-- PIE -->
<div class="lg:col-span-5 bg-surface-container-lowest p-8 rounded-xl">
    <h2 class="text-xl font-bold mb-6">Expense Distribution</h2>
    <canvas id="categoryChart"></canvas>
</div>

</div>
</div>
    `;

    // ── Define update function ────────────────────────────────────────────
    function mapMonthParam(month) {
        if (month === 'current') return '0';
        if (month === 'last') return '1';
        return month;
    }

    function getPreviousMonthParam(month) {
        if (month === 'current') return '1';

        const now = new Date();
        let baseDate;

        if (month === 'last') {
            baseDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        } else {
            const [year, monthNum] = String(month).split('-').map(Number);
            if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
                return '1';
            }
            baseDate = new Date(year, monthNum - 1, 1);
        }

        const previous = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
        return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
    }

    function updateAnalysisPage(month = 'current') {
        const monthParam = mapMonthParam(month);
        const comparisonMonthParam = getPreviousMonthParam(month);
        fetch(`http://127.0.0.1:5000/expenses?month=${monthParam}`, { headers: getHeaders() })
            .then(res => res.json())
            .then(expenses => {

                // ── Core calculations ─────────────────────────────────────
                let total = 0, days = new Set(), highest = 0, highestCat = '', catTotals = {};
                expenses.forEach(exp => {
                    let amt = Number(exp.amount);
                    total += amt;
                    days.add(exp.date);
                    if (amt > highest) { highest = amt; highestCat = exp.category; }
                    catTotals[exp.category] = (catTotals[exp.category] || 0) + amt;
                });

                let now         = new Date();
                let daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                let currentDay  = now.getDate();
                let avgDaily    = days.size ? (total / days.size) : 0;
                let projected   = avgDaily * daysInMonth;

                // ✅ FIX 2 — Highest Expense: always amber highlight
                const highestEl = document.getElementById('highestExpense');
                highestEl.textContent = '₹' + highest.toFixed(2);
                highestEl.className = 'text-4xl font-bold transition-colors duration-300 text-amber-400';

                document.getElementById('highestCategory').textContent = highestCat || 'N/A';

                // ── Category breakdown bars ───────────────────────────────
                let categoryHTML = '';
                const CAT_COLORS = {
                    food: '#256af4', travel: '#f59e0b', bills: '#10b981',
                    housing: '#ef4444', shopping: '#8b5cf6', other: '#ec4899'
                };
                for (let [cat, amt] of Object.entries(catTotals)) {
                    let percent = total > 0 ? (amt / total * 100) : 0;
                    let color = CAT_COLORS[cat.toLowerCase()] || '#256af4';
                    categoryHTML += `
                        <div>
                            <div class="flex justify-between text-sm mb-1">
                                <span class="font-medium">${cat}</span>
                                <span>₹${amt.toFixed(0)} <span class="opacity-60">(${percent.toFixed(1)}%)</span></span>
                            </div>
                            <div class="w-full bg-surface-container-low rounded-full h-2">
                                <div class="rounded-full h-2 transition-all duration-500" style="width:${percent}%; background:${color}"></div>
                            </div>
                        </div>`;
                }
                document.getElementById('categoryBreakdown').innerHTML = categoryHTML || '<p class="text-sm opacity-60">No data</p>';

                // ── Weekend vs Weekday ────────────────────────────────────
                let weekendTotal = 0, weekdayTotal = 0;
                let weekendDays = new Set(), weekdayDays = new Set();
                expenses.forEach(exp => {
                    const day = new Date(exp.date + 'T00:00:00').getDay();
                    if (day === 0 || day === 6) {
                        weekendTotal += Number(exp.amount);
                        weekendDays.add(exp.date);
                    } else {
                        weekdayTotal += Number(exp.amount);
                        weekdayDays.add(exp.date);
                    }
                });
                const avgWeekend = weekendDays.size ? weekendTotal / weekendDays.size : 0;
                const avgWeekday = weekdayDays.size ? weekdayTotal / weekdayDays.size : 0;

                // ── Top categories ────────────────────────────────────────
                const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
                const topCat  = sortedCats[0];

                // ── Fetch budget + previous month in parallel ─────────────
                Promise.all([
                    fetch('http://127.0.0.1:5000/get-budget', { headers: getHeaders() }).then(r => r.json()),
                    fetch(`http://127.0.0.1:5000/expenses?month=${comparisonMonthParam}`, { headers: getHeaders() }).then(r => r.json())
                ])
                .then(([budget, comparisonMonthExpenses]) => {

                    const monthlyBudget = budget.monthly_budget || 0;
                    const dailyLimit    = budget.daily_limit    || 0;

                    // ✅ FIX 1 — Avg Daily: red if over daily limit
                    const avgDailyEl = document.getElementById('avgDaily');
                    avgDailyEl.textContent = '₹' + avgDaily.toFixed(2);
                    avgDailyEl.className = 'text-4xl font-bold transition-colors duration-300 ' +
                        (dailyLimit > 0 && avgDaily > dailyLimit ? 'text-red-500' : '');

                    // ✅ FIX 3 — Projected Monthly: red if over monthly budget
                    const projectedEl = document.getElementById('projectedExpense');
                    projectedEl.textContent = '₹' + projected.toFixed(2);
                    projectedEl.className = 'text-4xl font-bold transition-colors duration-300 ' +
                        (monthlyBudget > 0 && projected > monthlyBudget ? 'text-red-500' : '');

                    // Previous month total for selected period comparison
                    let comparisonMonthTotal = 0;
                    comparisonMonthExpenses.forEach(exp => {
                        comparisonMonthTotal += Number(exp.amount);
                    });

                    // Debug: log to verify data is coming through
                    console.log('comparisonMonthExpenses count:', comparisonMonthExpenses.length, 'comparisonMonthTotal:', comparisonMonthTotal, 'currentTotal:', total);

                    // ── Monthly performance card ──────────────────────────
                    let perf = monthlyBudget > 0 ? (total / monthlyBudget * 100) : 0;
                    if (comparisonMonthTotal > 0) {
                        let change = ((total - comparisonMonthTotal) / comparisonMonthTotal) * 100;
                        document.getElementById('monthlyPerformance').innerHTML = `
                            <div class="space-y-1">
                                <div class="text-2xl font-bold">${perf.toFixed(1)}%</div>
                                <div class="text-xs font-semibold ${change > 0 ? 'text-red-400' : 'text-green-400'}">
                                    ${change > 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}% vs previous month
                                </div>
                            </div>`;
                    } else {
                        document.getElementById('monthlyPerformance').textContent = perf.toFixed(1) + '%';
                    }

                    // ════════════════════════════════════════════════════
                    //  BUILD INSIGHTS
                    // ════════════════════════════════════════════════════
                    const insights = [];

                    // ── 1. Spending Behavior ──────────────────────────────────────────
                    insights.push({ type: 'header', label: '📊 Spending Behavior' });

                    if (comparisonMonthTotal > 0) {
                        const diff    = total - comparisonMonthTotal;
                        const diffPct = Math.abs(diff / comparisonMonthTotal * 100).toFixed(1);
                        if (diff > 0) {
                            insights.push({
                                icon: '🔴',
                                text: `You spent ${diffPct}% more than previous month`,
                                sub:  `+₹${diff.toFixed(0)} compared to the previous month`,
                                tag: 'warn'
                            });
                        } else if (diff < 0) {
                            insights.push({
                                icon: '🟢',
                                text: `You reduced expenses by ₹${Math.abs(diff).toFixed(0)}`,
                                sub:  `${diffPct}% less than previous month — great discipline!`,
                                tag: 'good'
                            });
                        } else {
                            insights.push({
                                icon: '🟡',
                                text: 'Spending matches previous month exactly',
                                sub:  'Consistent spending pattern detected',
                                tag: 'neutral'
                            });
                        }
                    } else {
                        insights.push({
                            icon: '📌',
                            text: 'No previous month data available yet',
                            sub:  'Keep tracking to unlock month-over-month comparisons',
                            tag: 'neutral'
                        });
                    }

                    // ── 2. Top Category Insight ───────────────────────────
                    insights.push({ type: 'header', label: '🏷️ Top Category' });

                    if (topCat) {
                        const topPct = total > 0 ? (topCat[1] / total * 100).toFixed(1) : 0;
                        insights.push({
                            icon: '🔝',
                            text: `${topCat[0]} is your highest spending category`,
                            sub:  `₹${topCat[1].toFixed(0)} — ${topPct}% of total expenses`,
                            tag: topPct > 50 ? 'warn' : 'neutral'
                        });
                    }

                    // ── 3. Daily Pattern ──────────────────────────────────
                    insights.push({ type: 'header', label: '📅 Daily Pattern' });

                    if (avgWeekend > 0 && avgWeekday > 0) {
                        if (avgWeekend > avgWeekday * 1.15) {
                            insights.push({
                                icon: '📅',
                                text: 'You spend more on weekends',
                                sub:  `Weekend avg ₹${avgWeekend.toFixed(0)}/day vs weekday ₹${avgWeekday.toFixed(0)}/day`,
                                tag: 'warn'
                            });
                        } else if (avgWeekday > avgWeekend * 1.15) {
                            insights.push({
                                icon: '💼',
                                text: 'You spend more on weekdays',
                                sub:  `Weekday avg ₹${avgWeekday.toFixed(0)}/day vs weekend ₹${avgWeekend.toFixed(0)}/day`,
                                tag: 'neutral'
                            });
                        } else {
                            insights.push({
                                icon: '⚖️',
                                text: 'Spending is balanced across the week',
                                sub:  `Weekend ₹${avgWeekend.toFixed(0)}/day · Weekday ₹${avgWeekday.toFixed(0)}/day`,
                                tag: 'good'
                            });
                        }
                    }

                    // ── 4. Prediction ─────────────────────────────────────
                    insights.push({ type: 'header', label: '🔮 Prediction' });

                    if (monthlyBudget > 0) {
                        const remaining      = monthlyBudget - total;
                        const daysLeft       = daysInMonth - currentDay;
                        const dailyAllowance = daysLeft > 0 ? remaining / daysLeft : 0;

                        if (projected > monthlyBudget) {
                            const overBy = projected - monthlyBudget;
                            insights.push({
                                icon: '⚠️',
                                text: `You may exceed your budget by ₹${overBy.toFixed(0)}`,
                                sub:  `Projected ₹${projected.toFixed(0)} vs your budget ₹${monthlyBudget.toFixed(0)}`,
                                tag: 'warn'
                            });
                        } else {
                            insights.push({
                                icon: '✅',
                                text: `On track to stay within budget`,
                                sub:  `Projected ₹${projected.toFixed(0)} — ₹${(monthlyBudget - projected).toFixed(0)} under budget`,
                                tag: 'good'
                            });
                        }

                        if (remaining <= 0) {
                            insights.push({
                                icon: '🚨',
                                text: `Budget already exceeded by ₹${Math.abs(remaining).toFixed(0)}`,
                                sub:  'Stop non-essential spending immediately',
                                tag: 'warn'
                            });
                        } else if (daysLeft > 0) {
                            insights.push({
                                icon: '💡',
                                text: `Safe to spend ₹${dailyAllowance.toFixed(0)}/day for remaining ${daysLeft} days`,
                                sub:  `₹${remaining.toFixed(0)} left in budget`,
                                tag: dailyAllowance < avgDaily ? 'warn' : 'good'
                            });
                        }
                    } else {
                        insights.push({
                            icon: '📋',
                            text: 'No budget set — predictions unavailable',
                            sub:  'Tap "Set Budget" to unlock prediction insights',
                            tag: 'neutral'
                        });
                    }

                   // ── 5. Smart Suggestions 🔥 ───────────────────────────────────────
                    insights.push({ type: 'header', label: '🔥 Smart Suggestions' });

                    if (topCat && topCat[1] > 0) {
                        if (monthlyBudget > 0 && projected > monthlyBudget) {
                            // Calculate exact % reduction needed on top category to bring projected within budget
                            const overBy = projected - monthlyBudget;
                            const neededReduction = Math.min((overBy / topCat[1]) * 100, 100);
                            const targetAmt = topCat[1] * (1 - neededReduction / 100);
                            insights.push({
                                icon: '💰',
                                text: `Reduce ${topCat[0]} by ${neededReduction.toFixed(0)}% to stay within budget`,
                                sub:  `Target: ₹${targetAmt.toFixed(0)} instead of ₹${topCat[1].toFixed(0)} — saves ₹${(topCat[1] - targetAmt).toFixed(0)}`,
                                tag: 'warn'
                            });
                        } else {
                            // Already within budget — suggest a modest saving goal
                            const saving10 = topCat[1] * 0.10;
                            insights.push({
                                icon: '💰',
                                text: `Trim ${topCat[0]} by 10% for extra savings of ₹${saving10.toFixed(0)}`,
                                sub:  `Target: ₹${(topCat[1] * 0.9).toFixed(0)} instead of ₹${topCat[1].toFixed(0)}`,
                                tag: 'good'
                            });
                        }
                    }
                    if (dailyLimit > 0 && avgDaily > dailyLimit) {
                        const overDaily = avgDaily - dailyLimit;
                        insights.push({
                            icon: '📉',
                            text: `Limit daily spending — you're ₹${overDaily.toFixed(0)} over your daily cap`,
                            sub:  `Daily limit: ₹${dailyLimit} · Your avg: ₹${avgDaily.toFixed(0)}`,
                            tag: 'warn'
                        });
                    }

                    if (monthlyBudget > 0 && projected < monthlyBudget) {
                        const potentialSave = monthlyBudget - projected;
                        insights.push({
                            icon: '🎯',
                            text: `You can save ₹${potentialSave.toFixed(0)} if current trend continues`,
                            sub:  'Maintain your pace to hit this savings goal',
                            tag: 'good'
                        });
                    }

                    const noSpendDays = currentDay - days.size;
                    if (noSpendDays > 0) {
                        insights.push({
                            icon: '🌟',
                            text: `${noSpendDays} no-spend day${noSpendDays !== 1 ? 's' : ''} so far this month`,
                            sub:  'Every no-spend day adds to your savings',
                            tag: 'good'
                        });
                    }

                    // ── RENDER insights ───────────────────────────────────
                    const tagStyles = {
                        warn:    'border-l-2 border-yellow-300/60 pl-2',
                        good:    'border-l-2 border-green-300/60 pl-2',
                        neutral: 'border-l-2 border-white/20 pl-2'
                    };

                    document.getElementById('insightsList').innerHTML = insights.map(item => {
                        if (item.type === 'header') {
                            return `
                                <li class="pt-4 pb-1 first:pt-0">
                                    <span class="text-xs font-bold uppercase tracking-widest opacity-60 block">
                                        ${item.label}
                                    </span>
                                </li>`;
                        }
                        return `
                            <li class="flex items-start gap-3 py-2 ${tagStyles[item.tag] || ''}">
                                <span class="text-base shrink-0 mt-0.5">${item.icon}</span>
                                <div class="min-w-0">
                                    <p class="font-semibold leading-snug">${item.text}</p>
                                    ${item.sub ? `<p class="text-xs opacity-60 mt-0.5">${item.sub}</p>` : ''}
                                </div>
                            </li>`;
                    }).join('');

                })
                .catch(err => console.error('Budget/LastMonth fetch error:', err));
            })
            .catch(err => console.error('Expenses fetch error:', err));
    }

    // Set current month display
    function setCurrentMonthDisplay(selectedMonth = 'current') {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];

        let monthText = '';

        if (selectedMonth === 'current') {
            const today = new Date();
            monthText = monthNames[today.getMonth()];
        } else if (selectedMonth === 'last') {
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            monthText = monthNames[lastMonth.getMonth()];
        } else {
            try {
                const [year, month] = selectedMonth.split('-').map(Number);
                if (year && month >= 1 && month <= 12) {
                    monthText = `${monthNames[month - 1]} ${year}`;
                } else {
                    monthText = 'Invalid';
                }
            } catch (err) {
                monthText = 'Invalid';
            }
        }

        document.getElementById('currentMonthDisplay').textContent = monthText;
    }

    // Create expense trend chart
    function createTrendChart(expenses, dateFilter = 'today', customDate = null) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        let targetDate = null;
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        if (dateFilter === 'today') {
            targetDate = today.toISOString().split('T')[0];
        } else if (dateFilter === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (yesterday.getMonth() === month && yesterday.getFullYear() === year) {
                targetDate = yesterday.toISOString().split('T')[0];
            } else {
                targetDate = today.toISOString().split('T')[0];
            }
        } else if (dateFilter === 'custom' && customDate) {
            const picked = new Date(customDate);
            const isCurrentMonth = picked.getFullYear() === year && picked.getMonth() === month;
            const isNotFuture = picked <= today;
            if (isCurrentMonth && isNotFuture) {
                targetDate = customDate;
            } else {
                targetDate = today.toISOString().split('T')[0];
            }
        }

        const dayExpenses = expenses.filter(exp => exp.date === targetDate);

        // ── Group by hour for the trend line ─────────────────────────────
        const hourlyTotals = new Array(24).fill(0);
        dayExpenses.forEach(exp => {
            const hour = exp.time ? parseInt(exp.time.split(':')[0]) : 0;
            hourlyTotals[hour] += Number(exp.amount);
        });

        // ── Destroy existing chart ────────────────────────────────────────
        if (window.trendChartInstance) {
            window.trendChartInstance.destroy();
            window.trendChartInstance = null;
        }

        // ── Remove any existing drill-down button ─────────────────────────
        const existingBtn = document.getElementById('backToMonthBtn');
        if (existingBtn) existingBtn.remove();

        // ── Build the MONTH line chart (default view) ─────────────────────
        function buildMonthChart() {
            const btn = document.getElementById('backToMonthBtn');
            if (btn) btn.remove();

            if (window.trendChartInstance) {
                window.trendChartInstance.destroy();
                window.trendChartInstance = null;
            }

            // Group expenses by date for the whole month
            const dailyTotals = {};
            expenses.forEach(exp => {
                dailyTotals[exp.date] = (dailyTotals[exp.date] || 0) + Number(exp.amount);
            });

            const sortedDates = Object.keys(dailyTotals).sort();
            const amounts = sortedDates.map(d => dailyTotals[d]);
            const dateLabels = sortedDates.map(d => {
                const expDate = new Date(d + 'T00:00:00');
                return expDate.getDate();
            });

            window.trendChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dateLabels,
                    datasets: [{
                        label: `${expenses.length} expense(s) on ${targetDate}`,
                        data: amounts,
                        borderColor: '#256af4',
                        backgroundColor: 'rgba(37, 106, 244, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 7,
                        pointBackgroundColor: 'transparent',
                        pointBorderColor: '#256af4',
                        pointBorderWidth: 2,
                        pointHoverRadius: 9,
                        pointHitRadius: 14,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: true,
                            labels: { color: '#9ca3af', font: { size: 12 } }
                        },
                        tooltip: {
                            callbacks: {
                                title: (items) => `Day ${items[0].label}`,
                                label: (item) => `₹${item.raw} — click to see categories`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.08)' },
                            ticks: { color: '#9ca3af' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#9ca3af' }
                        }
                    },
                    onClick(event, elements) {
                        if (!elements.length) return;

                        const idx = elements[0].index;
                        const clickedDate = sortedDates[idx];
                        const clickedTotal = amounts[idx];

                        const catTotals = {};
                        expenses.forEach(exp => {
                            if (exp.date !== clickedDate) return;
                            const cat = exp.category || 'Other';
                            catTotals[cat] = (catTotals[cat] || 0) + Number(exp.amount);
                        });

                        buildCategoryChart(clickedDate, clickedTotal, catTotals);
                    }
                }
            });
        }

        function buildCategoryChart(date, total, catTotals) {
            if (window.trendChartInstance) {
                window.trendChartInstance.destroy();
                window.trendChartInstance = null;
            }

            const ALL_CATEGORIES = ['Food', 'Travel', 'Bills', 'Housing', 'Shopping', 'Other'];
            const COLORS = {
                'Food': '#256af4', 'Travel': '#f59e0b', 'Bills': '#10b981',
                'Housing': '#ef4444', 'Shopping': '#8b5cf6', 'Other': '#ec4899',
            };

            const vals = ALL_CATEGORIES.map(cat => {
                const key = Object.keys(catTotals).find(
                    k => k.toLowerCase() === cat.toLowerCase()
                );
                return key ? catTotals[key] : 0;
            });

            window.trendChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ALL_CATEGORIES,
                    datasets: [{
                        label: `Categories on ${date} (Total: ₹${total})`,
                        data: vals,
                        backgroundColor: ALL_CATEGORIES.map(cat => COLORS[cat]),
                        borderRadius: 8,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    layout: { padding: { bottom: 10 } },
                    plugins: {
                        legend: {
                            display: true,
                            labels: { color: '#9ca3af', font: { size: 12 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: (item) => item.raw > 0 ? `₹${item.raw}` : 'No expense'
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.08)' },
                            ticks: { color: '#9ca3af' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#9ca3af',
                                autoSkip: false,
                                maxRotation: 0,
                                minRotation: 0,
                                font: { size: 12 },
                            }
                        }
                    }
                }
            });

            if (!document.getElementById('backToMonthBtn')) {
                const chartWrapper = ctx.closest('.bg-surface-container-lowest') || ctx.parentElement;
                const btnWrapper = document.createElement('div');
                btnWrapper.id = 'backToMonthBtnWrapper';
                btnWrapper.style.cssText = 'display:flex; justify-content:flex-end; margin-bottom:12px;';

                const btn = document.createElement('button');
                btn.id = 'backToMonthBtn';
                btn.textContent = '← Month View';
                btn.className = 'px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:opacity-90 transition-opacity';
                btn.onclick = () => {
                    const wrapper = document.getElementById('backToMonthBtnWrapper');
                    if (wrapper) wrapper.remove();
                    buildMonthChart();
                };

                btnWrapper.appendChild(btn);
                chartWrapper.insertBefore(btnWrapper, ctx);
            }
        }

        // ── Initial render: month view ────────────────────────────────────
        buildMonthChart();
    }

    // ✅ FIX 4 — Donut chart: legend hidden
    function createCategoryDonutChart(expenses) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const ALL_CATEGORIES = ['Food', 'Travel', 'Bills', 'Housing', 'Shopping', 'Other'];
        const COLORS = [
            '#256af4', '#f59e0b', '#10b981',
            '#ef4444', '#8b5cf6', '#ec4899'
        ];

        const catTotals = {};
        expenses.forEach(exp => {
            const cat = exp.category
                ? exp.category.charAt(0).toUpperCase() + exp.category.slice(1).toLowerCase()
                : 'Other';
            const matched = ALL_CATEGORIES.find(c => c.toLowerCase() === cat.toLowerCase()) || 'Other';
            catTotals[matched] = (catTotals[matched] || 0) + Number(exp.amount);
        });

        const total = Object.values(catTotals).reduce((a, b) => a + b, 0);
        const vals = ALL_CATEGORIES.map(cat => catTotals[cat] || 0);

        if (window.categoryChartInstance) {
            window.categoryChartInstance.destroy();
            window.categoryChartInstance = null;
        }

        window.categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ALL_CATEGORIES,
                datasets: [{
                    data: vals,
                    backgroundColor: COLORS,
                    borderWidth: 3,
                    hoverOffset: 10,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '68%',
                plugins: {
                    // ✅ FIX 4: legend hidden — no colour explanation row
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (item) => {
                                const val = item.raw;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${item.label}: ₹${val.toFixed(2)} (${pct}%)`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                beforeDraw(chart) {
                    const { width, height, ctx: c } = chart;
                    c.save();

                    c.font = `bold ${Math.round(height / 10)}px sans-serif`;
                    c.fillStyle = '#0a0a0a';
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    c.fillText(`₹${total.toFixed(0)}`, width / 2, height / 2 - 10);

                    c.font = `${Math.round(height / 18)}px sans-serif`;
                    c.fillStyle = '#9ca3af';
                    c.fillText('Total Spent', width / 2, height / 2 + 14);

                    c.restore();
                }
            }]
        });
    }

    // ── Initial data load ─────────────────────────────────────────────────
    const initialMonth = 'current';
    updateAnalysisPage(initialMonth);
    setCurrentMonthDisplay(initialMonth);

    const loadTrendData = (month) => {
        const monthParam = month === 'current' ? '0' : month === 'last' ? '1' : month;
        fetch(`http://127.0.0.1:5000/expenses?month=${monthParam}`, { headers: getHeaders() })
            .then(res => res.json())
            .then(expenses => {
                createTrendChart(expenses);
                createCategoryDonutChart(expenses);
            })
            .catch(err => console.error('Error loading trend data:', err));
    };

    loadTrendData(initialMonth);

    const monthSelector = document.getElementById('monthSelector');
    const customMonthInput = document.getElementById('customMonthInput');

    monthSelector.addEventListener('change', () => {
        const selected = monthSelector.value;

        if (selected === 'custom') {
            customMonthInput.classList.remove('hidden');
            return;
        }

        customMonthInput.classList.add('hidden');
        setCurrentMonthDisplay(selected);
        updateAnalysisPage(selected);
        loadTrendData(selected);
    });

    customMonthInput.addEventListener('change', () => {
        const selectedMonth = customMonthInput.value;
        if (!selectedMonth) return;

        monthSelector.value = 'custom';
        setCurrentMonthDisplay(selectedMonth);
        updateAnalysisPage(selectedMonth);
        loadTrendData(selectedMonth);
    });
}