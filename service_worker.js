chrome.runtime.onInstalled.addListener(() => {
  console.log('GitHub Repo Analyzer extension installed.');
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-cx') {
    chrome.windows.create({
      url: chrome.runtime.getURL('sidebar.html'),
      type: 'panel',
      width: 300,
      height: 600,
      focused: true,
    });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'get-xpath') {
    getXPathFunction();
  }
});

function getXPathFunction() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'startXPath' });
  });
}
