let createMode = false;
const APP_PREFIX = 'p2p-folder-drop-user-v3-';
const form = document.getElementById('authForm');
const title = document.getElementById('authTitle');
const submitButton = document.getElementById('submitButton');
const toggle = document.getElementById('authToggle');

toggle.addEventListener('click', () => {
    createMode = !createMode;
    title.textContent = createMode ? 'Create a File Drop account' : 'Sign in to File Drop';
    submitButton.textContent = createMode ? 'Create Account' : 'Sign In';
    toggle.textContent = createMode ? 'Already have an account? Sign in' : 'Need an account? Create one';
    document.getElementById('password').value = '';
});

async function isUsernameAvailable(username) {
    return new Promise((resolve) => {
        const probe = new Peer(APP_PREFIX + username.toLowerCase());
        let finished = false;
        const finish = (available) => {
            if (finished) return;
            finished = true;
            probe.destroy();
            resolve(available);
        };
        probe.on('open', () => finish(true));
        probe.on('error', (error) => finish(error.type !== 'unavailable-id'));
        setTimeout(() => finish(false), 8000);
    });
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const users = JSON.parse(localStorage.getItem('p2p_users') || '{}');
    const key = username.toLowerCase();

    if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) {
        alert('Use 3-24 letters, numbers, underscores, or hyphens for your username.');
        return;
    }
    if (createMode) {
        if (users[key]) {
            alert('That username is already saved on this device.');
            return;
        }
        submitButton.disabled = true;
        submitButton.textContent = 'Checking username...';
        const available = await isUsernameAvailable(username);
        submitButton.disabled = false;
        submitButton.textContent = 'Create Account';
        if (!available) {
            alert('That username is already taken or the username service is unavailable.');
            return;
        }
        users[key] = { username, password };
        localStorage.setItem('p2p_users', JSON.stringify(users));
    } else if (!users[key] || users[key].password !== password) {
        alert('Username or password is incorrect.');
        return;
    }

    users[key].lastLogin = new Date().toISOString();
    localStorage.setItem('p2p_users', JSON.stringify(users));
    localStorage.setItem('p2p_current_user', users[key].username);
    window.location.href = 'index.html';
});
