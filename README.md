# docs-reports

Scripts for generating reports for documentation repos.

## Generate Biweekly PR Report

To generate a biweekly report on the changes that have been made to the docs site, which includes the PRs merged within the last two weeks and all open PRs, you can use the `generate-biweekly-pr-report.js` script.

To run the script, you will need to create a `.env` file. Your `.env` file will need to contain the same variables defined in the `.env.example` file.

The script accepts these inputs:

- `--github-username` or `-u` - the GitHub username or org name that owns the docs repo you want to generate a report for
- `--github-repo` or `-r` - the GitHub repo name of the docs you want to generate a report for

Then you can run the script using the following command:

```bash
node scripts/generate-biweekly-report.js -u INSERT_GITHUB_USERNAME -r INSERT_REPO_NAME
```

The output of the script will appear in the `csv_output` directory.
