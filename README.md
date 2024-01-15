# docs-reports

Scripts for generating reports for documentation repos.

## Generate Biweekly PR Report

To generate a biweekly report on the changes that have been made to the docs site, which, by default, includes the PRs merged within the last two weeks and all open PRs, you can use the `generate-biweekly-PR-report.js` script.

To run the script, you will need to create a `.env` file. Your `.env` file will need to contain the same variables defined in the `.env.example` file.

The script accepts these inputs:

- `--github-username` or `-u` - the GitHub username or org name that owns the docs repo you want to generate a report for
- `--github-repo` or `-r` - the GitHub repo name of the docs you want to generate a report for
- `--start-date` or `s` - the date to start including merged PRs
- `--stop-date` or `t` - the date to stop including merged PRs
- `--num-days` or `n` - the number of previous days to include merged PRs from

Note: If `--start-date`, `--stop-date`, or `--num-days` is not provided, the PRs merged within the last two weeks will be pulled.

Then you can run the script using the following command:

```bash
node scripts/generate-biweekly-PR-report.js -u INSERT_GITHUB_USERNAME -r INSERT_REPO_NAME
```

The output of the script will appear in the `csv_output` directory.
