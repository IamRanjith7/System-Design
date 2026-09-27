(() => {
  const STORAGE_KEY = "sd_toolkit_quiz_v1";
  const sidebar = document.getElementById("sidebar");
  const menuButton = document.getElementById("mobile-toggle");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const currentTopic = document.getElementById("current-topic");
  const searchInput = document.getElementById("topic-search");
  const progressText = document.getElementById("progress-text");
  const progressFill = document.getElementById("progress-fill");
  const topbarQuizBtn = document.getElementById("topbar-quiz-btn");
  const topbarPrintBtn = document.getElementById("topbar-print-btn");

  const pages = [...document.querySelectorAll(".page-view")];
  const navItems = [...document.querySelectorAll(".nav-item")];

  // Load saved quiz state
  let quizState = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) quizState = JSON.parse(raw) || {};
  } catch (_) {
    quizState = {};
  }

  const saveQuizState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quizState));
    } catch (_) {}
  };

  // Mobile sidebar drawer
  const closeSidebar = () => {
    sidebar?.classList.remove("open");
    sidebarBackdrop?.classList.remove("active");
    menuButton?.setAttribute("aria-expanded", "false");
  };

  const openSidebar = () => {
    sidebar?.classList.add("open");
    sidebarBackdrop?.classList.add("active");
    menuButton?.setAttribute("aria-expanded", "true");
  };

  const toggleSidebar = () => {
    if (sidebar?.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  menuButton?.addEventListener("click", toggleSidebar);
  sidebarBackdrop?.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });

  // Update global mastery progress in sidebar
  const updateGlobalProgress = () => {
    const totalPages = pages.length;
    let completedPages = 0;

    pages.forEach((page) => {
      const pid = page.id;
      const pageRecord = quizState[pid] || {};
      const cards = page.querySelectorAll(".quiz-card");
      let answeredCount = 0;
      let correctCount = 0;

      cards.forEach((card, idx) => {
        if (pageRecord[idx] !== undefined) {
          answeredCount++;
          if (Number(pageRecord[idx]) === Number(card.dataset.correctIdx)) {
            correctCount++;
          }
        }
      });

      // Update sidebar badge for this page
      const l2Link = document.querySelector(`.l2-link[href="#${pid}"]`);
      if (l2Link) {
        let badge = l2Link.querySelector(".quiz-check-badge");
        if (answeredCount > 0) {
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "quiz-check-badge";
            l2Link.appendChild(badge);
          }
          badge.textContent = answeredCount === cards.length ? `✓ ${correctCount}/${cards.length}` : `${correctCount}/${cards.length}`;
        } else if (badge) {
          badge.remove();
        }
      }

      if (cards.length > 0 && answeredCount === cards.length) {
        completedPages++;
      }
    });

    if (progressText) {
      progressText.textContent = `${completedPages} / ${totalPages} Quizzes Completed`;
    }
    if (progressFill && totalPages > 0) {
      progressFill.style.width = `${Math.round((completedPages / totalPages) * 100)}%`;
    }
  };

  // Render quiz state for a specific page
  const syncPageQuizUI = (page) => {
    if (!page) return;
    const pid = page.id;
    const pageRecord = quizState[pid] || {};
    const cards = [...page.querySelectorAll(".quiz-card")];
    let correctCount = 0;
    let answeredCount = 0;
    const letters = ["A", "B", "C", "D"];

    cards.forEach((card, qIdx) => {
      const correctIdx = Number(card.dataset.correctIdx);
      const chosenIdx = pageRecord[qIdx];
      const buttons = [...card.querySelectorAll(".quiz-option-btn")];
      const feedback = card.querySelector(".quiz-feedback");

      buttons.forEach((btn, oIdx) => {
        btn.classList.remove("correct", "wrong");
        if (chosenIdx !== undefined) {
          if (oIdx === correctIdx) {
            btn.classList.add("correct");
          } else if (oIdx === Number(chosenIdx)) {
            btn.classList.add("wrong");
          }
        }
      });

      if (feedback) {
        if (chosenIdx !== undefined) {
          answeredCount++;
          const isRight = Number(chosenIdx) === correctIdx;
          if (isRight) correctCount++;
          feedback.classList.remove("is-correct", "is-wrong");
          feedback.classList.add("show", isRight ? "is-correct" : "is-wrong");
          const statusPrefix = isRight
            ? `<strong>✓ Correct (${letters[correctIdx]})!</strong> `
            : `<strong>✗ Incorrect (You chose ${letters[chosenIdx]}; Correct Answer is ${letters[correctIdx]}).</strong> `;
          feedback.innerHTML = statusPrefix + (card.dataset.explanation || "");
        } else {
          feedback.classList.remove("show", "is-correct", "is-wrong");
          feedback.innerHTML = "";
        }
      }
    });

    const scoreBadge = page.querySelector(".quiz-score-badge");
    if (scoreBadge) {
      scoreBadge.textContent = `Score: ${correctCount} / ${cards.length} (${answeredCount} attempted)`;
      scoreBadge.classList.toggle("perfect", cards.length > 0 && correctCount === cards.length);
    }
  };

  // Page switcher
  const showPage = (rawTargetId, updateUrl = true, subTargetId = null) => {
    let targetId = rawTargetId;
    let targetPage = document.getElementById(targetId);

    if (!targetPage || !targetPage.classList.contains("page-view")) {
      targetId = pages[0]?.id || "core-concepts-networking-essentials";
      targetPage = document.getElementById(targetId);
    }

    pages.forEach((page) => {
      const isActive = page.id === targetId;
      page.classList.toggle("active", isActive);
      page.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    syncPageQuizUI(targetPage);

    if (!subTargetId) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    // Update breadcrumb in topbar
    if (currentTopic && targetPage) {
      const topicTitle = targetPage.dataset.topicTitle || "System Design";
      const pageTitle = targetPage.dataset.pageTitle || "";
      currentTopic.innerHTML = `
        <span class="breadcrumb-category">${topicTitle}</span>
        <span class="breadcrumb-divider" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
        <span class="breadcrumb-page">${pageTitle}</span>
      `;
    }

    // Update active state in sidebar tree
    navItems.forEach((item) => {
      const href = item.getAttribute("href") || "";
      const itemPageId = href.startsWith("#") ? href.slice(1) : "";
      const itemSub = item.dataset.targetSub || null;

      if (item.classList.contains("l2-link")) {
        const isMatch = itemPageId === targetId;
        item.classList.toggle("active", isMatch);
        if (isMatch) {
          const l2Node = item.closest(".l2-node");
          const l1Node = item.closest(".l1-node");
          l2Node?.classList.add("expanded");
          l1Node?.classList.add("expanded");
        }
      } else if (item.classList.contains("l3-link")) {
        item.classList.toggle("active-sub", itemPageId === targetId && itemSub === subTargetId);
      }
    });

    if (updateUrl) {
      const newHash = subTargetId ? `#${targetId}?sub=${subTargetId}` : `#${targetId}`;
      if (window.location.hash !== newHash) {
        history.pushState(null, "", newHash);
      }
    }

    if (subTargetId && targetPage) {
      requestAnimationFrame(() => {
        const subEl = document.getElementById(subTargetId);
        if (subEl) {
          const y = subEl.getBoundingClientRect().top + window.scrollY - 74;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      });
    }
  };

  // Parse hash on load or popstate
  const handleHashChange = (updateUrl = false) => {
    const rawHash = window.location.hash.replace(/^#/, "");
    if (!rawHash) {
      showPage(pages[0]?.id || "in-a-hurry-delivery", false, null);
      return;
    }
    const [pagePart, queryPart] = rawHash.split("?");
    let subId = null;
    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      subId = params.get("sub");
    }
    // Check if pagePart is directly a page-view id or an anchor inside a page
    const directPage = document.getElementById(pagePart);
    if (directPage && directPage.classList.contains("page-view")) {
      showPage(pagePart, updateUrl, subId);
    } else if (directPage) {
      const parentPage = directPage.closest(".page-view");
      if (parentPage) {
        showPage(parentPage.id, updateUrl, pagePart);
      } else {
        showPage(pages[0]?.id, false, null);
      }
    } else {
      showPage(pages[0]?.id, false, null);
    }
  };

  // Tree toggle buttons
  document.querySelectorAll(".tree-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const node = btn.closest(".tree-node");
      node?.classList.toggle("expanded");
    });
  });

  // Sidebar navigation link clicks
  navItems.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();
      const targetId = href.slice(1);
      const subId = link.dataset.targetSub || null;
      showPage(targetId, true, subId);
      if (window.innerWidth <= 980) closeSidebar();
    });
  });

  // Delegate clicks inside content (in-page links, quiz options, reset quiz, answer key toggle, copy code)
  document.addEventListener("click", (e) => {
    // 1. Quiz Option Click
    const optBtn = e.target.closest(".quiz-option-btn");
    if (optBtn) {
      const card = optBtn.closest(".quiz-card");
      const page = optBtn.closest(".page-view");
      if (card && page) {
        const pid = page.id;
        const qIdx = Number(card.dataset.qIdx);
        const oIdx = Number(optBtn.dataset.optIdx);
        if (!quizState[pid]) quizState[pid] = {};
        quizState[pid][qIdx] = oIdx;
        saveQuizState();
        syncPageQuizUI(page);
        updateGlobalProgress();
      }
      return;
    }

    // 2. Reset Quiz Button
    const resetBtn = e.target.closest(".reset-quiz-btn");
    if (resetBtn) {
      const page = resetBtn.closest(".page-view");
      if (page) {
        delete quizState[page.id];
        saveQuizState();
        syncPageQuizUI(page);
        updateGlobalProgress();
      }
      return;
    }

    // 3. Reveal / Jump to Answer Key Button
    const jumpAkBtn = e.target.closest(".jump-answer-key-btn");
    if (jumpAkBtn) {
      const page = jumpAkBtn.closest(".page-view");
      const akSection = page?.querySelector(".answer-key-section");
      if (akSection) {
        akSection.classList.add("open");
        const toggleBtn = akSection.querySelector(".answer-key-toggle-btn");
        if (toggleBtn) toggleBtn.textContent = "Hide Answer Key ▲";
        const y = akSection.getBoundingClientRect().top + window.scrollY - 74;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      return;
    }

    // 4. Answer Key Banner Toggle
    const akBanner = e.target.closest(".answer-key-banner");
    if (akBanner) {
      const akSection = akBanner.closest(".answer-key-section");
      if (akSection) {
        const isOpen = akSection.classList.toggle("open");
        const toggleBtn = akSection.querySelector(".answer-key-toggle-btn");
        if (toggleBtn) {
          toggleBtn.textContent = isOpen ? "Hide Answer Key ▲" : "Show Answer Key & Explanations ▼";
        }
      }
      return;
    }

    // 5. Copy Code Button
    const copyBtn = e.target.closest(".copy-button");
    if (copyBtn) {
      const wrap = copyBtn.closest(".code-wrap");
      const codeEl = wrap?.querySelector("pre code") || wrap?.querySelector("pre");
      if (codeEl) {
        const text = codeEl.innerText;
        const onCopied = () => {
          const orig = copyBtn.textContent;
          copyBtn.textContent = "Copied!";
          setTimeout(() => {
            copyBtn.textContent = orig;
          }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(onCopied).catch(() => {
            const ta = document.createElement("textarea");
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
            onCopied();
          });
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          onCopied();
        }
      }
      return;
    }

    // 6. Internal hash links inside page body or footer
    const inPageLink = e.target.closest(".page-view a[href^='#']");
    if (inPageLink) {
      const href = inPageLink.getAttribute("href") || "";
      if (href.length > 1) {
        e.preventDefault();
        const rawTarget = href.slice(1);
        const targetEl = document.getElementById(rawTarget);
        if (targetEl && targetEl.classList.contains("page-view")) {
          showPage(rawTarget, true, null);
        } else if (targetEl) {
          const parentPage = targetEl.closest(".page-view");
          if (parentPage) {
            showPage(parentPage.id, true, rawTarget);
          }
        }
      }
    }
  });

  // Topbar buttons
  topbarQuizBtn?.addEventListener("click", () => {
    const activePage = document.querySelector(".page-view.active");
    const quizSec = activePage?.querySelector(".quiz-section");
    if (quizSec) {
      const y = quizSec.getBoundingClientRect().top + window.scrollY - 74;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  });

  topbarPrintBtn?.addEventListener("click", () => {
    window.print();
  });

  // Sidebar live search filter
  searchInput?.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    const l1Nodes = [...document.querySelectorAll(".l1-node")];

    if (!q) {
      l1Nodes.forEach((l1) => {
        l1.style.display = "";
        l1.querySelectorAll(".l2-node, .l3-link").forEach((el) => {
          el.style.display = "";
        });
      });
      return;
    }

    l1Nodes.forEach((l1) => {
      let l1HasMatch = false;
      const l2Nodes = [...l1.querySelectorAll(".l2-node")];

      l2Nodes.forEach((l2) => {
        const l2Title = (l2.querySelector(".l2-link")?.textContent || "").toLowerCase();
        const l3Links = [...l2.querySelectorAll(".l3-link")];
        let l2SubMatch = false;

        l3Links.forEach((l3) => {
          const l3Text = (l3.textContent || "").toLowerCase();
          const match = l2Title.includes(q) || l3Text.includes(q);
          l3.style.display = match ? "" : "none";
          if (l3Text.includes(q)) l2SubMatch = true;
        });

        const showL2 = l2Title.includes(q) || l2SubMatch;
        l2.style.display = showL2 ? "" : "none";
        if (showL2) {
          l1HasMatch = true;
          if (l2SubMatch) l2.classList.add("expanded");
        }
      });

      l1.style.display = l1HasMatch ? "" : "none";
      if (l1HasMatch) l1.classList.add("expanded");
    });
  });

  window.addEventListener("popstate", () => handleHashChange(false));

  // Initial load
  handleHashChange(false);
  updateGlobalProgress();
})();
