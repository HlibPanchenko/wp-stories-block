document.addEventListener("DOMContentLoaded", () => {
    const blocks = document.querySelectorAll('.wp-stories-block[data-wpstb="1"]');
    if (!blocks.length) return;

    const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (IS_MOBILE) document.body.classList.add("mobile");

    blocks.forEach((block) => initStoriesBlock(block));

    function initStoriesBlock(block) {
        const timeline = block.querySelector("[data-wpstb-timeline]");
        const modal = block.querySelector("[data-wpstb-modal]");
        if (!timeline || !modal) return;

        // DOM
        const outer = modal.querySelector(".daily-stories__outer");
        const slidesWrap = modal.querySelector("[data-wpstb-slides]");
        const barsWrap = modal.querySelector("[data-wpstb-bars]");
        const prevBtn = modal.querySelector("[data-wpstb-prev]");
        const nextBtn = modal.querySelector("[data-wpstb-next]");
        const toggleBtn = modal.querySelector("[data-wpstb-toggle]");
        const closeBtns = modal.querySelectorAll("[data-wpstb-close]");

        const nameEl = modal.querySelector("[data-wpstb-name]");
        const profileLinkEl = modal.querySelector("[data-wpstb-profile-link]");

        if (!outer || !slidesWrap || !barsWrap) return;

        // State
        let storyNodes = [];
        let currentStoryIndex = -1;

        let slides = [];
        let bars = [];
        let timeouts = [];
        let entryUrl = null;

        let containerWidth = 1;
        let currentIndex = 0;

        // autoplay state
        let timer = null;
        let isHoldPaused = false;
        let slideStartTs = 0;
        let remainingMs = 0;

        // swipe/hold state
        let pointerDown = false;
        let isDragging = false;
        let dragOffset = 0;
        let startX = 0;
        let startY = 0;
        let holdTimer = null;

        const SWIPE_MIN_PX = 20;
        const SWIPE_MAX_Y = 30;
        const HOLD_DELAY_MS = 180;

        bindEvents();

        // ---------------------------
        // Events
        // ---------------------------
        function bindEvents() {
            // open by click on story
            timeline.addEventListener("click", onTimelineClick);

            // controls
            if (prevBtn) prevBtn.addEventListener("click", (e) => { e.preventDefault(); prev(); });
            if (nextBtn) nextBtn.addEventListener("click", (e) => { e.preventDefault(); next(); });
            if (toggleBtn) toggleBtn.addEventListener("click", (e) => { e.preventDefault(); togglePlayPause(); });

            if (closeBtns && closeBtns.length) {
                closeBtns.forEach((btn) => btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    closeModal();
                }));
            }

            // backdrop click (если у тебя реально кликается modal wrapper)
            modal.addEventListener("click", (e) => {
                if (e.target === modal) closeModal();
            });

            // keyboard
            document.addEventListener("keydown", (e) => {
                if (modal.hidden) return;
                if (e.key === "Escape") closeModal();
                if (e.key === "ArrowRight") next();
                if (e.key === "ArrowLeft") prev();
            });

            // resize
            window.addEventListener("resize", () => {
                if (modal.hidden) return;
                initSizes();
            });

            // swipe + hold
            outer.addEventListener("pointerdown", onPointerDown, { passive: true });
            outer.addEventListener("pointermove", onPointerMove, { passive: true });
            outer.addEventListener("pointerup", finishPointer, { passive: true });
            outer.addEventListener("pointercancel", finishPointer, { passive: true });
            outer.addEventListener("pointerleave", finishPointer, { passive: true });
        }

        function onTimelineClick(e) {
            const link = e.target.closest(".item-link");
            if (!link) return;

            const story = link.closest(".story");
            if (!story) return;

            e.preventDefault();

            storyNodes = Array.from(timeline.querySelectorAll(".story"));
            const idx = storyNodes.indexOf(story);
            currentStoryIndex = idx >= 0 ? idx : 0;

            if (!openStoryByIndex(currentStoryIndex)) return;
            openModal();
        }

        // ---------------------------
        // Modal open/close
        // ---------------------------
        function openModal() {
            modal.hidden = false;
            modal.classList.add("is-open");
            lockScroll();

            requestAnimationFrame(() => {
                initSizes();
                setActive(0);
                autoplay();
            });
        }

        function closeModal() {
            clearTimer();
            clearHoldTimer();
            stopVideo();

            isHoldPaused = false;
            document.body.classList.remove("paused");

            modal.classList.remove("is-open");
            modal.hidden = true;
            unlockScroll();

            slidesWrap.innerHTML = "";
            barsWrap.innerHTML = "";

            slides = [];
            bars = [];
            timeouts = [];
            currentIndex = 0;

            entryUrl = null;
            currentStoryIndex = -1;
        }

        function lockScroll() {
            document.documentElement.style.overflow = "hidden";
            document.body.style.overflow = "hidden";
        }

        function unlockScroll() {
            document.documentElement.style.overflow = "";
            document.body.style.overflow = "";
        }

        // ---------------------------
        // Layout / translate
        // ---------------------------
        function initSizes() {
            containerWidth = outer.clientWidth || 1;
            slidesWrap.style.width = `${containerWidth * slides.length}px`;
            slides.forEach((s) => (s.style.width = `${containerWidth}px`));
            translateTo(currentIndex);
        }

        function translateTo(i) {
            const dist = -(i * containerWidth);
            slidesWrap.style.transform = `translate3d(${dist}px,0,0)`;
        }

        function setDragging(on) {
            isDragging = on;
            slidesWrap.style.transition = on ? "none" : "";
        }

        function dragTo(offsetPx) {
            const base = -(currentIndex * containerWidth);
            slidesWrap.style.transform = `translate3d(${base + offsetPx}px,0,0)`;
        }

        // ---------------------------
        // Slides / bars
        // ---------------------------
        function setActive(i) {
            currentIndex = i;
            translateTo(i);
            setSlideActive(i);
            setBarActive(i);
            updateHeader();
        }

        function setSlideActive(i) {
            slides.forEach((el) => el.classList.remove("active"));
            if (slides[i]) slides[i].classList.add("active");

            stopVideo();
            playVideo();
        }

        function setBarActive(i) {
            bars.forEach((bar, idx) => {
                if (idx < i) {
                    bar.classList.add("seen");
                    bar.classList.remove("animate");
                } else {
                    bar.classList.remove("seen");
                    bar.classList.remove("animate");
                }
            });

            if (bars[i]) bars[i].classList.add("animate");
        }

        function updateHeader() {
            if (nameEl) {
                const title = storyNodes[currentStoryIndex]?.querySelector(".wpstb-name")?.textContent?.trim() || "";
                nameEl.textContent = title;
            }

            if (!profileLinkEl) return;
            if (entryUrl) {
                profileLinkEl.hidden = false;
                profileLinkEl.href = entryUrl;
            } else {
                profileLinkEl.hidden = true;
            }
        }

        // ---------------------------
        // Video helpers
        // ---------------------------
        function isVideo(i = currentIndex) {
            return slides[i] && slides[i].classList.contains("video");
        }

        function playVideo() {
            if (!isVideo()) return;
            const v = slides[currentIndex].querySelector("video");
            if (!v) return;

            // звук:
            // - на iOS автоплей со звуком почти всегда запрещен
            // - поэтому muted=false не гарантирует звук
            v.muted = false;
            v.play().catch(() => {});
        }

        function pauseVideo() {
            if (!isVideo()) return;
            const v = slides[currentIndex].querySelector("video");
            if (!v) return;
            v.pause();
        }

        function stopVideo() {
            if (!isVideo()) return;
            const v = slides[currentIndex].querySelector("video");
            if (!v) return;
            v.pause();
            try { v.currentTime = 0; } catch (e) {}
        }

        // ---------------------------
        // Autoplay (with hold support)
        // ---------------------------
        function clearTimer() {
            if (timer) clearTimeout(timer);
            timer = null;
        }

        function autoplay(msOverride) {
            clearTimer();

            const state = toggleBtn ? toggleBtn.getAttribute("data-state") : "playing";
            if (state === "paused") return;
            if (isHoldPaused) return;

            const total = parseInt(timeouts[currentIndex] || 3000, 10);
            const t = Number.isFinite(msOverride) ? msOverride : total;

            remainingMs = t;
            slideStartTs = Date.now();

            timer = setTimeout(() => {
                remainingMs = 0;
                if (currentIndex < slides.length - 1) next();
                else nextStory();
            }, t);
        }

        function pauseStoryHold() {
            if (isHoldPaused) return;
            isHoldPaused = true;

            if (timer) {
                const elapsed = Date.now() - slideStartTs;
                const total = parseInt(timeouts[currentIndex] || 3000, 10);
                remainingMs = Math.max(0, (remainingMs || total) - elapsed);
            }

            clearTimer();
            document.body.classList.add("paused");
            pauseVideo();
        }

        function resumeStoryHold() {
            if (!isHoldPaused) return;
            isHoldPaused = false;

            document.body.classList.remove("paused");
            playVideo();

            const t = Math.max(0, remainingMs || parseInt(timeouts[currentIndex] || 3000, 10));
            if (t <= 0) {
                next();
                return;
            }
            autoplay(t);
        }

        // ---------------------------
        // Navigation (slides + stories)
        // ---------------------------
        function next() {
            if (currentIndex >= slides.length - 1) {
                nextStory();
                return;
            }
            stopVideo();
            setActive(currentIndex + 1);
            autoplay();
        }

        function prev() {
            if (currentIndex <= 0) {
                const targetStory = currentStoryIndex - 1;
                const opened = openStoryByIndex(targetStory);
                if (opened) {
                    setActive(Math.max(0, slides.length - 1));
                    autoplay();
                }
                return;
            }

            stopVideo();
            setActive(currentIndex - 1);
            autoplay();
        }

        function nextStory() {
            stopVideo();
            openStoryByIndex(currentStoryIndex + 1);
        }

        function openStoryByIndex(storyIndex) {
            if (!storyNodes.length) storyNodes = Array.from(timeline.querySelectorAll(".story"));
            if (!storyNodes.length) return false;

            // конец списка: закрываем
            if (storyIndex >= storyNodes.length) {
                closeModal();
                return false;
            }

            if (storyIndex < 0) storyIndex = storyNodes.length - 1;

            currentStoryIndex = storyIndex;

            const storyEl = storyNodes[currentStoryIndex];
            const ok = buildFromStory(storyEl);
            if (!ok) return false;

            initSizes();
            setActive(0);
            autoplay();

            return true;
        }

        // ---------------------------
        // Build story -> slides + bars
        // ---------------------------
        function buildFromStory(storyEl) {
            const items = storyEl.querySelectorAll(".items li a");
            if (!items.length) return false;

            slidesWrap.innerHTML = "";
            barsWrap.innerHTML = "";

            entryUrl = storyEl.querySelector(".wpstb-avatar-link")?.getAttribute("href") || null;

            const fragSlides = document.createDocumentFragment();
            const fragBars = document.createDocumentFragment();

            slides = [];
            bars = [];
            timeouts = [];

            items.forEach((a, idx) => {
                const type = (a.getAttribute("data-type") || "").toLowerCase();
                const href = a.getAttribute("href") || "";
                const poster = a.querySelector("img")?.getAttribute("src") || "";

                const isVid = type === "video" || /\.(mp4|webm|ogg)(\?.*)?$/i.test(href);
                const initialT = isVid ? 15000 : 6000;

                timeouts.push(initialT);

                const slide = document.createElement("div");
                slide.className = "slide";
                slide.setAttribute("data-timeout", String(initialT));

                if (isVid) {
                    slide.classList.add("video");
                    slide.innerHTML = `
            <video playsinline preload="metadata">
              <source src="${href}">
            </video>
          `;

                    const videoEl = slide.querySelector("video");
                    if (videoEl) {
                        videoEl.addEventListener("loadedmetadata", () => {
                            let realDuration = Math.floor(videoEl.duration * 1000);

                            if (!Number.isFinite(realDuration) || realDuration <= 0) realDuration = 6000;

                            const finalDuration = Math.min(realDuration, 15000);

                            timeouts[idx] = finalDuration;
                            slide.setAttribute("data-timeout", String(finalDuration));

                            const barSpan = barsWrap.querySelector(`.bar[data-index="${idx}"] span`);
                            if (barSpan) barSpan.style.animationDuration = `${finalDuration}ms`;

                            if (idx === currentIndex && !modal.hidden && !isHoldPaused) autoplay(finalDuration);
                        }, { once: true });
                    }
                } else {
                    const src = poster || href;
                    slide.innerHTML = `<img src="${src}" alt="">`;
                }

                fragSlides.appendChild(slide);
                slides.push(slide);

                const bar = document.createElement("div");
                bar.className = "bar" + (isVid ? " video" : "");
                bar.setAttribute("data-index", String(idx));
                bar.innerHTML = `<span style="animation-duration:${initialT}ms;"></span>`;
                fragBars.appendChild(bar);
            });

            slidesWrap.appendChild(fragSlides);
            barsWrap.appendChild(fragBars);
            barsWrap.setAttribute("data-count", String(slides.length));

            bars = Array.from(barsWrap.querySelectorAll(".bar"));
            bars.forEach((bar) => {
                bar.addEventListener("click", () => {
                    const i = parseInt(bar.getAttribute("data-index"), 10);
                    if (!Number.isFinite(i)) return;
                    stopVideo();
                    setActive(i);
                    autoplay();
                });
            });

            return true;
        }

        // ---------------------------
        // Toggle (manual pause/play)
        // ---------------------------
        function togglePlayPause() {
            if (!toggleBtn) return;

            const state = toggleBtn.getAttribute("data-state");
            if (state === "paused") {
                toggleBtn.setAttribute("data-state", "playing");
                document.body.classList.remove("paused");
                setActive(currentIndex);
                autoplay();
                playVideo();
            } else {
                toggleBtn.setAttribute("data-state", "paused");
                document.body.classList.add("paused");
                clearTimer();
                pauseVideo();
            }
        }

        // ---------------------------
        // Hold timer helpers
        // ---------------------------
        function clearHoldTimer() {
            if (holdTimer) clearTimeout(holdTimer);
            holdTimer = null;
        }

        // ---------------------------
        // Pointer handlers (swipe + hold)
        // ---------------------------
        function onPointerDown(e) {
            if (modal.hidden) return;
            if (document.body.classList.contains("menu-open")) return;

            pointerDown = true;
            isDragging = false;
            dragOffset = 0;

            startX = e.clientX;
            startY = e.clientY;

            // запланируем hold (если не свайп)
            clearHoldTimer();
            holdTimer = setTimeout(() => {
                if (isDragging) return;
                pauseStoryHold();
            }, HOLD_DELAY_MS);

            outer.setPointerCapture?.(e.pointerId);
        }

        function onPointerMove(e) {
            if (!pointerDown || modal.hidden) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // вертикальный жест - считаем скроллом, отменяем
            if (Math.abs(dy) > SWIPE_MAX_Y && Math.abs(dy) > Math.abs(dx)) {
                pointerDown = false;
                setDragging(false);
                clearHoldTimer();
                autoplay();
                return;
            }

            // старт drag
            if (!isDragging && Math.abs(dx) > 8) {
                isDragging = true;
                setDragging(true);
                clearHoldTimer();
            }

            if (!isDragging) return;

            // “резина” на краях
            let limitedDx = dx;
            if (currentIndex === 0 && dx > 0) limitedDx = dx * 0.35;
            if (currentIndex === slides.length - 1 && dx < 0) limitedDx = dx * 0.35;

            dragOffset = limitedDx;
            dragTo(dragOffset);
        }

        function finishPointer() {
            if (!pointerDown) return;
            pointerDown = false;

            clearHoldTimer();

            // если был hold - отпустили -> продолжаем
            if (isHoldPaused) {
                resumeStoryHold();
                dragOffset = 0;
                isDragging = false;
                return;
            }

            // не свайпали -> просто продолжаем
            if (!isDragging) {
                autoplay();
                return;
            }

            setDragging(false);

            const dx = dragOffset;

            if (Math.abs(dx) >= SWIPE_MIN_PX) {
                if (dx < 0) next();
                else prev();
            } else {
                translateTo(currentIndex);
                autoplay();
            }

            dragOffset = 0;
            isDragging = false;
        }
    }
});
