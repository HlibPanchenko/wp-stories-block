document.addEventListener("DOMContentLoaded", () => {
    const blocks = document.querySelectorAll('.wpstb[data-wpstb="1"]');

    if (!blocks.length) return;

    const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (IS_MOBILE) document.body.classList.add("mobile");

    blocks.forEach((block) => initStoriesBlock(block));

    function initStoriesBlock(block) {
        const timeline = block.querySelector("[data-wpstb-timeline]");
        const modal = block.querySelector("[data-wpstb-modal]");
        if (!timeline || !modal) return;

        // DOM
        const outer = modal.querySelector(".wpstb-modal__frame");
        const slidesWrap = modal.querySelector("[data-wpstb-slides]");
        const barsWrap = modal.querySelector("[data-wpstb-bars]");
        const prevBtn = modal.querySelector("[data-wpstb-prev]");
        const nextBtn = modal.querySelector("[data-wpstb-next]");
        const toggleBtn = modal.querySelector("[data-wpstb-toggle]");
        const closeBtns = modal.querySelectorAll("[data-wpstb-close]");

        const profileCardEl = modal.querySelector("[data-wpstb-profile]");
        const profileImgEl = modal.querySelector("[data-wpstb-profile-img]");
        const profileNameEl = modal.querySelector("[data-wpstb-profile-name]");

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

            modal.addEventListener("click", (e) => {
                if (e.target === modal) closeModal();
            });

            document.addEventListener("keydown", (e) => {
                if (modal.hidden) return;
                if (e.key === "Escape") closeModal();
                if (e.key === "ArrowRight") next();
                if (e.key === "ArrowLeft") prev();
            });

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
            const link = e.target.closest("[data-wpstb-open]");
            if (!link) return;

            const story = link.closest(".wpstb-timeline__item");
            if (!story) return;

            e.preventDefault();

            storyNodes = Array.from(timeline.querySelectorAll(".wpstb-timeline__item"));

            const idx = storyNodes.indexOf(story);
            currentStoryIndex = idx >= 0 ? idx : 0;

            if (!openStoryByIndex(currentStoryIndex)) return;
            openModal();
        }

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
        }

        function setSlideActive(i) {
            slides.forEach((el) => el.classList.remove("is-active"));
            if (slides[i]) slides[i].classList.add("is-active");

            stopVideo();
            playVideo();
        }

        function setBarActive(i) {
            bars.forEach((bar, idx) => {
                if (idx < i) {
                    bar.classList.add("is-seen");
                    bar.classList.remove("is-animating");
                } else {
                    bar.classList.remove("is-seen");
                    bar.classList.remove("is-animating");
                }
            });

            if (bars[i]) bars[i].classList.add("is-animating");
        }

        function renderProfile(title, url, photo) {
            if (!profileCardEl) return;

            const hasAny = !!(url || title || photo);

            profileCardEl.hidden = !hasAny;
            if (!hasAny) return;

            if (url) {
                profileCardEl.setAttribute("href", url);
            } else {
                profileCardEl.removeAttribute("href");
            }

            if (profileNameEl) profileNameEl.textContent = title || "";

            if (profileImgEl) {
                if (photo) {
                    profileImgEl.src = photo;
                    profileImgEl.alt = title || "";
                    profileImgEl.hidden = false;
                } else {
                    profileImgEl.hidden = true;
                }
            }
        }

        // ---------------------------
        // Video helpers
        // ---------------------------
        function isVideo(i = currentIndex) {
            return slides[i] && slides[i].classList.contains("wpstb-slide--video");
        }

        function playVideo() {
            if (!isVideo()) return;

            const v = slides[currentIndex].querySelector("video");
            if (!v) return;

            // iOS and Chrome require playsinline + muted for autoplay
            v.playsInline = true;
            v.setAttribute("playsinline", "");
            v.preload = "metadata";

            // Try to play with sound first (may work on desktop)
            v.muted = false;

            const p = v.play();

            if (p && typeof p.catch === "function") {
                p.catch(() => {
                    // Autoplay with sound was blocked – fallback to muted playback
                    v.muted = true;
                    v.play().catch(() => {});
                });
            }
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
            if (!storyNodes.length) {
                storyNodes = Array.from(timeline.querySelectorAll(".wpstb-timeline__item"));
            }
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
            const items = storyEl.querySelectorAll(".wpstb-timeline__items li a");
            const firstItem = storyEl.querySelector(".wpstb-timeline__items li a");

            if (!items.length) return false;

            slidesWrap.innerHTML = "";
            barsWrap.innerHTML = "";

            entryUrl = firstItem?.getAttribute("data-link") || null;

            const storyTitle =
                firstItem?.getAttribute("data-linkText") ||
                storyEl.querySelector(".wpstb-name")?.textContent?.trim() ||
                "";

            const storyPhoto =
                storyEl.getAttribute("data-photo") ||
                storyEl.querySelector("img.wpstb-avatar")?.getAttribute("src") ||
                "";


            renderProfile(storyTitle, entryUrl, storyPhoto);

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
                slide.className = "wpstb-slide";
                slide.setAttribute("data-timeout", String(initialT));

                if (isVid) {
                    slide.classList.add("wpstb-slide--video");
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

                            const barSpan = barsWrap.querySelector(`.wpstb-bar[data-index="${idx}"] span`);
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
                bar.className = "wpstb-bar" + (isVid ? " wpstb-bar--video" : "");
                bar.setAttribute("data-index", String(idx));
                bar.innerHTML = `<span style="animation-duration:${initialT}ms;"></span>`;
                fragBars.appendChild(bar);
            });

            slidesWrap.appendChild(fragSlides);
            barsWrap.appendChild(fragBars);
            barsWrap.setAttribute("data-count", String(slides.length));

            bars = Array.from(barsWrap.querySelectorAll(".wpstb-bar"));
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

            // If the user interacts with controls/links - do not start swipe/hold logic
            if (e.target.closest("[data-wpstb-profile], [data-wpstb-close], [data-wpstb-prev], [data-wpstb-next], a, button")) {
                return;
            }

            pointerDown = true;
            isDragging = false;
            dragOffset = 0;

            startX = e.clientX;
            startY = e.clientY;

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

            // Vertical gesture detected – treat as scroll and cancel swipe
            if (Math.abs(dy) > SWIPE_MAX_Y && Math.abs(dy) > Math.abs(dx)) {
                pointerDown = false;
                setDragging(false);
                clearHoldTimer();
                autoplay();
                return;
            }

            // Start horizontal drag
            if (!isDragging && Math.abs(dx) > 8) {
                isDragging = true;
                setDragging(true);
                clearHoldTimer();
            }

            if (!isDragging) return;

            // Apply rubber-band effect on edges
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

            // If the story was paused by hold – resume and exit
            if (isHoldPaused) {
                resumeStoryHold();
                dragOffset = 0;
                isDragging = false;
                return;
            }

            // No swipe detected – just continue autoplay
            if (!isDragging) {
                autoplay();
                return;
            }

            setDragging(false);

            const dx = dragOffset;

            // Swipe threshold reached
            if (Math.abs(dx) >= SWIPE_MIN_PX) {
                if (dx < 0) next();
                else prev();
            } else {
                // Snap back to the current slide
                translateTo(currentIndex);
                autoplay();
            }

            dragOffset = 0;
            isDragging = false;
        }
    }
});
