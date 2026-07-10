function renderSettingsPage() {
    const mainContent = document.getElementById('mainContent');

    const username = localStorage.getItem('username') || 'Guest';
    const email = localStorage.getItem('email') || '';
    const fullName = localStorage.getItem('full_name') || username;

    mainContent.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-6">

            <section class="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-sky-50 via-white to-indigo-50 dark:from-slate-900 dark:via-[#142440] dark:to-[#0e1a2c] p-6 md:p-8 shadow-2xl">
                <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 dark:bg-primary/30 blur-3xl"></div>
                <div class="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-cyan-300/20 dark:bg-cyan-400/20 blur-2xl"></div>
                <div class="relative flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p class="text-[11px] uppercase tracking-[0.2em] text-primary/80 dark:text-primary-200/90">Settings Hub</p>
                        <h2 class="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account Details</h2>
                        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Update profile information and app preferences.</p>
                    </div>
                    <div class="rounded-2xl border border-slate-300/70 bg-white/70 dark:border-white/20 dark:bg-white/10 px-4 py-3 backdrop-blur">
                        <p class="text-[11px] text-slate-600 dark:text-slate-300">Signed in as</p>
                        <p id="settingsDisplayName" class="text-base font-bold text-slate-900 dark:text-white">${username}</p>
                    </div>
                </div>
            </section>

            <section class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div class="flex items-center gap-4 mb-6">
                    <img id="settingsAvatar" class="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/40 shadow-lg" src="${getAvatarSrcByGender(localStorage.getItem('gender') || 'male')}" alt="${username} avatar" />
                    <div>
                        <h3 class="text-lg font-bold">Profile Information</h3>
                        <p class="text-xs text-slate-500">Click Make Changes to unlock editable fields.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="text-[11px] uppercase tracking-wide text-slate-500">Full Name</label>
                        <input id="settingsFullName" type="text"
                            class="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                            value="${fullName}"
                            readonly disabled />
                    </div>

                    <div>
                        <label class="text-[11px] uppercase tracking-wide text-slate-500">Username</label>
                        <input id="settingsUsername" type="text"
                            class="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                            value="${username}" readonly disabled />
                    </div>

                    <div class="md:col-span-2">
                        <label class="text-[11px] uppercase tracking-wide text-slate-500">Email</label>
                        <input id="settingsEmail" type="email"
                            class="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-300 cursor-not-allowed"
                            value="${email}"
                            readonly disabled
                            placeholder="Email cannot be changed" />
                    </div>
                </div>

                <div id="profileSecurityBlock" class="hidden mt-5 rounded-2xl border border-amber-300/50 dark:border-amber-600/40 bg-amber-50/80 dark:bg-amber-900/20 p-4">
                    <label class="text-xs font-semibold text-amber-700 dark:text-amber-300">Current password (optional)</label>
                    <input id="profileCurrentPassword" type="password"
                        class="w-full mt-2 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300/60 dark:border-amber-600/40 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        disabled
                        placeholder="Leave blank to save without password" />
                    <p class="mt-2 text-xs text-amber-700/90 dark:text-amber-300/90">You can save profile changes without entering it.</p>
                </div>

                <div class="mt-5 flex flex-wrap gap-3">
                    <button id="enableProfileEditBtn"
                        class="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition">
                        Make Changes
                    </button>

                    <button id="saveSettingsBtn"
                        class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
                        disabled>
                        Save Changes
                    </button>
                </div>
            </section>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section class="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 class="text-lg font-semibold mb-4">Preferences</h3>
                    <div class="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                        <div>
                            <p class="text-sm font-medium">Dark Mode</p>
                            <span id="themeStatus" class="text-xs text-slate-500"></span>
                        </div>
                        <label for="toggleThemeBtn" class="relative inline-flex items-center cursor-pointer select-none">
                            <input id="toggleThemeBtn" type="checkbox" class="peer sr-only" />
                            <span class="w-14 h-8 rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400/50 dark:border-slate-600 transition peer-checked:bg-primary"></span>
                            <span class="absolute left-1 top-1 w-6 h-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6"></span>
                            <span id="themeIcon" class="material-symbols-outlined absolute left-1 top-1 w-6 h-6 text-[16px] leading-6 text-center text-amber-500 transition-transform peer-checked:translate-x-6 peer-checked:text-slate-700">light_mode</span>
                        </label>
                    </div>

                    <div class="mt-6 rounded-xl border border-red-300/60 dark:border-red-700/60 bg-red-50/80 dark:bg-red-900/20 p-4">
                        <button id="logoutBtn"
                            class="w-full px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">
                            Logout
                        </button>
                    </div>
                </section>
            </div>

        </div>
    `;

    attachSettingsEvents();
    loadSettingsProfile();
    setSettingsAvatar();
}

function showSettings() {
    loadContent('settings');
}

function loadSettingsProfile() {
    fetch('http://127.0.0.1:5000/profile', {
        headers: getHeaders()
    })
        .then(async (res) => {
            const data = await parseApiResponse(res, 'Failed to load profile');
            if (!res.ok) throw new Error(data.message || 'Failed to load profile');
            return data;
        })
        .then(profile => {
            if (profile.full_name) {
                localStorage.setItem('full_name', profile.full_name);
                const fullNameEl = document.getElementById('settingsFullName');
                if (fullNameEl) fullNameEl.value = profile.full_name;
            }

            if (profile.username) {
                localStorage.setItem('username', profile.username);
                document.getElementById('settingsUsername').value = profile.username;
                document.getElementById('settingsDisplayName').textContent = profile.username;

                const welcome = document.getElementById('welcomeUsername');
                if (welcome) welcome.textContent = profile.username;
            }

            if (profile.email) {
                localStorage.setItem('email', profile.email);
                document.getElementById('settingsEmail').value = profile.email;
            }

            if (profile.favorite_sport) {
                localStorage.setItem('favorite_sport', profile.favorite_sport);
            }

            if (profile.gender) {
                localStorage.setItem('gender', String(profile.gender).toLowerCase());
                setUserAvatar();
            }

            setSettingsAvatar();
        })
        .catch(err => {
            console.error('Profile load failed:', err);
            showPopup('Could not load latest profile info', 'warning', 3500);
        });
}

function attachSettingsEvents() {
    const enableProfileEditBtn = document.getElementById('enableProfileEditBtn');
    const saveBtn = document.getElementById('saveSettingsBtn');
    const themeStatus = document.getElementById('themeStatus');
    const toggleThemeBtn = document.getElementById('toggleThemeBtn');
    const themeIcon = document.getElementById('themeIcon');
    const usernameInput = document.getElementById('settingsUsername');
    const emailInput = document.getElementById('settingsEmail');
    const fullNameInput = document.getElementById('settingsFullName');
    const profilePasswordInput = document.getElementById('profileCurrentPassword');
    const profileSecurityBlock = document.getElementById('profileSecurityBlock');
    let profileEditingEnabled = false;

    const updateThemeLabel = () => {
        const isDark = document.documentElement.classList.contains('dark');
        themeStatus.textContent = isDark ? 'Enabled' : 'Disabled';
        if (toggleThemeBtn) {
            toggleThemeBtn.checked = isDark;
        }
        if (themeIcon) {
            themeIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
        }
    };
    updateThemeLabel();

    // Enable profile editing
    enableProfileEditBtn.addEventListener('click', () => {
        profileEditingEnabled = true;
        fullNameInput.disabled = false;
        fullNameInput.readOnly = false;
        usernameInput.disabled = false;
        usernameInput.readOnly = false;
        emailInput.disabled = true;
        emailInput.readOnly = true;
        profileSecurityBlock.classList.remove('hidden');
        profilePasswordInput.disabled = false;
        saveBtn.disabled = false;
        usernameInput.focus();
        enableProfileEditBtn.textContent = 'Editing Enabled';
        enableProfileEditBtn.disabled = true;
        showPopup('You can now edit profile fields', 'info', 2200);
    });

    // Save profile
    saveBtn.addEventListener('click', () => {
        if (!profileEditingEnabled) {
            showPopup('Click Make Changes first to edit your profile', 'warning', 3000);
            return;
        }

        const username = document.getElementById('settingsUsername').value.trim();
        const fullName = document.getElementById('settingsFullName').value.trim();
        const currentPassword = document.getElementById('profileCurrentPassword').value;

        if (!fullName || !username) {
            showPopup('Full name and username are required', 'error');
            return;
        }

        if (username.length < 3) {
            showPopup('Username must be at least 3 characters', 'error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        fetch('http://127.0.0.1:5000/profile', {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                full_name: fullName,
                username
            })
        })
            .then(async (res) => {
                const data = await parseApiResponse(res, 'Profile update failed');
                if (!res.ok) throw new Error(data.message || 'Profile update failed');
                return data;
            })
            .then(data => {
                const updated = data.profile || {};
                const updatedFullName = updated.full_name || fullName;
                const updatedUsername = updated.username || username;

                localStorage.setItem('full_name', updatedFullName);
                localStorage.setItem('username', updatedUsername);

                document.getElementById('settingsFullName').value = updatedFullName;

                const welcome = document.getElementById('welcomeUsername');
                if (welcome) welcome.textContent = updatedUsername;

                document.getElementById('settingsDisplayName').textContent = updatedUsername;

                setUserAvatar();
                setSettingsAvatar();
                showPopup('Profile updated successfully', 'success');
            })
            .catch(err => {
                console.error('Profile update failed:', err);
                showPopup(err.message || 'Unable to update profile', 'error', 4000);
            })
            .finally(() => {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';

                usernameInput.disabled = true;
                usernameInput.readOnly = true;
                emailInput.disabled = true;
                emailInput.readOnly = true;
                fullNameInput.disabled = true;
                fullNameInput.readOnly = true;
                profilePasswordInput.value = '';
                profilePasswordInput.disabled = true;
                profileSecurityBlock.classList.add('hidden');
                enableProfileEditBtn.disabled = false;
                enableProfileEditBtn.textContent = 'Make Changes';
                profileEditingEnabled = false;
            });
    });

    // Toggle theme
    toggleThemeBtn.addEventListener('change', () => {
        const isDark = toggleThemeBtn.checked;
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeLabel();
        showPopup('Theme preference saved', 'info', 2200);
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        showConfirm('Do you want to logout from this account?', {
            title: 'Confirm Logout',
            okText: 'Logout',
            cancelText: 'Stay'
        }).then(confirmed => {
            if (!confirmed) return;
            localStorage.clear();
            window.location.href = 'login.html';
        });
    });
}