# GitHub Reports & CSV Enhancement

Scripts for generating and enhancing GitHub repository reports with AI-powered improvements.

## Dependencies

- Node.js (v14+)
- GitHub personal access token
- AI API key (OpenAI compatible)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```env
   # Required
   GITHUB_AUTH_TOKEN=your_github_token
   OPENAI_API_KEY=your_ai_api_key

## Scripts

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

### 2. PR/Issue Indexer
```bash
node scripts/pr-indexer.js <repo_input> <output.csv> [authors] [format] [status_filter] [type_filter]
```
**Required:** `repo_input`, `output.csv`

**Shortcuts:**
```bash
node scripts/pr-indexer.js output.csv                        # Uses DEFAULT_* from .env
node scripts/pr-indexer.js ENV:polkadot output.csv           # Uses POLKADOT_* from .env
```

**Parameters:**
- `repo_input`: `"owner/repo"` or `"repo1,repo2"` or `ENV:config`
- `authors`: `"user1,user2"` or `ENV:FORMAT`
- `format`: `"Title,Author,Status"` or `ENV:MINIMAL`
- `status_filter`: `"open"`, `"closed"`, `"merged"` (can combine)
- `type_filter`: `"pr"`, `"issue"` (optional)

### 3. CSV Enhancer
```bash
node scripts/csv-improve.js <csv_file> [prompt_name]
```
**Required:** `csv_file`
**Optional:** `prompt_name` (uses PROMPT_{NAME} from .env)

### 4. Combined Workflow
```bash
./scripts/csv-generate-and-improve.sh [repo_input] [authors] [output_file] [prompt_name] [status_filter] [type_filter]
```
**All parameters optional** - uses .env defaults

## Examples

```bash
# Quick start with defaults
./scripts/csv-generate-and-improve.sh

# Environment shortcuts  
node scripts/pr-indexer.js ENV:polkadot output.csv

# Only open PRs with minimal format
node scripts/pr-indexer.js ENV:polkadot prs.csv "" ENV:MINIMAL "open" "pr"

# Only issues with status filter
node scripts/pr-indexer.js ENV:polkadot issues.csv "" "" "open" "issue"

# Combined workflow with type filter
./scripts/csv-generate-and-improve.sh ENV:POLKADOT "" output.csv DEFAULT "open" "pr"

# Custom filtering
node scripts/pr-indexer.js "owner/repo" output.csv "dev1,dev2" "Title,Author,Status" "merged"

# Enhance with AI
node scripts/csv-improve.js data.csv CATEGORIZE
```

