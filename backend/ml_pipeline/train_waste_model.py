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
    
    print("\nGenerating Binned Confusion Matrix and Classification Metrics...")
    import numpy as np
    import matplotlib.pyplot as plt
    import seaborn as sns
    from sklearn.metrics import confusion_matrix, classification_report
    
    # Bin continuous values into categories for confusion matrix
    labels = ["Low Surge", "Normal", "High Surge", "Severe Surge"]
    # Bins: 0-25th, 25-50th, 50-75th, 75-100th percentiles
    y_test_binned = pd.qcut(y_test, q=4, labels=labels)
    
    # Since y_pred might fall outside exact test quantiles, use absolute cutoffs from y_test quantiles
    cutoffs = [-np.inf] + list(np.percentile(y_test, [25, 50, 75])) + [np.inf]
    y_pred_binned = pd.cut(y_pred, bins=cutoffs, labels=labels)
    
    print("\n--- Model Classification Metrics (Binned) ---")
    print(classification_report(y_test_binned, y_pred_binned, labels=labels))
    print("---------------------------------------------")
    
    cm = confusion_matrix(y_test_binned, y_pred_binned, labels=labels)
    
    # Plot the matrix
    plt.figure(figsize=(10, 8))
    sns.set_theme(style="white", font_scale=1.2)
    sns.heatmap(cm, annot=True, fmt='g', cmap='Blues', xticklabels=labels, yticklabels=labels, cbar=False)
    plt.xlabel('Predicted Surge Level (XGBoost)', labelpad=15, fontweight='bold')
    plt.ylabel('Actual Surge Level (Simulated)', labelpad=15, fontweight='bold')
    plt.title('Waste Prediction Confusion Matrix (Binned Regressor)', pad=20, fontweight='bold')
    
    image_path = os.path.join(os.path.dirname(__file__), "confusion_matrix.png")
    plt.savefig(image_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Confusion matrix saved to {image_path}")
    
    # Save the model
    model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "waste_model.joblib")
    
    joblib.dump(model, model_path)
    print(f"Model saved successfully to {model_path}")

if __name__ == "__main__":
    train_model()
