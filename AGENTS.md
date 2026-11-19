# Architecture rules

- Signature Excel exports fetch admin-authorized, metadata-only cursor pages and assemble workbooks in the browser; this avoids large image payloads and server memory limits.
- Excel files are prepared before a separate download click; this preserves user activation for mobile downloads and sharing.
- Digital exports contain one flat metadata sheet; manual exports contain a master index and one upload sheet with sequential image/PDF-page rendering and internal links only, keeping the database unchanged and attachments offline.