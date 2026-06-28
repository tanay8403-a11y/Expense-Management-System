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

// ============================================================
// ALL EXPENSES PAGE — with Update + Delete actions
// ============================================================

function loadExpensesPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `

        <!-- Update Expense Modal (hidden by default) -->
        <div id="updateModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 hidden">

            <!-- Backdrop -->
            <div id="modalBackdrop"
                class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

            <!-- Modal Card -->
            <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl
                        w-full max-w-md mx-auto z-10
                        border border-slate-200 dark:border-slate-700
                        animate-modal">

                <!-- Header -->
                <div class="flex items-center justify-between px-6 py-4
                            border-b border-slate-200 dark:border-slate-800">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">edit</span>
                        <h3 class="text-lg font-bold">Update Expense</h3>
                    </div>
                    <button id="closeModalBtn"
                        class="w-8 h-8 flex items-center justify-center rounded-full
                               text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                               hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <!-- Form -->
                <div class="px-6 py-5 space-y-4">

                    <input type="hidden" id="updateExpenseId">

                    <!-- Description -->
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400 mb-1.5">
                            Description
                        </label>
                        <input id="updateDescription" type="text"
                            class="w-full px-4 py-2.5 rounded-lg text-sm font-medium
                                   bg-slate-50 dark:bg-slate-800
                                   border border-slate-300 dark:border-slate-600
                                   text-slate-900 dark:text-slate-100
                                   placeholder-slate-400
                                   focus:outline-none focus:ring-2 focus:ring-primary/50
                                   focus:border-primary transition"
                            placeholder="e.g. Rent, Groceries…">
                    </div>

                    <!-- Date -->
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400 mb-1.5">
                            Date
                        </label>
                        <input id="updateDate" type="date"
                            class="w-full px-4 py-2.5 rounded-lg text-sm font-medium
                                   bg-slate-50 dark:bg-slate-800
                                   border border-slate-300 dark:border-slate-600
                                   text-slate-900 dark:text-slate-100
                                   focus:outline-none focus:ring-2 focus:ring-primary/50
                                   focus:border-primary transition">
                    </div>

                    <!-- Amount + Category -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 mb-1.5">
                                Amount
                            </label>
                            <input id="updateAmount" type="number" step="0.01"
                                class="w-full px-4 py-2.5 rounded-lg text-sm font-medium
                                       bg-slate-50 dark:bg-slate-800
                                       border border-slate-300 dark:border-slate-600
                                       text-slate-900 dark:text-slate-100
                                       placeholder-slate-400
                                       focus:outline-none focus:ring-2 focus:ring-primary/50
                                       focus:border-primary transition"
                                placeholder="0.00">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 mb-1.5">
                                Category
                            </label>
                            <select id="updateCategory"
                                class="w-full px-4 py-2.5 rounded-lg text-sm font-medium
                                       bg-slate-50 dark:bg-slate-800
                                       border border-slate-300 dark:border-slate-600
                                       text-slate-900 dark:text-slate-100
                                       focus:outline-none focus:ring-2 focus:ring-primary/50
                                       focus:border-primary transition">
                                <option value="Food">Food</option>
                                <option value="Travel">Travel</option>
                                <option value="Shopping">Shopping</option>
                                <option value="Bills">Bills</option>
                                <option value="Housing">Housing</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                </div>

                <!-- Footer buttons -->
                <div class="flex items-center gap-3 px-6 py-4
                            border-t border-slate-200 dark:border-slate-800">
                    <button id="cancelModalBtn"
                        class="flex-1 py-2.5 rounded-lg text-sm font-semibold
                               bg-slate-100 dark:bg-slate-800
                               text-slate-700 dark:text-slate-300
                               hover:bg-slate-200 dark:hover:bg-slate-700
                               transition-colors">
                        Cancel
                    </button>
                    <button id="saveUpdateBtn"
                        class="flex-1 py-2.5 rounded-lg text-sm font-bold
                               bg-primary text-white
                               hover:bg-primary/90 active:scale-95
                               transition-all shadow-md shadow-primary/20">
                        Save Changes
                    </button>
                </div>

            </div>
        </div>

        <!-- Page Content -->
        <div class="bg-white dark:bg-slate-900 rounded-xl
                    border border-slate-200 dark:border-slate-800
                    shadow-sm overflow-hidden">

            <!-- Card header -->
            <div class="px-4 md:px-6 py-4
                        border-b border-slate-200 dark:border-slate-800
                        flex items-center justify-between">
                <h3 class="text-base md:text-lg font-bold">All Expenses</h3>
                <span id="expenseCount"
                    class="text-xs text-slate-500 dark:text-slate-400 font-medium"></span>
            </div>

            <!-- View Toggle -->
            <div class="px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex gap-2">
                <button id="dayViewBtn" class="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-primary text-white hover:bg-primary/90">
                    Day-wise
                </button>
                <button id="monthViewBtn" class="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
                    Month-wise
                </button>
            </div>

            <!-- Category Filter -->
            <div class="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Filter by Category</p>
                <div class="flex flex-wrap gap-2" id="categoryFilters">
                    <button class="category-filter px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-primary text-white hover:bg-primary/90" data-category="all">
                        All
                    </button>
                </div>
            </div>

            <!-- Day-wise Sections -->
            <div id="dayWiseSections" class="divide-y divide-slate-100 dark:divide-slate-800">
            </div>

            <!-- Month-wise Sections -->
            <div id="monthWiseSections" class="hidden divide-y divide-slate-100 dark:divide-slate-800">
            </div>

            <!-- Empty state (shown via JS) -->
            <div id="emptyState" class="hidden py-16 text-center">
                <span class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
                    receipt_long
                </span>
                <p class="mt-3 text-slate-400 dark:text-slate-500 text-sm">No expenses found</p>
            </div>

        </div>
    `;

    /* ── Modal helpers ──────────────────────────────────── */
    const modal       = document.getElementById('updateModal');
    const backdrop    = document.getElementById('modalBackdrop');
    const closeBtn    = document.getElementById('closeModalBtn');
    const cancelBtn   = document.getElementById('cancelModalBtn');
    const saveBtn     = document.getElementById('saveUpdateBtn');

    function openModal(exp) {
        document.getElementById('updateExpenseId').value    = exp.id;
        document.getElementById('updateDescription').value  = exp.description;
        document.getElementById('updateDate').value         = exp.date;
        document.getElementById('updateAmount').value       = exp.amount;
        document.getElementById('updateCategory').value     = exp.category;

        // Set max date to today (local date, not UTC)
        const updateDateInput = document.getElementById('updateDate');
        const today = new Date().toLocaleDateString('en-CA');
        updateDateInput.setAttribute('max', today);

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Focus first field for accessibility
        setTimeout(() => document.getElementById('updateDescription').focus(), 50);
    }

    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    // Escape key closes modal
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });

    /* ── Save update ────────────────────────────────────── */
    saveBtn.addEventListener('click', function () {
        const id          = document.getElementById('updateExpenseId').value;
        const description = document.getElementById('updateDescription').value.trim();
        const date        = document.getElementById('updateDate').value;
        const amount      = parseFloat(document.getElementById('updateAmount').value);
        const category    = document.getElementById('updateCategory').value;

        // Validation
        if (!description || !date || !amount || !category) {
            showModalError('Please fill in all fields.');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showModalError('Please enter a valid amount.');
            return;
        }

        // Validate date - no future dates allowed
        // Append T00:00:00 (no Z) so JS parses it as LOCAL midnight, not UTC
        const selectedDate = new Date(date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            showModalError('Expense date cannot be in the future. Please select today or an earlier date.');
            return;
        }

        // Optimistic UI: disable button + show loading
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Saving…';

        fetch(`http://127.0.0.1:5000/update/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, date, amount, category })
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(() => {
            closeModal();
            loadExpensesPage();   // refresh table
            loadExpenses();       // refresh dashboard totals
            loadChartData();      // refresh chart
        })
        .catch(err => {
            saveBtn.disabled    = false;
            saveBtn.textContent = 'Save Changes';
            showModalError('Update failed: ' + err.message);
        });
    });

    function showModalError(msg) {
        let err = document.getElementById('modalError');
        if (!err) {
            err = document.createElement('p');
            err.id = 'modalError';
            err.className = 'text-xs text-red-500 font-medium px-6 pb-2';
            document.getElementById('cancelModalBtn').closest('.flex').before(err);
        }
        err.textContent = msg;
    }

    /* ── Load & render day-wise sections ───────────────── */
    fetch("http://127.0.0.1:5000/expenses", {
        headers: getHeaders()
    })
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById("dayWiseSections");
        const empty = document.getElementById("emptyState");

        if (!data.length) {
            empty.classList.remove('hidden');
            document.getElementById('expenseCount').textContent = '0 expenses';
            return;
        }

        document.getElementById('expenseCount').textContent =
            data.length + ' expense' + (data.length !== 1 ? 's' : '');

        // Sort expenses by date (most recent first)
        const sorted = [...data].sort((a, b) => {
            const diff = new Date(b.date) - new Date(a.date);
            return diff !== 0 ? diff : b.id - a.id;
        });

        // Category badge colour map
        const badgeClass = {
            food:     'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            travel:   'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
            bills:    'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
            housing:  'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
            shopping: 'bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400',
        };

        // Get unique categories
        const uniqueCategories = [...new Set(sorted.map(exp => exp.category))];
        
        // Create category filter buttons
        const filterContainer = document.getElementById('categoryFilters');
        uniqueCategories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'category-filter px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600';
            btn.textContent = category;
            btn.dataset.category = category.toLowerCase();
            filterContainer.appendChild(btn);
        });

        let selectedFilter = 'all';
        let currentView = 'day'; // 'day' or 'month'

        // Function to render filtered expenses
        const renderExpenses = () => {
            if (currentView === 'day') {
                renderDayWiseExpenses();
            } else {
                renderMonthWiseExpenses();
            }
        };

        const renderDayWiseExpenses = () => {
            const container = document.getElementById("dayWiseSections");
            container.innerHTML = '';
            document.getElementById("monthWiseSections").classList.add('hidden');
            document.getElementById("dayWiseSections").classList.remove('hidden');

            // Filter expenses
            const filtered = selectedFilter === 'all' 
                ? sorted 
                : sorted.filter(exp => exp.category.toLowerCase() === selectedFilter);

            if (!filtered.length) {
                document.getElementById('emptyState').classList.remove('hidden');
                document.getElementById('expenseCount').textContent = '0 expenses';
                return;
            }

            document.getElementById('emptyState').classList.add('hidden');
            document.getElementById('expenseCount').textContent =
                filtered.length + ' expense' + (filtered.length !== 1 ? 's' : '');

            // Group filtered expenses by date
            const groupedByDate = {};
            filtered.forEach(exp => {
                if (!groupedByDate[exp.date]) {
                    groupedByDate[exp.date] = [];
                }
                groupedByDate[exp.date].push(exp);
            });

            // Render sections for each date
            Object.keys(groupedByDate).forEach(date => {
            const expenses = groupedByDate[date];
            const dateObj = new Date(date + 'T00:00:00'); // parse as local time to get correct day name in IST
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            // Calculate day total
            const dayTotal = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

            const daySection = document.createElement('div');
            daySection.className = 'day-section';
            const dayId = `day-${date.replace(/-/g, '')}`;
            
            // Create header
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header px-4 md:px-6 py-4 bg-slate-50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors';
            dayHeader.dataset.dayId = dayId;
            dayHeader.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 flex-1">
                        <button class="collapse-btn inline-flex items-center justify-center w-6 h-6 rounded transition-transform"
                                style="color: var(--primary-color, #3b82f6);">
                            <span class="material-symbols-outlined text-lg leading-none">expand_more</span>
                        </button>
                        <div>
                            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                ${dayName}
                            </p>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                ${formattedDate}
                            </p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold text-primary">
                            ₹${dayTotal.toFixed(2)}
                        </p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            ${expenses.length} item${expenses.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            `;
            daySection.appendChild(dayHeader);

            // Create content container
            const dayContent = document.createElement('div');
            dayContent.className = 'day-content divide-y divide-slate-100 dark:divide-slate-800';
            dayContent.dataset.dayId = dayId;

            // Add expense items
            expenses.forEach(exp => {
                const categoryBadgeClass = badgeClass[(exp.category || '').toLowerCase()] ||
                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';

                const expenseItem = document.createElement('div');
                expenseItem.className = 'px-4 md:px-6 py-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors';
                expenseItem.innerHTML = `
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1">
                            <p class="text-lg font-bold text-slate-900 dark:text-slate-100">
                                ${exp.description}
                            </p>
                            <div class="mt-2">
                                <span class="px-3 py-1.5 rounded-full text-base font-semibold ${categoryBadgeClass}">
                                    ${exp.category}
                                </span>
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                ₹${Number(exp.amount).toFixed(2)}
                            </p>
                            <p class="text-base text-slate-400 dark:text-slate-500 mt-2">
                                ${new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                        <div class="flex items-center gap-3 ml-2 flex-shrink-0">
                            <!-- Edit button -->
                            <button
                                class="edit-btn inline-flex items-center justify-center
                                       w-10 h-10 rounded-lg
                                       text-primary bg-primary/10
                                       hover:bg-primary/20 transition-colors"
                                data-id="${exp.id}"
                                data-description="${exp.description}"
                                data-date="${exp.date}"
                                data-amount="${exp.amount}"
                                data-category="${exp.category}"
                                title="Edit">
                                <span class="material-symbols-outlined text-xl leading-none">edit</span>
                            </button>

                            <!-- Delete button -->
                            <button
                                class="all-delete-btn inline-flex items-center justify-center
                                       w-10 h-10 rounded-lg
                                       text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10
                                       hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                data-id="${exp.id}"
                                title="Delete">
                                <span class="material-symbols-outlined text-xl leading-none">delete</span>
                            </button>
                        </div>
                    </div>
                `;
                dayContent.appendChild(expenseItem);
            });

            daySection.appendChild(dayContent);
            container.appendChild(daySection);
            });

            // Collapse/Expand functionality
            document.querySelectorAll('.day-header').forEach(header => {
                const collapseBtn = header.querySelector('.collapse-btn');
                const dayId = header.dataset.dayId;
                const dayContent = container.querySelector(`.day-content[data-day-id="${dayId}"]`);
                
                // Initially expanded
                let isExpanded = true;

                header.addEventListener('click', function () {
                    isExpanded = !isExpanded;
                    
                    if (isExpanded) {
                        dayContent.classList.remove('hidden');
                        collapseBtn.style.transform = 'rotate(0deg)';
                    } else {
                        dayContent.classList.add('hidden');
                        collapseBtn.style.transform = 'rotate(-90deg)';
                    }
                });
            });

            // Edit button listeners
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    openModal({
                        id:          this.dataset.id,
                        description: this.dataset.description,
                        date:        this.dataset.date,
                        amount:      this.dataset.amount,
                        category:    this.dataset.category,
                    });
                });
            });

            // Delete button listeners
            document.querySelectorAll('.all-delete-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    if (!confirm('Are you sure you want to delete this expense?')) return;
                    const id = this.getAttribute('data-id');
                    fetch(`http://127.0.0.1:5000/delete/${id}`, { 
                        method: 'DELETE',
                        headers: getHeaders()
                    })
                    .then(res => res.json())
                    .then(() => {
                        loadExpensesPage();
                        loadExpenses();
                    })
                    .catch(err => alert('Error: ' + err.message));
                });
            });
        };

        const renderMonthWiseExpenses = () => {
            const container = document.getElementById("monthWiseSections");
            container.innerHTML = '';
            document.getElementById("dayWiseSections").classList.add('hidden');
            document.getElementById("monthWiseSections").classList.remove('hidden');

            // Filter expenses
            const filtered = selectedFilter === 'all' 
                ? sorted 
                : sorted.filter(exp => exp.category.toLowerCase() === selectedFilter);

            if (!filtered.length) {
                document.getElementById('emptyState').classList.remove('hidden');
                document.getElementById('expenseCount').textContent = '0 expenses';
                return;
            }

            document.getElementById('emptyState').classList.add('hidden');
            document.getElementById('expenseCount').textContent =
                filtered.length + ' expense' + (filtered.length !== 1 ? 's' : '');

            // Group filtered expenses by month
            const groupedByMonth = {};
            filtered.forEach(exp => {
                const dateObj = new Date(exp.date);
                const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                if (!groupedByMonth[monthKey]) {
                    groupedByMonth[monthKey] = [];
                }
                groupedByMonth[monthKey].push(exp);
            });

            // Sort months in reverse order (most recent first)
            const sortedMonths = Object.keys(groupedByMonth).sort().reverse();

            // Render sections for each month
            sortedMonths.forEach(monthKey => {
                const expenses = groupedByMonth[monthKey];
                const [year, month] = monthKey.split('-');
                const monthDate = new Date(year, parseInt(month) - 1);
                const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                
                // Calculate month total
                const monthTotal = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

                const monthSection = document.createElement('div');
                monthSection.className = 'day-section';
                const monthId = `month-${monthKey}`;
                
                // Create header
                const monthHeader = document.createElement('div');
                monthHeader.className = 'day-header px-4 md:px-6 py-4 bg-slate-50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors';
                monthHeader.dataset.dayId = monthId;
                monthHeader.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3 flex-1">
                            <button class="collapse-btn inline-flex items-center justify-center w-6 h-6 rounded transition-transform"
                                    style="color: var(--primary-color, #3b82f6);">
                                <span class="material-symbols-outlined text-lg leading-none">expand_more</span>
                            </button>
                            <div>
                                <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    ${monthName}
                                </p>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    ${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-bold text-primary">
                                ₹${monthTotal.toFixed(2)}
                            </p>
                        </div>
                    </div>
                `;
                monthSection.appendChild(monthHeader);

                // Create content container
                const monthContent = document.createElement('div');
                monthContent.className = 'day-content divide-y divide-slate-100 dark:divide-slate-800';
                monthContent.dataset.dayId = monthId;

                // Add expense items (sorted by date within month)
                const sortedByDate = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
                sortedByDate.forEach(exp => {
                    const categoryBadgeClass = badgeClass[(exp.category || '').toLowerCase()] ||
                        'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';

                    const expenseItem = document.createElement('div');
                    expenseItem.className = 'px-4 md:px-6 py-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors';
                    expenseItem.innerHTML = `
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex-1">
                                <p class="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    ${exp.description}
                                </p>
                                <div class="mt-2">
                                    <span class="px-3 py-1.5 rounded-full text-base font-semibold ${categoryBadgeClass}">
                                        ${exp.category}
                                    </span>
                                </div>
                            </div>
                            <div class="text-right flex-shrink-0">
                                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    ₹${Number(exp.amount).toFixed(2)}
                                </p>
                                <p class="text-base text-slate-400 dark:text-slate-500 mt-2">
                                    ${new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                            <div class="flex items-center gap-3 ml-2 flex-shrink-0">
                                <!-- Edit button -->
                                <button
                                    class="edit-btn inline-flex items-center justify-center
                                           w-10 h-10 rounded-lg
                                           text-primary bg-primary/10
                                           hover:bg-primary/20 transition-colors"
                                    data-id="${exp.id}"
                                    data-description="${exp.description}"
                                    data-date="${exp.date}"
                                    data-amount="${exp.amount}"
                                    data-category="${exp.category}"
                                    title="Edit">
                                    <span class="material-symbols-outlined text-xl leading-none">edit</span>
                                </button>

                                <!-- Delete button -->
                                <button
                                    class="all-delete-btn inline-flex items-center justify-center
                                           w-10 h-10 rounded-lg
                                           text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10
                                           hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                    data-id="${exp.id}"
                                    title="Delete">
                                    <span class="material-symbols-outlined text-xl leading-none">delete</span>
                                </button>
                            </div>
                        </div>
                    `;
                    monthContent.appendChild(expenseItem);
                });

                monthSection.appendChild(monthContent);
                container.appendChild(monthSection);
            });

            // Collapse/Expand functionality
            document.querySelectorAll('.day-header').forEach(header => {
                const collapseBtn = header.querySelector('.collapse-btn');
                const monthId = header.dataset.dayId;
                const monthContent = container.querySelector(`.day-content[data-day-id="${monthId}"]`);
                
                // Initially expanded
                let isExpanded = true;

                header.addEventListener('click', function () {
                    isExpanded = !isExpanded;
                    
                    if (isExpanded) {
                        monthContent.classList.remove('hidden');
                        collapseBtn.style.transform = 'rotate(0deg)';
                    } else {
                        monthContent.classList.add('hidden');
                        collapseBtn.style.transform = 'rotate(-90deg)';
                    }
                });
            });

            // Edit button listeners
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    openModal({
                        id:          this.dataset.id,
                        description: this.dataset.description,
                        date:        this.dataset.date,
                        amount:      this.dataset.amount,
                        category:    this.dataset.category,
                    });
                });
            });

            // Delete button listeners
            document.querySelectorAll('.all-delete-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    if (!confirm('Are you sure you want to delete this expense?')) return;
                    const id = this.getAttribute('data-id');
                    fetch(`http://127.0.0.1:5000/delete/${id}`, { 
                        method: 'DELETE',
                        headers: getHeaders()
                    })
                    .then(res => res.json())
                    .then(() => {
                        loadExpensesPage();
                        loadExpenses();
                    })
                    .catch(err => alert('Error: ' + err.message));
                });
            });
        };

        // Initial render
        renderExpenses();

        // View toggle button listeners
        document.getElementById('dayViewBtn').addEventListener('click', function () {
            currentView = 'day';
            // Update button styles
            this.classList.add('bg-primary', 'text-white', 'hover:bg-primary/90');
            this.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-200', 'dark:hover:bg-slate-600');
            
            document.getElementById('monthViewBtn').classList.remove('bg-primary', 'text-white', 'hover:bg-primary/90');
            document.getElementById('monthViewBtn').classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-200', 'dark:hover:bg-slate-600');
            
            renderExpenses();
        });

        document.getElementById('monthViewBtn').addEventListener('click', function () {
            currentView = 'month';
            // Update button styles
            this.classList.add('bg-primary', 'text-white', 'hover:bg-primary/90');
            this.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-200', 'dark:hover:bg-slate-600');
            
            document.getElementById('dayViewBtn').classList.remove('bg-primary', 'text-white', 'hover:bg-primary/90');
            document.getElementById('dayViewBtn').classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-200', 'dark:hover:bg-slate-600');
            
            renderExpenses();
        });

        // Category filter button listeners
        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.addEventListener('click', function () {
                // Remove active state from all buttons
                document.querySelectorAll('.category-filter').forEach(b => {
                    b.classList.remove('bg-primary', 'text-white', 'hover:bg-primary/90');
                    b.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-200', 'dark:hover:bg-slate-600');
                });

                // Add active state to clicked button
                this.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-200', 'dark:hover:bg-slate-600');
                this.classList.add('bg-primary', 'text-white', 'hover:bg-primary/90');

                // Update filter and re-render
                selectedFilter = this.dataset.category;
                renderExpenses();
            });
        });
    })
    .catch(err => console.error('Error loading expenses:', err));
}