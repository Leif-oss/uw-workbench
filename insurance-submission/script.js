// Insurance Submission Form Handler
// Generates AS400 CSL (Character Separated Line) format files

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('submission-form');
    const clearBtn = document.getElementById('clear-form');
    const successMessage = document.getElementById('success-message');

    // Form field definitions for CSL format
    // CSL is typically a fixed-width or comma-separated format
    // For AS400, we'll use a pipe-delimited format with fixed positions
    const fieldDefinitions = [
        { name: 'effective_date', width: 10, pad: 'right', format: 'date' },
        { name: 'expiration_date', width: 10, pad: 'right', format: 'date' },
        { name: 'producer_name', width: 50, pad: 'right' },
        { name: 'producer_code', width: 10, pad: 'right' },
        { name: 'insured_name', width: 50, pad: 'right' },
        { name: 'additional_insured_names', width: 100, pad: 'right' },
        { name: 'contact_name', width: 50, pad: 'right' },
        { name: 'contact_phone', width: 20, pad: 'right' },
        { name: 'contact_email', width: 50, pad: 'right' },
        { name: 'mailing_address', width: 100, pad: 'right' },
        { name: 'location_street_number', width: 15, pad: 'right' },
        { name: 'location_street_name', width: 50, pad: 'right' },
        { name: 'location_suite', width: 20, pad: 'right' },
        { name: 'location_city', width: 30, pad: 'right' },
        { name: 'location_state', width: 2, pad: 'right' },
        { name: 'location_zip', width: 10, pad: 'right' },
        { name: 'building_limit', width: 15, pad: 'left', format: 'number' },
        { name: 'deductible', width: 15, pad: 'right' },
        { name: 'additional_limits_rents', width: 15, pad: 'left', format: 'number' },
        { name: 'additional_limits_ordinance', width: 15, pad: 'left', format: 'number' },
        { name: 'additional_limits_demolition', width: 15, pad: 'left', format: 'number' },
        { name: 'additional_limits_eqsl', width: 15, pad: 'left', format: 'number' },
        { name: 'additional_insured', width: 100, pad: 'right' },
        { name: 'mortgagee', width: 100, pad: 'right' },
        { name: 'loss_payee', width: 100, pad: 'right' },
        { name: 'construction_type', width: 30, pad: 'right' },
        { name: 'construction_year', width: 4, pad: 'right' },
        { name: 'square_feet', width: 15, pad: 'left', format: 'number' },
        { name: 'sprinkler_percent', width: 10, pad: 'right' },
        { name: 'protection_class', width: 10, pad: 'right' },
        { name: 'line_of_business', width: 50, pad: 'right' },
        { name: 'notes', width: 200, pad: 'right' }
    ];

    // Format date from YYYY-MM-DD to MM/DD/YYYY
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }

    // Clean and format number (remove commas, dollar signs)
    function formatNumber(value) {
        if (!value) return '';
        return String(value).replace(/[$,]/g, '').trim();
    }

    // Pad string to fixed width
    function padString(str, width, pad = 'right') {
        str = String(str || '').trim();
        if (str.length > width) {
            str = str.substring(0, width);
        }
        if (pad === 'left') {
            return str.padStart(width, ' ');
        } else {
            return str.padEnd(width, ' ');
        }
    }

    // Format field value based on definition
    function formatFieldValue(value, fieldDef) {
        if (!value || value.trim() === '') {
            return '';
        }

        let formatted = value;

        // Apply format transformations
        if (fieldDef.format === 'date') {
            formatted = formatDate(value);
        } else if (fieldDef.format === 'number') {
            formatted = formatNumber(value);
        }

        // Pad to width
        return padString(formatted, fieldDef.width, fieldDef.pad);
    }

    // Generate CSL file content (Fixed-width format)
    function generateCSLContent(formData) {
        const lines = [];
        
        // Header line with field names (optional, comment out if AS400 doesn't need it)
        const headerLine = fieldDefinitions.map(f => padString(f.name, f.width, f.pad)).join('');
        lines.push(headerLine);

        // Data line
        const dataLine = fieldDefinitions.map(f => {
            const value = formData.get(f.name) || '';
            return formatFieldValue(value, f);
        }).join('');

        lines.push(dataLine);
        
        return lines.join('\n');
    }

    // Generate CSV format (alternative format)
    function generateCSVContent(formData) {
        const headers = fieldDefinitions.map(f => f.name);
        const values = fieldDefinitions.map(f => {
            let value = formData.get(f.name) || '';
            
            // Format date
            if (f.format === 'date') {
                value = formatDate(value);
            }
            
            // Escape commas and quotes in CSV
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            
            return value;
        });

        return [headers.join(','), values.join(',')].join('\n');
    }

    // Generate pipe-delimited format (common for AS400)
    function generatePipeDelimitedContent(formData) {
        const headers = fieldDefinitions.map(f => f.name);
        const values = fieldDefinitions.map(f => {
            let value = formData.get(f.name) || '';
            
            // Format date
            if (f.format === 'date') {
                value = formatDate(value);
            }
            
            // Replace pipes in value with spaces
            value = value.replace(/\|/g, ' ');
            
            return value.trim();
        });

        return [headers.join('|'), values.join('|')].join('\n');
    }

    // Download file
    function downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        // Basic validation
        const requiredFields = ['effective_date', 'expiration_date', 'producer_name', 'insured_name'];
        let isValid = true;
        let firstInvalidField = null;

        for (const field of requiredFields) {
            const value = formData.get(field);
            if (!value || value.trim() === '') {
                isValid = false;
                firstInvalidField = field;
                break;
            }
        }

        if (!isValid) {
            alert('Please fill in all required fields (marked with *).');
            if (firstInvalidField) {
                const fieldElement = document.getElementById(firstInvalidField);
                if (fieldElement) {
                    fieldElement.focus();
                    fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            return;
        }

        // Generate timestamp for filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const dateStr = new Date().toISOString().slice(0, 10);

        // Generate all three formats
        const cslContent = generateCSLContent(formData);
        const csvContent = generateCSVContent(formData);
        const pipeContent = generatePipeDelimitedContent(formData);

        // Download CSL (fixed-width) - primary format
        downloadFile(cslContent, `insurance_submission_${timestamp}.csl`, 'text/plain');
        
        // Also download CSV as backup
        setTimeout(() => {
            downloadFile(csvContent, `insurance_submission_${timestamp}.csv`, 'text/csv');
        }, 300);

        // Also download pipe-delimited as alternative
        setTimeout(() => {
            downloadFile(pipeContent, `insurance_submission_${timestamp}.txt`, 'text/plain');
        }, 600);

        // Show success message
        successMessage.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Hide success message after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    });

    // Clear form handler
    clearBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all form data?')) {
            form.reset();
            successMessage.style.display = 'none';
            // Focus on first field
            const firstField = document.getElementById('effective_date');
            if (firstField) {
                firstField.focus();
            }
        }
    });

    // Auto-format phone number
    const phoneInput = document.getElementById('contact_phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 6) {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            } else if (value.length >= 3) {
                value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            }
            e.target.value = value;
        });
    }

    // Auto-format dates on input
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            // Validate expiration is after effective
            if (e.target.id === 'expiration_date' && document.getElementById('effective_date').value) {
                const effective = new Date(document.getElementById('effective_date').value);
                const expiration = new Date(e.target.value);
                if (expiration <= effective) {
                    alert('Expiration date must be after effective date.');
                    e.target.value = '';
                }
            }
        });
    });

    // Format number inputs (remove non-numeric except for %)
    const numberInputs = document.querySelectorAll('input[id*="limit"], input[id="deductible"], input[id="square_feet"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value;
            // Allow numbers, commas, and decimal points
            value = value.replace(/[^\d,.]/g, '');
            e.target.value = value;
        });
    });
});

