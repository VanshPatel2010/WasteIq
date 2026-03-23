import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker

# 1. Connection Strings
SQLITE_URL = "sqlite:///./wasteiq.db"
# Supabase URL provided by user
POSTGRES_URL = "postgresql://postgres:KEl1a34fMUyl8kh3@db.fwxmvllxdzgfvqitmwra.supabase.co:5432/postgres"

def migrate_data():
    print(f"Connecting to Local SQLite: {SQLITE_URL}")
    sqlite_engine = create_engine(SQLITE_URL)
    sqlite_meta = MetaData()
    sqlite_meta.reflect(bind=sqlite_engine)
    
    print(f"Connecting to Supabase PostgreSQL: {POSTGRES_URL}")
    # Adjust connect_args for Supabase to handle SSL correctly if needed, but defaults usually work
    pg_engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    pg_meta = MetaData()
    
    # Create tables in Postgres extending from the SQLite schema definitions
    # But wait, our FastAPI app already has declarative models. It's safer to use them to create tables.
    from database import Base
    print("Creating tables in Supabase if they don't exist...")
    # Import all models so Base knows about them
    from app.models import user, zone, truck, route, waste_worker_report, surge_prediction, surplus_match, zone_fill_level_log
    
    Base.metadata.create_all(bind=pg_engine)
    pg_meta.reflect(bind=pg_engine)

    sqlite_conn = sqlite_engine.connect()
    pg_conn = pg_engine.connect()

    pg_trans = pg_conn.begin()

    try:
        # Use SQLAlchemy's built-in topological sort based on Foreign Keys
        # sorted_tables returns tables in order of their dependencies (parents first)
        tables_in_order = sqlite_meta.sorted_tables
        
        print("Clearing existing data in Supabase (if any)...")
        # Delete in reverse order (children before parents) to avoid FK violations
        for table in reversed(tables_in_order):
            if table.name in pg_meta.tables:
                pg_conn.execute(pg_meta.tables[table.name].delete())
                print(f" - Cleared {table.name}")

        for sqlite_table in tables_in_order:
            table_name = sqlite_table.name
            if table_name not in pg_meta.tables:
                print(f"Table {table_name} not found in Postgres, skipping...")
                continue
            pg_table = pg_meta.tables[table_name]

            # Read all rows from SQLite
            result = sqlite_conn.execute(sqlite_table.select()).fetchall()
            
            if not result:
                print(f"Table {table_name} is empty, skipping...")
                continue
                
            print(f"Migrating {len(result)} rows for table '{table_name}'...")
            
            # Convert rows to list of dicts for bulk insert
            rows_to_insert = [dict(row._mapping) for row in result]
            
            # Bulk insert into Postgres
            pg_conn.execute(pg_table.insert(), rows_to_insert)
            
        pg_trans.commit()
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        pg_trans.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate_data()
