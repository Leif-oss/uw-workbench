import sqlite3
from pathlib import Path

# Path to workbench.db in the project root
DB_PATH = Path(__file__).parent.parent / "workbench.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create submissions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP,
            original_filename VARCHAR(500),
            file_type VARCHAR(50),
            extracted_text TEXT,
            effective_date VARCHAR(50),
            expiration_date VARCHAR(50),
            producer_name VARCHAR(255),
            producer_code VARCHAR(50),
            insured_name VARCHAR(255),
            additional_insured_names TEXT,
            agency_id INTEGER,
            contact_id INTEGER,
            contact_name VARCHAR(255),
            contact_phone VARCHAR(50),
            contact_email VARCHAR(255),
            mailing_address TEXT,
            location_street_number VARCHAR(50),
            location_street_name VARCHAR(255),
            location_suite VARCHAR(50),
            location_city VARCHAR(100),
            location_state VARCHAR(2),
            location_zip VARCHAR(20),
            building_limit VARCHAR(50),
            deductible VARCHAR(50),
            additional_limits_rents VARCHAR(50),
            additional_limits_ordinance VARCHAR(50),
            additional_limits_demolition VARCHAR(50),
            additional_limits_eqsl VARCHAR(50),
            additional_insured TEXT,
            mortgagee TEXT,
            loss_payee TEXT,
            construction_type VARCHAR(100),
            construction_year VARCHAR(10),
            square_feet VARCHAR(20),
            sprinkler_percent VARCHAR(20),
            protection_class VARCHAR(20),
            line_of_business VARCHAR(100),
            notes TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            reviewed_by VARCHAR(255),
            FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        )
    """)
    
    conn.commit()
    conn.close()
    print("Submissions table created successfully!")

if __name__ == "__main__":
    migrate()


