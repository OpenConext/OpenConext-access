ALTER TABLE organizations
DROP INDEX full_text_index,
  ADD FULLTEXT INDEX full_text_index (name);

ALTER TABLE organizations
DROP COLUMN schac_home_organization;
