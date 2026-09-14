UPDATE sync_rev SET value = value + 1;

UPDATE exercises SET muscle_group = 'Quads', rev = (SELECT value FROM sync_rev) WHERE muscle_group = 'Legs';
UPDATE exercises SET muscle_group = 'Abs', rev = (SELECT value FROM sync_rev) WHERE muscle_group = 'Core';

ALTER TABLE programs DROP COLUMN weekday;
