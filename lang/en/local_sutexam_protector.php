<?php
// ไฟล์: local/sutexam_protector/lang/en/local_sutexam_protector.php

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Full Screen Exam Lock Plugin';

// ส่วนการตั้งค่าในหน้า Quiz (Settings Header)
$string['sutexam_protector_hdr'] = 'Full Screen Exam Lock Settings';

// ฟิลด์เปิด/ปิด
$string['sutenabled'] = 'Enable Full Screen Exam Lock Settings';
$string['sutenabled_help'] = 'If enabled, this quiz will be locked in full-screen mode, and navigation/key shortcuts will be restricted to prevent cheating.';

// ฟิลด์รหัสผ่าน
$string['sutpassword'] = 'Pause/Change Device Password';
$string['sutpassword_help'] = 'A password required by the proctor to temporarily pause the exam or allow the student to change computers.';

// ข้อความแจ้งเตือน (กรณีต้องการใช้ในอนาคต)
$string['violation_title'] = 'Security Violation Detected';
$string['violation_desc'] = 'You have left full-screen mode or switched windows. Please click the button below to return to the exam.';