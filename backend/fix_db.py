from database import engine
from sqlalchemy import text

with engine.connect() as con:
    try:
        con.execute(text("ALTER TABLE trucks ADD COLUMN is_active BOOLEAN DEFAULT 1;"))
        con.commit()
        print("is_active added")
    except Exception as e:
        print(e)
