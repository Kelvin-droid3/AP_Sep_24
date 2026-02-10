const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const { requireStudent } = require("../middleware/auth");

const router = express.Router();

router.post("/auth/login", (req, res) => {
  const { student_number, password } = req.body;
  if (!student_number || !password) {
    return res.status(400).json({ error: "Missing student_number or password" });
  }

  db.get(
    "SELECT * FROM students WHERE student_number = ?",
    [student_number],
    (err, row) => {
      if (err) return res.status(500).json(err);
      if (!row) return res.status(401).json({ error: "Invalid credentials" });

      const ok = bcrypt.compareSync(password, row.password_hash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      req.session.student = {
        id: row.id,
        name: row.name,
        student_number: row.student_number
      };

      res.json({ id: row.id, name: row.name, student_number: row.student_number });
    }
  );
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", (req, res) => {
  res.json({ student: req.session.student || null });
});

router.get("/modules", requireStudent, (req, res) => {
  const studentId = req.session.student.id;
  db.all(
    `
      SELECT modules.id, modules.code, modules.name
      FROM module_students
      JOIN modules ON module_students.module_id = modules.id
      WHERE module_students.student_id = ?
      ORDER BY modules.code
    `,
    [studentId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

router.get("/timetable", requireStudent, (req, res) => {
  const studentId = req.session.student.id;
  db.all(
    `
      SELECT timetable.day, timetable.start_time, timetable.end_time,
             timetable.room,
             modules.id AS module_id, modules.code, modules.name
      FROM module_students
      JOIN timetable ON module_students.module_id = timetable.module_id
      JOIN modules ON modules.id = module_students.module_id
      WHERE module_students.student_id = ?
      ORDER BY timetable.day, timetable.start_time
    `,
    [studentId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

router.get("/modules/:id/details", requireStudent, (req, res) => {
  const studentId = req.session.student.id;
  const moduleId = Number(req.params.id);

  db.get(
    `
      SELECT modules.id, modules.code, modules.name
      FROM module_students
      JOIN modules ON module_students.module_id = modules.id
      WHERE module_students.student_id = ? AND module_students.module_id = ?
    `,
    [studentId, moduleId],
    (err, moduleRow) => {
      if (err) return res.status(500).json(err);
      if (!moduleRow) return res.status(404).json({ error: "Module not found" });

      db.all(
        `
          SELECT lecturers.name
          FROM lecturer_modules
          JOIN lecturers ON lecturer_modules.lecturer_id = lecturers.id
          WHERE lecturer_modules.module_id = ?
        `,
        [moduleId],
        (lecErr, lecturers) => {
          if (lecErr) return res.status(500).json(lecErr);

          db.all(
            `
              SELECT day, start_time, end_time, room
              FROM timetable
              WHERE module_id = ?
              ORDER BY day, start_time
            `,
            [moduleId],
            (timeErr, timetableRows) => {
              if (timeErr) return res.status(500).json(timeErr);
              res.json({
                module: moduleRow,
                lecturers: lecturers.map(l => l.name),
                timetable: timetableRows
              });
            }
          );
        }
      );
    }
  );
});

router.get("/attendance", requireStudent, (req, res) => {
  const studentId = req.session.student.id;
  db.all(
    `
      SELECT attendance.timestamp, sessions.id AS session_id,
             modules.code, modules.name AS module_name
      FROM attendance
      JOIN sessions ON attendance.session_id = sessions.id
      JOIN modules ON sessions.module_id = modules.id
      WHERE attendance.student_id = ?
      ORDER BY attendance.timestamp DESC
    `,
    [studentId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

router.post("/auth/change-password", requireStudent, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: "Missing current_password or new_password" });
  }

  const studentId = req.session.student.id;
  db.get(
    "SELECT * FROM students WHERE id = ?",
    [studentId],
    (err, row) => {
      if (err) return res.status(500).json(err);
      if (!row) return res.status(404).json({ error: "Student not found" });

      const ok = bcrypt.compareSync(current_password, row.password_hash);
      if (!ok) return res.status(401).json({ error: "Invalid current password" });

      const passwordHash = bcrypt.hashSync(new_password, 10);
      db.run(
        "UPDATE students SET password_hash = ? WHERE id = ?",
        [passwordHash, studentId],
        function (updateErr) {
          if (updateErr) return res.status(500).json(updateErr);
          res.json({ success: true });
        }
      );
    }
  );
});

module.exports = router;
