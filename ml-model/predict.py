"""
predict.py
----------
Called by Node.js via child_process.spawn.
Reads JSON from stdin, runs all 3 models, prints JSON to stdout.

Usage (Node.js calls this):
  python predict.py '{"age":25,"gender":0,"height":175,"weight":80,"activity":2,"goal":0}'
"""

import sys
import json
import pickle
import math
import os
import pandas as pd

# ── Helper: load model safely ─────────────────────────────────
def load(filename):
    path = os.path.join(os.path.dirname(__file__), filename)
    with open(path, 'rb') as f:
        return pickle.load(f)

# ── BMI Calculator (pure math, no ML needed) ──────────────────
def calculate_bmi(weight_kg, height_cm):
    h = height_cm / 100  # convert to metres
    bmi = weight_kg / (h * h)
    return round(bmi, 1)

def bmi_category(bmi):
    if bmi < 18.5:
        return "Underweight"
    elif bmi < 25:
        return "Normal weight"
    elif bmi < 30:
        return "Overweight"
    else:
        return "Obese"

# ── Workout label → readable name ─────────────────────────────
WORKOUT_NAMES = {
    0: "Cardio + HIIT",
    1: "Strength Training",
    2: "Balanced Maintenance"
}

WORKOUT_DETAILS = {
    0: ["30 min running 5x/week", "HIIT sessions 3x/week", "Low-calorie diet focus", "Swimming or cycling"],
    1: ["Weight training 4x/week", "Progressive overload", "High protein intake", "Rest days important"],
    2: ["Mix of cardio + weights", "3-4 workouts/week", "Balanced macro diet", "Focus on consistency"]
}

# ── Main prediction function ───────────────────────────────────
def predict(data):
    age        = int(data['age'])
    gender     = int(data['gender'])      # 0=male, 1=female
    height     = float(data['height'])    # cm
    weight     = float(data['weight'])    # kg
    activity   = int(data['activity'])    # 1,2,3
    goal       = int(data['goal'])        # 0=loss,1=gain,2=maintain
    target_wt  = float(data.get('targetWeight', weight))

    # 1. BMI (formula, no model needed)
    bmi  = calculate_bmi(weight, height)
    cat  = bmi_category(bmi)

    # 2. Calorie prediction (Linear Regression)
    cal_bundle = load('calorie_model.pkl')
    cal_df     = pd.DataFrame([[age, gender, height, weight, activity, goal]],
                   columns=['age','gender','height_cm','weight_kg','activity_level','goal'])
    cal_scaled = cal_bundle['scaler'].transform(cal_df)
    calories   = int(round(cal_bundle['model'].predict(cal_scaled)[0]))

    # 3. Weight-loss timeline (Linear Regression, only meaningful if goal=0)
    weeks = None
    if goal == 0 and weight > target_wt:
        wl_bundle  = load('weightloss_model.pkl')
        wl_df      = pd.DataFrame([[age, gender, height, weight, activity]],
                      columns=['age','gender','height_cm','weight_kg','activity_level'])
        wl_scaled  = wl_bundle['scaler'].transform(wl_df)
        raw_weeks  = wl_bundle['model'].predict(wl_scaled)[0]
        kg_to_lose = weight - target_wt
        weeks      = int(round(max(kg_to_lose / 0.5, raw_weeks)))
    elif goal == 1:
        kg_to_gain = max(0, target_wt - weight)
        weeks      = int(round(kg_to_gain / 0.25)) if kg_to_gain > 0 else None

    # 4. Workout recommendation (Decision Tree)
    wkt_bundle = load('workout_model.pkl')
    wkt_df     = pd.DataFrame([[age, gender, bmi, activity, goal]],
                   columns=['age','gender','bmi','activity_level','goal'])
    wkt_label  = int(wkt_bundle['model'].predict(wkt_df)[0])

    return {
        "bmi":            bmi,
        "bmiCategory":    cat,
        "dailyCalories":  calories,
        "weeksToGoal":    weeks,
        "workoutType":    WORKOUT_NAMES[wkt_label],
        "workoutPlan":    WORKOUT_DETAILS[wkt_label],
        "macros": {
            "protein":  round(weight * (1.8 if goal == 1 else 1.2)),  # g/day
            "carbs":    round(calories * 0.45 / 4),
            "fats":     round(calories * 0.25 / 9)
        }
    }

# ── Entry point ───────────────────────────────────────────────
if __name__ == '__main__':
    try:
        # Node.js passes JSON as first command-line argument
        input_data = json.loads(sys.argv[1])
        result     = predict(input_data)
        print(json.dumps(result))   # Node.js reads this stdout
    except Exception as e:
        # Return error as JSON so Node.js can handle it gracefully
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
