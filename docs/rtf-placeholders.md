# RTF Template Placeholders

Use double-brace tokens (e.g., `{{companyName}}`) in RTF templates. During document generation, placeholders are replaced with NDA values.

## Formatting Rules

- Dates render as `MM/DD/YYYY`.
- Null or missing values render as an empty string.
- Contact names render as `FirstName LastName` (extra spaces trimmed).
- Special characters in values are escaped for RTF (`\`, `{`, `}`, and newlines).

## Company Fields

- `{{companyName}}` — Legal company name. Example: `Acme Corporation`
- `{{companyCity}}` — Company city (legacy alias for `{{city}}`). Example: `Washington`
- `{{companyState}}` — Company state (legacy alias for `{{state}}`). Example: `DC`
- `{{city}}` — Company city. Example: `Washington`
- `{{state}}` — Company state. Example: `DC`
- `{{stateOfIncorporation}}` — State of incorporation. Example: `Delaware`
- `{{abbreviatedName}}` — Abbreviated NDA name. Example: `ACME`
- `{{authorizedPurpose}}` — Authorized purpose text. Example: `Proposal Development for Contract XYZ-2024`
- `{{displayId}}` — NDA display identifier. Example: `100123`
- `{{ndaType}}` — NDA type. Example: `MUTUAL`
- `{{usmaxPosition}}` — USmax position. Example: `Prime Contractor`
- `{{usMaxPosition}}` — USmax position (legacy alias). Example: `Prime Contractor`

## Agency Fields

- `{{agencyGroupName}}` — Agency group name. Example: `Department of Defense`
- `{{subagencyName}}` — Subagency name. Example: `U.S. Air Force`
- `{{agencyOfficeName}}` — Agency office name. Example: `Office of the Secretary`

## Date Fields

- `{{effectiveDate}}` — NDA effective date (MM/DD/YYYY)
- `{{expirationDate}}` — NDA expiration date (MM/DD/YYYY)
- `{{createdDate}}` — NDA created date (MM/DD/YYYY)
- `{{requestedDate}}` — NDA requested date (alias of created date)
- `{{generatedDate}}` — Document generation date (MM/DD/YYYY)

## Contact Fields

- `{{opportunityContactName}}` — Opportunity contact full name
- `{{opportunityContactEmail}}` — Opportunity contact email
- `{{opportunityContactPhone}}` — Opportunity contact phone
- `{{contractsContactName}}` — Contracts contact full name
- `{{contractsContactEmail}}` — Contracts contact email
- `{{contractsContactPhone}}` — Contracts contact phone
- `{{relationshipContactName}}` — Relationship contact full name
- `{{relationshipContactEmail}}` — Relationship contact email
- `{{relationshipContactPhone}}` — Relationship contact phone
- `{{contactsContactName}}` — Contacts contact full name

## Legacy Contact Aliases

- `{{opportunityPocName}}` — Opportunity POC name (legacy alias)
- `{{contractsPocName}}` — Contracts POC name (legacy alias)
- `{{relationshipPocName}}` — Relationship POC name (legacy alias)
- `{{contactsPocName}}` — Contacts POC name (legacy alias)

## Metadata

- `{{createdByName}}` — NDA creator name

## Example Snippet

```
{\\rtf1\\ansi
Company: {{companyName}}\\line
Agency: {{agencyGroupName}} / {{subagencyName}}\\line
Effective: {{effectiveDate}}\\line
Opportunity Contact: {{opportunityContactName}} ({{opportunityContactEmail}})
}
```

## RTF Escaping Notes

Values are escaped before insertion:
- `\` becomes `\\`
- `{` becomes `\{`
- `}` becomes `\}`
- Newlines become `\\line`

Placeholders themselves are not escaped before replacement.
