

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
                let expDate = new Date(exp.date);
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

            // will budget
            fetch("http://127.0.0.1:5000/get-budget", {
                headers: getHeaders()
            })
                .then(res => {
                    if (!res.ok) {
                        throw new Error("API not found or server error");
                    }
                    return res.json();
                })
                .then(budget => {

                    let monthlyBudget = budget.monthly_budget || 0;
                    let remaining = monthlyBudget - monthlyTotal;

                    const element = document.getElementById("savingsAmount");

                    element.innerText = "₹" + remaining;

                    element.classList.remove("text-red-500", "text-green-500");

                    if (remaining < 0) {
                        element.classList.add("text-red-500");
                    } else {
                        element.classList.add("text-green-500");
                    }

                })
                .catch(err => {
                    console.error("Error:", err);
                    alert("Backend not working properly (check Flask)");
                });


            updateCategoryChart(data);

            // Reattach delete listeners after loading
            attachDeleteListeners();

        })
        .catch(err => {
            console.error("Error loading expenses:", err);
        });


}

// Attach delete event listeners
function attachDeleteListeners() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            let expenseId = this.getAttribute("data-id");

            if (confirm("Are you sure you want to delete this expense?")) {
                fetch(`http://127.0.0.1:5000/delete/${expenseId}`, {
                    method: "DELETE",
                    headers: getHeaders()
                })
                    .then(res => res.json())
                    .then(data => {
                        alert("Expense deleted successfully");
                        loadExpenses();
                        loadChartData();
                    })
                    .catch(err => {
                        console.error("Error:", err);
                        alert("Error deleting expense: " + err.message);
                    });
            }
        });
    });
}

let expensesData = [];
let currentMode = "monthly";

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
    let today = new Date();

    expensesData.forEach(exp => {

        if (!exp.date || !exp.amount) return;

        let expDate = new Date(exp.date);
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

        let date = new Date(exp.date);
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

    drawSVGChart(data);

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

function drawSVGChart(data) {

    if (currentMode === "weekly") {
        drawBarChart(data);
    } else {
        drawLineChart(data);
    }

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

    document.getElementById("lineChart").setAttribute("d", linePath);
    document.getElementById("areaChart").setAttribute("d", areaPath);

    document.getElementById("barChartGroup").innerHTML = "";

}

function drawBarChart(data) {

    let width = 1000;
    let height = 300;
    let maxValue = Math.max(...data, 1);

    let barCount = data.length;

    // ✅ Proper spacing calculation
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
        rect.setAttribute("y", y);
        rect.setAttribute("width", barWidth);
        rect.setAttribute("height", barHeight);
        rect.setAttribute("fill", "url(#barGrad)");
        rect.setAttribute("rx", "6");

        // Optional smooth animation
        rect.style.transition = "all 0.3s ease";

        barGroup.appendChild(rect);

    });

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

    function setCircle(id, value) {

        let circle = document.getElementById(id);

        circle.setAttribute("stroke-dasharray", `${value} ${C}`);
        circle.setAttribute("stroke-dashoffset", -offset);

        offset += value;

    }

    setCircle("travelCircle", t);
    setCircle("foodCircle", f);
    setCircle("billsCircle", b);
    setCircle("housingCircle", h);
    setCircle("shoppingCircle", s);
    setCircle("otherCircle", o);

    document.getElementById("travelAmount").innerText = "₹" + travel.toFixed(2);
    document.getElementById("foodAmount").innerText = "₹" + food.toFixed(2);
    document.getElementById("billsAmount").innerText = "₹" + bills.toFixed(2);
    document.getElementById("housingAmount").innerText = "₹" + housing.toFixed(2);
    document.getElementById("shoppingAmount").innerText = "₹" + shopping.toFixed(2);
    document.getElementById("otherAmount").innerText = "₹" + other.toFixed(2);

}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Display the logged-in username
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('welcomeUsername').textContent = username;
    }

    // Load initial data
    loadExpenses();
    loadChartData();

    // Set default date to today (use local date, not UTC)
    const today = getTodayLocal();
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = today;
    }

    // Add expense form listener
    attachFormListener();
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
}

// Store original dashboard HTML
let originalDashboardHTML = null;

// Navigation function to load different pages
function loadContent(page, event) {
    // Close budget modal if it's open
    closeBudgetModal();

    const mainContent = document.getElementById('mainContent');
    const pageTitle = document.getElementById('pageTitle');

    // Save original dashboard HTML on first load
    if (originalDashboardHTML === null) {
        originalDashboardHTML = mainContent.innerHTML;
    }

    // Update active button styling
    document.querySelectorAll('[data-nav]').forEach(btn => {
        btn.classList.remove('bg-primary/10', 'text-primary');
    });

    // Find the button that was clicked and highlight it
    if (event && event.target) {
        let btn = event.target.closest('button');
        if (btn) {
            btn.classList.add('bg-primary/10', 'text-primary');
            btn.classList.remove('text-slate-600', 'dark:text-slate-400');
        }
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

            break;

        case 'expenses':
            pageTitle.textContent = 'All Expenses';
            loadExpensesPage();
            break;

        case 'savings':
            pageTitle.textContent = 'Savings';
            loadSavingsPage();
            break;

        case 'reports':
            pageTitle.textContent = 'Reports';
            loadReportsPage();
            break;

        case 'addamount':
            pageTitle.textContent = 'Set Budget';
            loadAddAmountPage();
            break;

        case 'dashboard':
            pageTitle.textContent = 'Expense Overview';

            mainContent.innerHTML = originalDashboardHTML;
            setTimeout(() => {
                renderChart();
            }, 200);

            // ✅ Reattach everything after DOM reload
            attachFormListener();

            document.getElementById("weeklyBtn").addEventListener("click", function () {
                currentMode = "weekly";
                loadChartData();
            });

            document.getElementById("monthlyBtn").addEventListener("click", function () {
                currentMode = "monthly";
                loadChartData();
            });

            // ✅ Reload data
            loadExpenses();
            loadChartData();
            break;

    }
}

// Show settings dialog
function showSettings() {
    alert('Settings page coming soon!');
}

// Load savings page
function loadSavingsPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-semibold mb-4">Savings Overview</h3>
                <div class="space-y-4">
                    <div>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Monthly Income</p>
                        <p class="text-2xl font-bold">₹10,000</p>
                    </div>
                    <div>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Monthly Expense</p>
                        <p id="savingsExpenseTotal" class="text-2xl font-bold">₹0</p>
                    </div>
                    <div class="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <p class="text-sm text-slate-500 dark:text-slate-400">Total Savings</p>
                        <p id="savingsAmount" class="text-3xl font-bold text-emerald-500">₹0</p>
                    </div>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-semibold mb-4">Savings Tips</h3>
                <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li>• Set a monthly budget and stick to it</li>
                    <li>• Track your expenses regularly</li>
                    <li>• Cut down unnecessary spending</li>
                    <li>• Save 20% of your income</li>
                    <li>• Use the dashboard to monitor savings</li>
                </ul>
            </div>
        </div>
    `;

    // Calculate and display savings
    fetch("http://127.0.0.1:5000/expenses", {
        headers: getHeaders()
    })
        .then(res => res.json())
        .then(data => {
            let total = data.reduce((sum, exp) => sum + Number(exp.amount), 0);
            document.getElementById("savingsExpenseTotal").textContent = "₹" + total;
            document.getElementById("savingsAmount").textContent = "₹" + (10000 - total);
        })
        .catch(err => console.error("Error:", err));
}

// Load reports page
function loadReportsPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-semibold mb-4">Category Breakdown</h3>
                <div id="categoryReport" class="space-y-3 text-sm">
                    <p class="text-slate-500">Loading...</p>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                <h3 class="text-lg font-semibold mb-4">Monthly Summary</h3>
                <div id="monthlyReport" class="space-y-3 text-sm">
                    <p class="text-slate-500">Loading...</p>
                </div>
            </div>
        </div>
    `;

    // Load report data
    fetch("http://127.0.0.1:5000/expenses", {
        headers: getHeaders()
    })
        .then(res => res.json())
        .then(data => {
            let categories = {};
            data.forEach(exp => {
                if (categories[exp.category]) {
                    categories[exp.category] += Number(exp.amount);
                } else {
                    categories[exp.category] = Number(exp.amount);
                }
            });

            let categoryHtml = '';
            for (let cat in categories) {
                categoryHtml += `<div class="flex justify-between"><span>${cat}:</span><span class="font-semibold">₹${categories[cat].toFixed(2)}</span></div>`;
            }
            document.getElementById("categoryReport").innerHTML = categoryHtml || '<p class="text-slate-500">No data</p>';
        })
        .catch(err => console.error("Error:", err));
}


// ---------------- BUDGET MODAL ---------------- //

function openBudgetModal() {
    const modal = document.getElementById('budgetModal');
    if (!modal) return;

    // Pre-fill current month (local time)
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('budgetMonth').value = month;

    // Clear previous values & error
    document.getElementById('modalMonthlyBudget').value = '';
    document.getElementById('modalDailyLimit').value = '';
    const err = document.getElementById('budgetModalError');
    err.textContent = '';
    err.classList.add('hidden');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(() => document.getElementById('modalMonthlyBudget').focus(), 50);

    // Escape key closes
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

    // Validate
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
            closeBudgetModal();
            loadExpenses();   // refresh Monthly Budget card
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

