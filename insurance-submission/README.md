# Insurance Submission Form

A standalone web application for insurance agents to enter submission data that is exported in AS400 CSL (Character Separated Line) format for import.

## Design

The application is styled to match the Deans & Homer website (www.deanshomer.com) with:
- Dark navy/blue color scheme
- Clean, professional interface
- Modern typography and spacing
- Responsive design for mobile and desktop

## Features

- **Comprehensive Form Fields**: All fields from the document scrubber including:
  - Policy dates (effective/expiration)
  - Producer/agency information
  - Insured information
  - Contact details
  - Property location
  - Coverage limits
  - Building characteristics
  - Additional parties (mortgagee, loss payee, etc.)
  - Notes and special conditions

- **Multiple Export Formats**:
  - **CSL (Fixed-Width)**: Primary AS400 format with fixed-width fields
  - **CSV**: Comma-separated format for backup/compatibility
  - **Pipe-Delimited**: Alternative text format

- **Form Validation**: Required field validation and date range checking

- **Auto-Formatting**: 
  - Phone numbers auto-format as (XXX) XXX-XXXX
  - Dates validated (expiration must be after effective)
  - Numbers formatted appropriately

## Usage

1. **Open the Application**:
   - Simply open `index.html` in a web browser
   - Or serve via a web server for better security

2. **Fill Out the Form**:
   - Required fields are marked with an asterisk (*)
   - Complete as much information as available
   - Dates can be entered using the date picker

3. **Generate Files**:
   - Click "Generate AS400 CSL File" button
   - Three files will download:
     - `.csl` - Fixed-width format (primary for AS400)
     - `.csv` - CSV format (backup)
     - `.txt` - Pipe-delimited format (alternative)

4. **Clear Form**:
   - Click "Clear Form" to reset all fields

## File Formats

### CSL Format (Fixed-Width)
- Each field has a fixed character width
- Fields are padded with spaces
- No delimiters between fields
- Suitable for AS400 fixed-format imports

### CSV Format
- Comma-separated values
- Fields with commas/quotes are properly escaped
- Compatible with Excel and most systems

### Pipe-Delimited Format
- Fields separated by pipe (|) character
- Common alternative format for AS400 systems

## Field Specifications

All fields match the document scrubber schema:

- **Dates**: MM/DD/YYYY format
- **Producer Code**: 6-digit code (e.g., 010233)
- **State**: 2-letter abbreviation
- **ZIP**: 5 or 9 digits
- **Limits**: Numeric values (commas allowed for readability)
- **Construction Type**: Dropdown selection
- **Square Feet**: Numeric
- **Sprinkler Percent**: Percentage (e.g., 100%)

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server required - runs entirely in the browser
- No dependencies or external libraries

## Customization

To modify field widths or add/remove fields, edit the `fieldDefinitions` array in `script.js`:

```javascript
const fieldDefinitions = [
    { name: 'field_name', width: 50, pad: 'right', format: 'date' },
    // ...
];
```

- `name`: Form field name (must match input `name` attribute)
- `width`: Character width for fixed-width format
- `pad`: 'left' or 'right' padding direction
- `format`: Optional format type ('date' or 'number')

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Notes

- Files are generated client-side (no data sent to server)
- All processing happens in your browser
- Data privacy is maintained - no external connections

