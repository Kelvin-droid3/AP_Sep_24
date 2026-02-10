const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireLogin, (req, res) => {
  db.all("SELECT * FROM modules", [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

router.get("/:id/students", requireLogin, (req, res) => {
  const moduleId = Number(req.params.id);
  db.all(
    `
      SELECT students.id, students.name, students.student_number, students.nfc_uid
      FROM module_students
      JOIN students ON module_students.student_id = students.id
      WHERE module_students.module_id = ?
      ORDER BY students.name
    `,
    [moduleId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

module.exports = router;
