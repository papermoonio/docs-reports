# moonbeam-docs-reports

Reports for the Moonbeam documentation site.

## Generate Biweekly PR Report

To generate a biweekly report on the changes that have been made to the docs site, which includes the PRs merged within the last two weeks and all open PRs, you can use the `generate-biweekly-pr-report.js` script.

To run the script, you will need to create a `.env` file. Your `.env` file will need to contain the same variables defined in the `.env.example` file.

Then you can run the script using the following command:

```bash
node scripts/generte-biweekly-report.js
```

The output of the script will appear in the `csv_output` directory.
