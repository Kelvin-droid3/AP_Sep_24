const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireLogin, (req, res) => {
  db.all(
    `
      SELECT timetable.id, modules.code, modules.name, timetable.day,
             timetable.start_time, timetable.end_time
      FROM timetable
      JOIN modules ON timetable.module_id = modules.id
      ORDER BY timetable.day, timetable.start_time
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

module.exports = router;
