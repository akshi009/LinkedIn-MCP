# LinkedIn Job Search MCP Server
> Built for Akshi Jain's profile — Frontend / React / React Native roles

## Tools available

| Tool | What it does |
|------|-------------|
| `search_jobs` | Searches LinkedIn jobs via Apify scraper |
| `score_fit` | Scores a job description against your resume (0-100) |
| `generate_cover_letter` | Writes a tailored cover letter for any role |
| `get_resume_summary` | Returns your parsed resume context |

---

## Setup

### 1. Get a free Apify token
1. Sign up at https://apify.com (free tier = 5 USD/month credit, enough for ~50 searches)
2. Go to Settings → Integrations → API token
3. Copy the token

### 2. Install dependencies
```bash
npm install
```

### 3. Connect to Claude Desktop

Edit your Claude Desktop config:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linkedin-jobs": {
      "command": "node",
      "args": ["/FULL/PATH/TO/linkedin-job-mcp/src/index.js"],
      "env": {
        "APIFY_TOKEN": "your_apify_token_here"
      }
    }
  }
}
```

Replace `/FULL/PATH/TO/` with the actual path to this folder.

### 4. Restart Claude Desktop

The tools will appear automatically. You can now say things like:

- *"Search for React Native jobs in Bangalore"*
- *"Score my fit for this job: [paste JD]"*
- *"Write a cover letter for [role] at [company]"*
- *"Find remote frontend TypeScript roles and score the top 5"*

---

## Example workflow in Claude

```
You: Search for React jobs in India, max 5 results
Claude: [calls search_jobs] → returns 5 jobs

You: Score my fit for job #2
Claude: [calls score_fit] → Overall: 82/100, Strong fit. Apply.

You: Write a cover letter for that role
Claude: [calls generate_cover_letter] → tailored letter ready to send
```

---

## Notes

- Apify's LinkedIn scraper doesn't require LinkedIn API access or login
- Cover letters are auto-tailored to match skills found in the JD
- Fit score = 60% skill match + 40% role keyword match
- Your resume data is baked into the server — update `RESUME` in `src/index.js` to change it