import os
import sqlite3
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "attendance.db")


def get_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript(
        """
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            card_uid TEXT UNIQUE,
            mobile_token TEXT UNIQUE
        );

        CREATE TABLE IF NOT EXISTS lecturers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            reader_id TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS lectures (
            id INTEGER PRIMARY KEY,
            module_code TEXT NOT NULL,
            module_name TEXT NOT NULL,
            lecturer_id INTEGER NOT NULL,
            room_id INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            FOREIGN KEY (lecturer_id) REFERENCES lecturers(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        );

        CREATE TABLE IF NOT EXISTS enrollments (
            student_id INTEGER NOT NULL,
            lecture_id INTEGER NOT NULL,
            PRIMARY KEY (student_id, lecture_id),
            FOREIGN KEY (student_id) REFERENCES students(id),
            FOREIGN KEY (lecture_id) REFERENCES lectures(id)
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY,
            student_id INTEGER NOT NULL,
            lecture_id INTEGER NOT NULL,
            tapped_at TEXT NOT NULL,
            method TEXT NOT NULL,
            credential_type TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id),
            FOREIGN KEY (lecture_id) REFERENCES lectures(id)
        );
        """
    )
    conn.commit()
    conn.close()


def seed_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM students")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    students = [
        (1, "Aoife O'Brien", "04A1B2C3D4", "mtu-token-aoife"),
        (2, "Declan Murphy", "0499AA77BB", "mtu-token-declan"),
        (3, "Niamh Kelly", "04DEADBEEF", "mtu-token-niamh"),
    ]
    lecturers = [
        (1, "Dr. Sean Walsh"),
        (2, "Prof. Ciara O'Sullivan"),
    ]
    rooms = [
        (1, "IT101", "reader-it101"),
        (2, "Eng202", "reader-eng202"),
    ]

    now = datetime.now()
    today_9 = now.replace(hour=9, minute=0, second=0, microsecond=0)
    today_10 = today_9 + timedelta(hours=1)
    today_11 = today_10 + timedelta(hours=1)
    today_12 = today_11 + timedelta(hours=1)

    lectures = [
        (
            1,
            "CS401",
            "Distributed Systems",
            1,
            1,
            today_9.isoformat(),
            today_10.isoformat(),
        ),
        (
            2,
            "EE305",
            "Embedded Design",
            2,
            2,
            today_11.isoformat(),
            today_12.isoformat(),
        ),
    ]

    enrollments = [
        (1, 1),
        (2, 1),
        (2, 2),
        (3, 2),
    ]

    cursor.executemany("INSERT INTO students VALUES (?, ?, ?, ?)", students)
    cursor.executemany("INSERT INTO lecturers VALUES (?, ?)", lecturers)
    cursor.executemany("INSERT INTO rooms VALUES (?, ?, ?)", rooms)
    cursor.executemany("INSERT INTO lectures VALUES (?, ?, ?, ?, ?, ?, ?)", lectures)
    cursor.executemany("INSERT INTO enrollments VALUES (?, ?)", enrollments)
    conn.commit()
    conn.close()


def setup_database():
    init_db()
    seed_db()
