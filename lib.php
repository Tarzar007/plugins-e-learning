<?php
defined('MOODLE_INTERNAL') || die();

function local_sutexam_protector_before_footer() {
    global $PAGE, $USER, $DB;

    // ✅ 1. ต้องเป็นหน้า Quiz Attempt เท่านั้น
    if ($PAGE->pagetype !== 'mod-quiz-attempt') {
        return;
    }

    // ✅ 2. ต้อง login
    if (!isloggedin() || isguestuser()) {
        return;
    }

    // ✅ 3. ต้องเป็น "นักเรียน" (student role)
    if (!user_has_role_assignment($USER->id, 5)) {
        return;
    }

    // ✅ 4. ตรวจว่าเป็น attempt จริง (ไม่ใช่ preview)
    $attemptid = optional_param('attempt', 0, PARAM_INT);
    if (!$attemptid) {
        return;
    }

    $attempt = $DB->get_record('quiz_attempts', ['id' => $attemptid]);

    if (!$attempt || $attempt->preview == 1) {
        return;
    }

    // 🚀 โหลด JS
    $PAGE->requires->js_call_amd(
        'local_sutexam_protector/main',
        'init',
        [
            'userid' => $USER->id,
            'fullname' => fullname($USER),
            'attemptid' => $attemptid
        ]
    );
}