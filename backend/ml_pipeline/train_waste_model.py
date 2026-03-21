import pandas as pd
import xgboost as xgb
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

def train_model():
    data_path = os.path.join(os.path.dirname(__file__), "surat_waste_data.csv")
    if not os.path.exists(data_path):
        print(f"Error: Dataset not found at {data_path}. Run generator first.")
        return
        
    print("Loading dataset...")
    df = pd.read_csv(data_path)
    
    # Features (X) and Target (y)
    features = ["zone_id", "zone_type_encoded", "hour", "day_of_week", "month", "is_weekend", "season", "festival"]
    X = df[features]
    y = df["waste_kg"]
    
    print("Splitting data into train/test sets...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training XGBoost Regressor...")
    model = xgb.XGBRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=6,
        random_state=42,
        objective="reg:squarederror"
    )
    
    model.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Mean Absolute Error (kg): {mae:.2f}")
    print(f"R-squared Score: {r2:.4f}")
    
    # Save the model
    model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "waste_model.joblib")
    
    joblib.dump(model, model_path)
    print(f"Model saved successfully to {model_path}")

if __name__ == "__main__":
    train_model()
