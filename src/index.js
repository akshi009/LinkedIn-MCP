#!/usr/bin/env node

import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

const APIFY_TOKEN = process.env.APIFY_TOKEN;

const RESUME = {
    name: "Akshi Jain",

    roles: [
        "Software Engineer",
        "Backend Developer",
        "AI Developer",
        "Python Developer",
        "Full Stack Developer",
        "Automation Engineer"
    ],

    skills: [
        // Languages
        "Python", "JavaScript", "TypeScript", "C++", "C",

        // Backend
        "Node.js", "Express.js", "FastAPI", "Flask",
        "REST APIs", "Webhooks", "JWT Authentication",

        // AI
        "Claude AI", "Claude API",
        "Google Gemini API",
        "Model Context Protocol (MCP)",
        "AI Agents",
        "Custom AI Chatbots",

        // Databases
        "Supabase", "MongoDB", "Appwrite", "Clerk",

        // Frontend (kept but not emphasized)
        "React", "React Native", "Next.js",
        "Tailwind CSS", "Material UI",
        "Redux", "Zustand",

        // Integrations
        "Google Maps API",
        "Google Places API",
        "Financial APIs",
        "UPI Payment Integration",
        "Apify",

        // Tools
        "Git", "Figma"
    ],

    experience_years: 3,

    location: "Udaipur, Rajasthan, India",

    education: "B.Tech Computer Science (CGPA: 8.81)",

    highlights: [
        "Built a production Telegram AI chatbot using FastAPI, Claude API, and webhooks",
        "Developed a LinkedIn Job MCP Server with Claude AI, Apify, resume scoring, and cover letter generation",
        "Engineered a white-label multi-tenant SaaS platform with RBAC, CMS, and payment integration",
        "Designed and integrated scalable REST APIs and backend services",
        "Built enterprise software for EV charging operations, including settlement, billing, analytics, and RBAC",
        "Developed BrickNest, a cross-platform real estate application with secure authentication and real-time data"
    ]
};

const server = new McpServer({
    name: "linkedin-job-mcp",
    version: "1.0.0",
    description: "Search LinkedIn jobs and score fit for Akshi Jain's profile"
});

server.tool(
    "search_jobs",
    {
        keywords: z.string().optional().describe("Job title keywords (Software Engineer, Backend, AI, Python, etc.)"),
        location: z.string().optional().describe("Location, defaults to India"),
        max_results: z.number().optional().describe("Max jobs to fetch (default 20)")
    },
    async ({ keywords, location, max_results = 20 }) => {
        if (!APIFY_TOKEN) {
            return {
                content: [{
                    type: "text",
                    text: "ERROR: APIFY_TOKEN environment variable not set. Get a free token at https://apify.com"
                }]
            };
        }

        const searchKeywords =
            keywords ||
            "Software Engineer Backend Developer Python Developer AI Engineer Machine Learning Engineer GenAI Engineer";
        const searchLocation = location || "India";

        try {
            const runRes = await axios.post(
                `https://api.apify.com/v2/acts/cryptosignals~linkedin-jobs-scraper/runs?token=${APIFY_TOKEN}`,
                {
                    keyword: searchKeywords,
                    location: searchLocation,
                    maxJobs: max_results
                },
                { headers: { "Content-Type": "application/json" } }
            );

            const runId = runRes.data.data.id;

            let attempts = 0;
            let dataset;
            while (attempts < 30) {
                await new Promise(r => setTimeout(r, 3000));
                const statusRes = await axios.get(
                    `https://api.apify.com/v2/acts/cryptosignals~linkedin-jobs-scraper/runs/${runId}?token=${APIFY_TOKEN}`
                );
                const status = statusRes.data.data.status;
                if (status === "SUCCEEDED") {
                    const dataRes = await axios.get(
                        `https://api.apify.com/v2/datasets/${statusRes.data.data.defaultDatasetId}/items?token=${APIFY_TOKEN}`
                    );
                    dataset = dataRes.data;
                    break;
                } else if (status === "FAILED" || status === "ABORTED") {
                    throw new Error(`Apify run ${status}`);
                }
                attempts++;
            }

            if (!dataset || dataset.length === 0) {
                return { content: [{ type: "text", text: "No jobs found. Try different keywords." }] };
            }

            const jobs = dataset.map((job, i) => ({
                index: i + 1,
                title: job.title || "N/A",
                company: job.company || "N/A",
                location: job.location || "N/A",
                posted: job.postedAt || "N/A",
                apply_url: job.applyUrl || job.url || "N/A",
                description: (job.description || "").substring(0, 800)
            }));

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ jobs, total: jobs.length }, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: `Search failed: ${err.message}. Check your APIFY_TOKEN and try again.`
                }]
            };
        }
    }
);

server.tool(
    "score_fit",
    {
        job_title: z.string().describe("Job title"),
        job_description: z.string().describe("Full job description text"),
        company: z.string().optional().describe("Company name")
    },
    async ({ job_title, job_description, company }) => {
        const jdLower = job_description.toLowerCase();
        const matchedSkills = RESUME.skills.filter(s => jdLower.includes(s.toLowerCase()));
        const missedSkills = RESUME.skills.filter(s => !jdLower.includes(s.toLowerCase()));

        const skillScore = Math.round((matchedSkills.length / Math.max(RESUME.skills.length, 1)) * 100);

        const roleKeywords = [
            "software engineer",
            "backend",
            "python",
            "node.js",
            "express",
            "fastapi",
            "flask",
            "rest api",
            "webhook",
            "ai",
            "llm",
            "genai",
            "claude",
            "gemini",
            "mcp",
            "agent",
            "automation",
            "mongodb",
            "jwt"
        ];
        const roleMatches = roleKeywords.filter(k => jdLower.includes(k));
        const roleScore = Math.round((roleMatches.length / roleKeywords.length) * 100);

        const overallScore = Math.round(skillScore * 0.6 + roleScore * 0.4);

        let verdict = "Weak fit";
        if (overallScore >= 75) verdict = "Strong fit";
        else if (overallScore >= 55) verdict = "Good fit";
        else if (overallScore >= 35) verdict = "Moderate fit";

        const result = {
            job: `${job_title}${company ? ` at ${company}` : ""}`,
            overall_score: overallScore,
            verdict,
            matched_skills: matchedSkills,
            skills_to_highlight: matchedSkills.slice(0, 6),
            missing_skills: missedSkills.filter(s => jdLower.includes(s.toLowerCase().replace(/\./g, ""))).slice(0, 5),
            recommendation: overallScore >= 55
                ? `Apply. Lead with ${matchedSkills.slice(0, 3).join(", ")} in your cover letter.`
                : `Skip or apply only if the role description is incomplete.`
        };

        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

server.tool(
    "generate_cover_letter",
    {
        job_title: z.string().describe("Job title"),
        company: z.string().describe("Company name"),
        job_description: z.string().describe("Job description text"),
        tone: z.enum(["professional", "enthusiastic", "concise"]).optional().describe("Tone of letter")
    },
    async ({ job_title, company, job_description, tone = "professional" }) => {
        const jdLower = job_description.toLowerCase();
        const relevantSkills = RESUME.skills.filter(s => jdLower.includes(s.toLowerCase())).slice(0, 5);
        const relevantHighlights = RESUME.highlights.filter(h =>
            relevantSkills.some(s => h.toLowerCase().includes(s.toLowerCase()))
        );
        const highlight1 = relevantHighlights[0] || RESUME.highlights[0];
        const highlight2 = (relevantHighlights[1] || RESUME.highlights[1]) !== highlight1
            ? (relevantHighlights[1] || RESUME.highlights[1])
            : RESUME.highlights[2];

        const mcpLine = relevantSkills.some(s => ["mcp", "model context protocol (mcp)", "claude ai", "claude api", "google gemini api", "ai agents"].includes(s.toLowerCase()))
            ? "I've also built AI-native tools end-to-end, including a Claude-integrated LinkedIn job search MCP server and a production Telegram chatbot, reflecting my focus on shipping practical AI agents rather than just experimenting with them. "
            : "";

        const letter = `Dear Hiring Team at ${company},

I'm excited to apply for the ${job_title} role. With ${RESUME.experience_years}+ years building production backend systems and AI-powered tools, I bring hands-on experience in ${relevantSkills.slice(0, 3).join(", ")} — skills that align directly with what you're looking for.

Recently, I've ${highlight1.charAt(0).toLowerCase() + highlight1.slice(1)}, and ${highlight2.charAt(0).toLowerCase() + highlight2.slice(1)} — taking projects from architecture through production deployment.

${relevantSkills.includes("Python") ? "Python is my primary language for backend and AI work, which means clean, well-tested services that scale. " : ""}${relevantSkills.includes("Node.js") ? "I'm equally comfortable in Node.js, so I can adapt to whichever stack your backend runs on. " : ""}${mcpLine}

I'd love to bring this experience to ${company} and contribute to your team. Happy to share my portfolio or do a technical walkthrough.

Best regards,
Akshi Jain
akshi20jain03@gmail.com | linkedin.com/in/akshi-jain | github.com/akshi009`;

        return {
            content: [{ type: "text", text: letter }]
        };
    }
);

server.tool(
    "get_resume_summary",
    {},
    async () => {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    candidate: RESUME.name,
                    target_roles: RESUME.roles,
                    top_skills: RESUME.skills.slice(0, 10),
                    experience_years: RESUME.experience_years,
                    location: RESUME.location,
                    education: RESUME.education,
                    notable_projects: RESUME.highlights
                }, null, 2)
            }]
        };
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);
