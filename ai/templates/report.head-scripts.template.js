(function () {
  var s = localStorage.getItem('a11ylab-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme =
    s || (prefersDark ? 'dark' : 'light');
})();

(function () {
  var s = localStorage.getItem('a11ylab-active-tab');
  document.documentElement.dataset.activeTab = s || undefined;
})();
