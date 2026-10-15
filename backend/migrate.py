"""
Safe migration script — adds any missing columns without losing data.
Run once: python migrate.py
"""
import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(__file__), 'chainshield.db')

MIGRATIONS = [
    # (table, column, definition)
    ('shipments', 'risk_score', 'INTEGER DEFAULT 0'),
]

def run():
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()
    for table, column, definition in MIGRATIONS:
        cur.execute(f"PRAGMA table_info({table})")
        existing = [r[1] for r in cur.fetchall()]
        if column not in existing:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            print(f'  ✅  Added {table}.{column}')
        else:
            print(f'  ✔   {table}.{column} already exists')
    conn.commit()
    conn.close()
    print('Migration complete.')

if __name__ == '__main__':
    run()
