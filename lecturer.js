const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

router.get("/modules", requireLogin, (req, res) => {
  const lecturerId = req.session.user.id;

  db.all(
    `
      SELECT modules.id, modules.code, modules.name
      FROM modules
      JOIN lecturer_modules ON modules.id = lecturer_modules.module_id
      WHERE lecturer_modules.lecturer_id = ?
    `,
    [lecturerId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

router.get("/:id/modules", requireLogin, (req, res) => {
  const lecturerId = Number(req.params.id);
  const currentUser = req.session.user;

  if (currentUser.role !== "admin" && currentUser.id !== lecturerId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.all(
    `
      SELECT modules.id, modules.code, modules.name
      FROM modules
      JOIN lecturer_modules ON modules.id = lecturer_modules.module_id
      WHERE lecturer_modules.lecturer_id = ?
    `,
    [lecturerId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

module.exports = router;
