-- Migrate legacy enum data to Epic 10 values using text comparisons

UPDATE ndas
SET usmax_position = 'SUB_CONTRACTOR'
WHERE usmax_position::text = 'SUB';

UPDATE ndas
SET usmax_position = 'OTHER'
WHERE usmax_position::text = 'TEAMING';

UPDATE ndas
SET nda_type = 'CONSULTANT'
WHERE nda_type::text IN (
  'ONE_WAY_GOVERNMENT',
  'ONE_WAY_COUNTERPARTY',
  'VISITOR',
  'RESEARCH',
  'VENDOR_ACCESS'
);

UPDATE ndas
SET status = 'SENT_PENDING_SIGNATURE'
WHERE status::text = 'EMAILED';

UPDATE ndas
SET status = 'INACTIVE_CANCELED'
WHERE status::text IN ('INACTIVE', 'CANCELLED');

UPDATE nda_status_history
SET status = 'SENT_PENDING_SIGNATURE'
WHERE status::text = 'EMAILED';

UPDATE nda_status_history
SET status = 'INACTIVE_CANCELED'
WHERE status::text IN ('INACTIVE', 'CANCELLED');
