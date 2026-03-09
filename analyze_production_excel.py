"""
Script to analyze the production Excel file structure.
Run this after placing the Excel file in the project root.
"""
import pandas as pd
import sys
import os
from pathlib import Path
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def analyze_excel_file(filepath):
    """Analyze the structure of the production Excel file."""
    print(f"Analyzing: {filepath}")
    print("=" * 80)
    
    try:
        # Read Excel file
        xl = pd.ExcelFile(filepath)
        
        print(f"\nTotal Sheets: {len(xl.sheet_names)}")
        print(f"Sheets: {xl.sheet_names}")
        print()
        
        # Analyze each sheet
        for sheet_name in xl.sheet_names:
            print(f"\n{'='*80}")
            print(f"Sheet: {sheet_name}")
            print(f"{'='*80}")
            
            # Read raw data
            df = pd.read_excel(xl, sheet_name=sheet_name, header=None)
            
            print(f"Total rows: {len(df)}")
            print(f"Total columns: {len(df.columns)}")
            print()
            
            # Show first 20 rows to find header
            print("First 20 rows (looking for header row):")
            print("-" * 80)
            for idx in range(min(20, len(df))):
                row_preview = []
                for col_idx in range(min(10, len(df.columns))):
                    val = df.iloc[idx, col_idx]
                    if pd.notna(val):
                        row_preview.append(str(val)[:15])
                    else:
                        row_preview.append("")
                print(f"Row {idx:2d}: {' | '.join(row_preview)}")
            
            # Try to find header row
            print("\nSearching for header row...")
            header_candidates = []
            for idx in range(min(50, len(df))):
                first_col = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ""
                if first_col.lower() in ["code", "agency code", "agencycode"]:
                    header_candidates.append(idx)
                    print(f"  Found 'Code' in row {idx}")
            
            if header_candidates:
                header_row = header_candidates[0]
                print(f"\n[OK] Header row appears to be: Row {header_row}")
                
                # Show header row
                print("\nHeader row contents:")
                print("-" * 80)
                header_row_data = df.iloc[header_row]
                for col_idx, val in enumerate(header_row_data):
                    if pd.notna(val):
                        print(f"  Column {col_idx}: {val}")
                
                # Try to read with header
                try:
                    df_with_header = pd.read_excel(xl, sheet_name=sheet_name, header=header_row)
                    print(f"\n📋 Data rows after header: {len(df_with_header)}")
                    
                    # Show sample data rows
                    print("\nFirst 5 data rows:")
                    print("-" * 80)
                    for idx in range(min(5, len(df_with_header))):
                        row = df_with_header.iloc[idx]
                        print(f"Row {idx}:")
                        for col in df_with_header.columns[:10]:  # First 10 columns
                            val = row[col]
                            if pd.notna(val):
                                print(f"  {col}: {val}")
                except Exception as e:
                    print(f"  Error reading with header: {e}")
            else:
                print("  [WARNING] Could not find header row with 'Code'")
            
            # Check for data end markers
            print("\nChecking for data end markers...")
            for idx in range(len(df) - 10, len(df)):
                first_col = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ""
                if any(marker in first_col.lower() for marker in ["total", "summary", "grand"]):
                    print(f"  Found end marker in row {idx}: {first_col}")
            
    except Exception as e:
        print(f"[ERROR] Error analyzing file: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Look for Excel files in current directory
    current_dir = Path(".")
    excel_files = list(current_dir.glob("*.xlsx")) + list(current_dir.glob("*.xls")) + list(current_dir.glob("*.xlsm"))
    
    if excel_files:
        print(f"Found {len(excel_files)} Excel file(s):")
        for f in excel_files:
            print(f"  - {f.name}")
        print()
        
        # Analyze first file
        analyze_excel_file(excel_files[0])
    else:
        print("[ERROR] No Excel files found in current directory")
        print(f"Current directory: {os.getcwd()}")
        print("\nPlease place your Excel file in the project root directory.")
        print("Supported formats: .xlsx, .xls, .xlsm")
