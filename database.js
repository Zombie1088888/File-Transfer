const ADMIN_PASSWORD = '951753Caleb!!';
const adminForm = document.getElementById('adminForm');

adminForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (document.getElementById('adminPassword').value !== ADMIN_PASSWORD) {
        alert('Incorrect admin password.');
        return;
    }

    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('databaseView').style.display = 'block';
    renderUsers();
});

function renderUsers() {
    const users = JSON.parse(localStorage.getItem('p2p_users') || '{}');
    const body = document.querySelector('#usersTable tbody');
    const entries = Object.values(users);
    body.replaceChildren();
    document.getElementById('databaseNote').textContent = entries.length
        ? `${entries.length} account(s) saved in this browser. Passwords are hidden.`
        : 'No accounts are saved in this browser.';

    entries.forEach((user) => {
        const row = document.createElement('tr');
        const username = document.createElement('td');
        const status = document.createElement('td');
        const lastLogin = document.createElement('td');
        username.textContent = user.username;
        status.textContent = localStorage.getItem(`p2p_active_${user.username.toLowerCase()}`) ? 'Active' : 'Not active';
        lastLogin.textContent = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never';
        [username, status, lastLogin].forEach((cell) => {
            cell.style.padding = '8px';
            cell.style.borderTop = '1px solid #ddd';
            row.appendChild(cell);
        });
        body.appendChild(row);
    });
}
