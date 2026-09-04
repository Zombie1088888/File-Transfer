const ADMIN_PASSWORD = '951753Caleb!!';
const USERS_KEY = 'FILE_DROP_USERS';

function doGet(event) {
	const page = event && event.parameter && event.parameter.page;
	const file = page === 'database' ? 'database' : page === 'app' ? 'index' : 'signin';
	return HtmlService.createTemplateFromFile(file)
		.evaluate()
		.setTitle('P2P File & Folder Drop')
		.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
	return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function hashPassword(password) {
	const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
	return bytes.map((byte) => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

function getUsers() {
	return JSON.parse(PropertiesService.getScriptProperties().getProperty(USERS_KEY) || '{}');
}

function saveUsers(users) {
	PropertiesService.getScriptProperties().setProperty(USERS_KEY, JSON.stringify(users));
}

function createAccount(username, password) {
	const key = String(username).trim().toLowerCase();
	if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username) || String(password).length < 4) {
		throw new Error('Invalid username or password.');
	}
	const users = getUsers();
	if (users[key]) throw new Error('That username is already taken.');
	users[key] = { username: String(username).trim(), passwordHash: hashPassword(String(password)), lastLogin: new Date().toISOString() };
	saveUsers(users);
	return { username: users[key].username };
}

function login(username, password) {
	const key = String(username).trim().toLowerCase();
	const users = getUsers();
	if (!users[key] || users[key].passwordHash !== hashPassword(String(password))) {
		throw new Error('Username or password is incorrect.');
	}
	users[key].lastLogin = new Date().toISOString();
	saveUsers(users);
	return { username: users[key].username };
}

function listUsers(adminPassword) {
	if (adminPassword !== ADMIN_PASSWORD) throw new Error('Incorrect admin password.');
	return Object.values(getUsers()).map((user) => ({ username: user.username, lastLogin: user.lastLogin || null }));
}

function clearUsers(adminPassword) {
	if (adminPassword !== ADMIN_PASSWORD) throw new Error('Incorrect admin password.');
	PropertiesService.getScriptProperties().deleteProperty(USERS_KEY);
}
