const express = require("express");
const db = require("../db");

const router = express.Router();

router.post("/tap", (req, res) => {
  const { nfc_uid, module_id } = req.body;

  if (!nfc_uid || !module_id) {
    return res.status(400).json({ error: "Missing NFC UID or module_id" });
  }

  db.get(
    "SELECT * FROM students WHERE nfc_uid = ?",
    [nfc_uid],
    (err, student) => {
      if (err) return res.status(500).json(err);
      if (!student) return res.status(404).json({ error: "Unknown card" });

      db.get(
        "SELECT * FROM sessions WHERE module_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1",
        [module_id],
        (sessionErr, sessionRow) => {
          if (sessionErr) return res.status(500).json(sessionErr);
          if (!sessionRow) {
            return res.status(400).json({ error: "No active session for module" });
          }

          db.run(
            "INSERT INTO attendance (session_id, student_id) VALUES (?, ?)",
            [sessionRow.id, student.id],
            (insertErr) => {
              if (insertErr) {
                if (String(insertErr.message).includes("UNIQUE")) {
                  return res.json({
                    success: true,
                    already_logged: true,
                    name: student.name,
                    module_id
                  });
                }
                return res.status(500).json(insertErr);
              }
              res.json({
                success: true,
                name: student.name,
                module_id,
                session_id: sessionRow.id
              });
            }
          );
        }
      );
    }
  );
});

module.exports = router;
