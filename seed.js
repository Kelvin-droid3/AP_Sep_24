const db = require("./db");
const bcrypt = require("bcrypt");

console.log("Seeding database...");

db.serialize(() => {

  // wipe everything
  db.run("DROP TABLE IF EXISTS attendance");
  db.run("DROP TABLE IF EXISTS sessions");
  db.run("DROP TABLE IF EXISTS timetable");
  db.run("DROP TABLE IF EXISTS module_students");
  db.run("DROP TABLE IF EXISTS lecturer_modules");
  db.run("DROP TABLE IF EXISTS lecturers");
  db.run("DROP TABLE IF EXISTS students");
  db.run("DROP TABLE IF EXISTS modules");

  // create tables
  db.run(`
    CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      student_number TEXT NOT NULL,
      nfc_uid TEXT UNIQUE,
      password_hash TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE lecturers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'lecturer'
    )
  `);

  db.run(`
    CREATE TABLE modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE lecturer_modules (
      lecturer_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      PRIMARY KEY (lecturer_id, module_id)
    )
  `);

  db.run(`
    CREATE TABLE timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL,
      day TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE module_students (
      module_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      PRIMARY KEY (module_id, student_id)
    )
  `);

  db.run(`
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL,
      lecturer_id INTEGER NOT NULL,
      start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME
    )
  `);

  db.run(`
    CREATE TABLE attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (session_id, student_id)
    )
  `);

  // fake students
  const students = [
    ["Kelvin O'Brien", "MTU001", "04A1B2C3"],
    ["Aoife Murphy", "MTU002", "04A1B2C4"],
    ["Liam Walsh", "MTU003", "04A1B2C5"],
    ["Sarah Nolan", "MTU004", "04A1B2C6"],
    ["Daniel O'Shea", "MTU005", "04A1B2C7"],
    ["Emily Byrne", "MTU006", "04A1B2C8"],
    ["Jack Fitzgerald", "MTU007", "04A1B2C9"],
    ["Niamh O'Connor", "MTU008", "04A1B2D0"],
    ["Conor Ryan", "MTU009", "04A1B2D1"],
    ["Aisling Keane", "MTU010", "04A1B2D2"],
    ["Ethan Kelly", "MTU011", "04A1B2D3"],
    ["Chloe Burke", "MTU012", "04A1B2D4"],
    ["Sean Daly", "MTU013", "04A1B2D5"],
    ["Grace O'Riley", "MTU014", "04A1B2D6"],
    ["Fionn Moran", "MTU015", "04A1B2D7"],
    ["Holly Byrne", "MTU016", "04A1B2D8"],
    ["Noah Gallagher", "MTU017", "04A1B2D9"],
    ["Saoirse Quinn", "MTU018", "04A1B2E0"],
    ["Cian McCarthy", "MTU019", "04A1B2E1"],
    ["Maeve Doyle", "MTU020", "04A1B2E2"],
    ["Ronan O'Brien", "MTU021", "04A1B2E3"],
    ["Ciara Hayes", "MTU022", "04A1B2E4"],
    ["Dara Flynn", "MTU023", "04A1B2E5"],
    ["Orla Brady", "MTU024", "04A1B2E6"],
    ["Paddy Brennan", "MTU025", "04A1B2E7"],
    ["Zoe Kavanagh", "MTU026", "04A1B2E8"]
  ];

  students.forEach(s => {
    const passwordHash = bcrypt.hashSync("password123", 10);
    db.run(
      "INSERT INTO students (name, student_number, nfc_uid, password_hash) VALUES (?, ?, ?, ?)",
      [s[0], s[1], s[2], passwordHash]
    );
  });

  // fake lecturers
  const lecturers = [
    ["Brian O'Conner", "brian@mtu.ie", "password123", "admin"],
    ["Mia Toretto", "mia@mtu.ie", "password123", "lecturer"],
    ["George D O Mahony", "george@mtu.ie", "password123", "lecturer"],
    ["Angela Wright", "angela@mtu.ie", "password123", "lecturer"],
    ["Aine Ni She", "aine@mtu.ie", "password123", "lecturer"],
    ["Katie Power", "katie@mtu.ie", "password123", "lecturer"],
    ["Donagh O Mahony", "donagh@mtu.ie", "password123", "lecturer"]
  ];

  lecturers.forEach(l => {
    const passwordHash = bcrypt.hashSync(l[2], 10);
    db.run(
      "INSERT INTO lecturers (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [l[0], l[1], passwordHash, l[3]]
    );
  });

  // modules
  const modules = [
    ["CS401", "Computer Networks"],
    ["CS402", "Software Engineering"],
    ["CS403", "Cyber Security"],
    ["CS404", "Web Development"],
    ["CS405", "Mobile App Development"],
    ["COMH6002", "Computer Architecture"],
    ["COMP6035", "Computer Security Principles"],
    ["CMOD6001", "Creativity Innovation & Teamwork"],
    ["MATH6055", "Maths for Computer Science"],
    ["SOFT6018", "Programming Fundamentals"],
    ["SOFT6007", "Web Development Fundamentals"],
    ["LEGS8001", "Ethical and Legal Issues in IT"],
    ["COMP8056", "IT Solutions Architecture"],
    ["INTR8015", "Project - Implementation Phase"],
    ["COMP8028", "Security Penetration Testing"],
    ["COMH8001", "Enterprise Storage Systems"],
    ["COMP8019", "IT Service Management"],
    ["COMP8031", "IT Transformation"],
    ["INTR8016", "Project - Research Phase"],
    ["COMP8027", "Security Monitoring"],
    ["COMP8050", "Security for Software Systems"],
    ["COMP8052", "Software-Defined Networking"],
    ["COMP7040", "Technical Writing using XML"]
  ];

  modules.forEach(m => {
    db.run("INSERT INTO modules (code, name) VALUES (?, ?)", m);
  });

  // lecturer -> module mapping
  const lecturerModules = [
    [1, 1],
    [1, 3],
    [1, 4],
    [2, 2],
    [2, 5],
    [3, 7],
    [3, 10],
    [4, 8],
    [5, 9],
    [6, 12],
    [7, 14],
    [3, 6],
    [6, 11],
    [4, 13],
    [5, 15],
    [7, 16],
    [3, 17],
    [4, 18],
    [5, 19],
    [6, 20],
    [7, 21],
    [3, 22],
    [4, 23]
  ];

  lecturerModules.forEach(lm => {
    db.run("INSERT INTO lecturer_modules (lecturer_id, module_id) VALUES (?, ?)", lm);
  });

  // timetable
  const timetable = [
    [1, "Monday", "09:00", "11:00", "B201"],
    [2, "Monday", "11:00", "12:00", "C105"],
    [3, "Monday", "12:00", "14:00", "B301"],
    [4, "Tuesday", "09:00", "11:00", "Lab A"],
    [5, "Tuesday", "11:00", "12:00", "C210"],
    [6, "Wednesday", "09:00", "11:00", "B110"],
    [7, "Wednesday", "11:00", "12:00", "C215"],
    [8, "Wednesday", "12:00", "13:00", "B205"],
    [9, "Thursday", "09:00", "10:00", "B101"],
    [10, "Thursday", "10:00", "12:00", "Lab B"],
    [11, "Thursday", "13:00", "14:00", "C110"],
    [12, "Friday", "09:00", "10:00", "B202"],
    [13, "Friday", "10:00", "11:00", "C115"],
    [14, "Friday", "11:00", "13:00", "Lab C"],
    [15, "Monday", "14:00", "15:00", "B305"],
    [16, "Tuesday", "14:00", "15:00", "C120"],
    [17, "Wednesday", "14:00", "15:00", "B210"],
    [18, "Thursday", "14:00", "15:00", "C130"],
    [19, "Friday", "14:00", "15:00", "B220"],
    [20, "Monday", "15:00", "16:00", "C140"],
    [21, "Tuesday", "15:00", "16:00", "B230"],
    [22, "Wednesday", "15:00", "16:00", "C150"],
    [23, "Thursday", "15:00", "16:00", "B240"]
  ];

  timetable.forEach(t => {
    db.run(
      "INSERT INTO timetable (module_id, day, start_time, end_time, room) VALUES (?, ?, ?, ?, ?)",
      t
    );
  });

  // module -> students mapping (simple spread for demo)
  const moduleStudents = [
    [1, 1], [1, 2], [1, 3],
    [2, 1], [2, 4], [2, 5],
    [3, 2], [3, 6],
    [4, 3], [4, 7],
    [5, 4], [5, 8],
    [6, 1], [6, 9],
    [7, 2], [7, 10],
    [8, 3], [8, 11],
    [9, 4], [9, 12],
    [10, 5], [10, 13],
    [11, 6], [11, 14],
    [12, 7], [12, 15],
    [13, 8], [13, 16],
    [14, 9], [14, 17],
    [15, 10], [15, 18],
    [16, 11], [16, 19],
    [17, 12], [17, 20],
    [18, 13], [18, 21],
    [19, 14], [19, 22],
    [20, 15], [20, 23],
    [21, 16], [21, 24],
    [22, 17], [22, 25],
    [23, 18], [23, 26]
  ];

  moduleStudents.forEach(ms => {
    db.run("INSERT INTO module_students (module_id, student_id) VALUES (?, ?)", ms);
  });

  // create an active session for CS401 with Brian
  db.run(
    "INSERT INTO sessions (module_id, lecturer_id) VALUES (?, ?)",
    [1, 1]
  );

  console.log("Seeding complete.");
});

db.close();
