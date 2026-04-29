<?php
// ไฟล์: local/sutexam_protector/db/upgrade.php

function xmldb_local_sutexam_protector_upgrade($oldversion) {
    global $DB;
    $dbman = $DB->get_manager();

    if ($oldversion < 2026032600) { // เลขเวอร์ชันนี้ต้องสัมพันธ์กับ version.php
        $table = new xmldb_table('quiz');
        $field = new xmldb_field('sutenabled', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'timeclose');

        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_plugin_savepoint(true, 2026032600, 'local', 'sutexam_protector');
    }
    return true;
}