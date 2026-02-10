const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireLogin, (req, res) => {
  const { module_id } = req.body;
  const lecturerId = req.session.user.id;

  if (!module_id) return res.status(400).json({ error: "Missing module_id" });

  db.get(
    "SELECT 1 FROM lecturer_modules WHERE lecturer_id = ? AND module_id = ?",
    [lecturerId, module_id],
    (err, row) => {
      if (err) return res.status(500).json(err);
      if (!row) return res.status(403).json({ error: "Not assigned to module" });

      db.run(
        "INSERT INTO sessions (module_id, lecturer_id) VALUES (?, ?)",
        [module_id, lecturerId],
        function (insertErr) {
          if (insertErr) return res.status(500).json(insertErr);
          res.json({ id: this.lastID, module_id, lecturer_id: lecturerId });
        }
      );
    }
  );
});

router.post("/:id/end", requireLogin, (req, res) => {
  const sessionId = req.params.id;
  const lecturerId = req.session.user.id;

  db.run(
    "UPDATE sessions SET end_time = CURRENT_TIMESTAMP WHERE id = ? AND lecturer_id = ? AND end_time IS NULL",
    [sessionId, lecturerId],
    function (err) {
      if (err) return res.status(500).json(err);
      if (this.changes === 0) {
        return res.status(400).json({ error: "Session not found or already ended" });
      }
      res.json({ success: true });
    }
  );
});

router.get("/active", requireLogin, (req, res) => {
  const { module_id } = req.query;
  if (!module_id) return res.status(400).json({ error: "Missing module_id" });

  db.get(
    "SELECT * FROM sessions WHERE module_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1",
    [module_id],
    (err, row) => {
      if (err) return res.status(500).json(err);
      res.json(row || null);
    }
  );
});

router.get("/history", requireLogin, (req, res) => {
  const { module_id, start_date, end_date } = req.query;
  if (!module_id) return res.status(400).json({ error: "Missing module_id" });

  const params = [module_id];
  let where = "WHERE sessions.module_id = ?";

  if (start_date) {
    where += " AND date(sessions.start_time) >= date(?)";
    params.push(start_date);
  }

  if (end_date) {
    where += " AND date(sessions.start_time) <= date(?)";
    params.push(end_date);
  }

  db.all(
    `
      SELECT sessions.id, sessions.start_time, sessions.end_time,
             modules.code, modules.name AS module_name,
             COUNT(attendance.id) AS attendance_count
      FROM sessions
      JOIN modules ON sessions.module_id = modules.id
      LEFT JOIN attendance ON attendance.session_id = sessions.id
      ${where}
      GROUP BY sessions.id
      ORDER BY sessions.start_time DESC
    `,
    params,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

module.exports = router;
