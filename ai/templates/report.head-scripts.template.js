(function () {
  var s = localStorage.getItem('a11y-report-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme =
    s || (prefersDark ? 'dark' : 'light');
})();
