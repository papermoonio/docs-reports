# GitHub Reports & CSV Enhancement

Scripts for generating and enhancing GitHub repository reports with AI-powered improvements.

## Prerequisites

- Node.js (v14 or higher)
- GitHub personal access token with repository access
- AI API key (compatible with OpenAI format)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file with your configuration:**
   ```env
   # Required API Keys
   GITHUB_AUTH_TOKEN=your_github_personal_access_token
   OPENAI_API_KEY=your_ai_api_key

   # Default Configuration (for zero-config workflow)
   DEFAULT_REPOS="org/repo1,org/repo2,org/repo3"
   DEFAULT_AUTHORS="dev1,dev2,dev3,lead1"

   # AI Prompts for CSV Enhancement (customize as needed)
   PROMPT_DEFAULT="Generate concise descriptions under 15 words based on the content. Return full CSV with updated description field only."
   PROMPT_TECHNICAL="Rewrite descriptions using technical terminology and precise language. Keep under 20 words. Return full CSV with updated description field only."
   PROMPT_CATEGORIZE="Add category prefixes like [BUG], [FEATURE], [DOCS], [SETUP] based on content. Return full CSV with updated description field only."
   PROMPT_BUSINESS="Focus on business impact and user value. Keep under 25 words. Return full CSV with updated description field only."
   PROMPT_PRIORITY="Add priority indicators [HIGH], [MEDIUM], [LOW] based on severity and include brief description. Return full CSV with updated description field only."
   PROMPT_CLEAN="Clean up markdown, fix grammar, make readable while preserving core meaning. Return full CSV with updated description field only."
   ```

3. **Quick start (zero-config workflow):**
   ```bash
   # After setting up .env with DEFAULT_REPOS and DEFAULT_AUTHORS
   ./scripts/csv-generate-and-improve.sh  # That's it!
   ```

---

## Script 1: PR Report Generator

**Purpose**: Creates time-based reports of merged pull requests from a single GitHub repository.

### Usage
```bash
node scripts/generate-PR-report.js [options]
```

### Parameters
| Parameter | Short | Description | Required |
|-----------|-------|-------------|----------|
| `--github-username` | `-u` | GitHub organization or username | ✅ |
| `--github-repo` | `-r` | Repository name | ✅ |
| `--start-date` | `-s` | Start date (YYYY-MM-DD) | ❌ |
| `--stop-date` | `-t` | End date (YYYY-MM-DD) | ❌ |
| `--num-days` | `-n` | Number of days back from today | ❌ |

### Examples
```bash
# Last 2 weeks (default)
node scripts/generate-PR-report.js -u moonbeam-foundation -r moonbeam-docs

# Last 30 days
node scripts/generate-PR-report.js -u parity -r substrate -n 30

# Specific date range
node scripts/generate-PR-report.js -u ethereum -r go-ethereum -s 2025-01-01 -t 2025-01-31
```

### Output
- CSV file saved to `csv_output/` directory
- Filename format: `{org}_{repo}_PR_Report_{start_date}_{end_date}.csv`
- Columns: Date, PR URL, Title, Description, Status, Author

---

## Script 2: GitHub PR/Issue Indexer

**Purpose**: Comprehensive indexer for issues and pull requests across single or multiple repositories with advanced filtering options.

### Usage
```bash
node scripts/pr-indexer.js <repo_input> <output_csv> [authors] [status_filter]
```

### Parameters
| Parameter | Description | Format | Required |
|-----------|-------------|--------|----------|
| `repo_input` | Repository specification | See formats below | ✅ |
| `output_csv` | Output CSV file path | `path/to/file.csv` | ✅ |
| `authors` | Filter by specific authors | `"user1,user2,user3"` | ❌ |
| `status_filter` | Filter by status | `"open,closed,merged"` | ❌ |

### Repository Input Formats
```bash
# Single repository
"owner/repo"
"https://github.com/owner/repo"

# Multiple repositories
"owner1/repo1,owner2/repo2,owner3/repo3"
"https://github.com/owner1/repo1,https://github.com/owner2/repo2"
```

### Status Filter Options
- `open` - Open issues and PRs
- `closed` - Closed issues and non-merged PRs
- `merged` - Merged pull requests only

### Examples
```bash
# All issues/PRs from single repo
node scripts/pr-indexer.js "paritytech/substrate" all_items.csv

# Multiple repos with author filtering
node scripts/pr-indexer.js "parity/substrate,parity/polkadot" team_work.csv "alice,bob,charlie"

# Open items only
node scripts/pr-indexer.js "ethereum/go-ethereum" open_items.csv "" "open"

# Merged PRs from specific authors
node scripts/pr-indexer.js "microsoft/vscode" merged_prs.csv "john,jane" "merged"

# Multiple status types
node scripts/pr-indexer.js "facebook/react" active_items.csv "" "open,merged"

# Complex filtering
node scripts/pr-indexer.js "owner1/repo1,owner2/repo2" filtered.csv "dev1,dev2" "open,closed"
```

### Output
CSV with columns: Repository, Date Opened, Issue/PR URL, Title, Description, Status, Issue Type, Author, Assignees, Reviewers

---

## Script 3: CSV Description Enhancer

**Purpose**: AI-powered enhancement of CSV descriptions using customizable prompts.

### Usage
```bash
node scripts/csv-improve.js <csv_file> [prompt_name]
```

### Parameters
| Parameter | Description | Required |
|-----------|-------------|----------|
| `csv_file` | Path to CSV file to enhance | ✅ |
| `prompt_name` | AI prompt to use (from .env) | ❌ |

### Built-in Behavior
- If no `prompt_name` provided: Uses built-in default prompt (concise descriptions under 15 words)
- If `prompt_name` provided: Uses `PROMPT_{NAME}` from `.env` file

### Examples
```bash
# Use built-in default prompt
node scripts/csv-improve.js data.csv

# Use custom prompts from .env
node scripts/csv-improve.js data.csv TECHNICAL
node scripts/csv-improve.js data.csv CATEGORIZE
node scripts/csv-improve.js data.csv BUSINESS
node scripts/csv-improve.js data.csv PRIORITY
node scripts/csv-improve.js data.csv CLEAN
```

### Custom Prompt Creation
Add to `.env` file:
```env
PROMPT_CUSTOM="Your custom instruction here. Always end with 'Return full CSV with updated description field only.'"
```

Then use:
```bash
node scripts/csv-improve.js data.csv CUSTOM
```

---

## Script 4: Combined Workflow (Recommended)

**Purpose**: Automated pipeline that runs indexer + enhancer in sequence for streamlined workflow.

### Usage
```bash
# Environment-driven (no arguments required)
./scripts/csv-generate-and-improve.sh

# Command-line driven 
./scripts/csv-generate-and-improve.sh [repo_input] [authors] [output_file] [prompt_name] [status_filter]

# Help
./scripts/csv-generate-and-improve.sh --help
```

### Parameters
| Parameter | Default | Description |
|-----------|---------|-------------|
| `repo_input` | `DEFAULT_REPOS` | Repository specification or ENV:config |
| `authors` | `DEFAULT_AUTHORS` | Comma-separated GitHub usernames |
| `output_file` | `"output.csv"` | Output CSV filename |
| `prompt_name` | `"DEFAULT"` | AI prompt name from .env |
| `status_filter` | `""` | Status filter (open,closed,merged) |

### Environment-Driven Workflow (Recommended)

When no arguments are provided, the script automatically uses configuration from `.env`:

```bash
# Uses DEFAULT_REPOS, DEFAULT_AUTHORS, and other .env settings
./scripts/csv-generate-and-improve.sh
```

This approach provides:
- ✅ **Zero configuration**: Just run the script
- ✅ **Team consistency**: Everyone uses the same settings
- ✅ **Easy customization**: Modify .env once, not every command
- ✅ **Reduced errors**: No need to remember long repository lists

### Command-Line Examples
```bash
# Basic usage (all defaults)
./scripts/csv-generate-and-improve.sh "owner/repo"

# With author filtering
./scripts/csv-generate-and-improve.sh "owner/repo" "dev1,dev2"

# Custom output file and prompt
./scripts/csv-generate-and-improve.sh "owner/repo" "dev1" custom.csv TECHNICAL

# Status filtering (skip authors with empty string)
./scripts/csv-generate-and-improve.sh "owner/repo" "" open_only.csv DEFAULT "open"

# Using ENV configurations
./scripts/csv-generate-and-improve.sh ENV:moonbeam "" moonbeam_report.csv BUSINESS

# Full parameter usage
./scripts/csv-generate-and-improve.sh "repo1,repo2" "author1,author2" report.csv CATEGORIZE "merged,closed"
```

---

## Workflow Examples

### Recommended: Environment-Driven Workflows

#### Setup Once, Run Anywhere
```bash
# Setup your .env file with your team's configuration
echo 'DEFAULT_REPOS="org/frontend,org/backend,org/api"' >> .env
echo 'DEFAULT_AUTHORS="dev1,dev2,dev3,lead1"' >> .env

# Then simply run reports with no arguments
./scripts/csv-generate-and-improve.sh  # Uses all defaults

# Or customize specific aspects
./scripts/csv-generate-and-improve.sh ENV:moonbeam "" moonbeam.csv BUSINESS
```

#### Daily Team Reports
```bash
# Weekly team performance (merged PRs)
./scripts/csv-generate-and-improve.sh "" "" weekly_merged.csv BUSINESS "merged"

# Current open work status  
./scripts/csv-generate-and-improve.sh "" "" current_open.csv CATEGORIZE "open"

# All recent activity with technical descriptions
./scripts/csv-generate-and-improve.sh "" "" recent_activity.csv TECHNICAL
```

### Traditional Command-Line Workflows

#### Use Case 1: Team Performance Review
```bash
# Get all merged PRs from team members in last period
./scripts/csv-generate-and-improve.sh "org/repo" "dev1,dev2,dev3" team_performance.csv BUSINESS "merged"
```

#### Use Case 2: Open Issues Analysis  
```bash
# Get all open issues with categorized descriptions
./scripts/csv-generate-and-improve.sh "org/repo" "" open_issues.csv CATEGORIZE "open"
```

#### Use Case 3: Multi-Repository Audit
```bash
# Audit multiple repos for specific authors
./scripts/csv-generate-and-improve.sh "org/frontend,org/backend,org/api" "lead1,lead2" audit.csv PRIORITY "open,merged"
```

### Use Case 4: Documentation Issues
```bash
# Find documentation-related issues across repos
node scripts/pr-indexer.js "org/docs,org/website" docs_issues.csv "" "open"
node scripts/csv-improve.js docs_issues.csv CATEGORIZE
```

---

## Output Files

All scripts generate CSV files with the following characteristics:
- **Encoding**: UTF-8
- **Delimiter**: Comma (,)
- **Quotes**: All fields quoted for safety
- **Sorting**: By date (oldest to newest)

### Column Descriptions
| Column | Description |
|--------|-------------|
| Repository | Repository name (owner/repo) |
| Date Opened | ISO 8601 timestamp |
| Issue/PR URL | Direct GitHub link |
| Title | Original issue/PR title |
| Description | Enhanced description (if processed by AI) |
| Status | Open, Closed, or Merged |
| Issue Type | Issue or PR |
| Author | GitHub username |
| Assignees | Comma-separated list of assigned users |
| Reviewers | Comma-separated list of PR reviewers |

---

## Summary

This GitHub reporting toolkit provides a comprehensive solution for automated PR and issue analysis with the following key features:

### 🎯 **Core Capabilities**
- **Multi-repository support**: Process multiple repos in a single command
- **Comprehensive filtering**: By author, status (open/closed/merged), and more
- **AI-powered enhancement**: Multiple prompt templates for different use cases
- **Rich metadata extraction**: Reviewers, assignees, timestamps, and detailed descriptions

### 🔧 **Configuration Options**
- **Environment-driven workflow**: Zero-config setup using `.env` defaults
- **Command-line flexibility**: Override any setting when needed
- **Custom configurations**: Define team-specific repo and author sets
- **Prompt customization**: Built-in prompts or custom AI instructions

### 📊 **Use Cases**
- **Team performance reviews**: Track merged PRs by team members
- **Sprint reporting**: Analyze open and closed work items
- **Code review metrics**: Extract reviewer patterns and workload
- **Multi-project audits**: Cross-repository issue tracking
- **Documentation generation**: AI-enhanced descriptions for reports

### 🚀 **Recommended Workflow**

1. **One-time setup**: Configure `.env` with your team's repositories and authors
2. **Daily reports**: Run `./scripts/csv-generate-and-improve.sh` with no arguments
3. **Custom analysis**: Override specific parameters as needed
4. **AI enhancement**: Leverage built-in prompts for categorization, prioritization, and cleanup

**Result**: Automated, consistent reporting that adapts to your team's needs while requiring minimal configuration.

---

## Troubleshooting

### Common Issues

1. **API Rate Limits**
   - GitHub API: 5000 requests/hour with auth token
   - Add delays between requests if hitting limits

2. **Large Repositories**
   - Use status filtering to reduce data volume
   - Filter by specific authors to focus scope

3. **AI API Errors**
   - Check API key validity
   - Verify prompt format includes required ending
   - Monitor API quota usage

4. **Missing Dependencies**
   ```bash
   npm install axios csv-writer dotenv yargs json2csv date-fns
   ```

### Error Messages

| Error | Solution |
|-------|----------|
| `GITHUB_AUTH_TOKEN not found` | Add token to .env file |
| `Prompt not found: CUSTOM` | Add `PROMPT_CUSTOM=...` to .env |
| `Invalid repository format` | Use `owner/repo` format |
| `API Response: 401` | Check GitHub token permissions |
| `CSV parse error` | Ensure proper CSV format |

---

## Advanced Configuration

### Custom AI Prompts
Create specialized prompts for different use cases:
```env
PROMPT_SECURITY="Identify security-related issues and add [SECURITY] prefix..."
PROMPT_PERFORMANCE="Focus on performance implications and add timing estimates..."
PROMPT_ACCESSIBILITY="Evaluate accessibility impact and add [A11Y] markers..."
```

### Batch Processing
Process multiple repositories efficiently:
```bash
# Create a batch script
for repo in "org/repo1" "org/repo2" "org/repo3"; do
  ./scripts/csv-generate-and-improve.sh "$repo" "" "${repo//\//_}.csv" TECHNICAL "merged"
done
```

