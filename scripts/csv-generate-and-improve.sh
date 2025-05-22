#!/bin/bash

# Check if repository URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./generate-and-improve.sh <repo_url> [authors] [output_file]"
    echo "Example: ./generate-and-improve.sh https://github.com/org/repo \"author1,author2\" custom_output.csv"
    exit 1
fi

REPO_URL=$1
AUTHORS=${2:-""}  # Use second argument if provided, otherwise empty string
OUTPUT_FILE=${3:-"output.csv"}  # Use third argument if provided, otherwise default to output.csv

# Run pr-indexer
if [ -z "$AUTHORS" ]; then
    node scripts/pr-indexer.js "$REPO_URL" "$OUTPUT_FILE"
else
    node scripts/pr-indexer.js "$REPO_URL" "$OUTPUT_FILE" "$AUTHORS"
fi

# Run csv-improve
node scripts/csv-improve.js "$OUTPUT_FILE" 