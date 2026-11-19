# Architecture rules

- Signature Excel exports fetch admin-authorized, metadata-only cursor pages and assemble workbooks in the browser; this avoids large image payloads and server memory limits.
- Excel files are prepared before a separate download click; this preserves user activation for mobile downloads and sharing.