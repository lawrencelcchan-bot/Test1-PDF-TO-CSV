diff --git a/README.md b/README.md
index 7f8d9223210ffe4feea5b41ff153f7346301534d..7956ea7ca3f8e4c38ea906ae9c408f9e2d8bbcaa 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,17 @@
-# Test1-PDF-TO-CSV
\ No newline at end of file
+# Test1-PDF-TO-CSV
+
+Browser-only PDF to CSV utility that works on GitHub Pages.
+
+## How to use
+
+1. Upload a PDF.
+2. Click **Preview**.
+3. In **Preview & Column Editor**, adjust column breaks (Auto/Manual, drag dividers, or edit numeric positions).
+4. Rename headers inline if needed.
+5. Click **Process** (top-right of preview panel) to generate/download CSV from your current preview.
+
+CSV export includes headers and rows exactly as shown in the preview table.
+
+## Persistence
+
+The app stores manual break positions, split mode, and header names in `localStorage`, and restores them on refresh.
