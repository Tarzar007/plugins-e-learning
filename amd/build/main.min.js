define(['jquery', 'core/log', 'https://cdn.jsdelivr.net/npm/sweetalert2@11'], function($, log, Swal) {
    "use strict";

    let isExamFinished = false;

    return {
        init: function() {
            // 1. จัดการ Native Dialogs
            window.alert = () => true;
            window.confirm = () => true;
            window.prompt = () => null;

            // 2. รันระบบป้องกันและ UI
            this.injectStrictStyles();
            this.setupInteractionsSecurity(); 
            this.setupKeyboardSecurity();    
            this.setupScreenshotDetection(); // เพิ่มการตรวจจับ Screenshot และ Window Blur
            this.setupStartButton();
            this.createPauseButton();

            // 3. ระบบตรวจจับ Fullscreen
            const checkFullscreen = () => {
                const isFS = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
                if (!isFS && !isExamFinished && !Swal.isVisible()) {
                    this.handleViolation("คุณออกจากโหมดเต็มจอ", "กรุณากลับเข้าสู่หน้าจอสอบเพื่อทำข้อสอบต่อ");
                }
            };
            document.addEventListener("fullscreenchange", checkFullscreen);
            document.addEventListener("webkitfullscreenchange", checkFullscreen);

            // 4. ระบบป้องกันการ Navigation
            this.lockNavigation();

            window.onbeforeunload = (e) => {
                if (!isExamFinished) {
                    e.preventDefault();
                    return (e.returnValue = "คำเตือน! การสอบยังไม่สิ้นสุด");
                }
            };

            this.observeSubmitButton();
        },

        // --- ระบบตรวจจับการแคปหน้าจอและสลับแอป (Mac/Windows) ---
        setupScreenshotDetection: function() {
            // ตรวจจับเมื่อหน้าจอเสีย Focus (มักเกิดจาก Cmd+Shift+4 บน Mac หรือการสลับโปรแกรม)
            window.addEventListener('blur', () => {
                if (!isExamFinished && !Swal.isVisible()) {
                    this.handleViolation(
                        "ตรวจพบการขัดจังหวะหน้าจอ", 
                        "หน้าต่างสอบเสียการเชื่อมต่อ (อาจเกิดจากการ Capture หน้าจอ หรือสลับโปรแกรม) กรุณากลับเข้าสู่โหมดเต็มจอทันที"
                    );
                }
            });
        },

        setupKeyboardSecurity: function() {
            document.addEventListener('keydown', (e) => {
                if (isExamFinished) return;
                
                const key = e.key.toLowerCase();
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

                // 1. ดักจับคีย์ลัดพื้นฐาน (Ctrl/Alt/F12/PrintScreen)
                if (e.ctrlKey || e.altKey || e.key === 'F12' || key === 'tab' || key === 'escape' || key === 'printscreen') {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }

                // 2. ดักจับปุ่ม Command (Meta) บน Mac พิเศษ
                if (isMac && e.metaKey) {
                    // ดัก Cmd + Shift + 3/4/5 (คีย์ลัด Screenshot ของ Mac)
                    if (['3', '4', '5', 'shift'].includes(key)) {
                        this.handleViolation("ไม่อนุญาตให้บันทึกภาพ", "ตรวจพบการใช้คีย์ลัดสำหรับ Capture หน้าจอ");
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, true);
        },

        createPauseButton: function() {
            if (document.getElementById("sut-pause-btn")) return;
            let btn = document.createElement("button");
            btn.innerHTML = "⏸️ หยุดทำชั่วคราว / เปลี่ยนเครื่อง";
            btn.id = "sut-pause-btn";
            btn.onclick = () => this.triggerPauseAction();
            document.body.appendChild(btn);
        },

        triggerPauseAction: function() {
            Swal.fire({
                title: 'หยุดทำข้อสอบชั่วคราว?',
                text: "ระบบจะบันทึกสถานะไว้ และคุณสามารถกลับมาทำต่อได้",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ยืนยันหยุดทำชั่วคราว',
                cancelButtonText: 'ทำข้อสอบต่อ',
                reverseButtons: true,
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    isExamFinished = true;
                    window.onbeforeunload = null;
                    window.location.replace(M.cfg.wwwroot); 
                }
            });
        },

        lockNavigation: function() {
            history.pushState(null, null, location.href);
            window.onpopstate = () => {
                if (!isExamFinished) history.pushState(null, null, location.href);
            };
        },

        injectStrictStyles: function() {
            const style = document.createElement('style');
            style.id = "sut-protector-styles";
            style.innerHTML = `
                @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap');
                
                /* ซ่อน Moodle UI 5.1.3 */
                .back-link, .navbar, #page-header, .breadcrumb, 
                .btn-secondary[href*="view.php"], 
                [data-region="navigation-drawer"],
                .secondary-navigation, .fixed-top { 
                    display: none !important; 
                    visibility: hidden !important; 
                }

                * { -webkit-user-select: none !important; user-select: none !important; font-family: 'Kanit', sans-serif; }
                input, textarea { -webkit-user-select: text !important; user-select: text !important; }
                
                html, body { overflow: hidden !important; height: 100vh !important; background: #f8f9fa !important; margin: 0 !important; }
                
                .sut-overlay { 
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
                    background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); 
                    z-index: 2147483647; display: flex; justify-content: center; align-items: center; 
                }
                
                .sut-modal { background: white; padding: 40px; border-radius: 24px; text-align: center; max-width: 400px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                .sut-btn { margin-top: 24px; padding: 12px 32px; background: #2563eb; color: white; border: none; border-radius: 12px; cursor: pointer; width: 100%; font-weight: 600; font-size: 16px; }
                .sut-title { color: #1e293b; font-size: 22px; font-weight: 600; margin-bottom: 8px; }
                .sut-desc { color: #64748b; font-size: 15px; line-height: 1.5; }

                #sut-pause-btn {
                    position: fixed; bottom: 20px; left: 20px; z-index: 9999;
                    padding: 10px 20px; background: #64748b; color: white;
                    border: none; border-radius: 8px; cursor: pointer; font-size: 14px;
                    opacity: 0.6; transition: all 0.3s;
                }
                #sut-pause-btn:hover { opacity: 1; background: #475569; }
            `;
            document.head.appendChild(style);
        },

        handleViolation: function(title, desc) {
            if (document.getElementById("custom-alert-overlay") || Swal.isVisible()) return;
            let warningDiv = document.createElement("div");
            warningDiv.id = "custom-alert-overlay";
            warningDiv.className = "sut-overlay";
            warningDiv.innerHTML = `
                <div class="sut-modal">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
                    <div class="sut-title">${title}</div>
                    <div class="sut-desc">${desc}</div>
                    <button id="confirm-re-fs" class="sut-btn">กลับเข้าสู่การสอบ</button>
                </div>`;
            document.body.appendChild(warningDiv);
            document.getElementById("confirm-re-fs").onclick = () => {
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
            let overlay = document.createElement("div");
            overlay.className = "sut-overlay";
            overlay.innerHTML = `
                <div class="sut-modal">
                    <div style="font-size: 56px; margin-bottom: 20px;">🚀</div>
                    <div class="sut-title">SUT Exam Protector</div>
                    <div class="sut-desc">ระบบจะทำงานในโหมดเต็มจอและปิดการใช้งานฟังก์ชันที่ไม่เกี่ยวข้อง</div>
                    <button id="enter-btn" class="sut-btn">เริ่มทำข้อสอบ</button>
                </div>`;
            document.body.appendChild(overlay);
            document.getElementById("enter-btn").onclick = () => { 
                this.forceFullscreen(); 
                overlay.remove(); 
            };
        },

        observeSubmitButton: function() {
            $(document).on('click', 'button, input[type="submit"]', (e) => {
                let text = ($(e.currentTarget).text() || $(e.currentTarget).val() || "").toLowerCase();
                if (["finish", "submit", "ส่ง", "เสร็จ"].some(kw => text.includes(kw))) {
                    isExamFinished = true;
                    window.onbeforeunload = null;
                    if (document.getElementById("sut-pause-btn")) document.getElementById("sut-pause-btn").remove();
                }
            });
        },

        setupInteractionsSecurity: function() {
            const block = (e) => {
                if (isExamFinished) return;
                e.preventDefault();
                e.stopPropagation();
                return false;
            };
            ['contextmenu', 'selectstart', 'copy', 'cut', 'paste', 'dragstart', 'drop'].forEach(evt => {
                document.addEventListener(evt, block, true);
            });
        }
    };
});