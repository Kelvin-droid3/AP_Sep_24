const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const requireRole = (role) => (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.session.user.role !== role) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

module.exports = {
  requireLogin,
  requireRole,
  requireStudent: (req, res, next) => {
    if (!req.session.student) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }
};
