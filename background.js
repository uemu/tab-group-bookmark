chrome.action.setBadgeText({ text: 'TGB' });
chrome.action.setBadgeBackgroundColor({ color: 'blue' });

chrome.storage.local.get(['tgb_bookmark_data'], (value) => {
    let data = value.tgb_bookmark_data || '{}';
    chrome.storage.local.set({ 'tgb_bookmark_data': data });
});
chrome.storage.local.get(['tgb_history'], (value) => {
    let data = value.tgb_history || '{}';
    chrome.storage.local.set({ 'tgb_history': data });
});

function getBookmarkNames(bookmarkData) {
    let bookmarkNames = Object.getOwnPropertyNames(bookmarkData);
    bookmarkNames.sort();
    return bookmarkNames;
}

function saveBookmarkData(bookmarkData) {
    chrome.storage.local.set({ 'tgb_bookmark_data': JSON.stringify(bookmarkData) });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    let command = request.command;
    let args = request.args;

    chrome.storage.local.get(['tgb_bookmark_data'], (value) => {
        let bookmarkData = JSON.parse(value.tgb_bookmark_data);

        if (command === 'bookmark-names') {
            sendResponse({ result: true, bookmarkNames: getBookmarkNames(bookmarkData) });
        } else if (command === 'save') {
            chrome.tabs.query({}, tabs => {
                bookmarkData[args[0]] = tabs.map(tab => tab.url);

                saveBookmarkData(bookmarkData);
                sendResponse({ result: true, bookmarkNames: getBookmarkNames(bookmarkData) });
            });
        } else if (command === 'delete') {
            delete bookmarkData[args[0]];

            saveBookmarkData(bookmarkData);
            sendResponse({ result: true, bookmarkNames: getBookmarkNames(bookmarkData) });
        } else if (command === 'rename') {
            let tmp = bookmarkData[args[0]];
            delete bookmarkData[args[0]];
            bookmarkData[args[1]] = tmp;

            saveBookmarkData(bookmarkData);
            sendResponse({ result: true, bookmarkNames: getBookmarkNames(bookmarkData) });
        } else if (command == 'open') {
            chrome.tabs.query({}, tabs => {
                let urls = bookmarkData[args[0]];
                urls.forEach(url => {
                    chrome.tabs.create({ url: url });
                });

                chrome.storage.local.set({ 'tgb_history': JSON.stringify(tabs.map(tab => tab.url)) });
                chrome.tabs.remove(tabs.map(tab => tab.id));

                sendResponse({ result: true });
            });
        } else if (command == 'undo') {
            chrome.storage.local.get(['tgb_history'], (value) => {
                let urls = JSON.parse(value.tgb_history);

                if (urls.length > 0) {
                    chrome.tabs.query({}, tabs => {
                        urls.forEach(url => {
                            chrome.tabs.create({ url: url });
                        });

                        chrome.tabs.remove(tabs.map(tab => tab.id));
                    });

                    chrome.storage.local.set({ 'tgb_history': '[]' });
                }

                sendResponse({ result: true });
            });
        } else if (command == 'bookmark-data') {
            chrome.storage.local.get(['tgb_bookmark_data'], (value) => {
                let bookmarkData = value.tgb_bookmark_data || '{}'
                sendResponse({ result: true, bookmarkData: bookmarkData });
            });
        } else if (command == 'save-bookmark-data') {
            try {
                bookmarkData = JSON.parse(args[0]);
            } catch (e) {
                sendResponse({ result: false });
                return;
            }

            chrome.storage.local.set({ 'tgb_bookmark_data': args[0] });
            sendResponse({ result: true, bookmarkNames: getBookmarkNames(bookmarkData) });
        }
    })

    return true;
});