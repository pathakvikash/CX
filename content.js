console.log('Content script loaded');

function getRepoDetails() {
  const repoUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+(\/|$)/;
  const currentUrl = window.location.href;
  if (repoUrlPattern.test(currentUrl)) {
    const { username, repoName } = parseGitHubUrl(currentUrl);
    return { repoUrl: currentUrl, username, repoName };
  }
  return null;
}

function parseGitHubUrl(url) {
  const urlParts = url.split('github.com/')[1].split('/');
  return { username: urlParts[0], repoName: urlParts[1] };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'getRepoDetails') {
    const repoDetails = getRepoDetails();
    sendResponse(repoDetails);
  }
});
