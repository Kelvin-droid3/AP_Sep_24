const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireLogin, (req, res) => {
  db.all("SELECT * FROM students", [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

router.put("/:id/nfc", requireLogin, (req, res) => {
  const studentId = Number(req.params.id);
  const { nfc_uid, module_id } = req.body;

  if (!nfc_uid || !module_id) {
    return res.status(400).json({ error: "Missing nfc_uid or module_id" });
  }

  db.get(
    "SELECT 1 FROM module_students WHERE module_id = ? AND student_id = ?",
    [module_id, studentId],
    (checkErr, row) => {
      if (checkErr) return res.status(500).json(checkErr);
      if (!row) return res.status(403).json({ error: "Student not in module" });

      db.run(
        "UPDATE students SET nfc_uid = ? WHERE id = ?",
        [nfc_uid, studentId],
        function (err) {
          if (err) return res.status(500).json(err);
          if (this.changes === 0) return res.status(404).json({ error: "Not found" });
          res.json({ id: studentId, nfc_uid });
        }
      );
    }
  );
});

module.exports = router;
