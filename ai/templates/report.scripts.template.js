/**
 * Elements table
 */
(function () {
  var table = document.querySelector('.elements-table');
  if (!table) return;
  var tbody = table.querySelector('tbody');
  var sortState = { col: null, dir: null };
  var ISSUE_RANK = { critical: 0, high: 1, medium: 2, none: 99 };

  function sortRows(col, dir) {
    var rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort(function (a, b) {
      var av, bv;
      if (col === 'id') {
        av = parseInt(a.dataset.sortId, 10);
        bv = parseInt(b.dataset.sortId, 10);
        return dir === 'asc' ? av - bv : bv - av;
      }
      if (col === 'tag') {
        av = a.dataset.sortTag || '';
        bv = b.dataset.sortTag || '';
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (col === 'issue') {
        av =
          ISSUE_RANK[a.dataset.sortIssue] != null
            ? ISSUE_RANK[a.dataset.sortIssue]
            : 99;
        bv =
          ISSUE_RANK[b.dataset.sortIssue] != null
            ? ISSUE_RANK[b.dataset.sortIssue]
            : 99;
        return dir === 'asc' ? av - bv : bv - av;
      }
      return 0;
    });
    rows.forEach(function (r) {
      tbody.appendChild(r);
    });
  }

  function updateHeaders(activeCol, activeDir) {
    table.querySelectorAll('th[data-sort-col]').forEach(function (th) {
      th.setAttribute(
        'aria-sort',
        th.dataset.sortCol === activeCol
          ? activeDir === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none',
      );
    });
  }

  table.querySelectorAll('.sort-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var th = btn.closest('th');
      var col = th.dataset.sortCol;
      var dir =
        sortState.col === col && sortState.dir === 'asc' ? 'desc' : 'asc';
      sortState.col = col;
      sortState.dir = dir;
      sortRows(col, dir);
      updateHeaders(col, dir);
    });
  });

  // Default: sort by Issue ascending on load
  sortState.col = 'issue';
  sortState.dir = 'asc';
  sortRows('issue', 'asc');
  updateHeaders('issue', 'asc');

  // Hide/show elements with no issues
  var noIssuesToggle = document.getElementById('no-issues-toggle');
  if (noIssuesToggle) {
    // Apply default hidden state on load
    tbody
      .querySelectorAll('tr[data-sort-issue="none"]')
      .forEach(function (row) {
        row.hidden = true;
      });

    noIssuesToggle.addEventListener('click', function () {
      var hiding = noIssuesToggle.getAttribute('aria-pressed') === 'true';
      var next = !hiding;
      noIssuesToggle.setAttribute('aria-pressed', String(next));
      noIssuesToggle.querySelector('.toggle-label').textContent = next
        ? 'Show all elements'
        : 'Show only elements with issues';
      tbody
        .querySelectorAll('tr[data-sort-issue="none"]')
        .forEach(function (row) {
          row.hidden = next;
        });
    });
  }
})();

/**
 * Theme toggle
 */
(function () {
  var btn = document.getElementById('theme-toggle');
  var status = document.getElementById('theme-status');

  function updateButton(theme) {
    btn.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
    );
  }

  // Sync button label with the theme already applied by the inline head script
  updateButton(document.documentElement.dataset.theme);

  btn.addEventListener('click', function () {
    var current = document.documentElement.dataset.theme;
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('a11y-report-theme', next);
    updateButton(next);
    // Announce to screen readers
    status.textContent =
      next === 'dark' ? 'Dark theme applied' : 'Light theme applied';
  });
})();

/**
 * Markers toggle
 */
(function () {
  var toggleBtn = document.getElementById('markers-toggle');
  var figure = document.getElementById('design-figure');
  if (!toggleBtn || !figure) return;

  toggleBtn.addEventListener('click', function () {
    var isShowing = toggleBtn.getAttribute('aria-pressed') === 'true';
    var next = !isShowing;
    toggleBtn.setAttribute('aria-pressed', String(next));
    toggleBtn.querySelector('.toggle-label').textContent = next
      ? 'Hide markers'
      : 'Show markers';
    figure.classList.toggle('design-container--markers-hidden', !next);
  });
})();
