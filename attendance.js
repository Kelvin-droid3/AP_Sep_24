const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireLogin, (req, res) => {
  const { session_id, module_id, student_id, start_date, end_date } = req.query;
  const params = [];
  let where = "";

  if (session_id) {
    where += " WHERE attendance.session_id = ?";
    params.push(session_id);
  }

  if (module_id) {
    where += where ? " AND" : " WHERE";
    where += " sessions.module_id = ?";
    params.push(module_id);
  }

  if (student_id) {
    where += where ? " AND" : " WHERE";
    where += " attendance.student_id = ?";
    params.push(student_id);
  }

  if (start_date) {
    where += where ? " AND" : " WHERE";
    where += " date(attendance.timestamp) >= date(?)";
    params.push(start_date);
  }

  if (end_date) {
    where += where ? " AND" : " WHERE";
    where += " date(attendance.timestamp) <= date(?)";
    params.push(end_date);
  }

  db.all(
    `
      SELECT students.name, students.student_number, modules.code, modules.name AS module_name,
             attendance.timestamp, attendance.session_id
      FROM attendance
      JOIN students ON attendance.student_id = students.id
      JOIN sessions ON attendance.session_id = sessions.id
      JOIN modules ON sessions.module_id = modules.id
      ${where}
      ORDER BY attendance.timestamp DESC
    `,
    params,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

module.exports = router;
