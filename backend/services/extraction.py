"""
Schema-driven extraction service.
Uses OpenAI to extract structured data from text corpus according to product schema.
"""
import json
import logging
import re
from typing import Dict, Any, Optional
from openai import OpenAI
from openai import APIError

logger = logging.getLogger(__name__)


def build_extraction_prompt(schema_definition: Dict[str, Any]) -> str:
    """
    Build extraction prompt from schema definition.
    Generates instructions based on the PBOP v1 schema structure.
    Uses aggressive extraction techniques similar to document_scrubber for maximum data capture.
    """
    prompt_parts = [
        "You are an expert commercial property insurance underwriting assistant with 20+ years of experience reviewing submissions.",
        "YOUR TASK: Extract ALL relevant underwriting data from the provided submission documents.",
        "Be thorough and AGGRESSIVE in finding information - look everywhere, even in headers, footers, email signatures, and margins.\n",
        "**CRITICAL: USE FIELD LABELS/HEADERS AS PRIMARY INDICATORS**",
        "The PDFs often contain form fields with labels. When you see a label like 'YrBuilt', 'Year Built', 'Construction Type', 'Protection Class', etc.,",
        "the value immediately next to that label (in the same row, column, or field) is ALMOST CERTAINLY the correct value for that field.",
        "**FIELD LABEL MATCHING STRATEGY:**",
        "1. Scan the entire document for field labels/headers that match the fields you need to extract",
        "2. When you find a label like 'YrBuilt', 'YearBuilt', 'Year Built', 'Built', 'Construction Year' - extract the value next to it as construction_year",
        "3. When you find 'Construction', 'Const Type', 'Construction Type', 'Type', 'Building Type' - extract the value next to it as construction_type",
        "4. When you find 'Protection Class', 'Prot Class', 'PC', 'ISO Class', 'Class' - extract the value next to it as protection_class",
        "5. When you find 'Stories', 'Story', 'Stories:', 'Floors', '# Stories' - extract the value next to it as stories",
        "6. When you find 'Building', 'Bldg', 'Building Limit', 'TIV', 'Coverage A', 'Building Value' - extract the value next to it as building_limit",
        "7. When you find 'Rents', 'Rental Income', 'Business Income', 'BI', 'Income' - extract the value next to it as rents",
        "8. When you find 'Deductible', 'Ded', 'Deductible:', 'Deduct' - extract the value next to it as deductible",
        "**CRITICAL EXTRACTION PRIORITY:** The following fields MUST be extracted - they appear in EVERY insurance submission:",
        "1. construction_type - Look for field labels AND values like 'Frame', 'Masonry', 'Brick', 'Steel', 'Concrete', 'Tilt-up', 'Butler', 'Fire Resistive', 'Adobe'",
        "2. stories - Look for field labels AND values like 'Stories', 'Story', 'Floors', '1-story', '2-story', etc.",
        "3. protection_class - Look for field labels AND values like 'Protection Class', 'ISO Class', 'Class', 'PC', numbers like '3', '4', 'Class 3'",
        "4. building_limit - Look for field labels AND values like 'Building Limit', 'TIV', 'Coverage A', 'Building Value', 'Property Value', dollar amounts",
        "5. rents - Look for field labels AND values like 'Rents', 'Business Income', 'Rental Income', 'Loss of Income', dollar amounts",
        "6. deductible - Look for field labels AND values like 'Deductible', 'Ded', dollar amounts or percentages like '5000' or '1%'",
        "These fields appear in 90%+ of submissions - if you don't find them, you're not looking hard enough. Check tables, schedules, ACORD forms, email body text.\n",
        
        "**SCHEMA STRUCTURE:**",
        "You must return a valid JSON object matching this exact structure:\n",
        
        "{",
        '  "policy": {',
        '    "company_number": "105",',
        '    "producer_number": "",',
        '    "key_name": "",  // Insured name, max 15 chars, format "Last, First" if individual',
        '    "inception_date": "",  // MM/DD/YY format',
        '    "expiration_date": ""  // MM/DD/YY format',
        '  },',
        '  "agency": {',
        '    "contact_name": "",',
        '    "contact_email": "",',
        '    "contact_phone": "",',
        '    "agency_name": ""',
        '  },',
        '  "insured": {',
        '    "full_name": "",',
        '    "care_of": "",',
        '    "street": "",',
        '    "city": "",',
        '    "state": "",',
        '    "zip": "",',
        '    "phone": "",',
        '    "email": "",',
        '    "contact_name": ""',
        '  },',
        '  "notes": [',
        '    {',
        '      "text": "",',
        '      "source_refs": [',
        '        {"source_id": 0, "page": 1, "snippet": ""}',
        '      ]',
        '    }',
        '  ],',
        '  "locations": [',
        '    {',
        '      "address": {',
        '        "street_number": "",',
        '        "street_name": "",',
        '        "suite": "",',
        '        "city": "",',
        '        "state": "",',
        '        "zip": ""',
        '      },',
        '      "additional_insureds": [',
        '        {"name": "", "address": ""}',
        '      ],',
        '      "mortgagee": {"name": "", "address": ""},',
        '      "building": {',
        '        "construction_type": "FR",  // EXAMPLE: Must be one of: AD, ST, RB, UB, BS, BB, FIR, MFIR, FR, FRB, FRS, HCB, IR, PIP, TU',
        '        "construction_year": 1985,  // EXAMPLE: Year built',
        '        "square_footage": 10000,  // EXAMPLE: Building square footage (numeric, no commas)',
        '        "sprinkler_percent": 100,  // EXAMPLE: Percentage with sprinklers',
        '        "stories": 2,  // EXAMPLE: Number of stories',
        '        "protection_class": "3"  // EXAMPLE: ISO Protection Class',
        '      },',
        '      "coverages": {',
        '        "building_limit": 2500000,  // EXAMPLE: Building limit (numeric, no commas, no $)',
        '        "rents": 500000,  // EXAMPLE: Rents limit (numeric, no commas)',
        '        "icc_ordinance": 250000,  // EXAMPLE: Ordinance limit',
        '        "debris_demo": null,',
        '        "eqsl_requested": false,',
        '        "eqsl_limit": null,',
        '        "deductible": "5000"  // EXAMPLE: Deductible amount or percentage',
        '      }',
        '    }',
        '  ]',
        '}\n',
        
        "**DETAILED EXTRACTION GUIDELINES:**\n",
        
        "**POLICY DATES (CRITICAL - LOOK EVERYWHERE):**",
        "- inception_date: Policy start date - Look for: 'Effective', 'Policy Period', 'Coverage Dates', 'Bind Date', 'Inception Date', 'Start Date'",
        "- expiration_date: Policy end date - Look for: 'Expiration', 'Expires', 'End Date', 'Term End', 'Renewal Date'",
        "- Format: MM/DD/YY (e.g., '01/15/25' for January 15, 2025)",
        "- Check headers, footers, policy declarations pages, emails, and cover sheets\n\n",
        
        "**PRODUCER/AGENCY (LOOK IN LETTERHEADS & SIGNATURES):**",
        "- producer_number: Agency code (usually 6 digits like '010233') - Look for: 'Producer Code', 'Agent Code', 'Code', numeric codes in headers",
        "- agency_name: Insurance agency/broker name submitting this (NOT the insured) - Look for: 'Producer', 'Agent', 'Broker', 'Submitted by', 'Agency', letterheads, email signatures, company letterhead",
        "- contact_name: Agency contact person - Look for: email signatures, 'Contact', 'Submitted by', names in letterheads",
        "- contact_email: Agency email - Look for: email addresses in signatures, headers, contact sections",
        "- contact_phone: Agency phone - Look for: phone numbers in signatures, headers, contact sections\n\n",
        
        "**INSURED/NAMED INSURED (CRITICAL - MULTIPLE LOCATIONS):**",
        "- full_name: The business/entity being insured (the customer) - Look for: 'Named Insured', 'Insured', 'Applicant', 'Customer', 'Business Name', 'Entity Name', 'Legal Name', 'DBA' sections, policy declarations",
        "- key_name: Shortened version (max 15 chars), format 'Last, First' for individuals, truncate business names - MUST be max 15 characters",
        "- care_of: 'Care of' or 'c/o' if applicable - Look for: 'c/o', 'Care of', 'Attn:', 'Attention:'",
        "- street: Full street address (split street_number and street_name carefully)",
        "- city, state, zip: Location address - Look for: 'Mailing Address', 'Location', 'Property Address', 'Risk Address', 'Building Address'",
        "- phone, email, contact_name: Insured contact info - Look for: contact sections, email signatures, headers\n\n",
        
        "**PROPERTY LOCATIONS (CRITICAL - EXTRACT ALL LOCATIONS):**",
        "- For EACH location found, extract:",
        "  - street_number: Street number ONLY (e.g., '123' or '123-125') - SPLIT CAREFULLY from street_name",
        "  - street_name: Street name and type (e.g., 'Main Street' or 'Oak Avenue') - Do NOT include number",
        "  - suite: Suite/Unit number if applicable (e.g., 'Suite 200', '#5', 'Unit 3')",
        "  - city: City name",
        "  - state: State (2-letter code preferred: CA, NY, TX, etc.)",
        "  - zip: ZIP code (5 or 9 digits)",
        "- Look for: 'Property Address', 'Location', 'Risk Address', 'Building Address', 'Schedule of Locations', 'Location Schedule', 'Property Schedule', multiple addresses in tables\n\n",
        
        "**COPE DATA (CRITICAL - CONSTRUCTION, OCCUPANCY, PROTECTION, EXPOSURE):**",
        "COPE information is VITAL for underwriting and MUST be extracted from EVERY submission.",
        "This data is often found in building descriptions, property schedules, declarations pages, ACORD forms, applications, or email body text.\n",
        "**CONSTRUCTION (C) - CRITICAL FIELD - MUST BE IN locations[].building.construction_type:**",
        "- construction_type: Building construction type - MUST be one of: AD, ST, RB, UB, BS, BB, FIR, MFIR, FR, FRB, FRS, HCB, IR, PIP, TU",
        "  - **THIS MUST GO IN: locations[0].building.construction_type** (or locations[X].building.construction_type for multi-location submissions)",
        "  - **FIELD LABELS TO MATCH (PRIORITY ORDER): 'Construction Type' (ACORD form field), 'Construction', 'Const Type', 'Type', 'Building Type', 'Const', 'Bldg Type'**",
        "  - **FUZZY MATCHING REQUIRED: Use intelligent matching for abbreviated or partial values**",
        "    * 'Conc Tilt' or 'Concrete Tilt' → map to 'TU' (Tilt-Up)",
        "    * 'Conc' or 'Concrete' → map to 'TU' or 'FIR' based on context",
        "    * 'Tilt' or 'Tiltup' → map to 'TU' (Tilt-Up)",
        "    * Partial matches should be mapped to the closest matching code",
        "  - When you see any of these labels, extract the value immediately next to/associated with that label and map it to the correct code",
        "  - This is a CRITICAL field for underwriting - extract it from EVERYWHERE it appears",
        "  - Look in building descriptions, property schedules, ACORD forms, applications, email body text",
        "  - CORRECT MAPPINGS:",
        "    * AD = Adobe (look for: 'Adobe', 'Adobe Construction', 'Adobe Building')",
        "    * ST = All Steel (look for: 'Steel', 'All Steel', 'Steel Frame', 'Steel Construction')",
        "    * RB = Brick, reinforced (look for: 'Brick reinforced', 'Reinforced Brick', 'Reinf Brick', 'Brick with reinforcement')",
        "    * UB = Brick, unreinforced (look for: 'Brick unreinforced', 'Unreinforced Brick', 'Unreinf Brick', 'Plain Brick')",
        "    * BS = Brick & Steel Truss (look for: 'Brick Steel Truss', 'Brick and Steel', 'Brick/Steel', 'Brick w Steel Truss')",
        "    * BB = Butler Building (look for: 'Butler Building', 'Butler Bldg', 'Butler', 'Prefab Metal Building', 'Metal Building')",
        "    * FIR = Fire Resistive (look for: 'Fire Resistive', 'Fire Resist', 'Fire Resistant', 'Concrete', 'Concrete Frame')",
        "    * MFIR = Modified Fire Resistive (look for: 'Modified Fire Resistive', 'Mod Fire Resist', 'Modified Fire Resist', 'Semi-Fire Resistive')",
        "    * FR = Frame (look for: 'Frame', 'Wood Frame', 'Frame Construction', 'Wood Construction', 'Frame Building')",
        "    * FRB = Frame with Brick (look for: 'Frame w Brick', 'Frame with Brick', 'Frame/Brick', 'Brick Veneer on Frame')",
        "    * FRS = Frame/Stucco (look for: 'Frame Stucco', 'Frame/Stucco', 'Stucco Frame', 'Stucco on Frame')",
        "    * HCB = HCB (look for: 'HCB', 'Hollow Concrete Block', 'CMU', 'Concrete Masonry Unit')",
        "    * IR = Iron & Wood Frame (look for: 'Iron Wood Frame', 'Iron & Wood', 'Iron and Wood', 'Iron/Wood', 'Mixed Iron Wood')",
        "    * PIP = Poured-in Place (look for: 'Poured-in Place', 'Poured in Place', 'PIP', 'Cast-in-Place', 'Cast in Place', 'Poured Concrete')",
        "    * TU = Tilt-Up (look for: 'Tilt-Up', 'Tilt Up', 'Tiltup', 'Tilt-up Construction', 'Tilt-up Concrete')",
        "  - Look EVERYWHERE: 'Construction', 'Building Type', 'Construction Class', 'Construction Code', 'Class', 'Frame', 'Masonry', 'Concrete', 'Steel', 'Wood Frame', 'Brick', 'CMU', 'Tilt-up', 'Steel Frame', 'Butler'",
        "  - If you see words like 'Frame', 'Masonry', 'Brick', 'Steel', 'Concrete', 'Tilt-up', 'Butler', 'Fire Resistive', 'Poured', 'Stucco' - EXTRACT IT and map to correct code",
        "- construction_year: Year built (4 digits: e.g., 1985, 2020) - **MUST GO IN: locations[].building.construction_year**",
        "  - **FIELD LABELS TO MATCH (PRIORITY ORDER): 'Yr Built' (ACORD form field), 'Year Built', 'Built', 'Construction Year', 'Date Built', 'Year Constructed', 'Built in', 'Construction Date', 'YrBuilt'**",
        "  - When you see 'Yr Built' or similar labels, extract the numeric value immediately next to it",
        "- square_footage: Building square footage (numeric, NO commas, NO formatting) - **MUST GO IN: locations[].building.square_footage** - CRITICAL FIELD - Look EVERYWHERE for: 'Square Feet', 'SF', 'Sq Ft', 'SqFt', 'Sq. Ft.', 'Square Footage', 'Area', 'Building Size', 'Size', 'Total SF', 'Building SF', 'Sq. Ft.', 'Square Foot', 'Building Area', 'Total Square Feet', 'Gross SF', 'Net SF'",
        "  - This is a CRITICAL field for underwriting - extract it from ANYWHERE it appears",
        "  - Look in building descriptions, property schedules, ACORD forms, applications, email body text",
        "  - Examples: '10000' not '10,000' or '10,000 SF' - extract just the number",
        "- stories: Number of stories/floors (integer) - **MUST GO IN: locations[].building.stories**",
        "  - **FIELD LABELS TO MATCH: 'Stories', 'Story', 'Stories:', 'Floors', 'Levels', '# Stories', 'Number of Stories', '# of Stories'**",
        "  - When you see any of these labels, extract the value immediately next to/associated with that label",
        "  - **THIS FIELD EXISTS IN MOST SUBMISSIONS - Also look for values like: '1-story', '2-story', 'single-story', 'multi-story', numbers followed by 'story' or 'stories'**",
        "  - If you see '1-story', '2-story', 'single-story', etc., extract the number (1, 2, etc.)",
        "  - Look in building descriptions, property schedules, ACORD forms, applications",
        "- sprinkler_percent: Percentage of building with sprinklers (0-100, numeric) - **MUST GO IN: locations[].building.sprinkler_percent** - Look for: 'Sprinkler', 'Sprinklered', 'Sprinkler Coverage', '% Sprinklered', 'Sprinkler %', 'Sprinklered %', 'Full Sprinkler'=100, 'Partial Sprinkler'=look for percentage, 'None'=0",
        "- protection_class: ISO Protection Class / Fire District (string, numeric value) - **MUST GO IN: locations[].building.protection_class**",
        "  - **FIELD LABELS TO MATCH (PRIORITY ORDER): 'PROT CL' (ACORD form field), 'Protection Class', 'Prot Class', 'PC', 'ISO Class', 'ISO', 'Fire District', 'Class', 'Protection Class:', 'ISO Protection Class', 'Fire Protection Class'**",
        "  - When you see 'PROT CL' or any of these labels, extract the numeric value immediately next to it",
        "  - **THIS FIELD EXISTS IN MOST SUBMISSIONS - Often shown as numbers like '3', '4', 'Class 3', 'PC 3', 'Protection Class 3', 'ISO 3'**",
        "  - Extract the numeric value (e.g., '3', '4') and store as string",
        "  - Look in property schedules, declarations pages, ACORD forms, building descriptions\n\n",
        
        "**COVERAGE LIMITS (CRITICAL - LOOK EVERYWHERE, INCLUDING TABLES AND SCHEDULES) - MUST GO IN locations[].coverages:**",
        "Coverage information is OFTEN in tables, schedules, declarations pages, ACORD forms, or email body text.",
        "Be EXTREMELY thorough - coverage limits are CRITICAL for underwriting and MUST be extracted.",
        "**CRITICAL: ALL coverage limits MUST be placed in locations[].coverages (e.g., locations[0].coverages.building_limit, locations[0].coverages.rents, locations[0].coverages.deductible)**\n",
        "**EXTRACTION PRIORITY FOR COVERAGE LIMITS:**",
        "1. Look in ANY table or schedule that mentions 'Coverage', 'Limit', 'Amount', 'Value', 'Building', 'Property', 'Rents', 'Income'",
        "2. Check email body text - producers often list coverage amounts in emails",
        "3. Look for declaration pages, schedules of coverage, ACORD 125/126 forms",
        "4. Check for multiple locations - each location may have different coverage amounts\n",
        "- building_limit: Total Insured Value (TIV) for building (numeric, NO commas, NO dollar signs, NO formatting) - **MUST GO IN: locations[].coverages.building_limit**",
        "  - **FIELD LABELS TO MATCH (PRIORITY ORDER): 'Building' (in Premises Information section), 'Bldg', 'Building Limit', 'TIV', 'Insured Value', 'Coverage A', 'Building Value', 'Replacement Cost', 'Property Value', 'Building Coverage', 'Coverage Amount', 'Limit', 'Building Sum Insured', 'Coverage Limit', 'Building TIV', 'Total Insured Value', 'Building Amount', 'Coverage A Limit', 'Property Limit'**",
        "  - **PREMISES INFORMATION SECTION: In the Premises Information section of ACORD forms, look for 'Building' followed by an amount - this is the building_limit**",
        "  - When you see any of these labels, extract the numeric value immediately next to/associated with that label",
        "  - **THIS FIELD EXISTS IN 95%+ OF SUBMISSIONS - IF YOU DON'T EXTRACT IT, YOU'RE MISSING CRITICAL DATA**",
        "  - Examples: '2500000' not '$2,500,000' or '2,500,000'",
        "  - In tables: Look for columns labeled 'Building', 'Property', 'Coverage A', 'TIV', 'Limit', 'Amount', 'Value'",
        "  - Numbers near 'Building', 'Property', 'Coverage A' are likely building limits",
        "  - If you see ANY dollar amount labeled as building/property value, that's the building_limit",
        "  - Check email body text - producers often list coverage amounts in emails",
        "- rents: Business Income / Rental Income limit (numeric, NO commas, NO dollar signs) - **MUST GO IN: locations[].coverages.rents**",
        "  - **FIELD LABELS TO MATCH (PRIORITY ORDER): 'Business Income' (in Premises Information section), 'Rents', 'Rental Income', 'Loss of Income', 'Time Element', 'Business Interruption', 'BI', 'Rental Value', 'Income Coverage', 'Rental Coverage', 'Loss of Rents', 'Rental Loss', 'Coverage B', 'Time Element Coverage'**",
        "  - **PREMISES INFORMATION SECTION: In the Premises Information section, look for 'Business Income', 'Rents', or similar labels followed by an amount - this is the rents limit**",
        "  - When you see any of these labels, extract the numeric value immediately next to/associated with that label",
        "  - **THIS FIELD EXISTS IN MANY SUBMISSIONS - In tables: Look for columns labeled 'Rents', 'Income', 'BI', 'Business Income', 'Time Element'**",
        "  - Numbers near 'Rents', 'Income', 'Business Income', 'Loss of Income' are likely rent limits",
        "  - If you see dollar amounts labeled as rental/business income, extract them",
        "- icc_ordinance: Ordinance or Law / Increased Cost of Construction (numeric, NO commas, NO dollar signs) - **MUST GO IN: locations[].coverages.icc_ordinance**",
        "  - **PREMISES INFORMATION SECTION: In the Premises Information section, look for 'ICC', 'Ordinance', 'Building Ordinance', or similar labels followed by a limit amount or 'included'**",
        "  - If label shows 'included' or is checked, note that coverage is included (you can set to a reasonable default or null)",
        "  - If label shows a numeric amount, extract that amount",
        "  - Also look for: 'ICC', 'Ordinance', 'Increased Cost', 'Law & Ordinance', 'Ordinance or Law', 'O&L', 'Increased Cost of Construction', 'ICC Coverage', 'Ordinance Coverage', 'Coverage D'",
        "  - In tables: Look for columns labeled 'Ordinance', 'ICC', 'O&L', 'Law & Ordinance'",
        "- debris_demo: Debris Removal / Demolition Cost (numeric, NO commas, NO dollar signs)",
        "  - Look for: 'Debris', 'Demolition', 'Debris Removal', 'Debris Removal Cost', 'Demolition Cost', 'Debris Removal Coverage'",
        "  - In tables: Look for columns labeled 'Debris', 'Demolition', 'Debris Removal'",
        "- eqsl_requested: Earthquake Sprinkler Leakage requested (boolean: true/false)",
        "  - Look for: 'EQSL', 'Earthquake Sprinkler Leakage', 'EQS', 'EQ Sprinkler Leakage', 'Earthquake SL', checkboxes, 'Yes'/'No', 'Requested'/'Not Requested', 'X' marks, checkmarks",
        "- eqsl_limit: EQSL limit if requested (numeric, NO commas, NO dollar signs)",
        "  - Look for: EQSL limit amounts, 'EQSL Limit', 'Earthquake Sprinkler Leakage Limit', numbers associated with EQSL",
        "- deductible: Policy deductible (string, can include % or amounts like '5000' or '1%') - **MUST GO IN: locations[].coverages.deductible**",
        "  - **FIELD LABELS TO MATCH: 'Deductible', 'Ded', 'Deductible:', 'Deduct', 'Per Occurrence', 'Per Claim', 'All Peril Deductible', 'Wind/Hail Deductible', 'Named Storm Deductible'**",
        "  - When you see any of these labels, extract the value immediately next to/associated with that label",
        "  - **THIS FIELD EXISTS IN 95%+ OF SUBMISSIONS - IF YOU DON'T EXTRACT IT, YOU'RE MISSING CRITICAL DATA**",
        "  - Also look for: '%', amounts with percentages, numbers followed by '%' or dollar amounts labeled as deductible",
        "  - Examples: '5000', '1%', '$5,000', '5,000', '1 percent'",
        "  - Look in declarations pages, coverage schedules, ACORD forms, email body text",
        "  - If you see ANY number with '%' or labeled as 'deductible', extract it\n",
        "**CRITICAL INSTRUCTIONS FOR COVERAGE EXTRACTION:**",
        "- If you see ANY table with numbers and coverage-related headers, EXTRACT THOSE NUMBERS",
        "- If you see coverage amounts mentioned in email body text (e.g., 'Building: $2.5M', 'Coverage A: 2500000'), EXTRACT THEM",
        "- Check for multiple locations - each location may have different coverage amounts",
        "- If building_limit is missing but you see 'Coverage A' or 'Property Limit' or any number labeled as building/property value, USE THAT VALUE",
        "- If you see dollar amounts like '$2,500,000' or '$2.5M' or '2.5 million', convert to plain number: '2500000'",
        "- Don't skip coverage data even if format is different (e.g., '2.5M' should become '2500000')",
        "- If deductible is shown as a percentage (e.g., '1%'), keep it as a string with the '%' symbol",
        "- Be AGGRESSIVE - if you're not 100% sure but the number looks like a coverage limit, extract it anyway\n\n",
        
        "**ADDITIONAL PARTIES (CHECK SEPARATE SECTIONS):**",
        "- additional_insureds: Array of additional insured parties - Look for: 'Additional Insured', 'AI', 'Additional Named Insured', separate sections or schedules",
        "- mortgagee: Mortgage holder / lender - Look for: 'Mortgagee', 'Lender', 'Bank', 'Loan Holder', 'First Mortgage'",
        "- Look for full addresses for additional insureds and mortgagees if provided\n\n",
        
        "**NOTES (EXTRACT ALL IMPORTANT INFO):**",
        "- notes: Array of note objects with text and source references",
        "- Look for: 'Notes', 'Comments', 'Loss History', 'Special Conditions', 'Underwriting Notes', 'Remarks', 'Special Provisions'",
        "- **BUILDING IMPROVEMENTS: Extract ALL content from 'Building Improvements' field/section and add to notes array**",
        "  - Example: If you see 'Building Improvements: wiring yr 2014, roof replaced 2020', create note entries like:",
        "    * Note 1: 'wiring yr 2014'",
        "    * Note 2: 'roof replaced 2020'",
        "  - Each improvement item should be a separate note entry if possible, or combine into logical chunks",
        "  - Include source references (source_id, page) for building improvements notes",
        "- Break into logical chunks and include source references (source_id, page, snippet)\n\n",
        
        "**EXTRACTION RULES (BE EXTREMELY AGGRESSIVE):**",
        "1. Extract data even if field names don't match exactly - use context and synonyms",
        "2. Look EVERYWHERE: headers, footers, email signatures, margins, tables, schedules, appendices, ACORD forms, applications",
        "3. For monetary values: use numbers only (NO dollar signs, NO commas, NO formatting) - e.g., '2500000' not '$2,500,000'",
        "   - Convert formats like '$2.5M' or '2.5 million' to '2500000'",
        "   - Convert formats like '$1,500,000' to '1500000' (remove commas and dollar signs)",
        "4. For dates: use MM/DD/YY format (e.g., '01/15/25') - Look for dates in various formats and convert",
        "5. For addresses: SPLIT street_number from street_name CAREFULLY - numbers are street_number, everything else is street_name",
        "6. If multiple values exist for a field, use the most prominent/recent/most complete one",
        "7. For locations: Extract EACH distinct location as a separate entry in the locations array",
        "8. Use empty string \"\" ONLY if field truly cannot be found after EXTENSIVE search",
        "9. Use null for numeric fields that are not found (not empty string)",
        "10. For construction_type: ALWAYS map to one of the enum codes (AD, ST, RB, UB, BS, BB, FIR, MFIR, FR, FRB, FRS, HCB, IR, PIP, TU) - don't use full names",
        "    - AD = Adobe (Adobe, Adobe Construction, Adobe Building)",
        "    - ST = All Steel (Steel, All Steel, Steel Frame)",
        "    - RB = Brick, reinforced (Reinforced Brick, Brick reinforced, Reinf Brick)",
        "    - UB = Brick, unreinforced (Unreinforced Brick, Brick unreinforced, Unreinf Brick)",
        "    - BS = Brick & Steel Truss (Brick Steel Truss, Brick and Steel)",
        "    - BB = Butler Building (Butler Building, Butler Bldg, Butler, Prefab Metal Building)",
        "    - FIR = Fire Resistive (Fire Resistive, Fire Resist, Concrete, Concrete Frame)",
        "    - MFIR = Modified Fire Resistive (Modified Fire Resistive, Mod Fire Resist)",
        "    - FR = Frame (Frame, Wood Frame, Frame Construction, Wood Construction)",
        "    - FRB = Frame with Brick (Frame w Brick, Frame with Brick, Brick Veneer on Frame)",
        "    - FRS = Frame/Stucco (Frame Stucco, Frame/Stucco, Stucco on Frame)",
        "    - HCB = HCB (HCB, Hollow Concrete Block, CMU, Concrete Masonry Unit)",
        "    - IR = Iron & Wood Frame (Iron Wood Frame, Iron and Wood, Iron/Wood)",
        "    - PIP = Poured-in Place (Poured-in Place, Poured in Place, PIP, Cast-in-Place, Poured Concrete)",
        "    - TU = Tilt-Up (Tilt-Up, Tilt Up, Tiltup, Tilt-up Construction)",
        "11. For key_name: MUST be max 15 characters - truncate if needed, use 'Last, First' format for individuals",
        "12. For notes: Include source_refs with source_id, page number, and snippet of text for traceability",
        "13. For COPE data (Construction, Occupancy, Protection, Exposure): These fields are CRITICAL - extract them even if they're not in obvious locations",
        "    - **ALL COPE fields MUST go in locations[].building structure**",
        "    - **If only one location, use locations[0].building for all COPE data**",
        "14. For coverage limits: If you see ANY number that could be a coverage amount, extract it - be aggressive",
        "    - **ALL coverage limits MUST go in locations[].coverages structure**",
        "    - **If only one location, use locations[0].coverages for all coverage data**",
        "15. **CRITICAL STRUCTURE RULE: You MUST create at least one location entry. Even if only one address is found, create locations[0] with that address, and place ALL building and coverage data in locations[0].building and locations[0].coverages**",
        "16. Return ONLY valid JSON, no markdown, no code fences, no explanations\n",
        
        "**IMPORTANT:**",
        "- key_name must be max 15 characters (truncate if needed)",
        "- key_name for individuals should be 'Last, First' format",
        "- company_number defaults to '105'",
        "- Return ALL locations found (can be empty array if none)",
        "- Return ALL notes as array of objects with source_refs\n",
        
        "**REDACTION IDENTIFICATION:**",
        "In addition to extracting fields, identify PII (Personally Identifiable Information) candidates for redaction:",
        "- Social Security Numbers (SSN)",
        "- Credit Card Numbers",
        "- Bank Account Numbers",
        "- Driver's License Numbers",
        "- Medical Record Numbers",
        "- Full Dates of Birth (if not needed for policy dates)",
        "- Other sensitive personal information\n",
        
        "**OUTPUT FORMAT:**",
        "You MUST return a JSON object with TWO top-level keys:",
        "1. 'extracted_data': The PBOP fields structure (as defined above)",
        "2. 'redaction_instructions': Array of redaction instructions, each with:",
        "   - 'source_id': The source ID where text was found",
        "   - 'text_to_redact': The exact text string to redact",
        "   - 'reason': Brief reason (e.g., 'SSN', 'Credit Card', 'DOB')",
        "   - 'start_position': Character position where text starts (optional, for precision)",
        "   - 'end_position': Character position where text ends (optional, for precision)\n",
        
        "**CRITICAL:**",
        "- DO NOT rewrite or modify the original document text",
        "- DO NOT return redacted text in extracted_data",
        "- ONLY identify what needs to be redacted via redaction_instructions",
        "- Redactions will be applied deterministically in code\n",
        
        "Return ONLY the JSON object, nothing else.",
    ]
    
    return "\n".join(prompt_parts)


def extract_with_schema(
    corpus_text: str,
    schema_definition: Dict[str, Any],
    api_key: str,
    model: str = "gpt-5-mini",
) -> Dict[str, Any]:
    """
    LAYER 3: Extract structured data + identify redaction candidates.
    TEXT MODEL ONLY - called once with normalized corpus.
    
    Returns:
    {
        "extracted_data": {...},  # PBOP fields in strict JSON
        "redaction_instructions": [...]  # Array of redaction instructions
    }
    
    The model MUST NOT rewrite the document text.
    Redactions MUST be applied deterministically in code using returned instructions.
    """
    if not api_key or not api_key.startswith("sk-") or len(api_key) < 20:
        raise ValueError("Invalid OpenAI API key")
    
    if not corpus_text:
        raise ValueError("Corpus text is required")
    
    # Limit corpus size to avoid token limits
    # gpt-4o supports up to 128k tokens, so we can use much more text
    # ~4 characters = 1 token, so 128k tokens = ~512k characters
    # We'll use 200k characters to leave room for the prompt and response
    max_corpus_length = 200000  # Increased from 50k to capture more pages
    original_length = len(corpus_text)
    
    if original_length > max_corpus_length:
        logger.warning(f"Corpus text truncated: {original_length:,} chars -> {max_corpus_length:,} chars (lost {original_length - max_corpus_length:,} chars)")
        logger.warning(f"This may cause COPE data on later pages to be missed. Consider using smaller documents or implementing page prioritization.")
        truncated_corpus = corpus_text[:max_corpus_length]
        # Add warning to corpus that it was truncated
        truncated_corpus = f"[WARNING: Document truncated - first {max_corpus_length:,} of {original_length:,} characters shown. Some later pages may be missing.]\n\n{truncated_corpus}"
    else:
        truncated_corpus = corpus_text
        logger.info(f"Full corpus sent to AI: {original_length:,} characters from all sources")
    
    # Build prompt
    system_prompt = build_extraction_prompt(schema_definition)
    user_prompt = f"Extract all underwriting data from these submission documents. Pay special attention to COPE data (Construction, Occupancy, Protection, Exposure) and coverage limits which may appear on any page.\n\n{truncated_corpus}"
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Try GPT-5 first, fallback to GPT-4o if not available
        # Skip model validation (models.list() can be slow/hang) - just try the API call directly
        # If it fails, we'll catch the error and fallback
        fallback_model = "gpt-4o"
        original_model = model
        
        # Build request parameters - exclude certain params for GPT-5 models
        request_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},  # Force JSON output
        }
        
        # GPT-5 models don't support temperature, top_p, frequency_penalty, presence_penalty
        if not model.startswith("gpt-5"):
            request_params["temperature"] = 0.1  # Low temperature for consistent extraction
        
        response = client.chat.completions.create(**request_params)
        
        # Validate response - check for model errors
        if not response.choices or not response.choices[0].message:
            error_msg = f"CRITICAL: GPT-5 model '{model}' returned empty response. This may indicate the model is not available."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        result_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        try:
            # Remove markdown code fences if present
            result_text = re.sub(r'^```json\s*\n', '', result_text)
            result_text = re.sub(r'\n```\s*$', '', result_text)
            result_text = result_text.strip()
            
            extracted_data = json.loads(result_text)
            
            # Validate structure (basic validation)
            if not isinstance(extracted_data, dict):
                raise ValueError("Extracted data must be a JSON object")
            
            # Handle response format - check if it's the new format with redaction_instructions
            if "extracted_data" in extracted_data:
                # New format: {extracted_data: {...}, redaction_instructions: [...]}
                extracted_data = extracted_data  # Keep as-is
                # Ensure extracted_data has required keys
                if "extracted_data" in extracted_data:
                    for key in ["policy", "agency", "insured", "notes", "locations"]:
                        if key not in extracted_data["extracted_data"]:
                            extracted_data["extracted_data"][key] = {} if key not in ["notes", "locations"] else []
                # Ensure redaction_instructions exists
                if "redaction_instructions" not in extracted_data:
                    extracted_data["redaction_instructions"] = []
            else:
                # Old format: just the data structure directly
                # Wrap it in the new format
                old_data = extracted_data.copy()
                extracted_data = {
                    "extracted_data": old_data,
                    "redaction_instructions": [],
                }
                # Ensure required keys exist
                for key in ["policy", "agency", "insured", "notes", "locations"]:
                    if key not in extracted_data["extracted_data"]:
                        extracted_data["extracted_data"][key] = {} if key not in ["notes", "locations"] else []
            
            return extracted_data
        
        except json.JSONDecodeError as e:
            # Try to repair JSON (remove trailing commas, etc.)
            try:
                # Simple repair attempt
                repaired = re.sub(r',(\s*[}\]])', r'\1', result_text)
                extracted_data = json.loads(repaired)
                return extracted_data
            except:
                raise ValueError(f"Failed to parse JSON response: {str(e)}\nResponse was: {result_text[:500]}")
    
    except ValueError as e:
        # Re-raise ValueError (model validation errors) as-is
        logger.error(f"CRITICAL GPT-5 validation error: {str(e)}")
        raise
    except Exception as e:
        # Check if error is about model not found - try fallback if original was GPT-5
        error_str = str(e).lower()
        if original_model.startswith("gpt-5") and ("model" in error_str and ("not found" in error_str or "does not exist" in error_str or "invalid" in error_str or "not available" in error_str)):
            # Try fallback model
            logger.warning(f"GPT-5 model '{original_model}' not available, trying fallback '{fallback_model}'")
            try:
                request_params = {
                    "model": fallback_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,  # GPT-4o supports temperature
                }
                response = client.chat.completions.create(**request_params)
                # Continue processing response below
                if not response.choices or not response.choices[0].message:
                    raise ValueError(f"Fallback model '{fallback_model}' returned empty response")
                result_text = response.choices[0].message.content.strip()
                # Parse JSON and return (same as above)
                result_text = re.sub(r'^```json\s*\n', '', result_text)
                result_text = re.sub(r'\n```\s*$', '', result_text)
                result_text = result_text.strip()
                extracted_data = json.loads(result_text)
                if not isinstance(extracted_data, dict):
                    raise ValueError("Extracted data must be a JSON object")
                # Handle response format
                if "extracted_data" in extracted_data:
                    if "redaction_instructions" not in extracted_data:
                        extracted_data["redaction_instructions"] = []
                else:
                    extracted_data = {"extracted_data": extracted_data, "redaction_instructions": []}
                return extracted_data
            except Exception as fallback_error:
                logger.error(f"Fallback model '{fallback_model}' also failed: {str(fallback_error)}")
                raise ValueError(f"Both '{original_model}' and '{fallback_model}' failed. Original error: {str(e)}, Fallback error: {str(fallback_error)}") from e
        raise ValueError(f"OpenAI API error: {str(e)}")
