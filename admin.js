const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const { requireLogin, requireRole } = require("../middleware/auth");

const router = express.Router();

const adminOnly = [requireLogin, requireRole("admin")];
const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
};

// Lecturers
router.get("/lecturers", adminOnly, (req, res) => {
  db.all(
    "SELECT id, name, email, role FROM lecturers ORDER BY name",
    [],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

router.post("/lecturers", adminOnly, (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing name, email, or password" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const roleValue = role === "admin" ? "admin" : "lecturer";

  db.run(
    "INSERT INTO lecturers (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    [name, email, passwordHash, roleValue],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID, name, email, role: roleValue });
    }
  );
});

router.put("/lecturers/:id", adminOnly, (req, res) => {
  const lecturerId = Number(req.params.id);
  const { name, email, password, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Missing name or email" });
  }

  const roleValue = role === "admin" ? "admin" : "lecturer";
  const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

  const sql = passwordHash
    ? "UPDATE lecturers SET name = ?, email = ?, password_hash = ?, role = ? WHERE id = ?"
    : "UPDATE lecturers SET name = ?, email = ?, role = ? WHERE id = ?";

  const params = passwordHash
    ? [name, email, passwordHash, roleValue, lecturerId]
    : [name, email, roleValue, lecturerId];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json(err);
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ id: lecturerId, name, email, role: roleValue });
  });
});

router.delete("/lecturers/:id", adminOnly, (req, res) => {
  const lecturerId = Number(req.params.id);
  if (req.session.user.id === lecturerId) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  db.run("DELETE FROM lecturers WHERE id = ?", [lecturerId], function (err) {
    if (err) return res.status(500).json(err);
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });
});

// Modules
router.get("/modules", adminOnly, (req, res) => {
  db.all("SELECT * FROM modules ORDER BY code", [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

router.post("/modules", adminOnly, (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) return res.status(400).json({ error: "Missing code or name" });

  db.run(
    "INSERT INTO modules (code, name) VALUES (?, ?)",
    [code, name],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID, code, name });
    }
  );
});

router.put("/modules/:id", adminOnly, (req, res) => {
  const moduleId = Number(req.params.id);
  const { code, name } = req.body;
  if (!code || !name) return res.status(400).json({ error: "Missing code or name" });

  db.run(
    "UPDATE modules SET code = ?, name = ? WHERE id = ?",
    [code, name, moduleId],
    function (err) {
      if (err) return res.status(500).json(err);
      if (this.changes === 0) return res.status(404).json({ error: "Not found" });
      res.json({ id: moduleId, code, name });
    }
  );
});

router.delete("/modules/:id", adminOnly, (req, res) => {
  const moduleId = Number(req.params.id);

  db.run("DELETE FROM modules WHERE id = ?", [moduleId], function (err) {
    if (err) return res.status(500).json(err);
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });
});

// Module -> students assignment
router.get("/modules/:id/students", adminOnly, (req, res) => {
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

router.post("/modules/:id/students", adminOnly, (req, res) => {
  const moduleId = Number(req.params.id);
  const { student_id } = req.body;
  if (!student_id) return res.status(400).json({ error: "Missing student_id" });

  db.run(
    "INSERT INTO module_students (module_id, student_id) VALUES (?, ?)",
    [moduleId, student_id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ success: true, module_id: moduleId, student_id });
    }
  );
});

router.delete("/modules/:id/students/:student_id", adminOnly, (req, res) => {
  const moduleId = Number(req.params.id);
  const studentId = Number(req.params.student_id);

  db.run(
    "DELETE FROM module_students WHERE module_id = ? AND student_id = ?",
    [moduleId, studentId],
    function (err) {
      if (err) return res.status(500).json(err);
      if (this.changes === 0) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    }
  );
});

// Students
router.get("/students", adminOnly, (req, res) => {
  db.all("SELECT * FROM students ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

router.post("/students", adminOnly, (req, res) => {
  const { name, student_number, nfc_uid } = req.body;
  if (!name || !student_number) {
    return res.status(400).json({ error: "Missing name or student_number" });
  }

  db.run(
    "INSERT INTO students (name, student_number, nfc_uid) VALUES (?, ?, ?)",
    [name, student_number, nfc_uid || null],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID, name, student_number, nfc_uid: nfc_uid || null });
    }
  );
});

router.put("/students/:id", adminOnly, (req, res) => {
  const studentId = Number(req.params.id);
  const { name, student_number, nfc_uid } = req.body;
  if (!name || !student_number) {
    return res.status(400).json({ error: "Missing name or student_number" });
  }

  db.run(
    "UPDATE students SET name = ?, student_number = ?, nfc_uid = ? WHERE id = ?",
    [name, student_number, nfc_uid || null, studentId],
    function (err) {
      if (err) return res.status(500).json(err);
      if (this.changes === 0) return res.status(404).json({ error: "Not found" });
      res.json({ id: studentId, name, student_number, nfc_uid: nfc_uid || null });
    }
  );
});

router.delete("/students/:id", adminOnly, (req, res) => {
  const studentId = Number(req.params.id);
  db.run("DELETE FROM students WHERE id = ?", [studentId], function (err) {
    if (err) return res.status(500).json(err);
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });
});

// Assign lecturer to module
router.post("/lecturers/:id/modules", adminOnly, (req, res) => {
  const lecturerId = Number(req.params.id);
  const { module_id } = req.body;
  if (!module_id) return res.status(400).json({ error: "Missing module_id" });

  db.run(
    "INSERT INTO lecturer_modules (lecturer_id, module_id) VALUES (?, ?)",
    [lecturerId, module_id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ success: true, lecturer_id: lecturerId, module_id });
    }
  );
});

router.delete("/lecturers/:id/modules/:module_id", adminOnly, (req, res) => {
  const lecturerId = Number(req.params.id);
  const moduleId = Number(req.params.module_id);

  db.run(
    "DELETE FROM lecturer_modules WHERE lecturer_id = ? AND module_id = ?",
    [lecturerId, moduleId],
    function (err) {
      if (err) return res.status(500).json(err);
      if (this.changes === 0) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    }
  );
});

// Admin session control
router.post("/sessions/:id/end", adminOnly, (req, res) => {
  const sessionId = Number(req.params.id);
  db.run(
    "UPDATE sessions SET end_time = CURRENT_TIMESTAMP WHERE id = ? AND end_time IS NULL",
    [sessionId],
    function (err) {
      if (err) return res.status(500).json(err);
      if (this.changes === 0) {
        return res.status(400).json({ error: "Session not found or already ended" });
      }
      res.json({ success: true });
    }
  );
});

router.post("/sessions/end-active", adminOnly, (req, res) => {
  const { module_id } = req.body;
  if (!module_id) return res.status(400).json({ error: "Missing module_id" });

  db.run(
    `
      UPDATE sessions
      SET end_time = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id FROM sessions
        WHERE module_id = ? AND end_time IS NULL
        ORDER BY start_time DESC
        LIMIT 1
      )
    `,
    [module_id],
    function (err) {
      if (err) return res.status(500).json(err);
      if (this.changes === 0) {
        return res.status(400).json({ error: "No active session for module" });
      }
      res.json({ success: true });
    }
  );
});

// Sessions + attendance export
router.get("/sessions", adminOnly, (req, res) => {
  db.all(
    `
      SELECT sessions.id, sessions.start_time, sessions.end_time,
             modules.id AS module_id, modules.code, modules.name AS module_name,
             lecturers.id AS lecturer_id, lecturers.name AS lecturer_name
      FROM sessions
      JOIN modules ON sessions.module_id = modules.id
      JOIN lecturers ON sessions.lecturer_id = lecturers.id
      ORDER BY sessions.start_time DESC
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

router.get("/attendance/export", adminOnly, (req, res) => {
  const { session_id, module_id, format } = req.query;
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

  db.all(
    `
      SELECT students.name, students.student_number,
             modules.code, modules.name AS module_name,
             sessions.id AS session_id, sessions.start_time, sessions.end_time,
             attendance.timestamp
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

      if (format === "csv") {
        const header = [
          "name",
          "student_number",
          "module_code",
          "module_name",
          "session_id",
          "session_start",
          "session_end",
          "attendance_timestamp"
        ].join(",");

        const lines = rows.map((r) =>
          [
            csvEscape(r.name),
            csvEscape(r.student_number),
            csvEscape(r.code),
            csvEscape(r.module_name),
            csvEscape(r.session_id),
            csvEscape(r.start_time),
            csvEscape(r.end_time),
            csvEscape(r.timestamp)
          ].join(",")
        );

        const csv = [header, ...lines].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=attendance.csv");
        return res.send(csv);
      }

      res.json(rows);
    }
  );
});

module.exports = router;
