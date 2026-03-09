# Production Import Analysis & Fix Plan

## Current Issues Identified

### Issue 1: Limited Header Row Search
**Location**: Line 447 in `backend/routers/admin.py`
```python
for idx in range(min(10, len(raw_df))):
```
- Only searches first 10 rows for "Code" header
- If header is further down, import fails

### Issue 2: Row Filtering May Stop Too Early
**Location**: Line 466
```python
df = df[df['Code'].notna() & df['Agency'].notna()]
```
- Filters out empty rows, but may miss agencies if there are gaps

### Issue 3: Fixed Column Indexes
**Location**: Lines 508-552
- Uses hardcoded column indexes (0, 1, 2, etc.)
- If Excel structure changes, mapping breaks

## What We Need to Confirm

1. **Header Row Location**
   - Which row number contains "Code", "Agency", etc.?
   - Is it always the same row, or variable?

2. **Data Range**
   - Where does the data start?
   - Where does it end? (blank rows, totals, etc.)
   - Are there empty rows between agencies?

3. **Column Structure**
   - Exact column order and names
   - Which columns are merged?
   - Are there any new columns we're missing?

4. **Office Variations**
   - Do different offices have different structures?
   - Different number of columns?
   - Different header positions?

## Fix Strategy

Once we see the Excel file, we'll:

1. **Dynamic Header Detection**
   - Search more rows (maybe 50+)
   - Look for multiple header indicators, not just "Code"
   - Handle merged headers better

2. **Better Row Detection**
   - Continue reading until we hit a clear end marker
   - Handle empty rows in the middle
   - Stop at totals/summary rows

3. **Flexible Column Mapping**
   - Map by column name, not just position
   - Handle missing columns gracefully
   - Support variations in structure

4. **Better Error Reporting**
   - Show which rows were skipped and why
   - Report agencies that couldn't be imported
   - Provide detailed per-office statistics

## Next Steps

1. ✅ Review current code structure
2. ⏳ Wait for Excel file to analyze
3. ⏳ Map exact field structure
4. ⏳ Fix header detection
5. ⏳ Fix row reading logic
6. ⏳ Test with actual file
7. ⏳ Verify all agencies are imported
