(function () {
    let keyword = '';
    let results = [];
    let bookmarkNames = [];
    let commands = ['/save', '/delete', '/rename', '/undo'];

    let listViewSize = 5;
    let offset = 0;
    let selected = 0;

    setup();

    function setup() {
        loadbookmarkNames();
        setKeywordEventListeners();
        setSettingsLinkEventListeners();
        setBackLinkEventListeners();
    }

    function setKeywordEventListeners() {
        let input = document.getElementById('keyword');
        input.addEventListener('blur', () => input.focus());
        input.addEventListener('input', () => onSearchInput());
        input.addEventListener('keyup', e => {
            if (e.shiftKey === true || e.ctrlKey === true || e.altKey === true) {
                return false;
            } else if (e.keyCode === 13) { // enter
                onEnterKey();
            } else if (e.keyCode === 38) { // keyup
                onUpKey();
            } else if (e.keyCode === 40) { // keydown
                onDownKey();
            } else if (e.keyCode === 27) { // esc
                onEscKey();
            }
        });
        input.focus();
    }

    function setSettingsLinkEventListeners() {
        let settings = document.getElementById('settings-link');
        settings.addEventListener('click', () => {
            document.getElementById('launcher').setAttribute('hidden', '');
            document.getElementById('settings').removeAttribute('hidden');

            getBookmarkRawData(rawData => {
                document.getElementById('bookmark-data').value = rawData;
            })
        });
    }

    function setBackLinkEventListeners() {
        let back = document.getElementById('back-link');
        back.addEventListener('click', () => {
            document.getElementById('launcher').removeAttribute('hidden');
            document.getElementById('settings').setAttribute('hidden', '');

            saveBookmarkRawData(document.getElementById('bookmark-data').value);
        });
    }

    function onSearchInput() {
        let list = document.getElementById('candidate-list');
        keyword = document.getElementById('keyword').value;

        if (!keyword) {
            results = [];
        } else {
            if (keyword.startsWith('/')) {
                if (keyword.startsWith('/delete')) {
                    results = bookmarkNames.map(b => '/delete ' + b);
                } else if (keyword.startsWith('/rename')) {
                    results = bookmarkNames.map(b => '/rename ' + b);
                } else {
                    results = commands;
                }
            } else if (keyword.startsWith('#')) {
                results = bookmarkNames.map(b => '#' + b);
            } else {
                results = bookmarkNames;
            }

            results = results.filter(r => r.startsWith(keyword));
        }

        offset = 0;
        updateListView(results, 0);
    }

    function updateListView(list, nextSelected) {
        let listView = document.getElementById('candidate-list');

        if (nextSelected >= offset + listViewSize && nextSelected < list.length) {
            offset++;
        } else if (nextSelected < offset && 0 < offset) {
            offset--;
        }

        if (0 <= nextSelected && nextSelected < list.length) {
            selected = nextSelected;
        }

        listView.innerHTML = '';
        list.slice(offset, offset + listViewSize).forEach((e, idx) => {
            let s = document.createElement('span');
            s.innerHTML = e;

            if (idx + offset == selected) {
                s.setAttribute('selected', '');
            } else {
                s.removeAttribute('selected');
            }

            listView.appendChild(s);
        });
    }

    function onEnterKey() {
        if (!keyword) {
            return;
        }

        if (results.length > 0) {
            document.getElementById('keyword').value = keyword = results[selected];

            if (keyword.startsWith('/delete')) {
                results = bookmarkNames.map(b => '/delete ' + b);
            } else if (keyword.startsWith('/rename')) {
                results = bookmarkNames.map(b => '/rename ' + b);
            }

            results = results.filter(r => r.startsWith(keyword));
            updateListView(results, 0);
        }

        if (keyword.startsWith('/')) {
            if (!processCommand()) {
                return;
            }
        } else if (keyword.startsWith('#')) {
            keyword = keyword.slice(1);
            results = bookmarkNames;
            if (!openBookmark()) {
                return;
            }
        } else {
            if (!openBookmark()) {
                return;
            }
        }

        clear();
    }

    function onUpKey() {
        updateListView(results, selected - 1);
    }

    function onDownKey() {
        updateListView(results, selected + 1);
    }

    function onEscKey() {
        clear();
    }

    function clear() {
        keyword = document.getElementById('keyword').value = '';
        document.getElementById('candidate-list').innerHTML = '';
        selected = 0;
        offset = 0;
    }

    function processCommand() {
        let command = keyword.split(' ');
        let result = false;

        switch (command[0]) {
            case '/save':
                result = processSaveCommand(command);
                break;
            case '/delete':
                result = processDeleteCommand(command);
                break;
            case '/rename':
                result = processRenameCommand(command);
                break;
            case '/undo':
                result = processUndoCommand(command);
                break;
            default:
                break;
        }

        return result;
    }

    function processSaveCommand(command) {
        if (command.length != 2) {
            return false;
        }

        if (chrome.runtime) {
            chrome.runtime.sendMessage(
                {
                    command: 'save',
                    args: [command[1]]
                },
                function (response) {
                    if (response.result) {
                        bookmarkNames = response.bookmarkNames;
                        alert(command[1] + ' saved');
                    }
                }
            );
        } else {
            // for dev
            bookmarkNames.push(command[1]);
            bookmarkNames.sort();
            alert(command[1] + ' saved');
        }

        return true;
    }

    function processDeleteCommand(command) {
        if (command.length != 2) {
            return false;
        }

        let i = bookmarkNames.indexOf(command[1]);

        if (i == -1) {
            return false;
        }

        if (chrome.runtime) {
            chrome.runtime.sendMessage(
                {
                    command: 'delete',
                    args: [command[1]]
                },
                response => {
                    if (response.result) {
                        bookmarkNames = response.bookmarkNames;
                        alert(command[1] + ' deleted');
                    }
                }
            );
        } else {
            // for dev
            bookmarkNames.splice(i, 1);
            alert(command[1] + ' deleted');
        }

        return true;
    }

    function processRenameCommand(command) {
        if (command.length != 3) {
            return false;
        }

        let i = bookmarkNames.indexOf(command[1]);

        if (i == -1) {
            return false;
        }

        if (chrome.runtime) {
            chrome.runtime.sendMessage(
                {
                    command: 'rename',
                    args: [command[1], command[2]]
                },
                response => {
                    if (response.result) {
                        bookmarkNames = response.bookmarkNames;
                        alert('renamed from ' + command[1] + ' to ' + command[2]);
                    }
                }
            );
        } else {
            // for dev
            bookmarkNames.splice(i, 1);
            bookmarkNames.push(command[2]);
            bookmarkNames.sort();
            alert('renamed from ' + command[1] + ' to ' + command[2]);
        }

        return true;
    }

    function processUndoCommand(command) {
        if (command.length != 1) {
            return false;
        }

        if (chrome.runtime) {
            chrome.runtime.sendMessage(
                {
                    command: 'undo'
                },
                response => {
                    if (!response.result) {
                        bookmarkNames = response.bookmarkNames;
                        alert('failed to undo!');
                    }
                }
            );
        } else {
            // for dev
            alert('undo');
        }

        return true;
    }

    function openBookmark() {
        keyword = keyword.trim();

        let bookmark = bookmarkNames.find((b) => {
            return b == keyword;
        });

        if (bookmark) {
            if (chrome.runtime) {
                chrome.runtime.sendMessage(
                    {
                        command: 'open',
                        args: [keyword]
                    },
                    response => {
                        if (!response.result) {
                            alert('failed to open bookmark!');
                        }
                    }
                );
            } else {
                alert('[debug] open ' + bookmark);
            }

            return true;
        } else {
            alert('bookmark not found!');
            return false;
        }
    }

    function loadbookmarkNames() {
        if (chrome.runtime) {
            chrome.runtime.sendMessage(
                {
                    command: 'bookmark-names'
                },
                response => {
                    if (response.result) {
                        bookmarkNames = response.bookmarkNames;
                    }
                }
            );
        }
    }

    function getBookmarkRawData(callback) {
        if (chrome.runtime) {
            chrome.runtime.sendMessage(
                {
                    command: 'bookmark-data'
                },
                response => {
                    if (response.result) {
                        callback(response.bookmarkData);
                    }
                }
            );
        } else {
            // for dev
            callback(JSON.stringify(bookmarkNames));
        }
    }

    function saveBookmarkRawData(bookmarkData) {
        if (chrome.runtime) {
            chrome.runtime.sendMessage(
                {
                    command: 'save-bookmark-data',
                    args: [bookmarkData]
                },
                response => {
                    if (response.result) {
                        bookmarkNames = response.bookmarkNames;
                    } else {
                        alert('failed to save bookmark data');
                    }
                }
            );
        } else {
            // for dev
            try {
                bookmarkNames = JSON.parse(bookmarkData);
            } catch (e) {
                alert('failed to save bookmark data');
                return;
            }
        }
    }
})();