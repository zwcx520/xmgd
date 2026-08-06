/* ===== 次元浪漫 · 个人归档 共享脚本 ===== */
(function () {
  "use strict";

  /* ---------- 工具:HTML 转义 ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- 工具:关键词高亮(先转义后插入 mark) ---------- */
  function highlight(text, kw) {
    var safe = esc(text);
    if (!kw) return safe;
    // 关键字同样做 HTML 转义,以便在已 escape 的字符串中匹配
    var kwEsc = kw.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
    // 转义正则元字符
    var kwRe = kwEsc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!kwRe) return safe;
    try {
      var re = new RegExp("(" + kwRe + ")", "gi");
      return safe.replace(re, '<mark class="hl">$1</mark>');
    } catch (e) {
      return safe;
    }
  }

  /* ---------- 樱花飘落 ---------- */
  function spawnPetals() {
    var box = document.querySelector(".petals");
    if (!box) return;
    var count = window.innerWidth < 768 ? 12 : 22;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "petal";
      var size = 8 + Math.random() * 12;
      p.style.left = Math.random() * 100 + "%";
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.animationDuration = (8 + Math.random() * 10) + "s";
      p.style.animationDelay = (-Math.random() * 12) + "s";
      p.style.opacity = 0.4 + Math.random() * 0.5;
      box.appendChild(p);
    }
  }

  /* ---------- 滚动渐入动画 ---------- */
  function initAOS() {
    var els = document.querySelectorAll("[data-aos]");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var delay = e.target.getAttribute("data-aos-delay") || 0;
          setTimeout(function () { e.target.classList.add("in"); }, delay);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 数字滚动动画 ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var dur = 1200, start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(ease * target).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(tick);
  }
  function initCounters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    if (!("IntersectionObserver" in window)) { nums.forEach(countUp); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- 归档日历选择 ---------- */
  function initCalendar() {
    var box = document.getElementById("calendarBox");
    if (!box || !window.ARCHIVE_DATA) return;
    var items = ARCHIVE_DATA.items;

    // 默认日历视图:最新归档所在月份
    var latest = items.reduce(function (acc, it) {
      var di = parseArchiveDate(it.date);
      return (!acc || di.sortKey > acc.sortKey) ? di : acc;
    }, null);
    if (latest) {
      archiveState.calView = { y: latest.y, m: latest.m };
    } else {
      var now = new Date();
      archiveState.calView = { y: now.getFullYear(), m: now.getMonth() + 1 };
    }

    var prevBtn = document.getElementById("calPrev");
    var nextBtn = document.getElementById("calNext");
    var allBtn = document.getElementById("calAll");
    var titleBtn = document.getElementById("calTitle");

    function shiftMonth(delta) {
      var v = archiveState.calView;
      var total = v.y * 12 + (v.m - 1) + delta;
      archiveState.calView = { y: Math.floor(total / 12), m: (total % 12) + 1 };
      renderCalendar();
    }
    prevBtn && prevBtn.addEventListener("click", function () { shiftMonth(-1); });
    nextBtn && nextBtn.addEventListener("click", function () { shiftMonth(1); });

    // 点击月份标题:选中整月(取消日期)
    titleBtn && titleBtn.addEventListener("click", function () {
      var v = archiveState.calView;
      if (archiveState.selectedDate && archiveState.selectedDate.y === v.y && archiveState.selectedDate.m === v.m && archiveState.selectedDate.d == null) {
        archiveState.selectedDate = null;
        updateCalHint("已显示全部归档");
      } else {
        archiveState.selectedDate = { y: v.y, m: v.m, d: null };
        updateCalHint("已选中 " + v.y + " 年 " + v.m + " 月");
      }
      renderCalendar();
      renderArchiveItems(archiveState.kw);
    });

    // 显示全部
    allBtn && allBtn.addEventListener("click", function () {
      archiveState.selectedDate = null;
      renderCalendar();
      renderArchiveItems(archiveState.kw);
      updateCalHint("已显示全部归档");
    });

    renderCalendar();
    updateCalHint("");
  }

  function updateCalHint(text) {
    var el = document.getElementById("calHint");
    if (!el) return;
    el.textContent = text || "";
  }

  function renderCalendar() {
    var grid = document.getElementById("calGrid");
    var titleBtn = document.getElementById("calTitle");
    if (!grid || !window.ARCHIVE_DATA) return;
    var v = archiveState.calView;
    var y = v.y, m = v.m;
    var items = ARCHIVE_DATA.items;

    // 统计当月有归档的日期
    var daysInMonth = {};
    items.forEach(function (it) {
      var di = parseArchiveDate(it.date);
      if (di.y === y && di.m === m) {
        daysInMonth[di.d] = (daysInMonth[di.d] || 0) + 1;
      }
    });

    var firstWeekday = new Date(y, m - 1, 1).getDay(); // 0=周日
    var daysCount = new Date(y, m, 0).getDate();
    var today = new Date();
    var isCurMonth = today.getFullYear() === y && (today.getMonth() + 1) === m;
    var todayD = today.getDate();

    var html = "";
    for (var i = 0; i < firstWeekday; i++) html += '<div class="cal-cell empty"></div>';
    for (var d = 1; d <= daysCount; d++) {
      var cnt = daysInMonth[d];
      var sel = archiveState.selectedDate;
      var isSelected = sel && sel.y === y && sel.m === m && sel.d === d;
      var isToday = isCurMonth && d === todayD;
      var cls = "cal-cell";
      if (cnt) cls += " has-arc";
      if (isSelected) cls += " selected";
      if (isToday) cls += " today";
      html += '<button type="button" class="' + cls + '" data-d="' + d + '">' +
        '<span class="d">' + d + '</span>' +
        (cnt ? '<span class="cnt">' + cnt + ' 篇</span>' : '') +
      '</button>';
    }
    grid.innerHTML = html;
    if (titleBtn) titleBtn.textContent = y + " 年 " + m + " 月";

    // 绑定单元格点击(所有日期均可点)
    grid.querySelectorAll(".cal-cell:not(.empty)").forEach(function (cell) {
      cell.addEventListener("click", function () {
        var d = parseInt(cell.getAttribute("data-d"), 10);
        var sel = archiveState.selectedDate;
        if (sel && sel.y === y && sel.m === m && sel.d === d) {
          // 再次点击取消
          archiveState.selectedDate = null;
          updateCalHint("已显示全部归档");
        } else {
          archiveState.selectedDate = { y: y, m: m, d: d };
          updateCalHint("已选中 " + y + " 年 " + m + " 月 " + d + " 日");
        }
        renderCalendar();
        renderArchiveItems(archiveState.kw);
      });
    });
  }

  /* ---------- 归档搜索 ---------- */
  function initSearch() {
    var input = document.getElementById("archiveSearch");
    var clearBtn = document.getElementById("searchClear");
    var dropdown = document.getElementById("searchDropdown");
    var toggles = document.querySelectorAll(".search-toggle");
    if (!input) return;

    function updateClear() {
      if (!clearBtn) return;
      clearBtn.style.display = input.value ? "grid" : "none";
    }

    function openDropdown() {
      if (!dropdown) return;
      dropdown.classList.add("show");
      dropdown.setAttribute("aria-hidden", "false");
      toggles.forEach(function (t) { t.classList.add("active"); });
      setTimeout(function () { input.focus(); }, 280);
    }
    function closeDropdown() {
      if (!dropdown) return;
      dropdown.classList.remove("show");
      dropdown.setAttribute("aria-hidden", "true");
      toggles.forEach(function (t) { t.classList.remove("active"); });
      input.blur();
    }
    function toggleDropdown() {
      if (dropdown && dropdown.classList.contains("show")) closeDropdown();
      else openDropdown();
    }

    toggles.forEach(function (t) {
      t.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleDropdown();
      });
    });

    // 点击外部关闭
    document.addEventListener("click", function (e) {
      if (!dropdown || !dropdown.classList.contains("show")) return;
      if (dropdown.contains(e.target)) return;
      if (e.target.closest(".search-toggle")) return;
      closeDropdown();
    });
    // Esc 关闭
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dropdown && dropdown.classList.contains("show")) {
        closeDropdown();
      }
    });

    var composing = false;
    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () {
      composing = false;
      archiveState.kw = input.value.trim();
      renderArchiveItems(archiveState.kw);
      updateClear();
    });
    input.addEventListener("input", function () {
      if (composing) return;
      archiveState.kw = input.value.trim();
      renderArchiveItems(archiveState.kw);
      updateClear();
    });
    if (clearBtn) {
      clearBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        input.value = "";
        archiveState.kw = "";
        renderArchiveItems("");
        input.focus();
        updateClear();
      });
    }
    updateClear();
  }

  /* ---------- 底部 tab 点击反馈 ---------- */
  function initTabRipple() {
    document.querySelectorAll(".tabbar a").forEach(function (a) {
      a.addEventListener("click", function () {
        a.style.transform = "scale(0.92)";
        setTimeout(function () { a.style.transform = ""; }, 150);
      });
    });
  }

  /* =====================================================
     页面数据渲染(仅当对应数据与容器存在时执行)
     ===================================================== */

  /* ----- 首页 ----- */
  function renderHome() {
    if (!window.HOME_DATA) return;

    // Hero
    var heroEl = document.getElementById("hero");
    if (heroEl) {
      var h = HOME_DATA.hero;
      var actions = h.actions.map(function (a, i) {
        return '<a href="' + esc(a.href) + '" class="btn btn-' + a.type + '"><i class="' + esc(a.icon) + '"></i> ' + esc(a.text) + '</a>';
      }).join("");
      heroEl.innerHTML =
        '<div class="hero-text">' +
          '<span class="hi">' + esc(h.hi) + '</span>' +
          '<h2>' + h.title + '</h2>' +
          '<p>' + esc(h.desc) + '</p>' +
          '<div class="hero-actions">' + actions + '</div>' +
        '</div>' +
        '<div class="hero-avatar">' +
          '<div class="ring"><img src="' + esc(h.avatar) + '" alt="头像"></div>' +
          '<span class="badge"><i class="fa-solid fa-heart"></i> ' + esc(h.badge) + '</span>' +
        '</div>';
    }

    // 统计
    var statsEl = document.getElementById("stats");
    if (statsEl) {
      statsEl.innerHTML = HOME_DATA.stats.map(function (s, i) {
        return '<div class="stat glass" data-aos="fade-up" data-aos-delay="' + (i * 80) + '">' +
          '<i class="' + esc(s.icon) + '"></i>' +
          '<div class="num" data-count="' + s.count + '">0</div>' +
          '<div class="label">' + esc(s.label) + '</div>' +
        '</div>';
      }).join("");
    }

    // 近期动态
    var recentEl = document.getElementById("recent");
    if (recentEl) {
      recentEl.innerHTML = HOME_DATA.recent.map(function (c, i) {
        return '<article class="card glass" data-idx="' + i + '" role="button" tabindex="0" aria-label="查看详情" data-aos="fade-up" data-aos-delay="' + (i * 80) + '">' +
          '<div class="thumb"><i class="' + esc(c.icon) + '"></i></div>' +
          '<span class="tag"><i class="fa-solid fa-tag"></i> ' + esc(c.tag) + '</span>' +
          '<h3>' + esc(c.title) + '</h3>' +
          '<p>' + esc(c.desc) + '</p>' +
          '<div class="meta"><span>' + esc(c.date) + '</span><span class="read-link">展开查看 <i class="fa-solid fa-arrow-right"></i></span></div>' +
        '</article>';
      }).join("");
      initHomeRecentDetail();
    }

    // 引言
    var quoteEl = document.getElementById("quote");
    if (quoteEl) {
      var q = HOME_DATA.quote;
      quoteEl.innerHTML =
        '<i class="fa-solid fa-quote-left" style="color:var(--pink);font-size:24px;"></i>' +
        '<p style="font-family:\'ZCOOL KuaiLe\',sans-serif;font-size:22px;margin:14px 0;color:var(--ink);">' + q.text + '</p>' +
        '<span style="color:var(--ink-soft);font-size:14px;">—— ' + esc(q.author) + '</span>';
    }
  }

  /* ----- 归档 ----- */
  var archiveState = {
    kw: "",
    selectedDate: null, // null=全部; {y,m,d}=某天
    calView: null,      // {y,m} 当前日历显示的月份
    bound: false
  };

  function itemMatchesSearch(it, kw) {
    if (!kw) return true;
    var hay = (it.title + " " + it.content + " " + it.date + " " + (it.tags || []).join(" ")).toLowerCase();
    return hay.indexOf(kw.toLowerCase()) !== -1;
  }

  // 解析 "2026年8月2日" → {y, m, d, sortKey, groupKey, groupLabel, day}
  function parseArchiveDate(s) {
    var m = String(s || "").match(/(\d+)年(\d+)月(\d+)日/);
    if (!m) return { y: 0, m: 0, d: 0, sortKey: 0, groupKey: "", groupLabel: s, day: s };
    var y = +m[1], mo = +m[2], d = +m[3];
    return {
      y: y, m: mo, d: d,
      sortKey: y * 10000 + mo * 100 + d,
      groupKey: y + "-" + mo,
      groupLabel: y + " 年 " + mo + " 月",
      day: d
    };
  }

  function itemMatchesDate(di, sd) {
    if (!sd) return true;
    return di.y === sd.y && di.m === sd.m && di.d === sd.d;
  }

  function renderArchiveItems(kw) {
    var tlEl = document.getElementById("timeline");
    if (!tlEl || !window.ARCHIVE_DATA) return;
    var items = ARCHIVE_DATA.items;
    var sd = archiveState.selectedDate;
    // 收集命中条目(搜索 + 日期)并按日期降序排序
    var matched = items.map(function (it, idx) {
      return { it: it, idx: idx, di: parseArchiveDate(it.date) };
    }).filter(function (x) {
      return itemMatchesSearch(x.it, kw) && itemMatchesDate(x.di, sd);
    });
    matched.sort(function (a, b) { return b.di.sortKey - a.di.sortKey; });

    // 按 "年-月" 分组
    var groups = [];
    var groupMap = {};
    matched.forEach(function (x) {
      var key = x.di.groupKey || "未知";
      if (!groupMap[key]) {
        var g = { key: key, label: x.di.groupLabel || "未知", sortKey: x.di.sortKey, items: [] };
        groupMap[key] = g; groups.push(g);
      }
      groupMap[key].items.push(x);
    });
    // 组已按 sortKey 降序(因 matched 已排序),无需再排

    // 渲染
    var html = groups.map(function (g) {
      var cards = g.items.map(function (x) {
        var it = x.it;
        var tags = (it.tags || []).map(function (t) { return '<span>' + highlight(t, kw) + '</span>'; }).join("");
        return '<div class="tl-item ar-card-wrap" data-cat="' + esc(it.cat) + '" data-aos="fade-up">' +
          '<div class="ar-card glass" data-idx="' + x.idx + '" role="button" tabindex="0" aria-label="查看详情">' +
            '<div class="ar-day"><span class="d-num">' + x.di.day + '</span><span class="d-unit">日</span></div>' +
            '<div class="ar-body">' +
              '<div class="ar-meta">' +
                '<span class="ar-date"><i class="fa-regular fa-calendar"></i> ' + highlight(it.date, kw) + '</span>' +
              '</div>' +
              '<h3>' + highlight(it.title, kw) + '</h3>' +
              '<p>' + highlight(it.content, kw) + '</p>' +
              '<div class="tags">' + tags + '</div>' +
              '<div class="read-more"><i class="fa-solid fa-arrow-right"></i> 展开查看</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join("");
      return '<section class="ar-group" data-aos="fade-up">' +
        '<div class="ar-group-head">' +
          '<i class="fa-regular fa-clock"></i>' +
          '<span class="ar-group-label">' + esc(g.label) + '</span>' +
          '<span class="ar-group-count">' + g.items.length + ' 篇</span>' +
          '<span class="ar-group-line"></span>' +
        '</div>' +
        '<div class="ar-group-list">' + cards + '</div>' +
      '</section>';
    }).join("");

    // 空状态
    if (!html) {
      var tip = "没有匹配的归档碎片";
      var sub = "试试切换日期或清空搜索~";
      if (kw && sd) {
        tip = "「" + esc(kw) + "」在该日期无匹配";
      } else if (kw) {
        tip = "没有找到包含「" + esc(kw) + "」的归档碎片";
      } else if (sd) {
        tip = sd.y + " 年 " + sd.m + " 月 " + sd.d + " 日 这天没有归档";
        sub = "试试选择其他有标记的日期~";
      }
      html = '<div class="empty-tip"><i class="fa-regular fa-face-frown"></i><p>' + tip + '</p><span>' + sub + '</span></div>';
    }
    tlEl.innerHTML = html;
    // 搜索结果直接显示,不重复渐入动画
    tlEl.querySelectorAll("[data-aos]").forEach(function (el) { el.classList.add("in"); });
    // 绑定详情点击(只绑一次)
    if (!archiveState.bound) {
      archiveState.bound = true;
      initArchiveDetail();
    }
  }

  function renderArchive() {
    if (!window.ARCHIVE_DATA) return;
    renderArchiveItems("");
    initCalendar();
  }

  /* ----- 归档/近期动态 共用:全屏详情弹层 ----- */
  var CAT_MAP = { essay: "随笔", code: "代码", photo: "画面", music: "音律", life: "日常" };

  function openDetailModal(it) {
    if (!it) return;
    var modal = document.createElement("div");
    modal.className = "detail-modal";
    var catName = CAT_MAP[it.cat] || it.tag || it.cat || "归档";
    var tags = (it.tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("");
    modal.innerHTML =
      '<div class="detail-backdrop"></div>' +
      '<div class="detail-sheet" role="dialog" aria-modal="true">' +
        '<div class="detail-topbar">' +
          '<span class="back-label"><i class="fa-solid fa-arrow-left" style="color:var(--pink)"></i> 归档详情</span>' +
          '<button class="detail-close" aria-label="关闭"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="detail-scroll">' +
          '<div class="detail-head">' +
            '<span class="detail-cat"><i class="fa-solid fa-tag"></i> ' + esc(catName) + '</span>' +
            '<div class="detail-date"><i class="fa-regular fa-calendar"></i> ' + esc(it.date) + '</div>' +
          '</div>' +
          '<h2 class="detail-title">' + esc(it.title) + '</h2>' +
          '<div class="detail-content">' + esc(it.content || it.desc || "") + '</div>' +
          (tags ? '<div class="detail-tags">' + tags + '</div>' : '') +
          '<div class="detail-foot">—— 来自时光的星轨碎片</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    // 触发动画
    requestAnimationFrame(function () { modal.classList.add("show"); });

    function close() {
      modal.classList.remove("show");
      document.body.style.overflow = "";
      setTimeout(function () {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      }, 280);
    }
    modal.querySelector(".detail-close").addEventListener("click", close);
    modal.querySelector(".detail-backdrop").addEventListener("click", close);
    document.addEventListener("keydown", function escFn(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", escFn); }
    });
  }

  /* ----- 归档详情:点击卡片打开弹层 ----- */
  function initArchiveDetail() {
    var tlEl = document.getElementById("timeline");
    if (!tlEl || !window.ARCHIVE_DATA) return;
    var items = ARCHIVE_DATA.items;

    tlEl.addEventListener("click", function (e) {
      var card = e.target.closest(".ar-card");
      if (!card) return;
      var idx = card.getAttribute("data-idx");
      if (idx == null) return;
      openDetailModal(items[parseInt(idx, 10)]);
    });
    tlEl.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest(".ar-card");
      if (!card) return;
      e.preventDefault();
      var idx = card.getAttribute("data-idx");
      if (idx == null) return;
      openDetailModal(items[parseInt(idx, 10)]);
    });
  }

  /* ----- 首页近期动态:点击卡片打开弹层 ----- */
  function initHomeRecentDetail() {
    var el = document.getElementById("recent");
    if (!el || !window.HOME_DATA || !HOME_DATA.recent) return;
    var items = HOME_DATA.recent;

    el.addEventListener("click", function (e) {
      var card = e.target.closest(".card");
      if (!card) return;
      var idx = card.getAttribute("data-idx");
      if (idx == null) return;
      // 点击的是 "阅读 →" 链接则不拦截,正常跳转
      if (e.target.closest("a[href]")) return;
      e.preventDefault();
      openDetailModal(items[parseInt(idx, 10)]);
    });
    el.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest(".card");
      if (!card) return;
      var idx = card.getAttribute("data-idx");
      if (idx == null) return;
      e.preventDefault();
      openDetailModal(items[parseInt(idx, 10)]);
    });
  }

  /* ----- 关于 ----- */
  function renderAbout() {
    if (!window.ABOUT_DATA) return;
    var d = ABOUT_DATA;

    var profileEl = document.getElementById("profileCard");
    if (profileEl) {
      var p = d.profile;
      var info = p.info.map(function (x) {
        return '<li><i class="' + esc(x.icon) + '"></i> ' + esc(x.text) + '</li>';
      }).join("");
      var social = p.social.map(function (s) {
        return '<a href="' + esc(s.href) + '" title="' + esc(s.title) + '"><i class="' + esc(s.icon) + '"></i></a>';
      }).join("");
      profileEl.innerHTML =
        '<div class="ava"><img src="' + esc(p.avatar) + '" alt="' + esc(p.name) + '"></div>' +
        '<h2>' + esc(p.name) + '</h2>' +
        '<p class="sign">' + esc(p.sign) + '</p>' +
        '<ul class="info-list" style="margin-top:20px;grid-template-columns:1fr;">' + info + '</ul>' +
        '<div class="social">' + social + '</div>';
    }

    var detailEl = document.getElementById("aboutDetail");
    if (detailEl) {
      var skills = d.skills.map(function (s) {
        return '<div class="skill">' +
          '<div class="top"><span>' + esc(s.name) + '</span><span>' + s.level + '%</span></div>' +
          '<div class="bar"><i style="width:' + s.level + '%"></i></div>' +
        '</div>';
      }).join("");
      var interests = d.interests.map(function (it) {
        return '<span><i class="' + esc(it.icon) + '"></i> ' + esc(it.text) + '</span>';
      }).join("");
      detailEl.innerHTML =
        '<h3><i class="fa-solid fa-feather-pointed" style="color:var(--pink)"></i> 自我介绍</h3>' +
        '<p style="color:var(--ink-soft);margin-bottom:24px;">' + esc(d.intro) + '</p>' +
        '<h3><i class="fa-solid fa-gauge-high" style="color:var(--pink)"></i> 技能星轨</h3>' +
        skills +
        '<h3 style="margin-top:24px;"><i class="fa-solid fa-heart" style="color:var(--pink)"></i> 兴趣星云</h3>' +
        '<div class="interests">' + interests + '</div>';
    }

    // App 信息
    var appEl = document.getElementById("aboutApp");
    if (appEl && d.appInfo) {
      var a = d.appInfo;
      appEl.innerHTML =
        '<div class="app-info-head">' +
          '<div class="app-logo"><i class="fa-solid fa-star"></i></div>' +
          '<div class="app-info-title">' +
            '<h2>' + esc(a.name) + '</h2>' +
            '<span class="app-version"><i class="fa-solid fa-code-branch"></i> v' + esc(a.version) + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="app-desc">' + esc(a.desc) + '</p>' +
        '<div class="app-meta">' +
          '<div class="app-meta-item">' +
            '<i class="fa-solid fa-user-pen"></i>' +
            '<div><span class="label">开发者</span><span class="value">' + esc(a.developer) + '</span></div>' +
          '</div>' +
          '<div class="app-meta-item">' +
            '<i class="fa-regular fa-calendar-check"></i>' +
            '<div><span class="label">开发时间</span><span class="value">' + esc(a.devDate) + '</span></div>' +
          '</div>' +
        '</div>';
    }
  }

  /* ----- 友链 ----- */
  function renderFriends() {
    if (!window.FRIENDS_DATA) return;
    var el = document.getElementById("friends");
    if (!el) return;
    el.innerHTML = FRIENDS_DATA.map(function (f, i) {
      return '<a class="friend-card glass" href="' + esc(f.href) + '" data-aos="fade-up" data-aos-delay="' + ((i % 2) * 80) + '">' +
        '<div class="fa"><img src="' + esc(f.avatar) + '" alt="' + esc(f.name) + '"></div>' +
        '<div class="info">' +
          '<h3>' + esc(f.name) + ' <i class="fa-solid fa-link" style="font-size:12px;color:var(--ink-soft)"></i></h3>' +
          '<p>' + esc(f.role) + '</p>' +
          '<div class="desc">' + esc(f.desc) + '</div>' +
        '</div>' +
      '</a>';
    }).join("");
  }

  /* ---------- 渲染所有页面(按需) ---------- */
  function renderAll() {
    renderHome();
    renderArchive();
    renderAbout();
    renderFriends();
  }

  /* ---------- 初始化(顺序:渲染 → 动画/筛选) ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    spawnPetals();
    renderAll();
    initAOS();
    initCounters();
    initSearch();
    initTabRipple();
  });
})();
