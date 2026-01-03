from datetime import datetime
from io import StringIO
import csv

from flask import Flask, redirect, render_template, request, send_file, url_for, jsonify

from db import get_db, setup_database


app = Flask(__name__)


@app.before_first_request
def initialize():
    setup_database()


def _fetch_one(query, params=()):
    conn = get_db()
    cursor = conn.execute(query, params)
    row = cursor.fetchone()
    conn.close()
    return row


def _fetch_all(query, params=()):
    conn = get_db()
    cursor = conn.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return rows


def _execute(query, params=()):
    conn = get_db()
    conn.execute(query, params)
    conn.commit()
    conn.close()


@app.route("/")
def index():
    students = _fetch_all("SELECT id, name FROM students ORDER BY name")
    lecturers = _fetch_all("SELECT id, name FROM lecturers ORDER BY name")
    return render_template("login.html", students=students, lecturers=lecturers)


@app.route("/login", methods=["POST"])
def login():
    role = request.form.get("role")
    user_id = request.form.get("user_id")
    if role == "student":
        return redirect(url_for("student_dashboard", student_id=user_id))
    return redirect(url_for("lecturer_dashboard", lecturer_id=user_id))


@app.route("/student/<int:student_id>")
def student_dashboard(student_id):
    student = _fetch_one("SELECT * FROM students WHERE id = ?", (student_id,))
    if not student:
        return redirect(url_for("index"))

    today = datetime.now().date().isoformat()
    upcoming = _fetch_all(
        """
        SELECT lectures.*, rooms.name AS room_name
        FROM lectures
        JOIN enrollments ON enrollments.lecture_id = lectures.id
        JOIN rooms ON rooms.id = lectures.room_id
        WHERE enrollments.student_id = ?
          AND date(lectures.start_time) = ?
        ORDER BY lectures.start_time
        """,
        (student_id, today),
    )
    attendance = _fetch_all(
        """
        SELECT lectures.module_code, lectures.module_name, attendance.tapped_at, attendance.method
        FROM attendance
        JOIN lectures ON attendance.lecture_id = lectures.id
        WHERE attendance.student_id = ?
        ORDER BY attendance.tapped_at DESC
        """,
        (student_id,),
    )
    total_sessions = _fetch_one(
        """
        SELECT COUNT(*) AS count
        FROM enrollments
        JOIN lectures ON enrollments.lecture_id = lectures.id
        WHERE enrollments.student_id = ?
        """,
        (student_id,),
    )["count"]
    attended_sessions = _fetch_one(
        "SELECT COUNT(DISTINCT lecture_id) AS count FROM attendance WHERE student_id = ?",
        (student_id,),
    )["count"]

    attendance_rate = 0
    if total_sessions:
        attendance_rate = int((attended_sessions / total_sessions) * 100)

    return render_template(
        "student_dashboard.html",
        student=student,
        upcoming=upcoming,
        attendance=attendance,
        attendance_rate=attendance_rate,
    )


@app.route("/lecturer/<int:lecturer_id>")
def lecturer_dashboard(lecturer_id):
    lecturer = _fetch_one("SELECT * FROM lecturers WHERE id = ?", (lecturer_id,))
    if not lecturer:
        return redirect(url_for("index"))

    today = datetime.now().date().isoformat()
    lectures = _fetch_all(
        """
        SELECT lectures.*, rooms.name AS room_name
        FROM lectures
        JOIN rooms ON rooms.id = lectures.room_id
        WHERE lectures.lecturer_id = ?
          AND date(lectures.start_time) = ?
        ORDER BY lectures.start_time
        """,
        (lecturer_id, today),
    )
    lecture_ids = [lecture["id"] for lecture in lectures]
    attendance_counts = {}
    for lecture_id in lecture_ids:
        count = _fetch_one(
            "SELECT COUNT(*) AS count FROM attendance WHERE lecture_id = ?",
            (lecture_id,),
        )["count"]
        attendance_counts[lecture_id] = count

    return render_template(
        "lecturer_dashboard.html",
        lecturer=lecturer,
        lectures=lectures,
        attendance_counts=attendance_counts,
    )


@app.route("/lecturer/<int:lecturer_id>/report")
def lecturer_report(lecturer_id):
    lecture_id = request.args.get("lecture_id", type=int)
    lecture = _fetch_one(
        """
        SELECT lectures.*, rooms.name AS room_name, lecturers.name AS lecturer_name
        FROM lectures
        JOIN rooms ON rooms.id = lectures.room_id
        JOIN lecturers ON lecturers.id = lectures.lecturer_id
        WHERE lectures.id = ? AND lecturers.id = ?
        """,
        (lecture_id, lecturer_id),
    )
    if not lecture:
        return redirect(url_for("lecturer_dashboard", lecturer_id=lecturer_id))

    attendance = _fetch_all(
        """
        SELECT students.name, attendance.tapped_at, attendance.method, attendance.credential_type
        FROM attendance
        JOIN students ON students.id = attendance.student_id
        WHERE attendance.lecture_id = ?
        ORDER BY attendance.tapped_at
        """,
        (lecture_id,),
    )
    return render_template(
        "report.html", lecture=lecture, attendance=attendance
    )


@app.route("/lecturer/<int:lecturer_id>/report.csv")
def lecturer_report_csv(lecturer_id):
    lecture_id = request.args.get("lecture_id", type=int)
    lecture = _fetch_one(
        """
        SELECT lectures.*, lecturers.name AS lecturer_name
        FROM lectures
        JOIN lecturers ON lecturers.id = lectures.lecturer_id
        WHERE lectures.id = ? AND lecturers.id = ?
        """,
        (lecture_id, lecturer_id),
    )
    if not lecture:
        return redirect(url_for("lecturer_dashboard", lecturer_id=lecturer_id))

    attendance = _fetch_all(
        """
        SELECT students.name, attendance.tapped_at, attendance.method, attendance.credential_type
        FROM attendance
        JOIN students ON students.id = attendance.student_id
        WHERE attendance.lecture_id = ?
        ORDER BY attendance.tapped_at
        """,
        (lecture_id,),
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student", "Tapped At", "Method", "Credential"])
    for row in attendance:
        writer.writerow([row["name"], row["tapped_at"], row["method"], row["credential_type"]])

    output.seek(0)
    return send_file(
        output,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"lecture-{lecture_id}-attendance.csv",
    )


@app.route("/api/tap", methods=["POST"])
def api_tap():
    payload = request.get_json(force=True)
    credential = payload.get("credential")
    credential_type = payload.get("credential_type", "card")
    reader_id = payload.get("reader_id")
    method = payload.get("method", "NFC")
    tapped_at = payload.get("tapped_at") or datetime.now().isoformat()

    student = _fetch_one(
        "SELECT * FROM students WHERE card_uid = ? OR mobile_token = ?",
        (credential, credential),
    )
    if not student:
        return jsonify({"status": "error", "message": "Unknown credential"}), 404

    lecture = _fetch_one(
        """
        SELECT lectures.id
        FROM lectures
        JOIN rooms ON rooms.id = lectures.room_id
        WHERE rooms.reader_id = ?
          AND ? BETWEEN lectures.start_time AND lectures.end_time
        """,
        (reader_id, tapped_at),
    )
    if not lecture:
        return jsonify({"status": "error", "message": "No lecture in session"}), 404

    _execute(
        """
        INSERT INTO attendance (student_id, lecture_id, tapped_at, method, credential_type)
        VALUES (?, ?, ?, ?, ?)
        """,
        (student["id"], lecture["id"], tapped_at, method, credential_type),
    )
    return jsonify(
        {
            "status": "ok",
            "student": student["name"],
            "lecture_id": lecture["id"],
        }
    )


if __name__ == "__main__":
    setup_database()
    app.run(host="0.0.0.0", port=5000, debug=True)
