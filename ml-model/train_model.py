"""
train_model.py
--------------
Trains 3 Scikit-learn models and saves them as .pkl files:
  1. Linear Regression  → predict daily calories
  2. Linear Regression  → predict weeks to reach goal weight
  3. Decision Tree      → recommend workout type (classification)

Run once before starting the Node.js server:
  python train_model.py
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score
import pickle
import os

# ── Load dataset ──────────────────────────────────────────────
df = pd.read_csv('../dataset/fitness_data.csv')
print(f"Dataset loaded: {len(df)} rows")

# ── Feature definitions ───────────────────────────────────────
# Common features used across models
# gender: 0=male, 1=female
# activity_level: 1=sedentary, 2=moderate, 3=active
# goal: 0=weight_loss, 1=muscle_gain, 2=maintenance

# ── Model 1: Daily Calorie Prediction (Linear Regression) ─────
print("\n[Model 1] Training calorie predictor (Linear Regression)...")

X_cal = df[['age', 'gender', 'height_cm', 'weight_kg', 'activity_level', 'goal']]
y_cal = df['daily_calories']

X_train, X_test, y_train, y_test = train_test_split(X_cal, y_cal, test_size=0.2, random_state=42)

# Scale features for better regression performance
scaler_cal = StandardScaler()
X_train_scaled = scaler_cal.fit_transform(X_train)
X_test_scaled  = scaler_cal.transform(X_test)

cal_model = LinearRegression()
cal_model.fit(X_train_scaled, y_train)

preds = cal_model.predict(X_test_scaled)
mae = mean_absolute_error(y_test, preds)
print(f"  Calorie MAE: {mae:.1f} kcal")

# ── Model 2: Weight-Loss Timeline (Linear Regression) ─────────
print("\n[Model 2] Training weight-loss timeline predictor (Linear Regression)...")

# Only rows where goal = weight loss (0)
df_wl = df[df['goal'] == 0].copy()

X_wl = df_wl[['age', 'gender', 'height_cm', 'weight_kg', 'activity_level']]
y_wl = df_wl['weeks_to_goal']

X_train2, X_test2, y_train2, y_test2 = train_test_split(X_wl, y_wl, test_size=0.2, random_state=42)

scaler_wl = StandardScaler()
X_train2_s = scaler_wl.fit_transform(X_train2)
X_test2_s  = scaler_wl.transform(X_test2)

wl_model = LinearRegression()
wl_model.fit(X_train2_s, y_train2)

preds2 = wl_model.predict(X_test2_s)
mae2 = mean_absolute_error(y_test2, preds2)
print(f"  Timeline MAE: {mae2:.1f} weeks")

# ── Model 3: Workout Recommendation (Decision Tree) ───────────
print("\n[Model 3] Training workout recommender (Decision Tree)...")
# Workout labels:
#   0 = Cardio + HIIT (fat loss)
#   1 = Strength Training (muscle gain)
#   2 = Balanced / Maintenance

# Map goal directly to workout (with BMI as tiebreaker)
def get_workout_label(row):
    if row['goal'] == 0:  # weight loss
        return 0
    elif row['goal'] == 1:  # muscle gain
        return 1
    else:  # maintenance
        return 2

df['workout_label'] = df.apply(get_workout_label, axis=1)

X_wkt = df[['age', 'gender', 'bmi', 'activity_level', 'goal']]
y_wkt = df['workout_label']

X_train3, X_test3, y_train3, y_test3 = train_test_split(X_wkt, y_wkt, test_size=0.2, random_state=42)

wkt_model = DecisionTreeClassifier(max_depth=5, random_state=42)
wkt_model.fit(X_train3, y_train3)

acc = accuracy_score(y_test3, wkt_model.predict(X_test3))
print(f"  Workout accuracy: {acc*100:.1f}%")

# ── Save all models ───────────────────────────────────────────
os.makedirs('.', exist_ok=True)

with open('calorie_model.pkl', 'wb') as f:
    pickle.dump({'model': cal_model, 'scaler': scaler_cal}, f)

with open('weightloss_model.pkl', 'wb') as f:
    pickle.dump({'model': wl_model, 'scaler': scaler_wl}, f)

with open('workout_model.pkl', 'wb') as f:
    pickle.dump({'model': wkt_model}, f)

print("\nAll models saved:")
print("  calorie_model.pkl")
print("  weightloss_model.pkl")
print("  workout_model.pkl")
print("\nTraining complete!")
