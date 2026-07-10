/* ============================================================
   MOBILE SIDEBAR — paste this at the very TOP of dashboard.js
   Works with the hamburger + close button added in index.html
============================================================ */

(function initMobileNav() {

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    ready(function () {

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const hamburger = document.getElementById('hamburger-btn');
        const closeBtn = document.getElementById('sidebar-close-btn');

        if (!sidebar) return; // safety guard

        /* ── Open ───────────────────────────────────────────── */
        function openSidebar() {
            sidebar.classList.add('sidebar-open');
            if (overlay) overlay.classList.add('show');
            document.body.style.overflow = 'hidden'; // block bg scroll
            if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
        }

        /* ── Close ──────────────────────────────────────────── */
        function closeSidebar() {
            sidebar.classList.remove('sidebar-open');
            if (overlay) overlay.classList.remove('show');
            document.body.style.overflow = '';
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        }

        /* ── Toggle ─────────────────────────────────────────── */
        function toggleSidebar() {
            sidebar.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
        }

        /* ── Event listeners ────────────────────────────────── */
        if (hamburger) hamburger.addEventListener('click', toggleSidebar);
        if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
        if (overlay) overlay.addEventListener('click', closeSidebar);

        /* Close when any nav button is tapped on mobile */
        sidebar.querySelectorAll('button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (window.innerWidth < 768) closeSidebar();
            });
        });

        /* Keyboard: Escape closes sidebar */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                closeSidebar();
                if (hamburger) hamburger.focus();
            }
        });

        /* On resize to desktop: reset everything */
        window.addEventListener('resize', function () {
            if (window.innerWidth >= 768) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('show');
                document.body.style.overflow = '';
            }
        });

    });

})();

/* ============================================================
   API HELPER — Get username from localStorage and add to headers
============================================================ */
function getHeaders() {
    const username = localStorage.getItem('username');
    return {
        'Content-Type': 'application/json',
        'X-Username': username || ''
    };
}

async function parseApiResponse(res, fallbackMessage) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('application/json')) {
        try {
            return await res.json();
        } catch (error) {
            return { message: fallbackMessage };
        }
    }

    const text = await res.text();
    if (text && text.trim().startsWith('<')) {
        return { message: fallbackMessage };
    }

    return { message: text || fallbackMessage };
}

function parseLocalDate(dateString) {
    return new Date(`${dateString}T00:00:00`);
}

function getAvatarSrcByGender(gender) {
    const avatarMap = {
        male: 'https://www.w3schools.com/howto/img_avatar.png',
        female: 'https://www.w3schools.com/howto/img_avatar2.png',
        default: 'https://www.w3schools.com/howto/img_avatar.png'
    };

    return avatarMap[(gender || '').toLowerCase()] || avatarMap.default;
}

function setUserAvatar() {
    const avatarEl = document.getElementById('userAvatar');
    if (!avatarEl) return;

    const gender = (localStorage.getItem('gender') || 'male').toLowerCase();
    const username = localStorage.getItem('username') || 'User';

    avatarEl.src = getAvatarSrcByGender(gender);
    avatarEl.alt = `${username} avatar`;
    avatarEl.title = `${username} (${gender})`;
}

function setSettingsAvatar() {
    const avatarEl = document.getElementById('settingsAvatar');
    if (!avatarEl) return;

    const gender = (localStorage.getItem('gender') || 'male').toLowerCase();
    const username = localStorage.getItem('username') || 'User';

    avatarEl.src = getAvatarSrcByGender(gender);
    avatarEl.alt = `${username} avatar`;
    avatarEl.title = `${username} (${gender})`;
}

function deleteExpenseById(expenseId) {
    showConfirm('Are you sure you want to delete this expense?', { okText: 'Delete', cancelText: 'Cancel' })
        .then(confirmed => {
            if (!confirmed) return;

            fetch(`http://127.0.0.1:5000/delete/${expenseId}`, {
                method: 'DELETE',
                headers: getHeaders()
            })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errObj => {
                throw new Error(errObj.message || `HTTP ${res.status}`);
            });
        }
        return res.json();
    })
    .then(data => {
        if (data.message !== 'deleted') {
            throw new Error(data.message || 'Unable to delete expense');
        }
        showPopup('Expense deleted successfully', 'success', 4000);
        loadExpenses();
        loadChartData();
    })
    .catch(err => {
        console.error('Delete failed:', err);
        showPopup('Error deleting expense: ' + err.message, 'error', 5000);
        if (err.message.includes('username is required')) {
            showPopup('Please login first. Redirecting to login page.', 'warning', 5000);
            window.location.href = 'login.html';
        }
    });
});
}

function isBudgetSet() {
    return fetch('http://127.0.0.1:5000/get-budget', { headers: getHeaders() })
        .then(res => {
            if (!res.ok) throw new Error('Budget check failed');
            return res.json();
        })
        .then(data => {
            return data.monthly_budget && Number(data.monthly_budget) > 0;
        })
        .catch(() => false);
}

/* Returns today's date as YYYY-MM-DD in the user's LOCAL timezone.
   Using toISOString() would give UTC which is behind IST by 5:30 hrs
   and causes today's date to appear as a future date. */
function getTodayLocal() {
    return new Date().toLocaleDateString('en-CA'); // 'en-CA' locale always gives YYYY-MM-DD
}

function loadExpenses() {

    fetch("http://127.0.0.1:5000/expenses", {
        headers: getHeaders()
    })
        .then(res => res.json())
        .then(data => {

            console.log("Loaded expenses:", data);

            let table = document.getElementById("expenseTable");
            table.innerHTML = "";

            let monthlyTotal = 0;
            let todayTotal = 0;

            let today = getTodayLocal();
            let currentMonth = new Date().getMonth();
            let currentYear = new Date().getFullYear();

            // First, calculate totals from ALL expenses
            data.forEach(exp => {
                let expDate = parseLocalDate(exp.date);
                let expMonth = expDate.getMonth();
                let expYear = expDate.getFullYear();

                if (expMonth === currentMonth && expYear === currentYear) {
                    monthlyTotal += Number(exp.amount);
                }

                if (exp.date === today) {
                    todayTotal += Number(exp.amount);
                }
            });

            // Create a sorted copy (newest first, and by ID for same-day transactions) and get top 6
            let sortedData = [...data].sort((a, b) => {
                let dateA = new Date(a.date).getTime();
                let dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateB - dateA; // Sort by date descending
                return b.id - a.id; // If same date, sort by ID descending (newer IDs first)
            });
            let recentSix = sortedData.slice(0, 6);

            console.log("Recent 6:", recentSix);

            // Display the 6 most recent transactions
            recentSix.forEach(exp => {

                table.innerHTML += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td class="px-6 py-4 font-medium">${exp.description}</td>
                <td class="px-6 py-4">${exp.category}</td>
                <td class="px-6 py-4">${exp.date}</td>
                <td class="px-6 py-4 text-right font-bold">₹${exp.amount}</td>
                <td class="px-6 py-4 text-center">
                <button class="delete-btn text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold text-sm hover:underline" data-id="${exp.id}">Delete</button>
                </td>
                </tr>
                `;

            });

            document.getElementById("monthlyExpense").innerText = "₹" + monthlyTotal;
            document.getElementById("todayExpense").innerText = "₹" + todayTotal;

            // Get monthly budget + savings
            fetch("http://127.0.0.1:5000/get-budget", {
                headers: getHeaders()
            })
            .then(res => {
                if (!res.ok) throw new Error("API error");
                return res.json();
            })
            .then(budget => {

                let monthlyBudget = budget.monthly_budget || 0;
                let savingsTotal = budget.savings_total || 0;

                // Update savings display always
                const savingsEl = document.getElementById("savingsAmount");
                if (savingsEl) {
                    savingsEl.innerText = "₹" + Number(savingsTotal).toFixed(2);
                }

                // New month with no monthly budget
                if (isNewMonth && monthlyBudget === 0) {
                    const element = document.getElementById("remainingAmount");
                    element.innerText = "No budget set";
                    element.classList.remove("text-red-500", "text-green-500");
                    return;
                }

                let remaining = monthlyBudget - monthlyTotal;

                const element = document.getElementById("remainingAmount");
                element.innerText = "₹" + remaining.toFixed(2);
                element.classList.remove("text-red-500", "text-green-500");

                if (remaining < 0) {
                    element.classList.add("text-red-500");
                } else {
                    element.classList.add("text-green-500");
                }

            })
            .catch(err => {
                console.error("Error:", err);
            });


            updateCategoryChart(data);

        })
        .catch(err => {
            console.error("Error loading expenses:", err);
        });


}

let expensesData = [];
let currentMode = "weekly";

function loadChartData() {

    fetch("http://127.0.0.1:5000/expenses", {
        headers: getHeaders()
    })
        .then(res => res.json())
        .then(data => {

            expensesData = data;

            renderChart();

        });

}

function getWeeklyData() {

    let weeklyData = new Array(7).fill(0);
    let today = parseLocalDate(getTodayLocal());

    expensesData.forEach(exp => {

        if (!exp.date || !exp.amount) return;

        let expDate = parseLocalDate(exp.date);
        let daysAgo = Math.floor((today - expDate) / (1000 * 60 * 60 * 24));

        if (daysAgo >= 0 && daysAgo < 7) {
            weeklyData[6 - daysAgo] += Number(exp.amount);
        }

    });

    return weeklyData;

}

function getMonthlyData() {

    let monthlyData = new Array(12).fill(0);

    expensesData.forEach(exp => {

        if (!exp.date || !exp.amount) return;

        let date = parseLocalDate(exp.date);
        let month = date.getMonth();

        if (month < 12) {
            monthlyData[month] += Number(exp.amount);
        }

    });

    return monthlyData;

}

function renderChart() {

    let data = currentMode === "weekly" ? getWeeklyData() : getMonthlyData();
    updateAxisLabels();

    // Fetch daily limit and pass to drawSVGChart
    fetch("http://127.0.0.1:5000/get-budget", {
        headers: getHeaders()
    })
        .then(res => res.json())
        .then(budget => {
            let dailyLimit = budget.daily_limit || 0;
            drawSVGChart(data, dailyLimit);
        })
        .catch(() => {
            drawSVGChart(data, 0);
        });

}

function updateAxisLabels() {

    let labels = [];

    if (currentMode === "weekly") {
        let today = new Date();
        let dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
            let d = new Date(today);
            d.setDate(d.getDate() - i);
            labels.push(dayNames[d.getDay()] + ' ' + d.getDate());
        }

    } else {
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }

    let maxLabels = currentMode === "weekly" ? 7 : 12;
    for (let i = 0; i < maxLabels; i++) {
        let labelElement = document.getElementById('label' + i);
        if (labelElement) {
            labelElement.innerText = labels[i];
            labelElement.style.display = 'block';
            labelElement.style.flex = "1";
            labelElement.style.textAlign = "center";
        }
    }

    for (let i = maxLabels; i < 12; i++) {
        let labelElement = document.getElementById('label' + i);
        if (labelElement) {
            labelElement.style.display = 'none';
        }
    }

}

function drawSVGChart(data, dailyLimit = 0) {
    if (currentMode === "weekly") {
        drawBarChart(data, dailyLimit);
    } else {
        drawLineChart(data);
        // Remove daily limit line and tooltip if present (in case of mode switch)
        const svg = document.getElementById("barChartGroup").ownerSVGElement;
        if (svg) {
            const oldLine = svg.querySelector('#dailyLimitLine');
            if (oldLine) oldLine.remove();
            const oldTooltip = svg.querySelector('#dailyLimitTooltip');
            if (oldTooltip) oldTooltip.remove();
        }
    }
}

let reportExpenseGraph = null;

function drawExpenseGraph(filteredExpenses, startDate, endDate, monthTotals, sortedMonths) {
    const canvas = document.getElementById('expenseGraphChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = Array.isArray(sortedMonths) && sortedMonths.length
        ? sortedMonths
        : (filteredExpenses || []).map(exp => exp.date);

    const values = labels.length && monthTotals
        ? labels.map(label => Number(monthTotals[label] || 0))
        : (filteredExpenses || []).map(exp => Number(exp.amount) || 0);

    if (reportExpenseGraph) {
        reportExpenseGraph.destroy();
    }

    reportExpenseGraph = new Chart(canvas.getContext('2d'), {
        type: labels.length > 8 ? 'line' : 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Expense Amount',
                data: values,
                borderColor: '#256af4',
                backgroundColor: 'rgba(37, 106, 244, 0.18)',
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointBackgroundColor: '#256af4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function closeInsightsPopup() {
    const popup = document.getElementById('insightsPopup');
    if (popup) {
        popup.classList.add('hidden');
    }
}

function openInsightsPopup() {
    const popup = document.getElementById('insightsPopup');
    if (popup) {
        popup.classList.remove('hidden');
    }
}

function loadAddAmountPage() {
    openBudgetModal();
}

function drawLineChart(data) {

    let width = 1000;
    let height = 300;
    let maxValue = Math.max(...data, 1);

    let step = width / (data.length - 1);

    let linePath = "";
    let areaPath = "";

    data.forEach((value, index) => {

        let x = index * step;
        let y = height - (value / maxValue) * height;

        if (index === 0) {
            linePath += `M${x},${y}`;
            areaPath += `M${x},${y}`;
        }
        else {
            linePath += ` L${x},${y}`;
            areaPath += ` L${x},${y}`;
        }

    });

    areaPath += ` L${width},${height} L0,${height} Z`;

    const lineElement = document.getElementById("lineChart");
    const areaElement = document.getElementById("areaChart");
    
    lineElement.setAttribute("d", linePath);
    lineElement.setAttribute("class", "chart-line");
    
    // Calculate path length for stroke-dasharray animation
    setTimeout(() => {
        const pathLength = lineElement.getTotalLength();
        lineElement.style.strokeDasharray = pathLength;
        lineElement.style.strokeDashoffset = pathLength;
    }, 10);
    
    areaElement.setAttribute("d", areaPath);
    areaElement.setAttribute("class", "chart-area");

    document.getElementById("barChartGroup").innerHTML = "";

}

function drawBarChart(data, dailyLimit = 0) {
    let width = 1000;
    let height = 300;
    let maxValue = Math.max(...data, dailyLimit, 1);
    let barCount = data.length;
    let gap = 20; // space between bars
    let barWidth = (width - (gap * (barCount + 1))) / barCount;
    let barGroup = document.getElementById("barChartGroup");
    barGroup.innerHTML = "";

    data.forEach((value, index) => {
        let barHeight = (value / maxValue) * (height - 20); // avoid touching top
        let x = gap + index * (barWidth + gap);
        let y = height - barHeight;
        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", height); // Start from bottom
        rect.setAttribute("width", barWidth);
        rect.setAttribute("height", 0); // Start with 0 height
        // If value exceeds dailyLimit, color dark red, else blue gradient
        if (dailyLimit > 0 && value > dailyLimit) {
            rect.setAttribute("fill", "#b71c1c");
        } else {
            rect.setAttribute("fill", "url(#barGrad)");
        }
        rect.setAttribute("rx", "6");
        rect.setAttribute("class", "chart-bar");
        rect.style.transition = "all 0.3s ease";
        
        // Animate to final position with delay based on index
        setTimeout(() => {
            rect.setAttribute("y", y);
            rect.setAttribute("height", barHeight);
        }, 50 + index * 50);
        
        barGroup.appendChild(rect);
    });

    // Draw daily limit line if set and positive
    if (dailyLimit > 0) {
        let yLimit = height - (dailyLimit / maxValue) * (height - 20);
        let svg = barGroup.ownerSVGElement;
        // Remove previous limit line and tooltip if any
        let oldLine = svg.querySelector('#dailyLimitLine');
        if (oldLine) oldLine.remove();
        let oldTooltip = svg.querySelector('#dailyLimitTooltip');
        if (oldTooltip) oldTooltip.remove();

        let limitLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        limitLine.setAttribute("id", "dailyLimitLine");
        limitLine.setAttribute("x1", 0);
        limitLine.setAttribute("x2", width);
        limitLine.setAttribute("y1", yLimit);
        limitLine.setAttribute("y2", yLimit);
        limitLine.setAttribute("stroke", "#e74c3c");
        limitLine.setAttribute("stroke-width", "3");
        limitLine.setAttribute("stroke-dasharray", "10,5");
        limitLine.style.cursor = "pointer";
        svg.appendChild(limitLine);

        // Tooltip group (hidden by default)
        let tooltipGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        tooltipGroup.setAttribute("id", "dailyLimitTooltip");
        tooltipGroup.style.display = "none";

        let tooltipText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        let tooltipValue = `Daily Limit: ₹${dailyLimit}`;
        tooltipText.setAttribute("x", 20);
        tooltipText.setAttribute("y", yLimit + 25);
        tooltipText.setAttribute("fill", document.documentElement.classList.contains('dark') ? "#ffffff" : "#000000");
        tooltipText.setAttribute("font-size", "18");
        tooltipText.setAttribute("font-family", "sans-serif");
        tooltipText.textContent = tooltipValue;
        tooltipGroup.appendChild(tooltipText);
        svg.appendChild(tooltipGroup);

        // Show/hide tooltip on hover
        limitLine.addEventListener("mouseenter", () => {
            tooltipGroup.style.display = "";
        });
        limitLine.addEventListener("mouseleave", () => {
            tooltipGroup.style.display = "none";
        });
    } else {
        // Remove previous limit line and tooltip if any
        let svg = barGroup.ownerSVGElement;
        let oldLine = svg.querySelector('#dailyLimitLine');
        if (oldLine) oldLine.remove();
        let oldTooltip = svg.querySelector('#dailyLimitTooltip');
        if (oldTooltip) oldTooltip.remove();
    }

    // Hide line/area
    document.getElementById("lineChart").setAttribute("d", "");
    document.getElementById("areaChart").setAttribute("d", "");
}

document.getElementById("weeklyBtn").addEventListener("click", function () {

    currentMode = "weekly";

    document.getElementById("weeklyBtn").classList.add("bg-primary", "text-white");
    document.getElementById("weeklyBtn").classList.remove("bg-slate-100", "dark:bg-slate-800");

    document.getElementById("monthlyBtn").classList.remove("bg-primary", "text-white");
    document.getElementById("monthlyBtn").classList.add("bg-slate-100", "dark:bg-slate-800");

    loadChartData();

});

document.getElementById("monthlyBtn").addEventListener("click", function () {

    currentMode = "monthly";

    document.getElementById("monthlyBtn").classList.add("bg-primary", "text-white");
    document.getElementById("monthlyBtn").classList.remove("bg-slate-100", "dark:bg-slate-800");

    document.getElementById("weeklyBtn").classList.remove("bg-primary", "text-white");
    document.getElementById("weeklyBtn").classList.add("bg-slate-100", "dark:bg-slate-800");

    loadChartData();

});

function updateCategoryChart(expenses) {

    let travel = 0;
    let food = 0;
    let bills = 0;
    let housing = 0;
    let shopping = 0;
    let other = 0;

    expenses.forEach(exp => {

        if (!exp.category || !exp.amount) return;

        let cat = exp.category.toLowerCase().trim();
        let amount = Number(exp.amount);

        if (cat === "travel") {
            travel += amount;
        }
        else if (cat === "food") {
            food += amount;
        }
        else if (cat === "bills") {
            bills += amount;
        }
        else if (cat === "housing") {
            housing += amount;
        }
        else if (cat === "shopping") {
            shopping += amount;
        }
        else {
            other += amount;
        }

    });

    let total = travel + food + bills + housing + shopping + other;

    if (total === 0) return;

    const C = 251;

    let t = (travel / total) * C;
    let f = (food / total) * C;
    let b = (bills / total) * C;
    let h = (housing / total) * C;
    let s = (shopping / total) * C;
    let o = (other / total) * C;

    let offset = 0;

    function setCircle(id, value, delay = 0) {

        let circle = document.getElementById(id);

        // Set CSS custom property for animation
        circle.style.setProperty('--dash-value', value);
        circle.setAttribute("stroke-dasharray", `0 ${C}`);
        circle.setAttribute("stroke-dashoffset", -offset);
        circle.setAttribute("class", "pie-segment");

        // Apply animation with delay
        setTimeout(() => {
            circle.setAttribute("stroke-dasharray", `${value} ${C}`);
        }, delay);

        offset += value;

    }

    // Animate each segment with staggered delays
    setCircle("travelCircle", t, 0);
    setCircle("foodCircle", f, 200);
    setCircle("billsCircle", b, 400);
    setCircle("housingCircle", h, 600);
    setCircle("shoppingCircle", s, 800);
    setCircle("otherCircle", o, 1000);

    document.getElementById("travelAmount").innerText = "₹" + travel.toFixed(2);
    document.getElementById("foodAmount").innerText = "₹" + food.toFixed(2);
    document.getElementById("billsAmount").innerText = "₹" + bills.toFixed(2);
    document.getElementById("housingAmount").innerText = "₹" + housing.toFixed(2);
    document.getElementById("shoppingAmount").innerText = "₹" + shopping.toFixed(2);
    document.getElementById("otherAmount").innerText = "₹" + other.toFixed(2);

    // Add animation classes to amount texts with delays
    const amountElements = [
        "travelAmount", "foodAmount", "billsAmount", 
        "housingAmount", "shoppingAmount", "otherAmount"
    ];
    
    amountElements.forEach((id, index) => {
        const element = document.getElementById(id);
        element.classList.add("amount-text");
        setTimeout(() => {
            element.style.opacity = "1";
        }, 300 + index * 100);
    });

}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    if (!localStorage.getItem('username')) {
        window.location.replace('login.html');
        return;
    }

    // Display the logged-in username
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('welcomeUsername').textContent = username;
    }

    // Set gender-based avatar from localStorage
    setUserAvatar();

    const userAvatarContainer = document.getElementById('userAvatarContainer');
    if (userAvatarContainer) {
        userAvatarContainer.addEventListener('click', function (event) {
            loadContent('settings', event);
        });
    }

    // Set Weekly button as active by default
    const weeklyBtn = document.getElementById("weeklyBtn");
    const monthlyBtn = document.getElementById("monthlyBtn");
    if (weeklyBtn && monthlyBtn) {
        weeklyBtn.classList.add("bg-primary", "text-white");
        weeklyBtn.classList.remove("bg-slate-100", "dark:bg-slate-800");
        monthlyBtn.classList.remove("bg-primary", "text-white");
        monthlyBtn.classList.add("bg-slate-100", "dark:bg-slate-800");
    }
    const validPages = new Set(['dashboard', 'expenses', 'analysis', 'reports', 'settings', 'addamount']);
    const savedPage = localStorage.getItem('active_page');
    const pageToLoad = validPages.has(savedPage) ? savedPage : 'dashboard';

    if (pageToLoad === 'dashboard') {
        // Load initial dashboard data
        loadExpenses();
        loadChartData();

        // Prompt for budget when dashboard is opened directly, or first login
        checkMonthlyBudgetPopup();

        // Set default date to today (use local date, not UTC)
        const today = getTodayLocal();
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.value = today;
        }

        // Add expense form listener
        attachFormListener();
    } else {
        loadContent(pageToLoad);
    }

    // Global delete listener for dashboard table only
    if (window.location.pathname.endsWith('/dashboard.html') || window.location.pathname.endsWith('/')) {
        document.body.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn');
            if (!deleteBtn) return;

            const expenseId = deleteBtn.getAttribute('data-id');
            if (!expenseId) return;

            deleteExpenseById(expenseId);
        });
    }
});

// Attach expense form listener (can be called multiple times)
function attachFormListener() {
    const expenseForm = document.getElementById("expenseForm");
    if (!expenseForm) return;

    // Remove previous listener if exists by cloning
    const newForm = expenseForm.cloneNode(true);
    expenseForm.parentNode.replaceChild(newForm, expenseForm);

    // Set max date to today (use local date, not UTC)
    const dateInput = document.getElementById("date");
    if (dateInput) {
        const today = getTodayLocal();
        dateInput.setAttribute('max', today);
    }

    // Attach new listener
    document.getElementById("expenseForm").addEventListener("submit", function (e) {
        e.preventDefault();

        let description = document.getElementById("description").value.trim();
        let date = document.getElementById("date").value.trim();
        let amount = document.getElementById("amount").value.trim();
        let category = document.getElementById("category").value.trim();

        if (!description || !date || !amount || !category) {
            alert("Please fill all fields");
            return;
        }

        // Validate date - no future dates allowed
        // IMPORTANT: append T00:00:00 (no Z) so JS parses it as LOCAL midnight,
        // not UTC midnight (which would make today appear as future in IST +5:30)
        const selectedDate = new Date(date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            alert("Expense date cannot be in the future. Please select today or an earlier date.");
            return;
        }

        // Convert amount to number
        amount = parseFloat(amount);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        isBudgetSet().then((budgetSet) => {
            if (!budgetSet) {
                alert("Please set a monthly budget before adding expenses.");
                openBudgetModal();
                return;
            }

            fetch("http://127.0.0.1:5000/add-expense", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    description: description,
                    date: date,
                    amount: amount,
                    category: category
                })
            })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.message === "added") {
                        alert("Expense Added Successfully!");
                        loadExpenses();
                        loadChartData();
                        document.getElementById("expenseForm").reset();
                        document.getElementById("date").value = getTodayLocal();
                    } else {
                        alert("Error: " + (data.message || "Unknown error"));
                    }
                })
                .catch(err => {
                    console.error("Error:", err);
                    alert("Error adding expense: " + err.message);
                });
        });
    });
}

// Store original dashboard HTML
let originalDashboardHTML = null;

// Navigation function to load different pages
function loadContent(page, event = null) {
    // Close budget modal if it's open
    closeBudgetModal();

    const mainContent = document.getElementById('mainContent');
    const pageTitle = document.getElementById('pageTitle');

    // Persist selected section so refresh can restore it.
    localStorage.setItem('active_page', page);

    // Save original dashboard HTML on first load
    if (originalDashboardHTML === null) {
        originalDashboardHTML = mainContent.innerHTML;
    }

    // Update active button styling
// Remove active state from all buttons
document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.classList.remove('bg-primary/10', 'text-primary', 'font-medium');
    btn.classList.add('text-slate-600', 'dark:text-slate-400');
});

// Highlight clicked button
if (event && event.target) {
    let btn = event.target.closest('button');
    if (btn && btn.hasAttribute('data-nav')) {
        btn.classList.add('bg-primary/10', 'text-primary', 'font-medium');
        btn.classList.remove('text-slate-600', 'dark:text-slate-400');
    }
}

    // If no event, set by page (fallback for non-click calls)
    const navBtn = document.querySelector(`[data-nav="${page}"]`);
    if (navBtn) {
        navBtn.classList.add('bg-primary/10', 'text-primary', 'font-medium');
        navBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
    }

    switch (page) {
        case 'dashboard':
            pageTitle.textContent = 'Expense Overview';

            mainContent.innerHTML = originalDashboardHTML;

            attachFormListener();

            // Fix buttons
            document.getElementById("weeklyBtn").addEventListener("click", function () {
                currentMode = "weekly";
                document.getElementById("weeklyBtn").classList.add("bg-primary", "text-white");
                document.getElementById("weeklyBtn").classList.remove("bg-slate-100", "dark:bg-slate-800");

                document.getElementById("monthlyBtn").classList.remove("bg-primary", "text-white");
                document.getElementById("monthlyBtn").classList.add("bg-slate-100", "dark:bg-slate-800");

                loadChartData();
            });

            document.getElementById("monthlyBtn").addEventListener("click", function () {
                currentMode = "monthly";
                document.getElementById("monthlyBtn").classList.add("bg-primary", "text-white");
                document.getElementById("monthlyBtn").classList.remove("bg-slate-100", "dark:bg-slate-800");

                document.getElementById("weeklyBtn").classList.remove("bg-primary", "text-white");
                document.getElementById("weeklyBtn").classList.add("bg-slate-100", "dark:bg-slate-800");

                loadChartData();
            });

            // Fix date (use local date, not UTC)
            setTimeout(() => {
                const dateInput = document.getElementById('date');
                if (dateInput) {
                    dateInput.value = getTodayLocal();
                }
            }, 100);

            // Reload data
            loadExpenses();
            loadChartData();

            // Show budget prompt on dashboard load when budget is not set
            checkMonthlyBudgetPopup();

            break;

        case 'expenses':
            pageTitle.textContent = 'All Expenses';
            loadExpensesPage();
            break;

        case 'analysis':
            pageTitle.textContent = 'Analysis';
            loadAnalysisPage();
            break;

        case 'reports':
            pageTitle.textContent = 'Reports';
            loadReportsPage();
            break;

        case 'settings':
            pageTitle.textContent = 'Settings';
            renderSettingsPage();
            break;

        case 'addamount':
            pageTitle.textContent = 'Set Budget';
            loadAddAmountPage();
            break;

    }
}




