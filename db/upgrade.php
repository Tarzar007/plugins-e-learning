<?php
defined('MOODLE_INTERNAL') || die();

function xmldb_local_sutexam_protector_upgrade($oldversion) {
    global $DB;
    $dbman = $DB->get_manager();

    if ($oldversion < 2026032600) {
        $table = new xmldb_table('quiz');

        // 1. เพิ่มฟิลด์ sutenabled
        $field_enabled = new xmldb_field('sutenabled', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'timeclose');
        if (!$dbman->field_exists($table, $field_enabled)) {
            $dbman->add_field($table, $field_enabled);
        }

        // 2. เพิ่มฟิลด์ sutpassword (ต้องมีเพื่อให้ lib.php ทำงานได้)
        $field_password = new xmldb_field('sutpassword', XMLDB_TYPE_CHAR, '255', null, null, null, null, 'sutenabled');
        if (!$dbman->field_exists($table, $field_password)) {
            $dbman->add_field($table, $field_password);
        }

        upgrade_plugin_savepoint(true, 2026032600, 'local', 'sutexam_protector');
    }
    return true;
}