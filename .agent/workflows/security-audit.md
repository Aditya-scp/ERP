Workflow: /security-audit
Audit the code and database for security problems and do not fix anything yet.
1. List every table and confirm RLS is enabled and has policies for every role that should access it.
2. Try cross-tenant reads and writes as a user of school A against school B data. Report any success.
3. Check that students, parents and teachers cannot read data outside their scope.
4. Search the code for service-role key usage outside server code and for hardcoded secrets.
5. Check storage buckets for public access and missing school_id prefixes.
6. Check that every sensitive action writes an audit log row.
7. Output a table: finding, severity, file or table, proposed fix. Wait for my approval before changing code.