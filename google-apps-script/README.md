# Apps Script files

- `generator/Kode.gs`: copy all contents into the `Kode.gs` file of the standalone AutoDeploy generator project. Replace `PASTE_PARENT_FOLDER_ID_HERE` in that project only.
- `generator/appsscript.json`: manifest for the generator project, not Cloudflare and not the generated customer backend.
- `templates/Code_Top100_Customer_Template.gs`: backend source reference. Generator injects this source into each customer Apps Script project.
- `templates/License_Server_Global_Template.gs`: current global license server reference source. Generator substitutes the database ID automatically.

Use the complete instructions under `../docs/01-...` and `../docs/02-...`. Do not manually deploy a separate license server for every customer.
