import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

with psycopg.connect(DATABASE_URL) as conn:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into test_connection (message)
            values (%s)
            """,
            ("Hello from FastAPI",),
        )

    conn.commit()