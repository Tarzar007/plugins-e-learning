define(['jquery', 'core/log', 'https://cdn.jsdelivr.net/npm/sweetalert2@11'], function($, log, Swal) {
    "use strict";

    let isExamFinished = false;
    let studentData = {
        pause_password: ""
    };

    return {
        init: function(params) {
            console.log("SUT Exam Protector Debug:", params);
            if (typeof params === 'object' && params !== null) {
                studentData = params;
            }

            this.injectStrictStyles();

            this.swalCustom = Swal.mixin({
                customClass: {
                    container: 'sut-swal-container',
                    popup: 'sut-swal-popup',
                    title: 'sut-swal-title',
                    confirmButton: 'sut-swal-confirm',
                    cancelButton: 'sut-swal-cancel'
                },
                buttonsStyling: false,
                backdrop: `rgba(0,0,0,0.85)`,
                allowOutsideClick: false
            });

            window.alert = () => true;
            window.confirm = () => true;
            window.prompt = () => null;

            this.setupInteractionsSecurity();
            this.setupKeyboardSecurity();
            this.setupScreenshotDetection();
            this.setupStartButton();
            this.createPauseButton();
            this.removeBackButtons();

            // ตรวจจับการหลุด fullscreen ทันที ไม่ว่าจะเกิดจาก F11, ESC หรืออื่นๆ
            const checkFullscreen = () => {
                if (isExamFinished) return;
                const isFS = document.fullscreenElement ||
                             document.webkitFullscreenElement ||
                             document.mozFullScreenElement ||
                             document.msFullscreenElement;

                if (!isFS) {
                    // ล็อคหน้าจอทันที ไม่ว่า Swal จะแสดงอยู่หรือไม่
                    this.handleViolation("คุณออกจากโหมดเต็มจอ", "กรุณากลับเข้าสู่หน้าจอสอบเพื่อทำข้อสอบต่อ");
                }
            };

            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
                document.addEventListener(evt, checkFullscreen);
            });

            this.lockNavigation();

            // บังคับให้ต้องใส่รหัสผ่านก่อนออก หรือทำข้อสอบให้เสร็จเท่านั้น
            window.onbeforeunload = (e) => {
                if (isExamFinished) return;
                this.handleCloseAttempt();
                e.preventDefault();
                return (e.returnValue = "");
            };

            this.observeSubmitButton();
        },

        removeBackButtons: function() {
            const findAndHide = () => {
                // selector ครอบคลุม Moodle 4.x และ 5.x
                $(`.back-link, .mod_quiz-back-link, button[name="backbutton"], .backbutton,
                   [data-action="previous"], .qnbutton.thispage,
                   #mod_quiz_navblock, .mod_quiz-prev-nav,
                   #nav-drawer, [data-region="navigation-drawer"], [data-region="drawer"],
                   .drawer, .drawer-left, .drawer-toggles,
                   button[data-action="toggle-drawer"], [data-action="toggle-drawer"],
                   .drawertoggle, footer#page-footer, .footer-content`).hide();

                $('button, a, input[type="button"]').each(function() {
                    const btnText = $(this).text().toLowerCase();
                    const btnName = ($(this).attr('name') || "").toLowerCase();
                    if (btnText.includes('back') || btnText.includes('ย้อนกลับ') ||
                        btnName === 'previous' || btnName === 'backbutton') {
                        $(this).css('display', 'none').prop('disabled', true);
                    }
                });

                // ปิด drawer ถ้า Moodle เปิดไว้ (class="show" หรือ aria-expanded="true")
                const drawer = document.getElementById('nav-drawer') ||
                               document.querySelector('[data-region="navigation-drawer"]') ||
                               document.querySelector('[data-region="drawer"]');
                if (drawer) {
                    drawer.style.cssText = 'display:none!important;visibility:hidden!important;width:0!important;';
                }
            };

            findAndHide();
            setInterval(findAndHide, 1000);

            // MutationObserver ดักจับ element ที่ Moodle inject ทีหลัง
            const observer = new MutationObserver(() => { findAndHide(); });
            observer.observe(document.body, { childList: true, subtree: true });
        },

        triggerPauseAction: function() {
            const expected = studentData.pause_password ? String(studentData.pause_password).trim() : "";

            this.swalCustom.fire({
                title: 'ยืนยันการหยุดสอบชั่วคราว',
                text: "กรุณากรอกรหัสผ่านจากอาจารย์ผู้คุมสอบ",
                icon: 'warning',
                input: 'password',
                inputAttributes: {
                    autocapitalize: 'off',
                    autocorrect: 'off'
                },
                showCancelButton: true,
                confirmButtonText: 'ตกลง',
                cancelButtonText: 'ยกเลิก',
                preConfirm: (inputPassword) => {
                    const actual = inputPassword ? String(inputPassword).trim() : "";
                    if (expected !== "" && actual === expected) {
                        return true;
                    } else {
                        const errorMsg = (expected === "") ? "ระบบยังไม่ได้ตั้งรหัสผ่าน" : "รหัสผ่านไม่ถูกต้อง";
                        Swal.showValidationMessage(errorMsg);
                        return false;
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    isExamFinished = true;
                    window.onbeforeunload = null;

                    let targetUrl = studentData.courseid
                        ? M.cfg.wwwroot + '/course/view.php?id=' + studentData.courseid
                        : M.cfg.wwwroot;

                    // ออกจาก fullscreen ก่อน แล้วค่อย redirect
                    const exitFs = document.exitFullscreen
                        || document.webkitExitFullscreen
                        || document.mozCancelFullScreen
                        || document.msExitFullscreen;

                    if (exitFs && (document.fullscreenElement || document.webkitFullscreenElement)) {
                        exitFs.call(document).then(() => {
                            window.location.replace(targetUrl);
                        }).catch(() => {
                            window.location.replace(targetUrl);
                        });
                    } else {
                        window.location.replace(targetUrl);
                    }
                }
            });
        },

        injectStrictStyles: function() {
            if (document.getElementById("sut-protector-styles")) return;
            const style = document.createElement('style');
            style.id = "sut-protector-styles";
            style.innerHTML = `
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;600&display=swap');

                * {
                    font-family: 'Noto Sans Thai', sans-serif !important;
                }

                body { -webkit-user-select: none !important; user-select: none !important; }
                input, textarea { -webkit-user-select: text !important; user-select: text !important; }

                /* SweetAlert Custom UI */
                .sut-swal-popup { border-radius: 16px !important; padding: 2rem !important; font-family: 'Noto Sans Thai', sans-serif !important; }
                .sut-swal-title { color: #1e293b !important; font-weight: 600 !important; }
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
                    background: rgba(0, 0, 0, 0.92); backdrop-filter: blur(10px);
                    z-index: 2147483647; display: flex; justify-content: center; align-items: center;
                    pointer-events: all !important;
                }
                .sut-modal {
                    background: white; padding: 40px; border-radius: 24px;
                    text-align: center; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                }
                .sut-btn {
                    margin-top: 24px; padding: 14px 32px; background: linear-gradient(180deg, #FF8C00 0%, #FF5F00 100%);
                    color: white; border: none; border-radius: 12px;
                    cursor: pointer; width: 100%; font-weight: 600; font-size: 1.1rem;
                }

                #sut-pause-btn {
                    position: fixed; bottom: 20px; left: 20px; z-index: 9999;
                    padding: 10px 20px; background: rgba(30, 41, 59, 0.7);
                    color: white; border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px; cursor: pointer; backdrop-filter: blur(4px);
                }

                /* ซ่อน UI ที่ไม่เกี่ยวกับการสอบทั้งหมด */

                /* Navigation Drawer (เมนูซ้าย General/Topic 1-4) */
                [data-region="navigation-drawer"],
                #nav-drawer,
                .drawer,
                .drawer-left,
                .drawer-toggles,
                [data-region="drawer"],
                aside#nav-drawer,
                .block_navigation,
                .block_course_list,
                .block-region-side-pre,
                nav[aria-label="Course navigation"],

                /* ปุ่มเปิด/ปิด drawer (hamburger) */
                button[data-action="toggle-drawer"],
                [data-action="toggle-drawer"],
                #nav-drawer-toggle,
                .drawertoggle,

                /* Navbar / Header บน */
                .navbar, .fixed-top, #page-header,
                header#page-header, .site-header,
                nav.navbar,

                /* Breadcrumb */
                .breadcrumb, ol.breadcrumb, nav[aria-label="Navigation bar"],

                /* Secondary navigation (แถบเมนูรอง) */
                .secondary-navigation, #page-navbar,
                nav.moremenu, .moremenu,

                /* ปุ่ม Back / ย้อนกลับ */
                .back-link, .mod_quiz-back-link,
                button[name="backbutton"], .backbutton,

                /* Footer */
                footer#page-footer, .footer-content, .footer-dark,

                /* Block อื่นๆ ที่ไม่เกี่ยวข้อง */
                .block_adminblock, .block_settings,
                [data-region="blocks-column"],
                button[id^="single_button"] {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    width: 0 !important;
                    overflow: hidden !important;
                }

                /* ให้เนื้อหาข้อสอบขยายเต็มหน้าจอ เมื่อ drawer ถูกซ่อน */
                #page-content, #region-main, .generaltable,
                [role="main"], #maincontent,
                .que, .qtext, .formulation {
                    margin-left: 0 !important;
                    padding-left: 16px !important;
                    width: 100% !important;
                    max-width: 100% !important;
                }

                /* คงส่วน activity header (ชื่อข้อสอบ) ไว้ให้แสดงปกติ */
                .activity-header,
                .activityname,
                .activity-header .activity-name,
                .page-header-headings,
                .activity-dates,
                .activity-altcontent {
                    display: block !important;
                    visibility: visible !important;
                    width: auto !important;
                    overflow: visible !important;
                }
            `;
            document.head.appendChild(style);
        },

        setupKeyboardSecurity: function() {
            document.addEventListener('keydown', (e) => {
                if (isExamFinished) return;

                // ถ้า overlay ล็อคแสดงอยู่ บล็อคทุกปุ่มเลย
                if (document.getElementById("custom-alert-overlay")) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return false;
                }

                const key = e.key.toLowerCase();

                // บล็อค Ctrl/Meta + Keys
                if (e.metaKey || e.ctrlKey) {
                    if (['s', 'p', 'c', 'v', 'u', 'r', 'w', 'q', 't', 'n'].includes(key)) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                    // บล็อค Windows+Shift+S (Snipping Tool)
                    if (e.shiftKey && key === 's') {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                }

                // บล็อคปุ่มเดี่ยวๆ
                // หมายเหตุ: F11 และ ESC ทำงานระดับ OS จึง block โดยตรงไม่ได้
                // แต่จะถูกจัดการผ่าน fullscreenchange event แทน
                const forbiddenKeys = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11','f12' , 'escape', 'printscreen'];
                if (forbiddenKeys.includes(key)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }

                // อนุญาต Tab (เลื่อนช่อง input) แต่บล็อค Shift+Tab (ย้อนกลับ)
                if (key === 'tab' && e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }

                // บล็อค Alt ทุกกรณี (รวม Alt+Tab, Alt+F4)
                if (e.altKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }

            }, true); // useCapture = true เพื่อดักก่อน event อื่น
        },

        setupScreenshotDetection: function() {
            let blurTimer = null;
            window.addEventListener('blur', () => {
                if (isExamFinished) return;
                if (document.getElementById("custom-alert-overlay")) return;
                // delay 300ms เพื่อให้ SweetAlert มีเวลา render ก่อนตรวจสอบ
                // ป้องกัน false positive ตอนกดปุ่มหยุดสอบ
                clearTimeout(blurTimer);
                blurTimer = setTimeout(() => {
                    if (isExamFinished) return;
                    if (document.getElementById("custom-alert-overlay")) return;
                    if (Swal.isVisible()) return;
                    try { navigator.clipboard.writeText('Protected Content'); } catch(e) {}
                    this.handleViolation("ตรวจพบการสลับหน้าจอ", "ระบบตรวจพบการย้ายโฟกัสออกจากหน้าต่างสอบ");
                }, 300);
            });

            // ถ้า focus กลับมา ยกเลิก timer (กรณีสลับแป้บเดียวแล้วกลับ)
            window.addEventListener('focus', () => {
                clearTimeout(blurTimer);
            });
        },

        // overlay ล็อคเมื่อหลุด fullscreen หรือสลับหน้าจอ
        handleViolation: function(title, desc) {
            // ลบ overlay เก่าก่อน แล้วสร้างใหม่เสมอ
            const existing = document.getElementById("custom-alert-overlay");
            if (existing) existing.remove();
            Swal.close();
            // *** ไม่เรียก exitFullscreen ที่นี่ เพราะจะทำให้เกิด fullscreenchange event ซ้ำ
            // และทำให้ overlay ถูกสร้าง-ลบวนซ้ำ ***

            let warningDiv = document.createElement("div");
            warningDiv.id = "custom-alert-overlay";
            warningDiv.className = "sut-overlay";
            warningDiv.innerHTML = `
                <div class="sut-modal">
                    <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
                    <div style="color: #0f172a; font-size: 24px; font-weight: 600;">${title}</div>
                    <div style="color: #475569; margin-top: 12px; line-height: 1.6;">${desc}</div>
                    <button id="confirm-re-fs" class="sut-btn">กลับเข้าสู่การสอบ</button>
                </div>`;
            document.body.appendChild(warningDiv);

            // บล็อค keyboard ทุกปุ่มขณะ overlay แสดงอยู่
            const blockAll = (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
            };
            document.addEventListener('keydown', blockAll, true);

            document.getElementById("confirm-re-fs").onclick = () => {
                document.removeEventListener('keydown', blockAll, true);
                warningDiv.remove();
                this.forceFullscreen();
            };
        },

        // overlay เมื่อพยายามปิดหน้าต่าง บังคับให้กลับเข้าสอบหรือใส่รหัสออก
        handleCloseAttempt: function() {
            if (document.getElementById("custom-alert-overlay")) return;

            let warningDiv = document.createElement("div");
            warningDiv.id = "custom-alert-overlay";
            warningDiv.className = "sut-overlay";
            warningDiv.innerHTML = `
                <div class="sut-modal">
                    <div style="font-size: 60px; margin-bottom: 20px;">🔒</div>
                    <div style="color: #0f172a; font-size: 24px; font-weight: 600;">ไม่สามารถออกจากห้องสอบได้</div>
                    <div style="color: #475569; margin-top: 12px; line-height: 1.6;">
                        คุณต้องทำข้อสอบให้เสร็จสิ้น<br>
                        หรือกดปุ่ม <strong>"หยุดสอบ/เปลี่ยนเครื่อง"</strong><br>
                        และใส่รหัสผ่านจากอาจารย์เท่านั้น
                    </div>
                    <button id="confirm-re-fs" class="sut-btn">กลับเข้าสู่การสอบ</button>
                </div>`;
            document.body.appendChild(warningDiv);

            const blockAll = (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
            };
            document.addEventListener('keydown', blockAll, true);

            document.getElementById("confirm-re-fs").onclick = () => {
                document.removeEventListener('keydown', blockAll, true);
                warningDiv.remove();
                this.forceFullscreen();
            };
        },

        forceFullscreen: function() {
            const elem = document.documentElement;
            const rfs = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
            if (rfs) rfs.call(elem).catch(() => {});
        },

        setupStartButton: function() {
            if (document.querySelector(".sut-overlay")) return;

            let overlay = document.createElement("div");
            overlay.className = "sut-overlay";
            overlay.innerHTML = `
                <div class="sut-modal" style="max-width:480px;">
                    <div style="font-size: 48px; margin-bottom: 12px;">🔒</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 20px;">
                        SUT Exam Protector
                    </div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">
                        ระบบจะทำงานในโหมดเต็มจอและล็อคการนำทาง
                    </div>
                    <button id="enter-btn" class="sut-btn">🚀 เริ่มทำข้อสอบ</button>
                </div>`;
            document.body.appendChild(overlay);
            document.getElementById("enter-btn").onclick = () => {
                this.forceFullscreen();
                overlay.remove();
            };
        },

        observeSubmitButton: function() {
            // ดักปุ่ม submit/finish ทั้งจาก text และ name attribute (Moodle 5.x ใช้ name="next")
            $(document).on('click', 'button, input[type="submit"]', (e) => {
                const el = $(e.currentTarget);
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

            // ดักการ submit form โดยตรง (Moodle บางเวอร์ชัน submit ผ่าน form แทนปุ่ม)
            $(document).on('submit', 'form', () => {
                const form = $('form[action*="processattempt"], form[action*="finishattempt"]');
                if (form.length) {
                    isExamFinished = true;
                    window.onbeforeunload = null;
                    $("#sut-pause-btn").remove();
                }
            });
        },

        setupInteractionsSecurity: function() {
            const block = (e) => { if (isExamFinished) return; e.preventDefault(); e.stopPropagation(); };
            ['contextmenu', 'selectstart', 'copy', 'cut', 'paste', 'dragstart', 'drop'].forEach(evt => {
                document.addEventListener(evt, block, true);
            });
        },

        lockNavigation: function() {
            history.pushState(null, null, location.href);
            window.onpopstate = () => { if (!isExamFinished) history.pushState(null, null, location.href); };
        },

        createPauseButton: function() {
            if (document.getElementById("sut-pause-btn")) return;
            let btn = document.createElement("button");
            btn.innerHTML = "⏸️ หยุดสอบ/เปลี่ยนเครื่อง";
            btn.id = "sut-pause-btn";
            btn.onclick = () => this.triggerPauseAction();
            document.body.appendChild(btn);
        }
    };
});