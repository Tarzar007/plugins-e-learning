<?php
defined('MOODLE_INTERNAL') || die();

/**
 * 1. เพิ่มฟิลด์ตั้งค่าในหน้าแก้ไข Quiz
 */
function local_sutexam_protector_coursemodule_standard_elements($formwrapper, $mform) {
    if ($formwrapper->get_coursemodule() && $formwrapper->get_coursemodule()->modname === 'quiz') {

        $mform->addElement('header', 'sutexam_protector_hdr', 'SUT Exam Protector Settings');

        // ปุ่มเปิด/ปิดระบบ
        $mform->addElement('selectyesno', 'sutenabled', 'เปิดใช้งานระบบป้องกัน SUT Exam Protector');
        $mform->setDefault('sutenabled', 0);

        // ช่องกรอกรหัสผ่านสำหรับหยุดสอบ
        $mform->addElement('text', 'sutpassword', 'รหัสผ่านสำหรับหยุดสอบ', array('size' => '20'));
        $mform->setType('sutpassword', PARAM_TEXT);
        
        // แสดงช่องกรอกรหัสเฉพาะเมื่อเลือก "Yes" ใน sutenabled
        $mform->hideIf('sutpassword', 'sutenabled', 'eq', 0);
    }
}

/**
 * 2. บันทึกข้อมูลเมื่อกด Save Quiz
 */
function local_sutexam_protector_coursemodule_edit_post_actions($quiz) {
    global $DB;

    // รับค่าจาก Form
    $sutenabled = optional_param('sutenabled', 0, PARAM_INT);
    $sutpassword = optional_param('sutpassword', '', PARAM_TEXT);

    // ตรวจสอบคอลัมน์ในฐานข้อมูลก่อนบันทึก
    $columns = $DB->get_columns('quiz');
    if (isset($columns['sutenabled']) && isset($columns['sutpassword'])) {
        $record = new stdClass();
        $record->id = $quiz->id;
        $record->sutenabled = $sutenabled;
        $record->sutpassword = trim($sutpassword);

        $DB->update_record('quiz', $record);
    }

    return $quiz;
}

/**
 * 3. โหลด JavaScript และส่งค่า Parameters
 */
function local_sutexam_protector_before_footer() {
    global $PAGE, $USER, $DB;

    // รันเฉพาะหน้าทำข้อสอบ
    if ($PAGE->pagetype !== 'mod-quiz-attempt') {
        return;
    }

    if (!isloggedin() || isguestuser()) {
        return;
    }

    $attemptid = optional_param('attempt', 0, PARAM_INT);
    if (!$attemptid) {
        return;
    }

    try {
        // ดึงข้อมูล Attempt
        $attempt = $DB->get_record('quiz_attempts', ['id' => $attemptid], '*', MUST_EXIST);
        if ($attempt->preview == 1) {
            return;
        }

        // ดึงข้อมูล Quiz
        $quiz = $DB->get_record('quiz', ['id' => $attempt->quiz], 'id, course, sutenabled, sutpassword', MUST_EXIST);
        if (empty($quiz->sutenabled)) {
            return;
        }

        // เช็คสิทธิ์ (อาจารย์ไม่ต้องโดนล็อคหน้าจอ)
        $context = context_module::instance($PAGE->cm->id);
        if (has_capability('mod/quiz:viewreports', $context)) {
            return;
        }

        // เตรียมรหัสผ่านให้เป็น String เสมอ (ป้องกัน undefined)
        $pause_password = isset($quiz->sutpassword) ? (string)$quiz->sutpassword : '';

        // ส่งค่าไป JavaScript
 $PAGE->requires->js_call_amd(
    'local_sutexam_protector/main',
    'init',
    [
        [ // <--- เพิ่มก้อน Array หุ้มตรงนี้
            'userid'         => (int)$USER->id,
            'fullname'       => fullname($USER),
            'attemptid'      => (int)$attemptid,
            'courseid'       => (int)$quiz->course,
            'pause_password' => (string)$pause_password 
        ] // <--- ปิดก้อน Array
    ]
);
    } catch (Exception $e) {
        debugging('SUT Exam Protector Error: ' . $e->getMessage());
    }
}