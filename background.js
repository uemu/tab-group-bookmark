chrome.browserAction.setBadgeText({ text: 'TGB' });
chrome.browserAction.setBadgeBackgroundColor({ color: 'blue' });

localStorage['tgb.bookmark-data'] = localStorage['tgb.bookmark-data'] || '{}';
localStorage['tgb.history'] = localStorage['tgb.history'] || '{}';

function getBookmarkNames(bookmarkData) {
    let bookmarkNames = Object.getOwnPropertyNames(bookmarkData);
    bookmarkNames.sort();
    return bookmarkNames;
}

function saveBookmarkData(bookmarkData) {
    localStorage['tgb.bookmark-data'] = JSON.stringify(bookmarkData);
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    let command = request.command;
    let args = request.args;
    let bookmarkData = JSON.parse(localStorage['tgb.bookmark-data']);

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

            localStorage['tgb.history'] = JSON.stringify(tabs.map(tab => tab.url));
            chrome.tabs.remove(tabs.map(tab => tab.id));

            sendResponse({ result: true });
        });
    } else if (command == 'undo') {
        let urls = JSON.parse(localStorage['tgb.history']);

        if (urls.length > 0) {
            chrome.tabs.query({}, tabs => {
                urls.forEach(url => {
                    chrome.tabs.create({ url: url });
                });

                chrome.tabs.remove(tabs.map(tab => tab.id));
            });

            localStorage['tgb.history'] = '[]';
        }

        sendResponse({ result: true });
    } else if (command == 'bookmark-data') {
        sendResponse({ result: true, bookmarkData: localStorage['tgb.bookmark-data'] });
    } else if (command == 'save-bookmark-data') {
        try {
            bookmarkData = JSON.parse(args[0]);
        } catch (e) {
            sendResponse({ result: false });
            return;
        }

        localStorage['tgb.bookmark-data'] = args[0];
        sendResponse({ result: true, bookmarkNames: getBookmarkNames(bookmarkData) });
    }

    return true;
});