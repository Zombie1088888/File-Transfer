let currentMode = 'files';
let currentUser = null;
let peer = null;
let selectedFolderFiles = [];
let receivingFiles = true;
const APP_PREFIX = 'p2p-folder-drop-user-v3-';

const savedUser = localStorage.getItem('p2p_current_user');
const savedUsers = JSON.parse(localStorage.getItem('p2p_users') || '{}');
if (!savedUser || !savedUsers[savedUser.toLowerCase()]) {
    window.location.href = 'signin.html';
} else {
    currentUser = savedUsers[savedUser.toLowerCase()].username;
}

document.getElementById('signOutBtn').addEventListener('click', () => {
    if (peer) peer.destroy();
    localStorage.removeItem('p2p_current_user');
    window.location.href = 'signin.html';
});

function switchMode(mode) {
    currentMode = mode;
    document.getElementById('tabFilesBtn').classList.toggle('active', mode === 'files');
    document.getElementById('tabFolderBtn').classList.toggle('active', mode === 'folder');
    document.getElementById('fileGroup').style.display = mode === 'files' ? 'block' : 'none';
    document.getElementById('folderGroup').style.display = mode === 'folder' ? 'block' : 'none';
}

document.getElementById('folderInput').addEventListener('change', (event) => {
    const newFiles = Array.from(event.target.files);
    selectedFolderFiles.push(...newFiles);
    const folderNames = [...new Set(selectedFolderFiles.map(file => file.webkitRelativePath.split('/')[0]))];
    document.getElementById('folderSummary').textContent = `${folderNames.length} folder(s), ${selectedFolderFiles.length} file(s) selected`;
    event.target.value = '';
});

function log(message, type = 'normal') {
    const logBox = document.getElementById('statusLog');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;
}

function peerIdFor(username) {
    return APP_PREFIX + username.toLowerCase();
}

function historyKey() {
    return `p2p_transfer_history_${currentUser.toLowerCase()}`;
}

function addHistory(kind, filename, username) {
    const history = JSON.parse(localStorage.getItem(historyKey()) || '{"sent":[],"downloaded":[]}');
    history[kind].unshift({ filename, username, time: new Date().toLocaleString() });
    history[kind] = history[kind].slice(0, 50);
    localStorage.setItem(historyKey(), JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem(historyKey()) || '{"sent":[],"downloaded":[]}');
    const lists = [['sentHistory', history.sent, 'to'], ['downloadHistory', history.downloaded, 'from']];
    lists.forEach(([id, entries, direction]) => {
        const list = document.getElementById(id);
        list.replaceChildren();
        if (!entries.length) {
            const empty = document.createElement('li');
            empty.className = 'history-empty';
            empty.textContent = direction === 'to' ? 'Nothing sent yet.' : 'Nothing downloaded yet.';
            list.appendChild(empty);
            return;
        }
        entries.forEach((entry) => {
            const item = document.createElement('li');
            item.textContent = `${entry.filename} (${direction} ${entry.username}) - ${entry.time}`;
            list.appendChild(item);
        });
    });
}

function startPeer() {
    document.getElementById('myUsername').innerText = currentUser;
    renderHistory();
    receivingFiles = localStorage.getItem(`p2p_receiving_${currentUser.toLowerCase()}`) !== 'false';
    updateReceivingButton();
    peer = new Peer(peerIdFor(currentUser));

    peer.on('open', () => {
        const badge = document.getElementById('statusBadge');
        badge.textContent = 'Ready';
        badge.className = 'status-badge status-online';
        log(`System online. Ready to send and receive as ${currentUser}`);
    });
    peer.on('error', (error) => log(`Peer Error: ${error.message}`, 'error'));
    peer.on('connection', (connection) => {
        log('Incoming connection established from peer...', 'success');
        connection.on('data', (data) => {
            if (data && data.type === 'message') {
                addMessage(data.sender || 'Peer', data.text);
                log(`Message received from ${data.sender || 'peer'}`, 'success');
            } else if (data && data.file && data.filename) {
                if (!receivingFiles) {
                    log(`Rejected incoming file "${data.filename}" because receiving is disabled.`, 'error');
                    connection.close();
                    return;
                }
                log(`Receiving ${data.isZip ? 'folder archive' : 'file'}: "${data.filename}"...`);
                const blob = new Blob([data.file], { type: data.filetype || 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = data.filename;
                downloadLink.style.display = 'none';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    document.body.removeChild(downloadLink);
                    URL.revokeObjectURL(url);
                }, 200);
                log(`Successfully downloaded: ${data.filename}`, 'success');
                addHistory('downloaded', data.filename, data.sender || 'peer');
            }
        });
    });
}

function addMessage(sender, text) {
    const messageBox = document.getElementById('messageBox');
    const emptyMessage = messageBox.querySelector('p');
    if (emptyMessage) emptyMessage.remove();
    const entry = document.createElement('div');
    entry.className = 'message-entry';
    const senderLabel = document.createElement('strong');
    senderLabel.textContent = `${sender}: `;
    entry.append(senderLabel, document.createTextNode(text));
    messageBox.appendChild(entry);
    messageBox.scrollTop = messageBox.scrollHeight;
}

function sendMessage() {
    const recipient = document.getElementById('peerUsername').value.trim();
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    if (!/^[a-zA-Z0-9_-]{3,24}$/.test(recipient)) {
        alert('Enter the receiver username above first.');
        return;
    }
    if (!text) return;
    const messageConnection = peer.connect(peerIdFor(recipient), { reliable: true });
    messageConnection.on('open', () => {
        messageConnection.send({ type: 'message', sender: currentUser, text });
        addMessage('You', text);
        log(`Message sent to ${recipient}`, 'success');
        messageInput.value = '';
    });
    messageConnection.on('error', (error) => log(`Message error: ${error.message}`, 'error'));
}

document.getElementById('messageBtn').addEventListener('click', sendMessage);
document.getElementById('messageInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendMessage();
});

function updateReceivingButton() {
    document.getElementById('receivingStatus').textContent = receivingFiles
        ? 'Incoming file transfers are enabled.'
        : 'Incoming file transfers are disabled. Messages are still available.';
    document.getElementById('toggleReceivingBtn').textContent = receivingFiles
        ? 'Stop Receiving Files'
        : 'Start Receiving Files';
}

document.getElementById('toggleReceivingBtn').addEventListener('click', () => {
    receivingFiles = !receivingFiles;
    localStorage.setItem(`p2p_receiving_${currentUser.toLowerCase()}`, receivingFiles);
    updateReceivingButton();
    log(receivingFiles ? 'Incoming file transfers enabled.' : 'Incoming file transfers disabled.');
});

if (currentUser) startPeer();

if (currentUser) {
    window.addEventListener('beforeunload', () => {
        localStorage.removeItem(`p2p_active_${currentUser.toLowerCase()}`);
    });
    localStorage.setItem(`p2p_active_${currentUser.toLowerCase()}`, new Date().toISOString());
}

document.getElementById('sendBtn').addEventListener('click', async () => {
    const peerUsername = document.getElementById('peerUsername').value.trim();
    const fileInput = document.getElementById('fileInput');
    if (!/^[a-zA-Z0-9_-]{3,24}$/.test(peerUsername)) {
        alert('Please enter a valid username.');
        return;
    }
    const isFolder = currentMode === 'folder';
    const filesToSend = isFolder ? selectedFolderFiles : Array.from(fileInput.files);
    if (filesToSend.length === 0) {
        alert(`Please select ${isFolder ? 'a folder' : 'at least one file'} first.`);
        return;
    }
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    const targetId = peerIdFor(peerUsername);
    log(`Connecting to receiver (${peerUsername})...`);
    try {
        if (isFolder || filesToSend.length > 1) {
            log(`Compressing ${filesToSend.length} item(s) into a .zip archive...`);
            const zip = new JSZip();
            const zipName = isFolder ? 'folders_bundle.zip' : 'files_bundle.zip';
            for (const file of filesToSend) zip.file(file.webkitRelativePath || file.name, file);
            const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
                if (metadata.percent % 25 === 0) log(`Compression progress: ${metadata.percent.toFixed(0)}%`);
            });
            log(`Compression complete (${(zipBlob.size / (1024 * 1024)).toFixed(2)} MB). Sending...`);
            sendDataToPeer(targetId, zipName, zipBlob, 'application/zip', true);
        } else {
            const singleFile = filesToSend[0];
            log(`Preparing single file: "${singleFile.name}" (${(singleFile.size / 1024).toFixed(1)} KB)...`);
            sendDataToPeer(targetId, singleFile.name, singleFile, singleFile.type, false);
        }
    } catch (error) {
        log(`Failed to process files: ${error.message}`, 'error');
        sendBtn.disabled = false;
    }
});

function sendDataToPeer(targetId, filename, blobOrFile, filetype, isZip) {
    const sendBtn = document.getElementById('sendBtn');
    const connection = peer.connect(targetId, { reliable: true });
    connection.on('open', () => {
        log(`Connected! Transferring "${filename}"...`, 'success');
        connection.send({ filename, filetype, file: blobOrFile, isZip, sender: currentUser });
        log(`Transfer finished for "${filename}"!`, 'success');
        addHistory('sent', filename, targetId.replace(APP_PREFIX, ''));
        sendBtn.disabled = false;
    });
    connection.on('error', (error) => {
        log(`Connection error: ${error.message}`, 'error');
        sendBtn.disabled = false;
    });
    setTimeout(() => {
        if (!connection.open) {
            log(`Connection timed out. Check if receiver username ${targetId.replace(APP_PREFIX, '')} is online.`, 'error');
            sendBtn.disabled = false;
        }
    }, 10000);
}
