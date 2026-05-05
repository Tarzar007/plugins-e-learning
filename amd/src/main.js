define(['jquery', 'core/log', 'https://cdn.jsdelivr.net/npm/sweetalert2@11'], function ($, log, Swal) {
    "use strict";

    let isExamFinished = false;
    let isAdjustingVolume = false;
    let studentData = {
        pause_password: "",
        courseid: "",
        student_name: "",
        student_id: ""
    };

    return {
        init: function (params) {
            console.log("SUT Exam Protector: Initializing...");
            if (params && typeof params === 'object') {
                studentData = Object.assign(studentData, params);
            }

            this.swalCustom = Swal.mixin({
                customClass: {
                    container:     'sut-swal-container',
                    popup:         'sut-swal-popup',
                    title:         'sut-swal-title',
                    confirmButton: 'sut-swal-confirm',
                    cancelButton:  'sut-swal-cancel'
                },
                buttonsStyling: false,
                backdrop: 'rgba(0,0,0,0.9)',
                allowOutsideClick: false,
                allowEscapeKey: false
            });

            window.alert   = () => true;
            window.confirm = () => true;
            window.prompt  = () => null;

            this.setupUI();
            this.setupSecurity();
            this.setupNavigationControl();
        },

        // ─── Setup ───────────────────────────────────────────────────────────

        setupUI: function () {
            this.injectStrictStyles();
            this.setupStartButton();
            this.createVolumeControl();
            this.createTextZoomControl();
            this.createClockWidget();
            this.createPauseButton();
            this.injectQuizTitleBanner();
            this.removeBackButtons();
            this.createWatermark();          // FIX: เพิ่ม watermark
        },

        setupSecurity: function () {
            this.setupInteractionsSecurity();
            this.setupKeyboardSecurity();
            this.setupScreenshotDetection();
            this.observeSubmitButton();
        },

        setupNavigationControl: function () {
            this.lockNavigation();
            const checkFullscreen = () => {
                if (isExamFinished) return;
                const isFS = !!(
                    document.fullscreenElement       ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement    ||
                    document.msFullscreenElement
                );
                if (!isFS && !document.getElementById("sut-start-overlay")) {
                    this.handleViolation(
                        "คุณออกจากโหมดเต็มจอ",
                        "กรุณากลับเข้าสู่หน้าจอสอบทันทีเพื่อทำข้อสอบต่อ"
                    );
                }
            };
            ['fullscreenchange', 'webkitfullscreenchange',
             'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
                document.addEventListener(evt, checkFullscreen);
            });

            window.onbeforeunload = (e) => {
                if (isExamFinished) return undefined;
                e.preventDefault();
                return (e.returnValue = "คุณยังทำข้อสอบไม่เสร็จสิ้น ต้องการออกจากหน้านี้ใช่หรือไม่?");
            };
        },

        // ─── Quiz Meta ────────────────────────────────────────────────────────

        getQuizName: function () {
            const el = document.querySelector(
                '.page-header-headings h1, .activity-header .activity-name, ' +
                '.activityname .instancename, h1.h2, h1'
            );
            return el ? el.textContent.trim().replace(/\s+/g, ' ') : "";
        },

        getBreadcrumb: function () {
            const el = document.querySelector(
                '.breadcrumb, nav[aria-label="Navigation bar"] ol, #page-navbar .breadcrumb'
            );
            if (!el) return "";
            const parts = [];
            el.querySelectorAll('li').forEach(li => {
                const text = li.textContent.trim().replace(/\s+/g, ' ');
                if (text) parts.push(text);
            });
            return parts.join(' / ');
        },

        // ─── Styles ───────────────────────────────────────────────────────────

        injectStrictStyles: function () {
            if (document.getElementById("sut-protector-styles")) return;
            const style = document.createElement('style');
            style.id = "sut-protector-styles";
            style.innerHTML = `
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;600;700&display=swap');

                body, #page, #region-main, .sut-overlay, .sut-modal, .swal2-container,
                p, span:not(.icon):not(.fa):not([class*="fa-"]),
                div:not(.icon):not(.fa):not([class*="fa-"]),
                a, button, input, td, th, li {
                    font-family: 'Noto Sans Thai', sans-serif !important;
                }
                i, .icon, .fa, .fas, .far, .fab, [class*="fa-"] {
                    font-family: "Font Awesome 5 Free","Font Awesome 6 Free","FontAwesome",sans-serif !important;
                    font-weight: 900 !important; font-style: normal !important;
                }
                .far { font-weight: 400 !important; }

                body { -webkit-user-select: none !important; user-select: none !important; }

                .navbar.fixed-top, .secondary-navigation, header#page-header { display: none !important; }

                #theme_boost-drawers-courseindex,
                [data-region="course-index"], .drawer-left,
                [data-toggler="drawers"][data-target="theme_boost-drawers-courseindex"] {
                    display: none !important; width: 0 !important;
                }
                body.drawer-open-left { margin-left: 0 !important; padding-left: 0 !important; }

                .btn-footer-popover, [data-action="footer-popover"],
                .path-mod-quiz .btn-icon.bg-secondary { display: none !important; }

                .path-mod-quiz .mod_quiz-back-link,
                .path-mod-quiz a.btn-secondary[href*="view.php"],
                .path-mod-quiz button[name="backbutton"],
                .path-mod-quiz .continuebutton a.btn-secondary,
                .path-mod-quiz .icon.fa-question,
                .path-mod-quiz .fa-question-circle,
                .path-mod-quiz .help-icon { display: none !important; }

                #page { margin-top: 0 !important; padding-top: 0 !important; }
                #page-content { padding-top: 10px !important; }

                #sut-quiz-title-banner {
                    background: #f8fafc; border-bottom: 3px solid #FF5F00;
                    padding: 20px; text-align: center; margin-bottom: 20px;
                }
                .sut-title-text { font-size: 24px; font-weight: 700; color: #1e293b; }

                .sut-volume-container, .sut-zoom-container {
                    position: fixed; top: 15px; z-index: 10000;
                    display: inline-flex; align-items: center; gap: 8px;
                    background: white; border: 2px solid #FF5F00;
                    border-radius: 10px; padding: 5px 12px;
                }
                .sut-volume-container { left: 15px; }
                .sut-zoom-container   { right: 15px; }

                .sut-volume-icon { font-size: 16px; line-height: 1; flex-shrink: 0; }
                #sut-volume-slider { width: 100px; cursor: pointer; }

                .sut-zoom-btn {
                    border: none; background: #f1f5f9; color: #1e293b;
                    padding: 5px 12px; border-radius: 6px; cursor: pointer;
                    font-weight: bold; transition: 0.2s;
                }
                .sut-zoom-btn:hover, .sut-zoom-btn.active { background: #FF5F00; color: white; }

                .zoom-s { font-size: 0.9rem !important; }
                .zoom-m { font-size: 1.2rem !important; }
                .zoom-l { font-size: 1.5rem !important; }

                .sut-swal-popup {
                    border-radius: 16px !important; padding: 2rem !important;
                    font-family: 'Noto Sans Thai', sans-serif !important;
                }
                .sut-swal-title  { color: #1e293b !important; font-weight: 600 !important; }
                .sut-swal-confirm {
                    background-color: #FF5F00 !important; color: white !important;
                    padding: 10px 24px !important; border-radius: 8px !important;
                    margin: 10px !important; cursor: pointer; border: none; font-weight: 600;
                }
                .sut-swal-cancel {
                    background-color: #1951a0 !important; color: white !important;
                    padding: 10px 24px !important; border-radius: 8px !important;
                    margin: 10px !important; cursor: pointer; border: none; font-weight: 600;
                }
                .swal2-validation-message { font-family: 'Noto Sans Thai', sans-serif !important; }

                .sut-overlay {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0,0,0,0.92); backdrop-filter: blur(10px);
                    z-index: 2147483647; display: flex;
                    justify-content: center; align-items: center;
                }
                .sut-modal {
                    background: white; padding: 40px; border-radius: 24px;
                    text-align: center; max-width: 420px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                }
                .sut-btn {
                    margin-top: 24px; padding: 14px 32px;
                    background: linear-gradient(180deg, #FF8C00 0%, #FF5F00 100%);
                    color: white; border: none; border-radius: 12px;
                    cursor: pointer; width: 100%; font-weight: 600; font-size: 1.1rem;
                }

                #sut-pause-btn {
                    position: fixed; bottom: 20px; left: 20px; z-index: 9999;
                    padding: 8px 16px; background: #ffffff; border: 2px solid #FF5F00;
                    color: #0f172a; font-size: 20px; font-weight: 700;
                    border-radius: 8px; cursor: pointer;
                }
                #sut-clock {
                    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
                    background: #ffffff; border: 2px solid #FF5F00;
                    border-radius: 10px; padding: 8px 16px;
                    color: #0f172a; font-size: 20px; font-weight: 700;
                }

                body.sut-paused-active #sut-pause-btn,
                body.sut-paused-active .sut-volume-container,
                body.sut-paused-active .sut-zoom-container,
                body.sut-paused-active #sut-clock { display: none !important; }

                /* Watermark */
                #sut-watermark {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    pointer-events: none; z-index: 9998; overflow: hidden;
                    user-select: none; -webkit-user-select: none;
                }
                .sut-wm-item {
                    position: absolute; white-space: nowrap;
                    font-size: 13px; font-weight: 500; letter-spacing: 0.5px;
                    color: rgba(0,0,0,0.07);
                    transform: rotate(-30deg); transform-origin: center center;
                    font-family: 'Noto Sans Thai', sans-serif;
                }

                @media print { body { display: none !important; } }
            `;
            document.head.appendChild(style);
        },

        // ─── Watermark ────────────────────────────────────────────────────────

        createWatermark: function () {
            if (document.getElementById('sut-watermark')) return;

            const name = String(studentData.student_name || "").trim();
            const id   = String(studentData.student_id   || "").trim();
            const parts = [name, id].filter(Boolean);
            if (parts.length === 0) return;          // ไม่มีข้อมูลนักศึกษา → ข้าม

            const startTime = new Date().toLocaleString('th-TH', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const label = parts.join('  ') + '  ' + startTime;

            const layer = document.createElement('div');
            layer.id = 'sut-watermark';
            document.body.appendChild(layer);
            this._buildWatermarkItems(layer, label);

            // Rebuild เมื่อ resize (เช่น ออก/เข้า fullscreen)
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => this._buildWatermarkItems(layer, label), 200);
            });
        },

        _buildWatermarkItems: function (layer, label) {
            layer.innerHTML = '';
            const W = window.innerWidth  + 400;
            const H = window.innerHeight + 400;
            for (let y = -200; y < H; y += 110) {
                const offsetX = (Math.round(y / 110) % 2 === 0) ? 0 : 190;
                for (let x = -200; x < W; x += 380) {
                    const el = document.createElement('div');
                    el.className = 'sut-wm-item';
                    el.textContent = label;
                    el.style.left = (x + offsetX) + 'px';
                    el.style.top  = y + 'px';
                    layer.appendChild(el);
                }
            }
        },

        // ─── Security ─────────────────────────────────────────────────────────

        setupKeyboardSecurity: function () {
            const block = (e) => {
                if (isExamFinished) return;
                // FIX: guard ค่า undefined
                const key = (e.key || '').toLowerCase();
                const cmd = e.ctrlKey || e.metaKey;

                // PrintScreen
                if (key === 'printscreen' || key === 'snapshot') {
                    e.preventDefault();
                    this.preventCaptureAction();
                    return false;
                }

                // Windows/Meta key
                if (e.metaKey) {
                    e.preventDefault();
                    this.handleViolation("ตรวจพบความพยายามสลับหน้าจอ", "ไม่อนุญาตให้ใช้ปุ่มลัดระบบขณะสอบ");
                    return false;
                }

                // FIX: Alt+Tab ต้องจัดการก่อน block Alt ทั่วไป
                if (e.altKey && key === 'tab') {
                    e.preventDefault();
                    this.handleViolation("ตรวจพบความพยายามสลับหน้าจอ", "ไม่อนุญาตให้ใช้ปุ่มลัดระบบขณะสอบ");
                    return false;
                }

                // Alt และ Function keys (ยกเว้น F5, F11)
                if (e.altKey || (key.startsWith('f') && !['f5', 'f11'].includes(key))) {
                    e.preventDefault();
                    return false;
                }

                // Ctrl/Cmd shortcuts
                if (cmd && ['c', 'v', 's', 'p', 'u', 'r', 't', 'n', 'w'].includes(key)) {
                    e.preventDefault();
                    return false;
                }
            };
            document.addEventListener('keydown', block, true);

            setInterval(() => {
                if (!isExamFinished && document.hasFocus()) {
                    try {
                        navigator.clipboard.writeText("⚠️ เนื้อหาได้รับความคุ้มครองโดย SUT Protector").catch(() => {});
                    } catch (err) {}
                }
            }, 2000);
        },

        // FIX: เอา duplicate ออก เหลือเวอร์ชันเดียว + guard ซ้ำ
        preventCaptureAction: function () {
            if (document.getElementById("sut-blackout-node")) return;
            const blackout = document.createElement('div');
            blackout.id = "sut-blackout-node";
            blackout.style.cssText = [
                'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
                'background:black', 'z-index:2147483647',
                'display:flex', 'justify-content:center', 'align-items:center',
                'color:white', 'font-size:2rem'
            ].join(';');
            blackout.innerHTML = "<div>PROTECTED CONTENT</div>";
            document.body.appendChild(blackout);
            navigator.clipboard.writeText("").catch(() => {});
            setTimeout(() => {
                const node = document.getElementById("sut-blackout-node");
                if (node) node.remove();
                this.handleViolation("ไม่อนุญาตให้จับภาพหน้าจอ", "ระบบตรวจพบการ Capture หน้าจอ ภาพที่ได้จะถูกทำให้เสียสมบูรณ์");
            }, 800);
        },

        // Blackout helpers — สำหรับ Win+PrtSc ที่ไม่ trigger keydown
        showBlackout: function () {
            if (document.getElementById('sut-blackout-persistent')) return;
            const el = document.createElement('div');
            el.id = 'sut-blackout-persistent';
            el.style.cssText = [
                'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
                'background:#000', 'z-index:2147483647',
                'color:#111', 'font-size:1px', 'user-select:none'
            ].join(';');
            el.textContent = 'PROTECTED';
            document.body.appendChild(el);
        },

        hideBlackout: function () {
            const el = document.getElementById('sut-blackout-persistent');
            if (el) el.remove();
        },

        // FIX: เพิ่ม showBlackout ทันทีเมื่อ blur (ครอบ Win+Shift+S, Snipping Tool)
        //      + focus กลับมาให้ hideBlackout
        //      + visibilitychange ก็ทำเหมือนกัน
        setupScreenshotDetection: function () {
            let blurTimer = null;

            window.addEventListener('blur', () => {
                if (isExamFinished || isAdjustingVolume) return;
                if (Swal.isVisible()) return;
                this.showBlackout();
                clearTimeout(blurTimer);
                blurTimer = setTimeout(() => {
                    if (isExamFinished) return;
                    if (document.getElementById("custom-alert-overlay")) return;
                    navigator.clipboard.writeText('Protected Content').catch(() => {});
                    this.handleViolation("ตรวจพบการสลับหน้าจอ", "ระบบตรวจพบการย้ายโฟกัสออกจากหน้าต่างสอบ");
                }, 300);
            });

            window.addEventListener('focus', () => {
                clearTimeout(blurTimer);
                this.hideBlackout();
            });

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && !isExamFinished) {
                    this.showBlackout();
                    this.handleViolation(
                        "ตรวจพบการออกจากหน้าจอสอบ",
                        "ระบบไม่อนุญาตให้สลับไปโปรแกรมอื่นหรือเปิด Tab ใหม่"
                    );
                } else if (document.visibilityState === 'visible') {
                    this.hideBlackout();
                }
            });
        },

        handleViolation: function (title, desc) {
            const existing = document.getElementById("custom-alert-overlay");
            if (existing) return;                   // FIX: ไม่ลบแล้วสร้างใหม่ — แค่ return
            Swal.close();

            const overlay = document.createElement("div");
            overlay.id = "custom-alert-overlay";
            overlay.className = "sut-overlay";
            overlay.innerHTML = `
                <div class="sut-modal">
                    <div style="font-size:60px;margin-bottom:20px;">⚠️</div>
                    <div style="color:#0f172a;font-size:24px;font-weight:600;">${title}</div>
                    <div style="color:#475569;margin-top:12px;line-height:1.6;">${desc}</div>
                    <button id="confirm-re-fs" class="sut-btn">กลับเข้าสู่การสอบ</button>
                </div>`;
            document.body.appendChild(overlay);

            const blockAll = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
            document.addEventListener('keydown', blockAll, true);
            document.getElementById("confirm-re-fs").onclick = () => {
                document.removeEventListener('keydown', blockAll, true);
                overlay.remove();
                this.forceFullscreen();
            };
        },

        forceFullscreen: function () {
            const el  = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen
                      || el.mozRequestFullScreen || el.msRequestFullscreen;
            if (req) req.call(el).catch(() => {});
        },

        // ─── Pause / Exit ─────────────────────────────────────────────────────

        triggerPauseAction: function () {
            document.body.classList.add('sut-paused-active');
            const expected = String(studentData.pause_password || "").trim();

            this.swalCustom.fire({
                title: 'ยืนยันการออกจากโหมด Full Screen',
                text: "ติดต่ออาจารย์เพื่อกรอกรหัสผ่านและหยุดสอบชั่วคราว",
                icon: 'error',
                input: 'password',
                inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
                showCancelButton: true,
                confirmButtonText: 'ตกลง',
                cancelButtonText: 'ยกเลิก',
                didClose: () => {
                    if (!isExamFinished) document.body.classList.remove('sut-paused-active');
                },
                preConfirm: (inputPassword) => {
                    const actual = String(inputPassword || "").trim();
                    if (expected !== "" && actual === expected) return true;
                    Swal.showValidationMessage(
                        expected === "" ? "ระบบยังไม่ได้ตั้งรหัสผ่าน" : "รหัสผ่านไม่ถูกต้อง"
                    );
                    return false;
                }
            }).then((result) => {
                if (!result.isConfirmed) {
                    document.body.classList.remove('sut-paused-active');
                    return;
                }
                isExamFinished = true;
                window.onbeforeunload = null;

                // FIX: try/catch ป้องกัน M.cfg undefined
                let targetUrl = '/';
                try {
                    targetUrl = studentData.courseid
                        ? M.cfg.wwwroot + '/course/view.php?id=' + studentData.courseid
                        : M.cfg.wwwroot;
                } catch (e) {
                    targetUrl = studentData.courseid
                        ? '/course/view.php?id=' + studentData.courseid
                        : '/';
                }

                const exitFs = document.exitFullscreen || document.webkitExitFullscreen
                             || document.mozCancelFullScreen || document.msExitFullscreen;
                if (exitFs && (document.fullscreenElement || document.webkitFullscreenElement)) {
                    exitFs.call(document)
                        .then(()  => { window.location.replace(targetUrl); })
                        .catch(() => { window.location.replace(targetUrl); });
                } else {
                    window.location.replace(targetUrl);
                }
            });
        },

        // ─── UI Widgets ───────────────────────────────────────────────────────

        setupStartButton: function () {
            if (document.getElementById("sut-start-overlay")) return;
            const quizName   = this.getQuizName() || "ข้อสอบ";
            const breadcrumb = this.getBreadcrumb();

            const overlay = document.createElement("div");
            overlay.id = "sut-start-overlay";
            overlay.className = "sut-overlay";
            overlay.innerHTML = `
                <div class="sut-modal" style="max-width:500px;text-align:left;">
                    <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:16px;text-align:center;">
                        ระบบป้องกันการทุจริตข้อสอบออนไลน์
                    </div>
                    ${breadcrumb ? `<div style="font-size:13px;color:#2563eb;margin-bottom:12px;">${breadcrumb}</div>` : ''}
                    <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">
                        📝 ${quizName}
                    </div>
                    <button id="enter-btn" class="sut-btn">🚀 เริ่มทำข้อสอบ</button>
                </div>`;
            document.body.prepend(overlay);

            document.getElementById("enter-btn").onclick = () => {
                this.forceFullscreen();
                document.body.classList.add('exam-started');
                overlay.remove();
            };
        },

        injectQuizTitleBanner: function () {
            if (document.getElementById('sut-quiz-title-banner')) return;
            const quizName = this.getQuizName();
            if (!quizName) return;

            const banner = document.createElement('div');
            banner.id = 'sut-quiz-title-banner';
            banner.innerHTML = `<span class="sut-title-text">${quizName}</span>`;

            const main = document.querySelector(
                '#region-main, [role="main"], #maincontent, .generaltable, #page-content'
            );
            if (main) main.insertBefore(banner, main.firstChild);
            else document.body.insertBefore(banner, document.body.firstChild);
        },

        removeBackButtons: function () {
            const selectors = [
                '.back-link', '.mod_quiz-back-link', 'button[name="backbutton"]',
                'a.btn-secondary[href*="mod/quiz/view.php"]',
                '.icon.fa-question', '.help-icon',
                '.btn-footer-popover', '[data-action="footer-popover"]',
                '[data-region="course-index"]', '#theme_boost-drawers-courseindex',
                '[data-toggler="drawers"][data-target="theme_boost-drawers-courseindex"]'
            ].join(', ');

            const findAndHide = () => {
                if (isExamFinished) {
                    clearInterval(this.backBtnTimer);
                    return;
                }
                $(selectors).attr('style', 'display:none !important');
                document.body.classList.remove('drawer-open-left');
            };
            findAndHide();
            this.backBtnTimer = setInterval(findAndHide, 500);
        },

        createPauseButton: function () {
            if (document.getElementById("sut-pause-btn")) return;
            const btn = document.createElement("button");
            btn.id = "sut-pause-btn";
            btn.innerHTML = "❌ ออกจากโหมด Full Screen";
            btn.onclick = () => this.triggerPauseAction();
            document.body.appendChild(btn);
        },

        createVolumeControl: function () {
            if (document.getElementById("sut-volume-ctrl")) return;
            const container = document.createElement("div");
            container.id = "sut-volume-ctrl";
            container.className = "sut-volume-container";
            container.innerHTML = `
                <span class="sut-volume-icon">🔊</span>
                <input type="range" id="sut-volume-slider" min="0" max="1" step="0.05" value="0.5">
            `;
            document.body.appendChild(container);

            const slider = document.getElementById("sut-volume-slider");

            // FIX: mouseenter/leave บน container ป้องกัน false-positive blur
            container.addEventListener('mouseenter', () => { isAdjustingVolume = true;  });
            container.addEventListener('mouseleave', () => { isAdjustingVolume = false; });

            slider.oninput = (e) => {
                e.stopPropagation();
                const vol = parseFloat(e.target.value);
                document.querySelectorAll("video, audio").forEach(m => {
                    m.volume = vol;
                    m.muted  = (vol === 0);
                });
            };
        },

        createTextZoomControl: function () {
            if (document.getElementById("sut-zoom-ctrl")) return;
            const container = document.createElement("div");
            container.id = "sut-zoom-ctrl";
            container.className = "sut-zoom-container";
            container.innerHTML = `
                <button class="sut-zoom-btn"        data-zoom="zoom-s" style="font-size:14px;">A</button>
                <button class="sut-zoom-btn active" data-zoom="zoom-m" style="font-size:16px;">A+</button>
                <button class="sut-zoom-btn"        data-zoom="zoom-l" style="font-size:18px;">A++</button>
            `;
            document.body.appendChild(container);

            const main = document.querySelector('#region-main') || document.body;
            container.querySelectorAll(".sut-zoom-btn").forEach(btn => {
                btn.onclick = () => {
                    main.classList.remove('zoom-s', 'zoom-m', 'zoom-l');
                    main.classList.add(btn.getAttribute('data-zoom'));
                    container.querySelectorAll('.sut-zoom-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                };
            });
        },

        createClockWidget: function () {
            if (document.getElementById("sut-clock")) return;
            const clock = document.createElement("div");
            clock.id = "sut-clock";
            clock.innerHTML = '<span id="sut-clock-time">00:00</span>';
            document.body.appendChild(clock);

            const update = () => {
                const now = new Date();
                const h = String(now.getHours()).padStart(2, '0');
                const m = String(now.getMinutes()).padStart(2, '0');
                const el = document.getElementById("sut-clock-time");
                if (el) el.textContent = h + ':' + m + ' น.';
            };
            update();
            setInterval(update, 1000);
        },

        // ─── Interactions & Navigation ────────────────────────────────────────

        setupInteractionsSecurity: function () {
            const block = (e) => {
                if (isExamFinished) return;
                e.preventDefault();
                e.stopPropagation();
            };
            ['contextmenu', 'selectstart', 'copy', 'cut', 'paste', 'dragstart', 'drop'].forEach(evt => {
                document.addEventListener(evt, block, true);
            });
        },

        lockNavigation: function () {
            history.pushState(null, null, location.href);
            window.onpopstate = () => {
                if (!isExamFinished) history.pushState(null, null, location.href);
            };
        },

        observeSubmitButton: function () {
            $(document).on('click', 'button, input[type="submit"]', (e) => {
                const el   = $(e.currentTarget);
                const text = (el.text() || el.val() || "").toLowerCase();
                const name = (el.attr('name') || "").toLowerCase();
                const isFinish = ["finish", "submit", "ส่ง", "เสร็จ"].some(kw => text.includes(kw));
                const isMoodleFinish = ["finishattempt", "finish"].some(kw => name.includes(kw));
                if (isFinish || isMoodleFinish) {
                    isExamFinished = true;
                    window.onbeforeunload = null;
                    $("#sut-pause-btn").remove();
                }
            });
            $(document).on('submit', 'form', () => {
                if ($('form[action*="processattempt"], form[action*="finishattempt"]').length) {
                    isExamFinished = true;
                    window.onbeforeunload = null;
                    $("#sut-pause-btn").remove();
                }
            });
        }
    };
});