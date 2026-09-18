# Tests

Unit tests live next to the code they cover (`*.test.ts`) and run with `npm test`.

`browser-regressions/` is an opt-in live Google Flights case. It uses the same
**local headed Chrome** path as `npm run dev`, not a Linux VM.

`vm/linux-chrome` is obsolete. We tried a containerized Chromium for Google
sign-in; it was too heavy. Headed Chrome on this Mac with a shared profile is
the runtime we kept.
