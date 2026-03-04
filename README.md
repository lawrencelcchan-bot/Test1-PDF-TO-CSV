diff --git a/README.md b/README.md
index 7f8d9223210ffe4feea5b41ff153f7346301534d..b6b1d4630de610dbfe3213333ae0c993e34ce591 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,20 @@
-# Test1-PDF-TO-CSV
\ No newline at end of file
+# Test1-PDF-TO-CSV
+
+Browser-only PDF to CSV utility that works on GitHub Pages.
+
+## How to use
+
+1. Open `index.html` from a static host (or GitHub Pages deployment).
+2. Upload a PDF file.
+3. In **Preview & Column Editor**:
+   - Use **Split mode: Auto** for automatic breaks, or switch to **Manual**.
+   - In manual mode, drag vertical dividers or edit numeric break positions.
+   - Add/remove dividers to change column count.
+   - Rename headers inline in the preview table.
+4. Click **Download CSV**.
+
+CSV export includes headers and rows exactly as shown in the preview table.
+
+## Persistence
+
+The app stores manual break positions, split mode, and header names in `localStorage`, and restores them on refresh.
