import os
from datetime import datetime, date

from flask import Flask, request, jsonify, redirect, send_from_directory
from flask_cors import CORS
import models

# Frontend folder
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

app = Flask(__name__)
CORS(app)

models.init_db()

# ---------------- HOME ---------------- #

@app.route("/")
def root():
    return redirect("/login.html")


# ---------------- LOGIN ---------------- #

@app.route("/login", methods=["POST"])
def login():

    data = request.json

    user = models.login_user(
        data["username"],
        data["password"]
    )

    if user:
        return {"message": "success", "username": data["username"]}
    else:
        return {"message": "invalid"}


# ---------------- REGISTER ---------------- #

@app.route("/register", methods=["POST"])
def register():

    data = request.json

    full_name = data["full_name"]
    username  = data["username"]
    password  = data["password"]
    sport     = data["favorite_sport"]

    conn = models.connect()
    cur  = conn.cursor()

    cur.execute(
        "INSERT INTO users(full_name, username, password, favorite_sport) VALUES(?,?,?,?)",
        (full_name, username, password, sport)
    )

    conn.commit()
    conn.close()

    return {"message": "registered"}


# ---------------- RESET PASSWORD ---------------- #

@app.route("/reset-password", methods=["POST"])
def reset_password():

    data = request.json

    username = data["username"]
    sport    = data["sport"]
    password = data["password"]

    conn = models.connect()
    cur  = conn.cursor()

    cur.execute(
        "UPDATE users SET password=? WHERE username=? AND favorite_sport=?",
        (password, username, sport)
    )

    conn.commit()
    conn.close()

    if cur.rowcount == 0:
        return {"message": "verification failed"}

    return {"message": "updated"}


# ---------------- GET EXPENSES ---------------- #

@app.route("/expenses", methods=["GET"])
def expenses():

    username = request.headers.get("X-Username")
    
    if not username:
        return {"message": "username is required"}, 401

    data = models.get_expenses(username)

    result = []

    for e in data:
        result.append({
            "id":          e[0],
            "date":        e[1],
            "category":    e[2],
            "amount":      e[3],
            "description": e[4]
        })

    return jsonify(result)


# ---------------- ADD EXPENSE ---------------- #

@app.route("/add-expense", methods=["POST"])
def add():

    try:
        data = request.json
        username = request.headers.get("X-Username")
        
        if not username:
            return {"message": "username is required"}, 401

        if not data.get("date") or not data.get("category") \
                or not data.get("amount") or not data.get("description"):
            return {"message": "missing required fields", "received": data}, 400

        # Validate date - no future dates allowed
        expense_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        today = date.today()
        
        if expense_date > today:
            return {"message": "Expense date cannot be in the future. Please select today or an earlier date."}, 400

        amount = float(data["amount"])

        success = models.add_expense(
            username,
            data["date"],
            data["category"],
            amount,
            data["description"]
        )

        if success:
            return {"message": "added"}
        else:
            return {"message": "user not found"}, 401

    except Exception as e:
        print(f"Error in add_expense: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"message": f"Error: {str(e)}"}, 500


# ---------------- DELETE EXPENSE ---------------- #

@app.route("/delete/<id>", methods=["DELETE"])
def delete(id):
    
    username = request.headers.get("X-Username")
    
    if not username:
        return {"message": "username is required"}, 401

    success = models.delete_expense(username, id)
    
    if success:
        return {"message": "deleted"}
    else:
        return {"message": "expense not found or unauthorized"}, 401


# ---------------- UPDATE EXPENSE ---------------- #

@app.route("/update/<int:id>", methods=["PUT"])
def update_expense(id):

    try:
        data = request.get_json()
        username = request.headers.get("X-Username")
        
        if not username:
            return jsonify({"message": "username is required"}), 401

        # Validate all fields are present
        if not data.get("date") or not data.get("category") \
                or not data.get("amount") or not data.get("description"):
            return jsonify({"message": "missing required fields"}), 400

        # Validate date - no future dates allowed
        expense_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        today = date.today()
        
        if expense_date > today:
            return jsonify({"message": "Expense date cannot be in the future. Please select today or an earlier date."}), 400

        amount = float(data["amount"])

        # Update in the database
        success = models.update_expense(
            username,
            id,
            data["date"],
            data["category"],
            amount,
            data["description"]
        )
        
        if success:
            return jsonify({"message": "updated"})
        else:
            return jsonify({"message": "expense not found or unauthorized"}), 401

    except Exception as e:
        print(f"Error in update_expense: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error: {str(e)}"}), 500


# ---------------- SET BUDGET ---------------- #

@app.route('/set-budget', methods=['POST'])
def set_budget():
    try:
        data = request.json
        username = request.headers.get('X-Username')

        if not username:
            return jsonify({"message": "username is required"}), 401

        month          = data.get('month')
        monthly_budget = data.get('monthly_budget')
        daily_limit    = data.get('daily_limit')

        if not month or monthly_budget is None or daily_limit is None:
            return jsonify({"message": "missing required fields"}), 400

        models.set_budget(username, month, float(monthly_budget), float(daily_limit))

        return jsonify({"message": "saved"})

    except Exception as e:
        print(f"Error in set_budget: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error: {str(e)}"}), 500


# ---------------- GET BUDGET ---------------- #

@app.route('/get-budget', methods=['GET'])
def get_budget():
    try:
        username = request.headers.get('X-Username')

        if not username:
            return jsonify({"message": "username is required"}), 401

        budget = models.get_budget(username)

        if budget:
            return jsonify({
                "monthly_budget": budget[0],
                "daily_limit":    budget[1]
            })

        return jsonify({
            "monthly_budget": 0,
            "daily_limit":    0
        })

    except Exception as e:
        print(f"Error in get_budget: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------- SERVE FRONTEND ---------------- #

@app.route("/<path:path>")
def serve_frontend(path):
    return send_from_directory(FRONTEND_DIR, path)


# ---------------- RUN SERVER ---------------- #

if __name__ == "__main__":
    app.run(debug=True)
