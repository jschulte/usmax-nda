# RTF Generation Manual E2E Checklist

This checklist covers the end-to-end validation that cannot be fully automated (Word/LibreOffice rendering).

## Preconditions

- An NDA exists with all fields populated (company, agency, POCs, dates).
- A template exists with placeholders for company, agency, contacts, and dates.

## Steps

1. Create or select an NDA with complete data.
2. Generate an RTF document via `POST /api/ndas/:id/generate-document`.
3. Download the generated RTF from the returned document metadata.
4. Open the RTF in Microsoft Word and/or LibreOffice.
5. Verify all placeholders were replaced with actual values.
6. Verify formatting is preserved (bold, italics, headings, lists).
7. Verify special characters render correctly (backslashes, braces, newlines).

## Expected Results

- No `{{placeholder}}` tokens remain in the document.
- Dates display as `MM/DD/YYYY`.
- Contact names display as `FirstName LastName`.
- Document formatting matches the template.
