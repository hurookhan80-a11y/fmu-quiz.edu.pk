(function () {
        "use strict";

        var LETTERS = ["A", "B", "C", "D", "E"];
        var CHECK_SVG =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
        var CROSS_SVG =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        var QUESTION_SECONDS = 60;
        var SUBJECTS = ["Anatomy", "Physiology", "Biochemistry"];
        var CHAPTER_SUBJECTS = ["Anatomy", "Physiology", "Biochemistry", "Histology", "Embryology", "Community Medicine", "Pathology", "Pharmacology", "Forensic Medicine", "Microbiology"];
        var BOOK_SHORT = {
          "Guyton and Hall, 14th ed.": "Guyton",
          "Moore — Clinically Oriented Anatomy (KLM)": "KLM",
          "Lippincott Illustrated Reviews: Biochemistry (8th ed.)": "Lippincott",
          "Harper's Illustrated Biochemistry (32nd ed.)": "Harper's",
          "Laiq Hussain — Medical Histology (9th ed.)": "Laiq Hussain",
          "Moore — The Developing Human": "Developing Human",
          "Satyanarayana — Textbook of Biochemistry (6th ed.)": "Satyanarayana",
          "Park — Textbook of Preventive and Social Medicine (26th ed.)": "Park",
          "Langman's Medical Embryology (15th ed.)": "Langman",
          "Robbins Basic Pathology (10th ed.)": "Robbins",
          "Katzung — Basic & Clinical Pharmacology (15th ed.)": "Katzung",
          "Reddy — Essentials of Forensic Medicine and Toxicology (35th ed.)": "Reddy",
          "Ananthanarayan & Paniker — Textbook of Microbiology (10th ed.)": "Ananthanarayan"
        };
        /* Chapter label for one question. Anatomy shows BOTH books side by side
           (KLM + BD Chaurasia); otherwise "Book Ch. N: Title". Items whose
           chapter could not be confirmed are labelled, never guessed. */
        function chapterLabel(item) {
          if (item.chapter == null) return "Chapter not confirmed yet";
          if (item.subject === "Anatomy" && item.chapter_klm) {
            return item.chapter_klm + " · " + (item.chapter_bd || "");
          }
          var book = BOOK_SHORT[item.chapter_book] || item.chapter_book || "";
          return (book ? book + " " : "") + "Ch. " + item.chapter + (item.chapter_title ? ": " + item.chapter_title : "");
        }
        /* "Past paper" for the per-chapter filter: a real paper label, not the
           "Send-up / Prof" original-bank label. Practice-bank items never count. */
        function isPastPaper(item, ref) {
          return ref.b === "m" && !!item.paper && item.paper !== "Send-up / Prof";
        }
        /* Chapter groups for one subject, sorted by book then chapter number.
           Each group: {book, chapter, title, refs, paperRefs, unverified}. */
        function chapterGroups(subject) {
          var groups = {};
          var order = [];
          [["m", MCQ_BANK], ["p", PRACTICE_BANK]].forEach(function (pair) {
            pair[1].forEach(function (item, i) {
              if (item.subject !== subject) return;
              var ref = { b: pair[0], i: i };
              var key = item.chapter == null ? "unverified" : (item.chapter_book || "") + "|" + item.chapter;
              var g = groups[key];
              if (!g) {
                g = { key: key, book: item.chapter_book, chapter: item.chapter, title: item.chapter_title, refs: [], paperRefs: [], unverified: item.chapter == null };
                groups[key] = g;
                order.push(g);
              }
              g.refs.push(ref);
              if (isPastPaper(item, ref)) g.paperRefs.push(ref);
            });
          });
          order.sort(function (a, b) {
            if (a.unverified !== b.unverified) return a.unverified ? 1 : -1;
            if (a.book !== b.book) return a.book < b.book ? -1 : 1;
            return a.chapter - b.chapter;
          });
          return order;
        }
        /* Distinct BD Chaurasia references inside one KLM chapter, as a short
           "Vol. 1 Ch. 2–11" style summary (one KLM chapter spans several BD
           chapters, so a single BD reference would mislead). */
        function bdSummary(group) {
          var seen = {};
          var vols = {};
          group.refs.forEach(function (ref) {
            var bd = itemOf(ref).chapter_bd;
            if (!bd || seen[bd]) return;
            seen[bd] = true;
            var m = bd.match(/Vol\. (\d+), Ch\. (\d+)/);
            if (!m) return;
            var v = m[1];
            (vols[v] = vols[v] || []).push(Number(m[2]));
          });
          var parts = Object.keys(vols).sort(function (a, b) { return a - b; }).map(function (v) {
            var chs = vols[v].sort(function (a, b) { return a - b; });
            return "Vol. " + v + " Ch. " + (chs.length === 1 ? chs[0] : chs[0] + "–" + chs[chs.length - 1]);
          });
          return parts.length ? "BD Chaurasia " + parts.join("; ") : "";
        }
        function distinctBdRefs(group) {
          var seen = {};
          var out = [];
          group.refs.forEach(function (ref) {
            var bd = itemOf(ref).chapter_bd;
            if (bd && !seen[bd]) { seen[bd] = true; out.push(bd); }
          });
          return out;
        }

        var els = {};
        [
          "viewWelcome", "welcomeStep1", "welcomeStep2", "welcomeStep3", "welcomeNextOne", "welcomeNextTwo",
          "welcomeSkipOne", "welcomeSkipTwo", "welcomeSkipThree", "welcomeStartBtn", "viewHome", "viewTiming", "viewQuiz", "viewResult", "viewReview", "viewMistakes",
          "viewStats", "viewSend", "homeBtn", "themeToggle", "themeLabel", "themeIcon", "searchInput", "searchResults",
          "timingQuizTitle", "timingImmediate", "timingEnd", "timingContinueBtn",
          "pastTotal", "pastList", "practiceTotal", "practiceList", "overviewQuestions", "overviewPapers",
          "paperSelect", "subjectSelect", "timerOptions", "filteredCount", "startFilteredBtn", "paperList", "paperBrowseCount",
          "chapterSubjects", "chapterPanel",
          "bookmarksCard", "bookmarksCount", "mistakesCard", "mistakesCount", "statsCard", "statsSummary", "reviewCard",
          "pillTimer", "timerText", "pillCorrect", "pillWrong", "pillAttempted",
          "progressFill", "finishEarly", "quizTopic", "qCard", "qTimeoutBanner", "qNum", "qText", "qOptions",
          "bookmarkBtn", "bookmarkLabel", "qExplain", "eAns", "eText", "qTimeout", "qSource", "qChapter", "qPaper", "prevBtn", "nextBtn",
          "resultTopic", "resultPct", "resultPctLabel", "statTotal", "statAttempted", "statCorrect",
          "statWrong", "statAccuracy", "statSkipped", "resultMsg", "resultBreakdown", "fullReview", "reviewBtn", "retryResultMistakesBtn",
          "downloadResultMistakesBtn", "downloadNoteResult",
          "restartBtn", "changeTopicBtn", "reviewSub", "rNum", "rText",
          "rOptions", "rAns", "rText2", "rSource", "rChapter", "rPaper", "rPrevBtn", "rNextBtn",
          "backToResultBtn", "mistakesSub", "mistakesList", "retryMistakesBtn",
          "downloadMistakesBtn", "downloadNoteMistakes", "clearMistakesBtn", "mistakesHomeBtn", "stAttempted", "stCorrect",
          "stWrong", "stAccuracy", "statsBySubject", "statsByPaper", "resetStatsBtn", "statsHomeBtn",
          "reviewName", "reviewText", "copyReviewBtn", "copyNote", "sendHomeBtn",
          "copyEmailBtn", "emailCopyNote"
        ].forEach(function (id) { els[id] = document.getElementById(id); });

        var VIEW_IDS = ["viewWelcome", "viewHome", "viewTiming", "viewQuiz", "viewResult", "viewReview", "viewMistakes", "viewStats", "viewSend"];
        var selectedSeconds = QUESTION_SECONDS;
        var selectedFeedbackMode = "immediate";
        var pendingQuiz = null;
        var currentViewId = "viewWelcome";

        function setTheme(isDark) {
          document.body.classList.toggle("theme-dark", isDark);
          document.body.classList.toggle("theme-light", !isDark);
          document.documentElement.style.colorScheme = isDark ? "dark" : "light";
          els.themeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
          els.themeToggle.title = isDark ? "Switch to Sunlight mode" : "Switch to Dark mode";
          els.themeLabel.textContent = isDark ? "Dark" : "Sunlight";
          els.themeIcon.innerHTML = isDark
            ? '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8z"/>'
            : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>';
        }
        els.themeToggle.addEventListener("click", function () {
          setTheme(!document.body.classList.contains("theme-dark"));
          saveProgress();
        });
        setTheme(false);

        function show(viewId) {
          stopTimer();
          currentViewId = viewId;
          VIEW_IDS.forEach(function (v) {
            els[v].classList.toggle("active", v === viewId);
          });
          document.body.classList.toggle("welcome-mode", viewId === "viewWelcome");
          els.homeBtn.style.display = (viewId === "viewHome" || viewId === "viewWelcome") ? "none" : "block";
          if (viewId === "viewHome") refreshHomeCounts();
          window.scrollTo(0, 0);
        }

        /* ---------------- item access ---------------- */
        function bankOf(ref) { return ref.b === "p" ? PRACTICE_BANK : MCQ_BANK; }
        function itemOf(ref) { return bankOf(ref)[ref.i]; }
        function refKey(ref) { return ref.b + ":" + ref.i; }
        function paperLineText(ref, item, full) {
          if (item.paper) {
            return full ? "\uD83D\uDCC4 This MCQ is from: " + item.paper : "From: " + item.paper;
          }
          if (ref && ref.b === "p") {
            return full
              ? "\u270D\uFE0F Practice MCQ \u2014 based on FMU past papers"
              : "From: Practice MCQ \u2014 based on FMU past papers";
          }
          return "";
        }
        function allRefs(bank) {
          var arr = bank === "p" ? PRACTICE_BANK : MCQ_BANK;
          return arr.map(function (_, i) { return { b: bank, i: i }; });
        }
        function subjectRefs(bank, subject) {
          var arr = bank === "p" ? PRACTICE_BANK : MCQ_BANK;
          var out = [];
          arr.forEach(function (item, i) {
            if (item.subject === subject) out.push({ b: bank, i: i });
          });
          return out;
        }
        function subjectClass(subject) {
          return "subject-" + String(subject || "").toLowerCase().replace(/[^a-z]+/g, "-");
        }
        function paperNames(item) {
          return item.paper ? item.paper.split(" · ") : ["Other / Unlabeled"];
        }
        var PAPER_NAMES = [];
        MCQ_BANK.forEach(function (item) {
          paperNames(item).forEach(function (name) {
            if (PAPER_NAMES.indexOf(name) === -1) PAPER_NAMES.push(name);
          });
        });
        function paperRefs(paper, subject) {
          var out = [];
          MCQ_BANK.forEach(function (item, i) {
            var paperMatch = !paper || paperNames(item).indexOf(paper) !== -1;
            var subjectMatch = !subject || item.subject === subject;
            if (paperMatch && subjectMatch) out.push({ b: "m", i: i });
          });
          return out;
        }
        function paperDirectCount(paper, subject) {
          var count = 0;
          MCQ_BANK.forEach(function (item) {
            var exact = paper === "Other / Unlabeled" ? !item.paper : item.paper === paper;
            if (exact && (!subject || item.subject === subject)) count++;
          });
          return count;
        }
        function paperCountText(paper, subject) {
          var total = paperRefs(paper, subject).length;
          var direct = paperDirectCount(paper, subject);
          var merged = total - direct;
          return merged > 0
            ? direct + " PDF questions + " + merged + " merged matches"
            : total + (total === 1 ? " question" : " questions");
        }

        /* ---------------- progress store (this visit) ---------------- */
        var mistakeKeys = [];      // ordered unique "b:i" keys
        var mistakeSet = {};       // key -> true
        var mistakePicks = {};     // key -> chosen option index (-1 = timed out / none)
        var bookmarkKeys = [];     // kept only for this open visit
        var bookmarkSet = {};
        var stats = freshStats();

        /* ---------------- persistence: bookmarks, mistakes, stats, theme ---------------- */
        /* Saved in localStorage under a versioned key. If storage is unavailable, blocked,
           full, or the bank changed size (old "b:i" keys would misalign), the quiz keeps
           working memory-only. Nothing sensitive is stored: only question keys, picks,
           aggregate stats, and the theme choice. No login, no server. */
        var STORE_KEY = "fmuQuizV1";
        function bankFingerprint() { return MCQ_BANK.length + ":" + PRACTICE_BANK.length; }
        function loadSaved() {
          try {
            if (typeof window === "undefined" || !window.localStorage) return null;
            var raw = window.localStorage.getItem(STORE_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!data || typeof data !== "object") return null;
            if (data.bank !== bankFingerprint()) return null;
            return data;
          } catch (e) { return null; }
        }
        function saveProgress() {
          try {
            if (typeof window === "undefined" || !window.localStorage) return;
            window.localStorage.setItem(STORE_KEY, JSON.stringify({
              bank: bankFingerprint(),
              mistakes: mistakeKeys,
              picks: mistakePicks,
              bookmarks: bookmarkKeys,
              stats: stats,
              theme: document.body.classList.contains("theme-dark")
            }));
          } catch (e) { /* storage blocked/full: quiz keeps working memory-only */ }
        }
        (function restoreProgress() {
          var data = loadSaved();
          if (!data) return;
          if (Array.isArray(data.mistakes)) {
            data.mistakes.forEach(function (k) {
              if (typeof k === "string" && !mistakeSet[k]) { mistakeSet[k] = true; mistakeKeys.push(k); }
            });
          }
          if (data.picks && typeof data.picks === "object") { mistakePicks = data.picks; }
          if (Array.isArray(data.bookmarks)) {
            data.bookmarks.forEach(function (k) {
              if (typeof k === "string" && !bookmarkSet[k]) { bookmarkSet[k] = true; bookmarkKeys.push(k); }
            });
          }
          if (data.stats && typeof data.stats.attempted === "number") {
            var s = freshStats();
            s.attempted = data.stats.attempted; s.correct = data.stats.correct; s.wrong = data.stats.wrong;
            if (data.stats.bySubject && typeof data.stats.bySubject === "object") s.bySubject = data.stats.bySubject;
            if (data.stats.byPaper && typeof data.stats.byPaper === "object") s.byPaper = data.stats.byPaper;
            stats = s;
          }
          if (data.theme === true) { setTheme(true); }
        })();


        function freshStats() {
          var s = { attempted: 0, correct: 0, wrong: 0, bySubject: {}, byPaper: {} };
          SUBJECTS.forEach(function (sub) {
            s.bySubject[sub] = { attempted: 0, correct: 0, wrong: 0 };
          });
          PAPER_NAMES.forEach(function (paper) {
            s.byPaper[paper] = { attempted: 0, correct: 0, wrong: 0 };
          });
          return s;
        }

        function recordResult(ref, ok, chosen) {
          var item = itemOf(ref);
          stats.attempted++;
          var ss = stats.bySubject[item.subject] || (stats.bySubject[item.subject] = { attempted: 0, correct: 0, wrong: 0 });
          ss.attempted++;
          var paperStats = ref.b === "m" ? paperNames(item) : [];
          paperStats.forEach(function (paper) {
            var ps = stats.byPaper[paper] || (stats.byPaper[paper] = { attempted: 0, correct: 0, wrong: 0 });
            ps.attempted++;
            if (ok) ps.correct++; else ps.wrong++;
          });
          if (ok) {
            stats.correct++;
            ss.correct++;
          } else {
            stats.wrong++;
            ss.wrong++;
            var key = refKey(ref);
            if (!mistakeSet[key]) {
              mistakeSet[key] = true;
              mistakeKeys.push(key);
            }
            mistakePicks[key] = (typeof chosen === "number" ? chosen : -1);
          }
          saveProgress();
        }

        function refreshHomeCounts() {
          var n = mistakeKeys.length;
          var b = bookmarkKeys.length;
          els.bookmarksCount.textContent = b === 0
            ? "No questions bookmarked yet"
            : b + (b === 1 ? " question ready" : " questions ready");
          els.bookmarksCard.disabled = b === 0;
          els.mistakesCount.textContent = n === 0
            ? "Nothing saved yet"
            : n + (n === 1 ? " question" : " questions") + " to work on";
          els.statsSummary.textContent = stats.attempted === 0
            ? "No questions attempted yet"
            : stats.attempted + " attempted · " + stats.correct + " correct · " + stats.wrong + " wrong";
        }

        /* ---------------- home: quiz cards ---------------- */
        function makeTopicCard(name, count, goLabel, onClick) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "topic-card" + (SUBJECTS.indexOf(name) !== -1 ? " " + subjectClass(name) : "");
          var left = document.createElement("span");
          var nm = document.createElement("span");
          nm.className = "tname";
          nm.textContent = name;
          var ct = document.createElement("span");
          ct.className = "tcount";
          ct.textContent = count;
          left.appendChild(nm);
          left.appendChild(ct);
          var go = document.createElement("span");
          go.className = "go";
          go.textContent = goLabel;
          btn.appendChild(left);
          btn.appendChild(go);
          btn.addEventListener("click", onClick);
          return btn;
        }

        els.pastTotal.textContent = MCQ_BANK.length + " questions";
        els.practiceTotal.textContent = PRACTICE_BANK.length + " questions";
        els.overviewQuestions.textContent = (MCQ_BANK.length + PRACTICE_BANK.length).toLocaleString("en-US");
        els.overviewPapers.textContent = PAPER_NAMES.length;
        els.paperBrowseCount.textContent = PAPER_NAMES.length + " options";

        function populatePaperSelect() {
          var current = els.paperSelect.value;
          var subject = els.subjectSelect.value;
          els.paperSelect.innerHTML = "";
          var allOpt = document.createElement("option");
          allOpt.value = "";
          allOpt.textContent = "All past papers (" + paperRefs("", subject).length + ")";
          els.paperSelect.appendChild(allOpt);
          PAPER_NAMES.forEach(function (paper) {
            var count = paperRefs(paper, subject).length;
            if (!count) return;
            var opt = document.createElement("option");
            opt.value = paper;
            opt.textContent = paper + " (" + paperCountText(paper, subject) + ")";
            els.paperSelect.appendChild(opt);
          });
          if (current && Array.prototype.some.call(els.paperSelect.options, function (opt) { return opt.value === current; })) {
            els.paperSelect.value = current;
          }
        }
        function selectedFilterRefs() {
          return paperRefs(els.paperSelect.value, els.subjectSelect.value);
        }
        function updateFilteredCount() {
          var refs = selectedFilterRefs();
          var paper = els.paperSelect.value || "All past papers";
          var subject = els.subjectSelect.value || "all subjects";
          var detail = els.paperSelect.value ? paperCountText(els.paperSelect.value, els.subjectSelect.value) : (refs.length + " questions");
          els.filteredCount.textContent = refs.length + " selected · " + detail + " · " + paper + " · " + subject;
          els.startFilteredBtn.disabled = refs.length === 0;
        }
        populatePaperSelect();
        updateFilteredCount();
        els.subjectSelect.addEventListener("change", function () {
          populatePaperSelect();
          updateFilteredCount();
        });
        els.paperSelect.addEventListener("change", updateFilteredCount);
        els.startFilteredBtn.addEventListener("click", function () {
          var refs = selectedFilterRefs();
          var title = (els.paperSelect.value || "All Past Papers") + " · " + (els.subjectSelect.value || "All Subjects");
          startQuiz(title, refs);
        });
        Array.prototype.forEach.call(els.timerOptions.querySelectorAll(".timer-choice"), function (btn) {
          btn.addEventListener("click", function () {
            selectedSeconds = Number(btn.getAttribute("data-seconds"));
            Array.prototype.forEach.call(els.timerOptions.querySelectorAll(".timer-choice"), function (other) {
              other.classList.toggle("active", other === btn);
            });
          });
        });
        PAPER_NAMES.forEach(function (paper) {
          var refs = paperRefs(paper, "");
          var card = document.createElement("button");
          card.type = "button";
          card.className = "paper-card";
          var name = document.createElement("strong");
          name.textContent = paper;
          var count = document.createElement("span");
          count.textContent = paperCountText(paper, "");
          card.appendChild(name);
          card.appendChild(count);
          card.addEventListener("click", function () { startQuiz(paper + " · All Subjects", refs); });
          els.paperList.appendChild(card);
        });

        var pastAll = document.createElement("button");
        pastAll.type = "button";
        pastAll.className = "all-card";
        var paText = document.createElement("span");
        var paBig = document.createElement("span");
        paBig.className = "big";
        paBig.textContent = "All Subjects";
        var paSmall = document.createElement("span");
        paSmall.className = "small";
        paSmall.textContent = MCQ_BANK.length + " questions · every subject";
        paText.appendChild(paBig);
        paText.appendChild(paSmall);
        var paArrow = document.createElement("span");
        paArrow.className = "arrow";
        paArrow.setAttribute("aria-hidden", "true");
        paArrow.textContent = "→";
        pastAll.appendChild(paText);
        pastAll.appendChild(paArrow);
        pastAll.addEventListener("click", function () {
          startQuiz("Past Papers · All Subjects", allRefs("m"));
        });
        els.pastList.appendChild(pastAll);

        SUBJECTS.forEach(function (subject) {
          var refs = subjectRefs("m", subject);
          els.pastList.appendChild(makeTopicCard(subject, refs.length + " questions", "Start →", function () {
            startQuiz("Past Papers · " + subject, refs);
          }));
        });

        els.practiceList.appendChild(makeTopicCard("All Practice MCQs", PRACTICE_BANK.length + " questions", "Start →", function () {
          startQuiz("Practice MCQs · All Subjects", allRefs("p"));
        }));
        SUBJECTS.forEach(function (subject) {
          var refs = subjectRefs("p", subject);
          els.practiceList.appendChild(makeTopicCard(subject, refs.length + " questions", "Start →", function () {
            startQuiz("Practice MCQs · " + subject, refs);
          }));
        });

        /* ---------------- home: browse by chapter ---------------- */
        function subjectTotal(subject) {
          var n = 0;
          [["m", MCQ_BANK], ["p", PRACTICE_BANK]].forEach(function (pair) {
            pair[1].forEach(function (item) { if (item.subject === subject) n++; });
          });
          return n;
        }
        function chapterCardLabel(group) {
          if (group.unverified) return "Chapter not confirmed yet";
          if (group.book === "Moore — Clinically Oriented Anatomy (KLM)") {
            var first = null;
            group.refs.some(function (ref) {
              var it = itemOf(ref);
              if (it.chapter_klm) { first = it; return true; }
              return false;
            });
            if (first) {
              var summary = bdSummary(group);
              return first.chapter_klm + (summary ? " · " + summary : "");
            }
          }
          var book = BOOK_SHORT[group.book] || group.book || "";
          return (book ? book + " " : "") + "Ch. " + group.chapter + (group.title ? ": " + group.title : "");
        }
        function renderChapterList(subject) {
          els.chapterPanel.innerHTML = "";
          var head = document.createElement("div");
          head.className = "subject-head serif";
          head.appendChild(document.createTextNode(subject));
          var tot = document.createElement("span");
          tot.className = "subject-total";
          tot.textContent = subjectTotal(subject) + " questions";
          head.appendChild(tot);
          els.chapterPanel.appendChild(head);
          var note = document.createElement("p");
          note.className = "section-note";
          note.textContent = subject === "Anatomy"
            ? "Each chapter shows both books — KLM (Moore) and BD Chaurasia — side by side."
            : "Chapters are from the book the questions are based on.";
          els.chapterPanel.appendChild(note);
          chapterGroups(subject).forEach(function (group) {
            var label = chapterCardLabel(group);
            var countText = group.refs.length + (group.refs.length === 1 ? " question" : " questions") +
              (group.paperRefs.length ? " · " + group.paperRefs.length + " past-paper" : "");
            els.chapterPanel.appendChild(makeTopicCard(label, countText, "Open →", function () {
              renderChapterDetail(subject, group);
            }));
          });
          var back = document.createElement("button");
          back.type = "button";
          back.className = "btn back chapter-back";
          back.textContent = "← All subjects";
          back.addEventListener("click", function () {
            els.chapterPanel.innerHTML = "";
            renderChapterSubjects();
          });
          els.chapterPanel.appendChild(back);
        }
        function renderChapterDetail(subject, group) {
          els.chapterPanel.innerHTML = "";
          var head = document.createElement("div");
          head.className = "subject-head serif";
          head.appendChild(document.createTextNode(chapterCardLabel(group)));
          els.chapterPanel.appendChild(head);
          if (group.unverified) {
            var unNote = document.createElement("p");
            unNote.className = "section-note";
            unNote.textContent = "These questions could not be matched to a book chapter with confidence, so they are listed here instead of being guessed into a chapter.";
            els.chapterPanel.appendChild(unNote);
          } else if (group.book === "Moore — Clinically Oriented Anatomy (KLM)") {
            var books = document.createElement("div");
            books.className = "chapter-books";
            var klmLine = document.createElement("div");
            var klmStrong = document.createElement("strong");
            klmStrong.textContent = "KLM: ";
            klmLine.appendChild(klmStrong);
            var first = null;
            group.refs.some(function (ref) {
              var it = itemOf(ref);
              if (it.chapter_klm) { first = it; return true; }
              return false;
            });
            klmLine.appendChild(document.createTextNode(first ? first.chapter_klm : ""));
            books.appendChild(klmLine);
            distinctBdRefs(group).forEach(function (bd) {
              var line = document.createElement("div");
              var bStrong = document.createElement("strong");
              bStrong.textContent = "BD Chaurasia: ";
              line.appendChild(bStrong);
              line.appendChild(document.createTextNode(bd.replace(/^BD Chaurasia /, "")));
              books.appendChild(line);
            });
            els.chapterPanel.appendChild(books);
          } else {
            var bookLine = document.createElement("p");
            bookLine.className = "section-note";
            bookLine.textContent = "Book: " + (group.book || "");
            els.chapterPanel.appendChild(bookLine);
          }
          var allBtn = document.createElement("button");
          allBtn.type = "button";
          allBtn.className = "btn primary chapter-choice";
          allBtn.textContent = "Start all " + group.refs.length + " MCQs";
          allBtn.addEventListener("click", function () {
            startQuiz(subject + " · " + chapterCardLabel(group), group.refs);
          });
          els.chapterPanel.appendChild(allBtn);
          if (group.paperRefs.length) {
            var paperBtn = document.createElement("button");
            paperBtn.type = "button";
            paperBtn.className = "btn gold chapter-choice";
            paperBtn.textContent = "Sirf past paper MCQs (" + group.paperRefs.length + ")";
            paperBtn.addEventListener("click", function () {
              startQuiz(subject + " · " + chapterCardLabel(group) + " · Past papers only", group.paperRefs);
            });
            els.chapterPanel.appendChild(paperBtn);
          } else {
            var none = document.createElement("p");
            none.className = "section-note";
            none.textContent = "No past-paper MCQs in this chapter yet — only practice questions.";
            els.chapterPanel.appendChild(none);
          }
          var back = document.createElement("button");
          back.type = "button";
          back.className = "btn back chapter-back";
          back.textContent = "← Back to " + subject + " chapters";
          back.addEventListener("click", function () { renderChapterList(subject); });
          els.chapterPanel.appendChild(back);
        }
        function renderChapterSubjects() {
          els.chapterSubjects.innerHTML = "";
          CHAPTER_SUBJECTS.forEach(function (subject) {
            var n = subjectTotal(subject);
            if (!n) return;
            els.chapterSubjects.appendChild(makeTopicCard(subject, n + " questions", "Chapters →", function () {
              renderChapterList(subject);
            }));
          });
        }
        renderChapterSubjects();

        els.bookmarksCard.addEventListener("click", function () {
          var refs = bookmarkKeys.map(function (key) {
            var parts = key.split(":");
            return { b: parts[0], i: Number(parts[1]) };
          });
          startQuiz("Bookmarked questions", refs);
        });
        els.mistakesCard.addEventListener("click", function () {
          renderMistakes();
          show("viewMistakes");
        });
        els.statsCard.addEventListener("click", function () {
          renderStats();
          show("viewStats");
        });
        els.reviewCard.addEventListener("click", function () {
          show("viewSend");
        });

        /* ---------------- home: search ---------------- */
        var searchMatches = [];
        function renderSearch() {
          var raw = els.searchInput.value.trim().toLowerCase();
          els.searchResults.innerHTML = "";
          if (raw.length < 2) {
            els.searchResults.classList.remove("open");
            searchMatches = [];
            return;
          }
          var words = raw.split(/\s+/);
          searchMatches = [];
          [["m", MCQ_BANK], ["p", PRACTICE_BANK]].forEach(function (pair) {
            pair[1].forEach(function (item, i) {
              var hay = (item.q + " " + item.subject + " " + (item.paper || "") + " " + chapterLabel(item) + " " + item.options.join(" ")).toLowerCase();
              var ok = words.every(function (w) { return hay.indexOf(w) !== -1; });
              if (ok) searchMatches.push({ b: pair[0], i: i });
            });
          });
          els.searchResults.classList.add("open");

          var count = document.createElement("p");
          count.className = "search-count";
          count.textContent = searchMatches.length === 0
            ? "No questions match “" + els.searchInput.value.trim() + "”. Try another keyword."
            : searchMatches.length + (searchMatches.length === 1 ? " question matches" : " questions match") + " — tap one to jump straight to it:";
          els.searchResults.appendChild(count);

          if (searchMatches.length > 0) {
            var startBtn = document.createElement("button");
            startBtn.type = "button";
            startBtn.className = "search-start";
            startBtn.textContent = "Start quiz with these " + searchMatches.length + " questions";
            startBtn.addEventListener("click", function () {
              startQuiz("Search: “" + els.searchInput.value.trim() + "”", searchMatches.slice());
            });
            els.searchResults.appendChild(startBtn);

            var shown = searchMatches.slice(0, 40);
            shown.forEach(function (ref, pos) {
              var item = itemOf(ref);
              var hit = document.createElement("button");
              hit.type = "button";
              hit.className = "search-hit";
              var hq = document.createElement("span");
              hq.className = "hq";
              hq.textContent = item.q;
              var htag = document.createElement("span");
              htag.className = "htag";
              htag.textContent = item.subject + (ref.b === "p" ? " · Practice" : " · Past paper");
              hit.appendChild(hq);
              hit.appendChild(htag);
              hit.addEventListener("click", function () {
                startQuiz("Search: “" + els.searchInput.value.trim() + "”", searchMatches.slice(), pos);
              });
              els.searchResults.appendChild(hit);
            });
            if (searchMatches.length > shown.length) {
              var more = document.createElement("p");
              more.className = "search-more";
              more.textContent = "Showing first " + shown.length + " of " + searchMatches.length + " matches.";
              els.searchResults.appendChild(more);
            }
          }
        }
        var searchTimer = null;
        els.searchInput.addEventListener("input", function () {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(renderSearch, 120);
        });

        /* ---------------- quiz engine ---------------- */
        var quiz = null; // {title, order:[ref...], pos, chosen:{pos:optIdx|-1}, timeLeft:{pos:seconds}}
        var timerId = null;

        function shuffle(arr) {
          var a = arr.slice();
          for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
          }
          return a;
        }

        function chooseFeedbackMode(mode) {
          selectedFeedbackMode = mode === "end" ? "end" : "immediate";
          [els.timingImmediate, els.timingEnd].forEach(function (btn) {
            var active = btn.getAttribute("data-mode") === selectedFeedbackMode;
            btn.classList.toggle("active", active);
            btn.setAttribute("aria-checked", active ? "true" : "false");
          });
        }

        function startQuiz(title, refs, startPos) {
          if (!refs.length) return;
          pendingQuiz = { title: title, refs: refs.slice(), startPos: startPos };
          chooseFeedbackMode("immediate");
          els.timingQuizTitle.textContent = title + " · " + refs.length + (refs.length === 1 ? " question" : " questions");
          show("viewTiming");
        }

        function launchQuiz(title, refs, startPos) {
          var requestedRef = typeof startPos === "number" ? refs[startPos] : null;
          var order = shuffle(refs);
          var firstPos = 0;
          if (requestedRef) {
            var wanted = refKey(requestedRef);
            order.some(function (ref, idx) {
              if (refKey(ref) === wanted) { firstPos = idx; return true; }
              return false;
            });
          }
          quiz = {
            title: title,
            order: order,
            pos: firstPos,
            chosen: {},
            timeLeft: {},
            timerSeconds: selectedSeconds,
            feedbackMode: selectedFeedbackMode
          };
          pendingQuiz = null;
          show("viewQuiz");
          renderQuestion();
        }

        els.timingImmediate.addEventListener("click", function () { chooseFeedbackMode("immediate"); });
        els.timingEnd.addEventListener("click", function () { chooseFeedbackMode("end"); });
        els.timingContinueBtn.addEventListener("click", function () {
          if (!pendingQuiz) { show("viewHome"); return; }
          launchQuiz(pendingQuiz.title, pendingQuiz.refs, pendingQuiz.startPos);
        });

        function counts() {
          var correct = 0, wrong = 0;
          Object.keys(quiz.chosen).forEach(function (p) {
            var chosen = quiz.chosen[p];
            if (quiz.feedbackMode === "end" && chosen === -1) return;
            var item = itemOf(quiz.order[Number(p)]);
            if (chosen === item.answer) correct++; else wrong++;
          });
          return { correct: correct, wrong: wrong, attempted: correct + wrong };
        }

        function renderScore() {
          var c = counts();
          var examMode = quiz.feedbackMode === "end";
          els.pillCorrect.parentElement.hidden = examMode;
          els.pillWrong.parentElement.hidden = examMode;
          els.pillCorrect.textContent = "Correct " + c.correct;
          els.pillWrong.textContent = "Wrong " + c.wrong;
          els.pillAttempted.textContent = "Attempted " + c.attempted + " / " + quiz.order.length;
          els.progressFill.style.width =
            quiz.order.length ? (c.attempted / quiz.order.length) * 100 + "%" : "0%";
        }

        function fmtTime(s) {
          var m = Math.floor(s / 60);
          var r = s % 60;
          return m + ":" + (r < 10 ? "0" : "") + r;
        }

        function renderTimer() {
          var noTimer = !quiz.timerSeconds;
          els.pillTimer.hidden = noTimer;
          if (noTimer) return;
          var left = quiz.timeLeft[quiz.pos];
          if (left === undefined) left = quiz.timerSeconds;
          els.timerText.textContent = fmtTime(Math.max(0, Math.ceil(left)));
          els.pillTimer.classList.toggle("low", left <= 10.5);
        }

        function stopTimer() {
          if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
          }
        }

        function startTimer() {
          stopTimer();
          if (!quiz.timerSeconds || quiz.chosen[quiz.pos] !== undefined) return;
          if (quiz.timeLeft[quiz.pos] === undefined) quiz.timeLeft[quiz.pos] = quiz.timerSeconds;
          renderTimer();
          timerId = setInterval(function () {
            quiz.timeLeft[quiz.pos] -= 0.25;
            if (quiz.timeLeft[quiz.pos] <= 0) {
              quiz.timeLeft[quiz.pos] = 0;
              onTimeout();
              return;
            }
            renderTimer();
          }, 250);
        }

        function advanceExamMode() {
          if (quiz.pos < quiz.order.length - 1) {
            quiz.pos++;
            renderQuestion();
            window.scrollTo(0, 0);
          } else {
            showResults();
          }
        }

        function onTimeout() {
          stopTimer();
          quiz.chosen[quiz.pos] = -1;
          if (quiz.feedbackMode === "end") {
            advanceExamMode();
          } else {
            recordResult(quiz.order[quiz.pos], false, -1);
            renderQuestion();
            renderScore();
          }
        }

        function renderQuestion() {
          var ref = quiz.order[quiz.pos];
          var item = itemOf(ref);
          els.quizTopic.innerHTML = "";
          var subjectBadge = document.createElement("span");
          subjectBadge.className = "subject-badge " + subjectClass(item.subject);
          subjectBadge.textContent = item.subject;
          els.quizTopic.appendChild(subjectBadge);
          els.quizTopic.appendChild(document.createTextNode("  " + quiz.title + (ref.b === "p" ? " · Practice" : " · Past paper")));
          els.qCard.className = "qcard " + subjectClass(item.subject);
          els.progressFill.className = "fill " + subjectClass(item.subject);
          var bookmarked = !!bookmarkSet[refKey(ref)];
          els.bookmarkBtn.classList.toggle("active", bookmarked);
          els.bookmarkBtn.setAttribute("aria-pressed", bookmarked ? "true" : "false");
          els.bookmarkBtn.firstElementChild.textContent = bookmarked ? "★" : "☆";
          els.bookmarkLabel.textContent = bookmarked ? "Bookmarked" : "Bookmark";
          els.qNum.textContent = "Question " + (quiz.pos + 1) + " of " + quiz.order.length;
          els.qText.textContent = item.q;
          els.qOptions.innerHTML = "";

          var chosen = quiz.chosen[quiz.pos];
          var answered = chosen !== undefined;

          item.options.forEach(function (optText, oi) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "opt";
            var chip = document.createElement("span");
            chip.className = "chip";
            chip.textContent = LETTERS[oi] || String(oi + 1);
            var label = document.createElement("span");
            label.textContent = optText;
            btn.appendChild(chip);
            btn.appendChild(label);
            var verdict = document.createElement("span");
            verdict.className = "verdict";
            btn.appendChild(verdict);

            if (answered) {
              btn.disabled = true;
              if (quiz.feedbackMode === "end") {
                if (oi === chosen) btn.classList.add("is-selected");
              } else {
                if (oi === item.answer) {
                  btn.classList.add("is-correct");
                  verdict.innerHTML = CHECK_SVG;
                }
                if (oi === chosen && chosen !== item.answer) {
                  btn.classList.add("is-wrong");
                  verdict.innerHTML = CROSS_SVG;
                }
              }
            } else {
              btn.addEventListener("click", function () {
                stopTimer();
                quiz.chosen[quiz.pos] = oi;
                recordResult(quiz.order[quiz.pos], oi === item.answer, oi);
                if (quiz.feedbackMode === "end") {
                  advanceExamMode();
                } else {
                  renderQuestion();
                  renderScore();
                }
              });
            }
            els.qOptions.appendChild(btn);
          });

          if (answered && quiz.feedbackMode !== "end") {
            els.eAns.textContent =
              "Correct answer: " + (LETTERS[item.answer] || "") + ". " + item.options[item.answer] + " —";
            els.eText.textContent = item.explanation;
            els.qSource.innerHTML = "";
            var srcStrong = document.createElement("strong");
            srcStrong.textContent = "Source: ";
            els.qSource.appendChild(srcStrong);
            els.qSource.appendChild(document.createTextNode(item.source));
            els.qChapter.innerHTML = "";
            var qChStrong = document.createElement("strong");
            qChStrong.textContent = "Chapter: ";
            els.qChapter.appendChild(qChStrong);
            els.qChapter.appendChild(document.createTextNode(chapterLabel(item)));
            els.qTimeout.hidden = chosen !== -1;
            els.qExplain.classList.add("show");
          } else {
            els.qExplain.classList.remove("show");
          }

          els.qTimeoutBanner.hidden = quiz.feedbackMode === "end" || chosen !== -1;

          var paperText = paperLineText(ref, item, true);
          els.qPaper.textContent = paperText;
          els.qPaper.hidden = !paperText;

          els.prevBtn.disabled = quiz.pos === 0;
          var isLast = quiz.pos === quiz.order.length - 1;
          els.nextBtn.textContent = isLast ? "See results" : "Next →";
          renderTimer();
          renderScore();
          startTimer();
        }

        els.prevBtn.addEventListener("click", function () {
          if (quiz.pos > 0) { quiz.pos--; renderQuestion(); window.scrollTo(0, 0); }
        });
        els.nextBtn.addEventListener("click", function () {
          if (quiz.pos < quiz.order.length - 1) {
            quiz.pos++;
            renderQuestion();
            window.scrollTo(0, 0);
          } else {
            showResults();
          }
        });
        els.finishEarly.addEventListener("click", showResults);
        els.bookmarkBtn.addEventListener("click", function () {
          if (!quiz) return;
          var ref = quiz.order[quiz.pos];
          var key = refKey(ref);
          if (bookmarkSet[key]) {
            delete bookmarkSet[key];
            bookmarkKeys = bookmarkKeys.filter(function (saved) { return saved !== key; });
          } else {
            bookmarkSet[key] = true;
            bookmarkKeys.push(key);
          }
          saveProgress();
          renderQuestion();
        });

        /* ---------------- results ---------------- */
        function makeAccuracyRow(label, correct, attempted) {
          var row = document.createElement("div");
          row.className = "stat-row";
          var head = document.createElement("div");
          head.className = "sr-head";
          var name = document.createElement("span");
          name.className = "sr-name";
          name.textContent = label;
          var nums = document.createElement("span");
          nums.className = "sr-nums";
          nums.textContent = attempted
            ? correct + " / " + attempted + " correct · " + Math.round((correct / attempted) * 100) + "%"
            : "not attempted";
          head.appendChild(name);
          head.appendChild(nums);
          var track = document.createElement("div");
          track.className = "track";
          var fill = document.createElement("div");
          fill.className = "fill";
          fill.style.width = (attempted ? Math.round((correct / attempted) * 100) : 0) + "%";
          track.appendChild(fill);
          row.appendChild(head);
          row.appendChild(track);
          return row;
        }

        function renderExamBreakdown() {
          els.resultBreakdown.innerHTML = "";
          var title = document.createElement("h3");
          title.textContent = "Accuracy in this quiz";
          els.resultBreakdown.appendChild(title);
          var bySubject = {};
          var byPaper = {};
          quiz.order.forEach(function (ref, pos) {
            var chosen = quiz.chosen[pos];
            if (chosen === undefined || chosen === -1) return;
            var item = itemOf(ref);
            var ok = chosen === item.answer;
            var ss = bySubject[item.subject] || (bySubject[item.subject] = { attempted: 0, correct: 0 });
            ss.attempted++;
            if (ok) ss.correct++;
            if (ref.b === "m") {
              paperNames(item).forEach(function (paper) {
                var ps = byPaper[paper] || (byPaper[paper] = { attempted: 0, correct: 0 });
                ps.attempted++;
                if (ok) ps.correct++;
              });
            }
          });
          SUBJECTS.forEach(function (subject) {
            if (bySubject[subject]) {
              els.resultBreakdown.appendChild(makeAccuracyRow(subject, bySubject[subject].correct, bySubject[subject].attempted));
            }
          });
          Object.keys(byPaper).forEach(function (paper) {
            els.resultBreakdown.appendChild(makeAccuracyRow(paper, byPaper[paper].correct, byPaper[paper].attempted));
          });
        }

        function renderFullReview() {
          els.fullReview.innerHTML = "";
          var attempted = [];
          var notAttempted = [];

          quiz.order.forEach(function (ref, pos) {
            var entry = { ref: ref, pos: pos, item: itemOf(ref), chosen: quiz.chosen[pos] };
            if (entry.chosen === undefined || entry.chosen === -1) notAttempted.push(entry);
            else attempted.push(entry);
          });

          function makeSectionHead(titleText, countText, noteText) {
            var fragment = document.createDocumentFragment();
            var head = document.createElement("div");
            head.className = "review-section-head";
            var title = document.createElement("h3");
            title.textContent = titleText;
            var count = document.createElement("span");
            count.className = "review-count";
            count.textContent = countText;
            head.appendChild(title);
            head.appendChild(count);
            fragment.appendChild(head);
            var note = document.createElement("p");
            note.className = "review-section-note";
            note.textContent = noteText;
            fragment.appendChild(note);
            return fragment;
          }

          var attemptedSection = document.createElement("section");
          attemptedSection.className = "review-section";
          attemptedSection.appendChild(makeSectionHead(
            "Attempted",
            attempted.length + (attempted.length === 1 ? " question" : " questions"),
            "Your answer, the correct answer, and the explanation for every question you answered."
          ));

          if (!attempted.length) {
            var noneAttempted = document.createElement("div");
            noneAttempted.className = "empty-note";
            noneAttempted.textContent = "You did not answer any questions in this exam.";
            attemptedSection.appendChild(noneAttempted);
          }

          attempted.forEach(function (entry) {
            var ref = entry.ref;
            var pos = entry.pos;
            var item = entry.item;
            var chosen = entry.chosen;
            var card = document.createElement("article");
            card.className = "review-all-card";
            var num = document.createElement("div");
            num.className = "qnum";
            num.textContent = "Question " + (pos + 1) + " of " + quiz.order.length + " · " + item.subject;
            var question = document.createElement("p");
            question.className = "qtext";
            question.style.marginBottom = "10px";
            question.textContent = item.q;
            var yours = document.createElement("p");
            yours.className = "review-answer " + (chosen === item.answer ? "user-correct" : "user-wrong");
            var yourStrong = document.createElement("strong");
            yourStrong.textContent = "Your answer: ";
            yours.appendChild(yourStrong);
            yours.appendChild(document.createTextNode((LETTERS[chosen] || "") + ". " + item.options[chosen]));
            var correct = document.createElement("p");
            correct.className = "review-answer user-correct";
            var correctStrong = document.createElement("strong");
            correctStrong.textContent = "Correct answer: ";
            correct.appendChild(correctStrong);
            correct.appendChild(document.createTextNode((LETTERS[item.answer] || "") + ". " + item.options[item.answer]));
            var explain = document.createElement("div");
            explain.className = "explain show";
            var ehead = document.createElement("div");
            ehead.className = "ehead";
            ehead.textContent = "Explanation";
            var ebody = document.createElement("div");
            ebody.className = "ebody";
            ebody.textContent = item.explanation;
            var source = document.createElement("div");
            source.className = "source-line";
            var sourceStrong = document.createElement("strong");
            sourceStrong.textContent = "Source: ";
            source.appendChild(sourceStrong);
            source.appendChild(document.createTextNode(item.source));
            explain.appendChild(ehead);
            explain.appendChild(ebody);
            explain.appendChild(source);
            var chLine = document.createElement("div");
            chLine.className = "source-line";
            var chStrong = document.createElement("strong");
            chStrong.textContent = "Chapter: ";
            chLine.appendChild(chStrong);
            chLine.appendChild(document.createTextNode(chapterLabel(item)));
            explain.appendChild(chLine);
            var paperText = paperLineText(ref, item, false);
            card.appendChild(num);
            card.appendChild(question);
            card.appendChild(yours);
            card.appendChild(correct);
            card.appendChild(explain);
            if (paperText) {
              var paper = document.createElement("div");
              paper.className = "paper-line";
              paper.textContent = paperText;
              card.appendChild(paper);
            }
            attemptedSection.appendChild(card);
          });
          els.fullReview.appendChild(attemptedSection);

          var notAttemptedSection = document.createElement("section");
          notAttemptedSection.className = "review-section";
          notAttemptedSection.appendChild(makeSectionHead(
            "Not attempted",
            notAttempted.length + (notAttempted.length === 1 ? " question" : " questions"),
            notAttempted.length
              ? "Correct answers and explanations are hidden. Attempt these questions to reveal them in Learning Mode."
              : "You attempted every question in this exam."
          ));

          notAttempted.forEach(function (entry) {
            var card = document.createElement("article");
            card.className = "review-all-card not-attempted";
            var label = document.createElement("span");
            label.className = "not-attempted-label";
            label.textContent = "Not attempted";
            var question = document.createElement("p");
            question.className = "qtext";
            question.style.margin = "0";
            question.textContent = entry.item.q;
            card.appendChild(label);
            card.appendChild(question);
            notAttemptedSection.appendChild(card);
          });

          if (notAttempted.length) {
            var attemptNow = document.createElement("button");
            attemptNow.type = "button";
            attemptNow.className = "btn primary attempt-now-btn";
            attemptNow.textContent = "Attempt these now";
            attemptNow.addEventListener("click", function () {
              launchLearningReview(notAttempted.map(function (entry) { return entry.ref; }));
            });
            notAttemptedSection.appendChild(attemptNow);
          }
          els.fullReview.appendChild(notAttemptedSection);
        }

        function launchLearningReview(refs) {
          if (!refs.length) return;
          quiz = {
            title: "Not attempted · Learning review",
            order: refs.slice(),
            pos: 0,
            chosen: {},
            timeLeft: {},
            timerSeconds: 0,
            feedbackMode: "immediate"
          };
          pendingQuiz = null;
          show("viewQuiz");
          renderQuestion();
        }

        function showResults() {
          var c = counts();
          var total = quiz.order.length;
          var pct = total ? Math.round((c.correct / total) * 100) : 0;
          var acc = c.attempted ? Math.round((c.correct / c.attempted) * 100) : 0;
          var examMode = quiz.feedbackMode === "end";
          els.resultTopic.textContent = quiz.title;
          els.resultPct.textContent = (examMode ? acc : pct) + "%";
          els.resultPctLabel.textContent = examMode
            ? "accuracy across attempted questions"
            : "of all questions in this quiz correct";
          els.statTotal.textContent = total;
          els.statAttempted.textContent = c.attempted;
          els.statCorrect.textContent = c.correct;
          els.statWrong.textContent = c.wrong;
          els.statAccuracy.textContent = acc + "%";
          els.statSkipped.textContent = total - c.attempted;
          var msg;
          if (c.attempted === 0) msg = "No questions attempted yet — give it a try!";
          else if (acc >= 90) msg = "Excellent work — keep it up!";
          else if (acc >= 70) msg = "Good going — review your mistakes to push higher.";
          else if (acc >= 50) msg = "Fair attempt — the mistakes review below will help.";
          else msg = "Don't give up — review each mistake and try again.";
          els.resultMsg.textContent = msg;
          els.resultBreakdown.hidden = !examMode;
          els.fullReview.hidden = !examMode;
          if (examMode) {
            renderExamBreakdown();
            renderFullReview();
          } else {
            els.resultBreakdown.innerHTML = "";
            els.fullReview.innerHTML = "";
          }
          els.reviewBtn.disabled = c.wrong === 0;
          els.reviewBtn.textContent = c.wrong === 0
            ? "No mistakes to review"
            : "Review my mistakes (" + c.wrong + ")";
          els.retryResultMistakesBtn.disabled = c.wrong === 0;
          els.retryResultMistakesBtn.textContent = c.wrong === 0
            ? "No mistakes to revise"
            : "Revise my mistakes as a quiz (" + c.wrong + ")";
          if (els.downloadResultMistakesBtn) {
            els.downloadResultMistakesBtn.textContent = mistakeKeys.length
              ? "Download My Mistakes (" + mistakeKeys.length + ")"
              : "Download My Mistakes";
          }
          if (els.downloadNoteResult) els.downloadNoteResult.textContent = "";
          show("viewResult");
        }

        els.retryResultMistakesBtn.addEventListener("click", function () {
          var refs = [];
          quiz.order.forEach(function (ref, pos) {
            var chosen = quiz.chosen[pos];
            if (chosen !== undefined && chosen !== -1 && chosen !== itemOf(ref).answer) refs.push(ref);
          });
          startQuiz("My mistakes · Revise", refs);
        });
        els.restartBtn.addEventListener("click", function () {
          startQuiz(quiz.title, quiz.order.slice());
        });
        els.changeTopicBtn.addEventListener("click", function () {
          quiz = null;
          show("viewHome");
        });

        /* ---------------- review this quiz's mistakes ---------------- */
        var quizMistakes = []; // positions in quiz.order answered incorrectly
        var rPos = 0;

        els.reviewBtn.addEventListener("click", function () {
          quizMistakes = [];
          quiz.order.forEach(function (ref, pos) {
            var chosen = quiz.chosen[pos];
            if (chosen !== undefined && chosen !== -1 && chosen !== itemOf(ref).answer) {
              quizMistakes.push(pos);
            }
          });
          quizMistakes.sort(function (a, b) { return a - b; });
          rPos = 0;
          show("viewReview");
          renderReview();
        });

        function renderReview() {
          var pos = quizMistakes[rPos];
          var ref = quiz.order[pos];
          var item = itemOf(ref);
          var chosen = quiz.chosen[pos];
          els.reviewSub.textContent =
            quiz.title + " · " + item.subject + (ref.b === "p" ? " · Practice" : " · Past paper");
          els.rNum.textContent = "Mistake " + (rPos + 1) + " of " + quizMistakes.length;
          els.rText.textContent = item.q;
          els.rOptions.innerHTML = "";
          item.options.forEach(function (optText, oi) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "opt";
            btn.disabled = true;
            var chip = document.createElement("span");
            chip.className = "chip";
            chip.textContent = LETTERS[oi] || String(oi + 1);
            var label = document.createElement("span");
            label.textContent = optText;
            btn.appendChild(chip);
            btn.appendChild(label);
            var verdict = document.createElement("span");
            verdict.className = "verdict";
            btn.appendChild(verdict);
            if (oi === item.answer) {
              btn.classList.add("is-correct");
              verdict.innerHTML = CHECK_SVG;
            }
            if (oi === chosen && chosen !== item.answer) {
              btn.classList.add("is-wrong");
              verdict.innerHTML = CROSS_SVG;
            }
            els.rOptions.appendChild(btn);
          });
          els.rAns.textContent =
            "Correct answer: " + (LETTERS[item.answer] || "") + ". " + item.options[item.answer] + " —";
          els.rText2.textContent = item.explanation;
          els.rSource.innerHTML = "";
          var srcStrong = document.createElement("strong");
          srcStrong.textContent = "Source: ";
          els.rSource.appendChild(srcStrong);
          els.rSource.appendChild(document.createTextNode(item.source));
          els.rChapter.innerHTML = "";
          var rChStrong = document.createElement("strong");
          rChStrong.textContent = "Chapter: ";
          els.rChapter.appendChild(rChStrong);
          els.rChapter.appendChild(document.createTextNode(chapterLabel(item)));
          var reviewPaperText = paperLineText(ref, item, true);
          els.rPaper.textContent = reviewPaperText;
          els.rPaper.hidden = !reviewPaperText;
          els.rPrevBtn.disabled = rPos === 0;
          els.rNextBtn.disabled = rPos === quizMistakes.length - 1;
        }

        els.rPrevBtn.addEventListener("click", function () {
          if (rPos > 0) { rPos--; renderReview(); window.scrollTo(0, 0); }
        });
        els.rNextBtn.addEventListener("click", function () {
          if (rPos < quizMistakes.length - 1) { rPos++; renderReview(); window.scrollTo(0, 0); }
        });
        els.backToResultBtn.addEventListener("click", function () {
          show("viewResult");
        });

        /* ---------------- download my mistakes ---------------- */
        function escapeHtml(str) {
          return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function refsFromMistakeKeys() {
          return mistakeKeys.map(function (key) {
            var parts = key.split(":");
            return { b: parts[0], i: Number(parts[1]), key: key };
          });
        }

        function buildMistakesHTML() {
          var refs = refsFromMistakeKeys();
          var total = refs.length;
          var today = new Date();
          var dateStr = today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
          var parts = [];
          parts.push("<!DOCTYPE html>");
          parts.push('<html lang="en"><head><meta charset="utf-8">');
          parts.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
          parts.push("<title>FMU Past Papers Quiz — My Mistakes</title>");
          parts.push("<style>");
          parts.push("body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:0;background:#f5f2ea;color:#17322d;line-height:1.55;}");
          parts.push(".wrap{max-width:760px;margin:0 auto;padding:24px 16px 40px;}");
          parts.push("h1{font-family:Georgia,serif;font-size:26px;margin:0 0 4px;color:#07362f;}");
          parts.push(".credit{font-size:14px;color:#5d726b;margin:0 0 18px;}");
          parts.push(".credit strong{color:#17322d;}");
          parts.push(".meta{font-size:13.5px;color:#5d726b;margin:0 0 20px;}");
          parts.push("h2{font-family:Georgia,serif;font-size:20px;border-bottom:2px solid #d9ab2d;padding-bottom:6px;margin:26px 0 12px;color:#07362f;}");
          parts.push(".card{background:#fffdf7;border:1px solid #ddd3bd;border-radius:12px;padding:16px 16px 14px;margin:0 0 14px;}");
          parts.push(".tag{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#0b4f47;margin:0 0 6px;}");
          parts.push(".q{font-size:16.5px;font-weight:600;margin:0 0 12px;}");
          parts.push(".opts{list-style:none;margin:0 0 12px;padding:0;}");
          parts.push(".opts li{border:1.5px solid #ddd3bd;border-radius:10px;padding:10px 12px;margin:0 0 8px;background:#fffdf7;font-size:15px;}");
          parts.push(".opts li.correct{border-color:#177245;background:#e0f1e4;}");
          parts.push(".opts li.wrong{border-color:#b02e26;background:#fbe7e2;}");
          parts.push(".badge{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 8px;margin-left:8px;vertical-align:middle;}");
          parts.push(".badge.ok{background:#177245;color:#fff;}");
          parts.push(".badge.no{background:#b02e26;color:#fff;}");
          parts.push(".explain{background:#efe9db;border:1px solid #d9ab2d;border-left:5px solid #d9ab2d;border-radius:10px;padding:12px 14px;font-size:15px;}");
          parts.push(".explain h3{margin:0 0 6px;font-size:13px;letter-spacing:.05em;text-transform:uppercase;color:#b98a12;}");
          parts.push(".source{margin-top:10px;padding-top:8px;border-top:1px dashed #ddd3bd;font-size:13.5px;color:#5d726b;}");
          parts.push(".from{margin-top:10px;font-size:13.5px;color:#5d726b;}");
          parts.push(".your{font-size:14px;font-weight:600;color:#b02e26;margin:0 0 10px;}");
          parts.push("footer{margin-top:28px;padding-top:14px;border-top:1px solid #ddd3bd;font-size:13.5px;color:#5d726b;text-align:center;}");
          parts.push("@media print{body{background:#fff;}.wrap{max-width:none;padding:12px;}.card{break-inside:avoid;box-shadow:none;}}");
          parts.push("</style></head><body><div class=\"wrap\">");
          parts.push("<h1>FMU Past Papers Quiz &mdash; My Mistakes</h1>");
          parts.push('<p class="credit">Developed by <strong>Habib Ullah</strong> &mdash; 1st Year MBBS Student, FMU</p>');
          parts.push('<p class="meta">' + escapeHtml(total + (total === 1 ? " question" : " questions") + " to revise &middot; Downloaded " + dateStr) + "</p>");

          SUBJECTS.forEach(function (subject) {
            var group = refs.filter(function (ref) { return itemOf(ref).subject === subject; });
            if (!group.length) return;
            parts.push("<h2>" + escapeHtml(subject) + " <span style=\"font-size:13px;color:#5d726b;font-weight:600;\">" + group.length + (group.length === 1 ? " question" : " questions") + "</span></h2>");
            group.forEach(function (ref, idx) {
              var item = itemOf(ref);
              var pick = mistakePicks[ref.key];
              if (typeof pick !== "number") pick = -1;
              var typeTag = (ref.b === "p" ? "Practice MCQ" : "Past paper");
              parts.push('<div class="card">');
              parts.push('<p class="tag">' + escapeHtml(subject + " · " + typeTag) + "</p>");
              parts.push('<p class="q">' + (idx + 1) + ". " + escapeHtml(item.q) + "</p>");
              if (pick === -1) {
                parts.push('<p class="your">Timed out &mdash; no answer selected.</p>');
              } else if (pick !== item.answer) {
                parts.push('<p class="your">Your answer: ' + escapeHtml((LETTERS[pick] || "") + ". " + (item.options[pick] || "")) + "</p>");
              }
              parts.push('<ul class="opts">');
              item.options.forEach(function (optText, oi) {
                var cls = "";
                var badge = "";
                if (oi === item.answer) { cls = "correct"; badge = '<span class="badge ok">&#10003; Correct</span>'; }
                else if (oi === pick) { cls = "wrong"; badge = '<span class="badge no">&#10007; Your answer</span>'; }
                parts.push("<li" + (cls ? ' class="' + cls + '"' : "") + "><strong>" + escapeHtml(LETTERS[oi] || String(oi + 1)) + ".</strong> " + escapeHtml(optText) + badge + "</li>");
              });
              parts.push("</ul>");
              parts.push('<div class="explain"><h3>Explanation</h3><p style="margin:0;"><strong>Correct answer: ' + escapeHtml((LETTERS[item.answer] || "") + ". " + (item.options[item.answer] || "")) + "</strong> &mdash; " + escapeHtml(item.explanation) + '</p><div class="source"><strong>Source:</strong> ' + escapeHtml(item.source) + "</div></div>");
              var fromText = paperLineText(ref, item, false);
              if (fromText) parts.push('<div class="from">' + escapeHtml(fromText) + "</div>");
              parts.push("</div>");
            });
          });

          // Any subjects outside the main list (safety net)
          var extra = refs.filter(function (ref) { return SUBJECTS.indexOf(itemOf(ref).subject) === -1; });
          if (extra.length) {
            parts.push("<h2>Other</h2>");
            extra.forEach(function (ref, idx) {
              var item = itemOf(ref);
              var pick = mistakePicks[ref.key];
              if (typeof pick !== "number") pick = -1;
              parts.push('<div class="card">');
              parts.push('<p class="tag">' + escapeHtml(item.subject) + "</p>");
              parts.push('<p class="q">' + (idx + 1) + ". " + escapeHtml(item.q) + "</p>");
              if (pick === -1) parts.push('<p class="your">Timed out &mdash; no answer selected.</p>');
              parts.push('<ul class="opts">');
              item.options.forEach(function (optText, oi) {
                var cls = oi === item.answer ? "correct" : (oi === pick ? "wrong" : "");
                var badge = oi === item.answer ? '<span class="badge ok">&#10003; Correct</span>' : (oi === pick ? '<span class="badge no">&#10007; Your answer</span>' : "");
                parts.push("<li" + (cls ? ' class="' + cls + '"' : "") + "><strong>" + escapeHtml(LETTERS[oi] || String(oi + 1)) + ".</strong> " + escapeHtml(optText) + badge + "</li>");
              });
              parts.push("</ul>");
              parts.push('<div class="explain"><h3>Explanation</h3><p style="margin:0;"><strong>Correct answer: ' + escapeHtml((LETTERS[item.answer] || "") + ". " + (item.options[item.answer] || "")) + "</strong> &mdash; " + escapeHtml(item.explanation) + '</p><div class="source"><strong>Source:</strong> ' + escapeHtml(item.source) + "</div></div>");
              var fromText = paperLineText(ref, item, false);
              if (fromText) parts.push('<div class="from">' + escapeHtml(fromText) + "</div>");
              parts.push("</div>");
            });
          }

          parts.push("<footer>FMU Past Papers Quiz &mdash; keep revising these until they stick.</footer>");
          parts.push("</div></body></html>");
          return parts.join("\n");
        }

        function downloadMyMistakes(noteEl) {
          if (!mistakeKeys.length) {
            if (noteEl) noteEl.textContent = "No mistakes yet in this visit \u2014 attempt a quiz first";
            return;
          }
          if (noteEl) noteEl.textContent = "Preparing your download\u2026";
          try {
            var html = buildMistakesHTML();
            var blob = new Blob([html], { type: "text/html;charset=utf-8" });
            var url = (window.URL && window.URL.createObjectURL) ? window.URL.createObjectURL(blob) : null;
            var a = document.createElement("a");
            a.download = "FMU-My-Mistakes.html";
            if (url) {
              a.href = url;
            } else {
              a.href = "data:text/html;charset=utf-8," + encodeURIComponent(html);
            }
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (url) {
              setTimeout(function () {
                try { window.URL.revokeObjectURL(url); } catch (e) {}
              }, 800);
            }
            if (noteEl) noteEl.textContent = "Downloaded \u2014 check your downloads folder for FMU-My-Mistakes.html";
          } catch (err) {
            if (noteEl) noteEl.textContent = "Download could not start in this browser \u2014 try again, or open My Mistakes and retry.";
          }
        }

        if (els.downloadResultMistakesBtn) {
          els.downloadResultMistakesBtn.addEventListener("click", function () {
            downloadMyMistakes(els.downloadNoteResult);
          });
        }
        if (els.downloadMistakesBtn) {
          els.downloadMistakesBtn.addEventListener("click", function () {
            downloadMyMistakes(els.downloadNoteMistakes);
          });
        }

        /* ---------------- my mistakes ---------------- */
        function renderMistakes() {
          var refs = mistakeKeys.map(function (key) {
            var parts = key.split(":");
            return { b: parts[0], i: Number(parts[1]) };
          });
          els.mistakesSub.textContent = refs.length === 0
            ? "Questions you answer wrong — or run out of time on — collect here, grouped by subject, so you can focus on exactly what tripped you up."
            : refs.length + (refs.length === 1 ? " question" : " questions") + " saved from your quizzes, grouped by subject.";
          els.retryMistakesBtn.disabled = refs.length === 0;
          els.retryMistakesBtn.textContent = refs.length === 0
            ? "Retry these as a quiz"
            : "Retry these as a quiz (" + refs.length + ")";
          if (els.downloadMistakesBtn) {
            els.downloadMistakesBtn.textContent = refs.length === 0
              ? "Download My Mistakes"
              : "Download My Mistakes (" + refs.length + ")";
          }
          if (els.downloadNoteMistakes) els.downloadNoteMistakes.textContent = "";
          els.clearMistakesBtn.disabled = refs.length === 0;
          els.mistakesList.innerHTML = "";

          if (refs.length === 0) {
            var empty = document.createElement("div");
            empty.className = "empty-note";
            empty.textContent = "No mistakes saved yet. Start any quiz — anything you get wrong will appear here.";
            els.mistakesList.appendChild(empty);
            return;
          }

          SUBJECTS.forEach(function (subject) {
            var group = refs.filter(function (ref) { return itemOf(ref).subject === subject; });
            if (!group.length) return;
            var head = document.createElement("div");
            head.className = "subject-head serif";
            head.appendChild(document.createTextNode(subject));
            var tot = document.createElement("span");
            tot.className = "subject-total";
            tot.textContent = group.length + (group.length === 1 ? " question" : " questions");
            head.appendChild(tot);
            els.mistakesList.appendChild(head);

            group.forEach(function (ref) {
              var item = itemOf(ref);
              var card = document.createElement("div");
              card.className = "qcard mistake-item";
              var tag = document.createElement("div");
              tag.className = "mtag";
              tag.textContent = subject + (ref.b === "p" ? " · Practice MCQ" : " · Past paper");
              var qt = document.createElement("p");
              qt.className = "qtext";
              qt.style.marginBottom = "14px";
              qt.textContent = item.q;
              var opts = document.createElement("div");
              opts.className = "options";
              item.options.forEach(function (optText, oi) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "opt";
                btn.disabled = true;
                var chip = document.createElement("span");
                chip.className = "chip";
                chip.textContent = LETTERS[oi] || String(oi + 1);
                var label = document.createElement("span");
                label.textContent = optText;
                btn.appendChild(chip);
                btn.appendChild(label);
                var verdict = document.createElement("span");
                verdict.className = "verdict";
                btn.appendChild(verdict);
                if (oi === item.answer) {
                  btn.classList.add("is-correct");
                  verdict.innerHTML = CHECK_SVG;
                }
                opts.appendChild(btn);
              });
              var ex = document.createElement("div");
              ex.className = "explain";
              var eh = document.createElement("div");
              eh.className = "ehead";
              eh.textContent = "Explanation";
              var eb = document.createElement("div");
              eb.className = "ebody";
              var ea = document.createElement("span");
              ea.className = "eans";
              ea.textContent = "Correct answer: " + (LETTERS[item.answer] || "") + ". " + item.options[item.answer] + " —";
              eb.appendChild(ea);
              eb.appendChild(document.createTextNode(" " + item.explanation));
              var sl = document.createElement("div");
              sl.className = "source-line";
              var ss2 = document.createElement("strong");
              ss2.textContent = "Source: ";
              sl.appendChild(ss2);
              sl.appendChild(document.createTextNode(item.source));
              ex.appendChild(eh);
              ex.appendChild(eb);
              ex.appendChild(sl);
              var chLine = document.createElement("div");
              chLine.className = "source-line";
              var chStrong = document.createElement("strong");
              chStrong.textContent = "Chapter: ";
              chLine.appendChild(chStrong);
              chLine.appendChild(document.createTextNode(chapterLabel(item)));
              ex.appendChild(chLine);
              var mistakePaperText = paperLineText(ref, item, false);
              if (mistakePaperText) {
                var paperLine = document.createElement("div");
                paperLine.className = "paper-line";
                paperLine.textContent = mistakePaperText;
                ex.appendChild(paperLine);
              }
              card.appendChild(tag);
              card.appendChild(qt);
              card.appendChild(opts);
              card.appendChild(ex);
              els.mistakesList.appendChild(card);
            });
          });
        }

        els.retryMistakesBtn.addEventListener("click", function () {
          var refs = mistakeKeys.map(function (key) {
            var parts = key.split(":");
            return { b: parts[0], i: Number(parts[1]) };
          });
          startQuiz("My Mistakes · Retry", refs);
        });

        var clearArmed = false;
        els.clearMistakesBtn.addEventListener("click", function () {
          if (!clearArmed) {
            clearArmed = true;
            els.clearMistakesBtn.textContent = "Tap again to confirm clear";
            setTimeout(function () {
              clearArmed = false;
              els.clearMistakesBtn.textContent = "Clear all mistakes";
            }, 3000);
            return;
          }
          clearArmed = false;
          els.clearMistakesBtn.textContent = "Clear all mistakes";
          mistakeKeys = [];
          mistakeSet = {};
          mistakePicks = {};
          renderMistakes();
          saveProgress();
        });
        els.mistakesHomeBtn.addEventListener("click", function () { show("viewHome"); });

        /* ---------------- my stats ---------------- */
        function renderStats() {
          els.stAttempted.textContent = stats.attempted;
          els.stCorrect.textContent = stats.correct;
          els.stWrong.textContent = stats.wrong;
          els.stAccuracy.textContent = stats.attempted
            ? Math.round((stats.correct / stats.attempted) * 100) + "%"
            : "0%";
          els.statsBySubject.innerHTML = "";
          SUBJECTS.forEach(function (subject) {
            var s = stats.bySubject[subject] || { attempted: 0, correct: 0, wrong: 0 };
            var acc = s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0;
            var row = document.createElement("div");
            row.className = "stat-row " + subjectClass(subject);
            var head = document.createElement("div");
            head.className = "sr-head";
            var nm = document.createElement("span");
            nm.className = "sr-name";
            nm.textContent = subject;
            var nums = document.createElement("span");
            nums.className = "sr-nums";
            nums.textContent = s.attempted === 0
              ? "not attempted yet"
              : s.correct + " / " + s.attempted + " correct · " + acc + "%";
            head.appendChild(nm);
            head.appendChild(nums);
            var track = document.createElement("div");
            track.className = "track";
            var fill = document.createElement("div");
            fill.className = "fill " + subjectClass(subject);
            fill.style.width = acc + "%";
            track.appendChild(fill);
            row.appendChild(head);
            row.appendChild(track);
            els.statsBySubject.appendChild(row);
          });
          els.statsByPaper.innerHTML = "";
          PAPER_NAMES.forEach(function (paper) {
            var s = stats.byPaper[paper] || { attempted: 0, correct: 0, wrong: 0 };
            var acc = s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0;
            var row = document.createElement("div");
            row.className = "stat-row";
            var head = document.createElement("div");
            head.className = "sr-head";
            var nm = document.createElement("span");
            nm.className = "sr-name";
            nm.textContent = paper;
            var nums = document.createElement("span");
            nums.className = "sr-nums";
            nums.textContent = s.attempted === 0 ? "not attempted yet" : s.correct + " / " + s.attempted + " · " + acc + "%";
            head.appendChild(nm);
            head.appendChild(nums);
            var track = document.createElement("div");
            track.className = "track";
            var fill = document.createElement("div");
            fill.className = "fill";
            fill.style.width = acc + "%";
            track.appendChild(fill);
            row.appendChild(head);
            row.appendChild(track);
            els.statsByPaper.appendChild(row);
          });
        }

        var resetArmed = false;
        els.resetStatsBtn.addEventListener("click", function () {
          if (!resetArmed) {
            resetArmed = true;
            els.resetStatsBtn.textContent = "Tap again to confirm reset";
            setTimeout(function () {
              resetArmed = false;
              els.resetStatsBtn.textContent = "Reset stats";
            }, 3000);
            return;
          }
          resetArmed = false;
          els.resetStatsBtn.textContent = "Reset stats";
          stats = freshStats();
          renderStats();
          saveProgress();
        });
        els.statsHomeBtn.addEventListener("click", function () { show("viewHome"); });

        /* ---------------- send a review ---------------- */
        function reviewPayload() {
          var name = els.reviewName.value.trim();
          var text = els.reviewText.value.trim();
          if (!text) return "";
          return (name ? "Name: " + name + "\n" : "") + "Review: " + text;
        }

        els.copyReviewBtn.addEventListener("click", function () {
          var text = reviewPayload();
          if (!text) {
            els.copyNote.textContent = "Write your review first, then copy it.";
            els.reviewText.focus();
            return;
          }
          function done() {
            els.copyNote.textContent = "Copied — now tap “Send via Instagram” and paste it in the chat.";
          }
          function fallback() {
            els.reviewText.focus();
            els.reviewText.select();
            try { document.execCommand("copy"); } catch (e) {}
            done();
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fallback);
          } else {
            fallback();
          }
        });
        els.sendHomeBtn.addEventListener("click", function () { show("viewHome"); });

        els.copyEmailBtn.addEventListener("click", function () {
          var addr = "hurookhan80@gmail.com";
          function done() {
            els.emailCopyNote.textContent = "Email address copied — paste it in your Gmail/mail app";
          }
          function fallback() {
            var ta = document.createElement("textarea");
            ta.value = addr;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy"); } catch (e) {}
            document.body.removeChild(ta);
            done();
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(addr).then(done, fallback);
          } else {
            fallback();
          }
        });

        /* ---------------- welcome, home, and graceful exit ---------------- */
        var farewellBackdrop = document.getElementById("farewellBackdrop");
        var farewellReviewBtn = document.getElementById("farewellReviewBtn");
        var farewellLeaveBtn = document.getElementById("farewellLeaveBtn");
        var exitGuardArmed = false;
        var farewellShown = false;
        var leavingApproved = false;

        function armExitGuard() {
          if (exitGuardArmed) return;
          exitGuardArmed = true;
          try { window.history.pushState({ fmuQuizExitGuard: true }, ""); } catch (e) {}
        }
        function showFarewell() {
          if (farewellShown) return;
          farewellShown = true;
          farewellBackdrop.hidden = false;
          farewellReviewBtn.focus();
        }
        window.addEventListener("popstate", function () {
          if (leavingApproved) return;
          if (currentViewId === "viewHome" && !farewellShown) {
            try { window.history.pushState({ fmuQuizExitGuard: true }, ""); } catch (e) {}
            showFarewell();
          }
        });
        window.addEventListener("beforeunload", function (event) {
          if (currentViewId !== "viewHome" || farewellShown || leavingApproved) return;
          farewellShown = true;
          event.preventDefault();
          event.returnValue = "";
        });
        farewellReviewBtn.addEventListener("click", function () {
          farewellBackdrop.hidden = true;
        });
        farewellLeaveBtn.addEventListener("click", function () {
          leavingApproved = true;
          farewellBackdrop.hidden = true;
          try { window.history.go(-2); } catch (e) { window.history.back(); }
        });

        function setWelcomeStep(stepNumber) {
          [els.welcomeStep1, els.welcomeStep2, els.welcomeStep3].forEach(function (step, index) {
            var active = index === stepNumber - 1;
            step.classList.toggle("active", active);
            step.setAttribute("aria-hidden", active ? "false" : "true");
          });
          window.scrollTo(0, 0);
          var heading = document.getElementById("welcomeHeading" + stepNumber);
          if (heading) heading.focus({ preventScroll: true });
        }
        function enterQuizMenu() {
          show("viewHome");
          armExitGuard();
        }
        els.welcomeNextOne.addEventListener("click", function () { setWelcomeStep(2); });
        els.welcomeNextTwo.addEventListener("click", function () { setWelcomeStep(3); });
        els.welcomeSkipOne.addEventListener("click", enterQuizMenu);
        els.welcomeSkipTwo.addEventListener("click", enterQuizMenu);
        els.welcomeSkipThree.addEventListener("click", enterQuizMenu);
        els.welcomeStartBtn.addEventListener("click", enterQuizMenu);
        els.homeBtn.addEventListener("click", function () {
          quiz = null;
          pendingQuiz = null;
          show("viewHome");
          armExitGuard();
        });

        refreshHomeCounts();
      })();
