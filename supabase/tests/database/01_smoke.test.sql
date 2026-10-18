BEGIN;
SELECT plan(1);

SELECT pass('pgTAP test harness initialized');

SELECT * FROM finish();
ROLLBACK;
