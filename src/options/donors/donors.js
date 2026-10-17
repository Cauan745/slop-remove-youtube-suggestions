const HTML = document.documentElement;

browser.storage.local.get('dark_mode', ({ dark_mode }) => {
  HTML.setAttribute('dark_mode', dark_mode);
});

const reviewLink = document.getElementById('review-link');
const path = browser.runtime.getURL('/');
if (path.startsWith('moz')) {
  reviewLink.setAttribute('href', 'https://addons.mozilla.org/en-US/firefox/addon/remove-youtube-s-suggestions/');
} else if (path.startsWith('chrome')) {
  reviewLink.setAttribute('href', 'https://chrome.google.com/webstore/detail/rys-%E2%80%94-remove-youtube-sugg/cdhdichomdnlaadbndgmagohccgpejae');
} else {
  reviewLink.removeAttribute('href');
  reviewLink.removeAttribute('target');
}

const donateButton = document.getElementById('donate_button');
const donateLinksContainer = document.getElementById('donate-links-container');
const donateLinks = document.getElementById('donate-links');
donateLinksContainer.addEventListener('click', event => {
  if (event.target === donateLinksContainer) donateLinksContainer.setAttribute('hidden', '');
});
donateButton.addEventListener('click', () => {
  donateLinksContainer.removeAttribute('hidden');
  const buttonBox = donateButton.getBoundingClientRect();
  const linksBox = donateLinks.getBoundingClientRect();
  donateLinks.style.top = `${buttonBox.top - linksBox.height - 5}px`;
  donateLinks.style.left = `${buttonBox.left - (linksBox.width - buttonBox.width)}px`;
});
