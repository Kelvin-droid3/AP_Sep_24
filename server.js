const express = require("express");
const cors = require("cors");
const session = require("express-session");
const authRoutes = require("./routes/auth");
const studentsRoutes = require("./routes/students");
const modulesRoutes = require("./routes/modules");
const attendanceRoutes = require("./routes/attendance");
const nfcRoutes = require("./routes/nfc");
const lecturerRoutes = require("./routes/lecturer");
const sessionsRoutes = require("./routes/sessions");
const timetableRoutes = require("./routes/timetable");
const adminRoutes = require("./routes/admin");
const studentRoutes = require("./routes/student");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/modules", modulesRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api", nfcRoutes);
app.use("/api/lecturer", lecturerRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
