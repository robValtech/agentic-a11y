/**
 * Sortable table
 *
 * initSortableTable(tableId, defaultSort)
 *   tableId     — id attribute of the <table> element
 *   defaultSort — optional { col, dir } applied on load
 */
(function () {
  var ISSUE_RANK = { critical: 0, high: 1, medium: 2, none: 99 };

  function initSortableTable(tableId, defaultSort) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var tbody = table.querySelector('tbody');
    var sortState = { col: null, dir: null };

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

    if (defaultSort) {
      sortState.col = defaultSort.col;
      sortState.dir = defaultSort.dir;
      sortRows(defaultSort.col, defaultSort.dir);
      updateHeaders(defaultSort.col, defaultSort.dir);
    }
  }

  initSortableTable('landmarks-table', { col: 'id', dir: 'asc' });
  initSortableTable('components-table', { col: 'issue', dir: 'asc' });
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
    localStorage.setItem('a11ylab-theme', next);
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

/**
 * Tabs
 *
 * Implements the WAI-ARIA tab pattern with automatic activation.
 * Keyboard support:
 *   ArrowRight / ArrowDown  — next tab (wraps)
 *   ArrowLeft  / ArrowUp    — previous tab (wraps)
 *   Home                    — first tab
 *   End                     — last tab
 *   Tab                     — moves focus into the active panel
 */
(function () {
  var tabList = document.querySelector('[role="tablist"]');
  if (!tabList) return;

  var tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
  if (tabs.length === 0) return;

  // Restore previously active tab
  var storedActiveTabId = document.documentElement.dataset.activeTab;
  var storedActiveTab = document.getElementById(storedActiveTabId);
  storedActiveTab && activateTab(storedActiveTab);

  function activateTab(tab) {
    // Deactivate all tabs and hide all panels
    tabs.forEach(function (t) {
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
      var panelId = t.getAttribute('aria-controls');
      var panel = panelId ? document.getElementById(panelId) : null;
      if (panel) panel.hidden = true;
    });

    // Activate the selected tab and show its panel

    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');
    var activeTabId = tab.getAttribute('id');
    var activePanelId = tab.getAttribute('aria-controls');
    var activePanel = activePanelId
      ? document.getElementById(activePanelId)
      : null;
    if (activePanel) activePanel.hidden = false;
    localStorage.setItem('a11ylab-active-tab', activeTabId);
  }

  function focusTab(tab) {
    tab.focus();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateTab(tab);
    });

    tab.addEventListener('keydown', function (event) {
      var idx = tabs.indexOf(tab);
      var nextTab;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          nextTab = tabs[(idx + 1) % tabs.length];
          activateTab(nextTab);
          focusTab(nextTab);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          nextTab = tabs[(idx - 1 + tabs.length) % tabs.length];
          activateTab(nextTab);
          focusTab(nextTab);
          break;
        case 'Home':
          event.preventDefault();
          activateTab(tabs[0]);
          focusTab(tabs[0]);
          break;
        case 'End':
          event.preventDefault();
          activateTab(tabs[tabs.length - 1]);
          focusTab(tabs[tabs.length - 1]);
          break;
      }
    });
  });
})();
