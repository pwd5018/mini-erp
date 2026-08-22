# Security

Phase 1 has no mutation path and therefore cannot change ERP data. Seeded notes and descriptions are data only; future agent prompts and tool adapters must treat all enterprise fields as untrusted content, never as instructions.

Planned controls include deterministic role checks outside the model, explicit structured approvals for every write, strict Zod input schemas, record existence checks, idempotency keys, and verification after uncertain transactions.
