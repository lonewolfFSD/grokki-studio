const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');
const {
  THEMES,
  generatePresentation,
  generateDocument,
  generateSpreadsheet,
  generateCSV,
  generateMarkdown,
  generateLaTeX,
  generateHTML,
  generatePDF,
} = require('./office_generator');

/**
 * Direct, human-toned fallback data with flowcharts, charts, and KPI scorecards
 */
function getFallbackData(type, userPrompt, themeKey, blueprint = 'auto') {
  const cleanTitle =
    userPrompt && userPrompt.length > 3
      ? userPrompt.slice(0, 56).replace(/\n/g, ' ')
      : 'Product & Execution Plan';

  if (type === 'pptx') {
    return {
      title: cleanTitle,
      subtitle: 'Key Numbers, System Flow, and Execution Plan',
      category: blueprint !== 'auto' ? blueprint.toUpperCase() : 'OVERVIEW',
      imagePrompt: `${cleanTitle}, modern minimalist workspace photography, dramatic lighting`,
      slides: [
        {
          type: 'title',
          tag: 'Overview',
          title: cleanTitle,
          subtitle: `A direct breakdown of core numbers, workflow architecture, and next steps for ${cleanTitle}.`,
        },
        {
          type: 'metrics',
          tag: 'Key Numbers',
          title: 'Where Things Stand Today',
          subtitle: 'Primary numbers driving decisions this quarter.',
          metrics: [
            { value: '3.2x', label: 'Throughput Speedup', description: 'Measured reduction in end-to-end cycle time after removing manual handoffs.' },
            { value: '99.4%', label: 'Uptime Reliability', description: 'Sustained service availability across primary production workloads.' },
            { value: '-38%', label: 'Unit Cost Drop', description: 'Lowered per-unit overhead through caching and batch scheduling.' },
          ],
        },
        {
          type: 'flowchart',
          tag: 'System Flow',
          title: 'How the Workflow Operates End-to-End',
          subtitle: 'Four-stage pipeline from raw input to verified output.',
          steps: [
            { title: '1. Ingest & Validate', description: 'Capture incoming requests, strip malformed payloads, and normalize schema.' },
            { title: '2. Context Routing', description: 'Match task complexity to the fastest capable worker or model tier.' },
            { title: '3. Parallel Execution', description: 'Run core synthesis and verification checks concurrently.' },
            { title: '4. Delivery & Audit', description: 'Ship final artifact to user and log latency + quality metrics.' },
          ],
          takeaway: 'Isolating validation from execution cuts tail latency by more than half.',
        },
        {
          type: 'chart',
          tag: 'Performance Trend',
          title: 'Quarterly Output vs. Baseline',
          subtitle: 'Steady quarter-over-quarter gains across four consecutive cycles.',
          chart: {
            seriesName: 'Output Index',
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            values: [48, 74, 112, 165],
          },
          bullets: [
            'Q1–Q2 focused on eliminating stability bottlenecks.',
            'Q3 introduced automated routing and caching.',
            'Q4 reached 165 index—more than triple Q1 baseline.',
          ],
        },
        {
          type: 'cards',
          tag: 'Core Priorities',
          title: 'Three Areas That Matter Most',
          subtitle: 'Where engineering and operations focus is locked in.',
          cards: [
            {
              title: 'Fast Feedback Loops',
              description: 'Ship small, measurable changes weekly instead of massive quarterly drops.',
              bullets: ['Automated regression checks', 'Sub-second local previews', 'Clear rollback paths'],
            },
            {
              title: 'Lean Infrastructure',
              description: 'Keep dependencies minimal and avoid heavy external bottlenecks.',
              bullets: ['Local-first file compilation', 'Zero idle compute waste', 'Predictable cost ceiling'],
            },
            {
              title: 'Real-World Quality',
              description: 'Optimize for actual human readability, not boilerplate volume.',
              bullets: ['Direct, scannable layouts', 'Visual diagrams over walls of text', 'Immediate native file export'],
            },
          ],
        },
        {
          type: 'bullets',
          tag: 'Next Steps',
          title: 'Immediate Action Plan',
          subtitle: 'Concrete deliverables for the next 30 days.',
          bullets: [
            'Lock final scope and assign a single owner to each pipeline stage.',
            'Run benchmark tests against real user workloads and fix the top 3 slow paths.',
            'Review weekly numbers every Friday and cut anything that is not moving the needle.',
            'Ship v1 to production and gather direct user feedback.',
          ],
          takeaway: `Keep scope tight, measure real usage, and ship ${cleanTitle} without unnecessary complexity.`,
        },
      ],
    };
  }

  if (type === 'xlsx' || type === 'csv') {
    return {
      title: cleanTitle,
      subtitle: 'Quarterly Breakdown, Variance & Projected Run-Rate',
      sheetName: 'Overview',
      headers: ['Line Item', 'Q1 Actual', 'Q2 Actual', 'Variance', 'Growth %', 'Annual Run-Rate'],
      rows: [
        ['Core Product Subscriptions', 145000, 182000, 37000, 0.255, 728000],
        ['Enterprise Annual Licenses', 95000, 124000, 29000, 0.305, 496000],
        ['Usage & API Tier Revenue', 38000, 49500, 11500, 0.302, 198000],
        ['Cloud & Compute Hosting', -42000, -38500, 3500, -0.083, -154000],
        ['Engineering & Product Team', -88000, -91000, -3000, 0.034, -364000],
        ['Growth & Customer Acquisition', -34000, -39000, -5000, 0.147, -156000],
        ['Operations & Tooling', -14500, -14000, 500, -0.034, -56000],
      ],
    };
  }

  return {
    title: cleanTitle,
    subtitle: 'Practical Breakdown, Architecture Flow & Action Plan',
    category: blueprint !== 'auto' ? blueprint.toUpperCase() : 'BRIEFING',
    summary: `This document lays out a direct, practical plan for ${cleanTitle}—covering the core numbers, how the workflow fits together, where the bottlenecks are, and what to execute next.`,
    metrics: [
      { value: '3.2x', label: 'Cycle Speedup', description: 'Faster turnaround from initial input to finished output.' },
      { value: '99.4%', label: 'Reliability', description: 'Consistent execution across standard workloads.' },
      { value: '-38%', label: 'Cost per Unit', description: 'Savings from leaner resource allocation.' },
    ],
    flowchart: [
      { title: 'Input & Scope', description: 'Define clear constraints and target outcome.' },
      { title: 'Core Processing', description: 'Run structured synthesis and validation.' },
      { title: 'Quality Check', description: 'Verify accuracy, numbers, and formatting.' },
      { title: 'Final Delivery', description: 'Ship ready-to-use output and track results.' },
    ],
    sections: [
      {
        title: '1. Context & What We Are Solving',
        content: `Most teams waste time on bloated processes when tackling ${cleanTitle}. The goal here is straightforward: strip out unnecessary steps, focus on the highest-leverage bottlenecks, and deliver measurable results quickly.`,
        bullets: [
          'Keep the scope focused on outcomes that users immediately notice.',
          'Automate repetitive handoffs so the team focuses on high-judgment work.',
          'Track three core metrics instead of drowning in vanity dashboards.',
        ],
      },
      {
        title: '2. Milestones & Ownership',
        content: 'Below is the concrete delivery schedule, who owns each piece, and current status:',
        table: {
          headers: ['Deliverable', 'Owner', 'Target Window', 'Priority', 'Status'],
          rows: [
            ['Core Architecture & Schema Lock', 'Engineering', 'Week 1', 'High', 'Complete'],
            ['Pipeline & Diagram Integration', 'Product', 'Week 2', 'Critical', 'In Progress'],
            ['Load Testing & Edge-Case Fixes', 'QA / Infra', 'Week 3', 'High', 'Scheduled'],
            ['Production Rollout & Review', 'All Leads', 'Week 4', 'High', 'Pending'],
          ],
        },
      },
      {
        title: '3. Risks & Direct Mitigations',
        content: 'Every plan hits friction in the real world. Here are the main failure modes and how we prevent them:',
        bullets: [
          'Scope creep: Lock requirements before sprint start and push non-essential ideas to phase 2.',
          'Latency spikes: Set hard timeouts on external calls with clean local fallbacks.',
          'Adoption friction: Make the default output immediately usable without manual cleanup.',
        ],
      },
    ],
  };
}

/**
 * Builds the LLM system prompt with direct human tone + visual diagrams/charts
 */
function buildSystemPrompt(docType, blueprint = 'auto') {
  const blueprintGuidance =
    blueprint && blueprint !== 'auto'
      ? `\nArchetype: "${blueprint}". Structure the content, numbers, and sections specifically for a real-world ${blueprint}.`
      : '';

  const humanToneRules = `
WRITING STYLE RULES (CRITICAL):
- Write like a sharp, experienced human operator speaking directly to a colleague or board.
- Be direct, concrete, and specific to the user's topic.
- NEVER use AI cliches or corporate fluff ("delve", "testament", "synergistic", "paradigm shift", "tapestry", "in conclusion").
- Use realistic numbers, concrete examples, and punchy sentences.`;

  if (docType === 'pptx') {
    return `You are a world-class presentation designer and strategist creating a 6-slide PowerPoint deck in JSON format.${blueprintGuidance}
${humanToneRules}

Include a mix of visual slide types so the presentation looks human-crafted and visually engaging:
- Slide 1: Cover slide (type: "title", tag, title, subtitle)
- Slide 2: 3 Key Numbers / KPIs (type: "metrics", tag, title, subtitle, metrics: [{ value, label, description }])
- Slide 3: Visual Process Flowchart / Architecture Diagram (type: "flowchart", tag, title, subtitle, steps: [4 connected stages with { title, description }], takeaway)
- Slide 4: Quantitative Bar Chart Slide (type: "chart", tag, title, subtitle, chart: { seriesName: "Metric", labels: ["Label 1", "Label 2", "Label 3", "Label 4"], values: [number, number, number, number] }, bullets: ["Insight 1", "Insight 2", "Insight 3"])
- Slide 5: 3 Core Pillars / Comparison Cards (type: "cards", tag, title, subtitle, cards: [{ title, description, bullets: ["Point 1", "Point 2"] }])
- Slide 6: Action Plan & Bottom Line (type: "bullets", tag, title, subtitle, bullets: ["Action 1", "Action 2", "Action 3", "Action 4"], takeaway)

Return ONLY valid raw JSON (no markdown fences):
{
  "title": "Direct Deck Title",
  "subtitle": "Sharp 1-line subtitle",
  "category": "Short Tag",
  "imagePrompt": "5-8 word visual photography prompt matching the topic for the cover slide",
  "slides": [
    { "type": "title", "tag": "Overview", "title": "Title", "subtitle": "Subtitle" },
    { "type": "metrics", "tag": "Key Numbers", "title": "Slide Title", "subtitle": "Sub", "metrics": [{ "value": "$4.8M", "label": "Label", "description": "Direct explanation" }] },
    { "type": "flowchart", "tag": "How It Works", "title": "System Flow", "subtitle": "Sub", "steps": [{ "title": "Stage 1", "description": "What happens" }, { "title": "Stage 2", "description": "What happens" }, { "title": "Stage 3", "description": "What happens" }, { "title": "Stage 4", "description": "What happens" }], "takeaway": "1-sentence key insight" },
    { "type": "chart", "tag": "Data", "title": "Chart Title", "subtitle": "Sub", "chart": { "seriesName": "Metric", "labels": ["Q1", "Q2", "Q3", "Q4"], "values": [40, 65, 95, 140] }, "bullets": ["Key point 1", "Key point 2", "Key point 3"] },
    { "type": "cards", "tag": "Core Pillars", "title": "Three Focus Areas", "subtitle": "Sub", "cards": [{ "title": "Card 1", "description": "Direct summary", "bullets": ["Detail A", "Detail B"] }] },
    { "type": "bullets", "tag": "Next Steps", "title": "Execution Plan", "subtitle": "Sub", "bullets": ["Step 1", "Step 2", "Step 3", "Step 4"], "takeaway": "Bottom-line conclusion" }
  ]
}`;
  }

  if (docType === 'xlsx' || docType === 'csv') {
    return `You are a sharp financial and data analyst creating a structured spreadsheet in JSON format.${blueprintGuidance}
${humanToneRules}
- Use raw numbers (e.g. 145000, not "$145k") for numeric columns so Excel formulas calculate totals and averages automatically.
- Provide 7 to 12 specific, realistic rows tailored to the user's topic.
- Return ONLY valid raw JSON (no markdown fences):
{
  "title": "Specific Model Title",
  "subtitle": "Clear 1-line scope",
  "sheetName": "Model",
  "headers": ["Line Item", "Q1", "Q2", "Q3", "Q4", "Total / Projected"],
  "rows": [
    ["Specific Item 1", 120000, 135000, 155000, 180000, 590000]
  ]
}`;
  }

  return `You are a sharp strategy advisor, engineer, and writer creating a publication-ready document in JSON format.${blueprintGuidance}
${humanToneRules}
Include:
- "metrics": 3 concrete KPI scorecards ({ value, label, description })
- "flowchart": 4 connected process/architecture stages ({ title, description }) so a visual diagram is rendered in the document
- "sections": 3 to 4 substantive sections with direct prose, actionable bullets, and a structured comparison/milestone table.

Return ONLY valid raw JSON (no markdown fences):
{
  "title": "Specific Document Title",
  "subtitle": "Clear, direct subtitle",
  "category": "Category Tag",
  "summary": "Direct 2-3 sentence summary stating the core thesis and outcome.",
  "metrics": [
    { "value": "99.9%", "label": "Metric Name", "description": "Short context" },
    { "value": "2.8x", "label": "Metric Name", "description": "Short context" },
    { "value": "-32%", "label": "Metric Name", "description": "Short context" }
  ],
  "flowchart": [
    { "title": "Step 1", "description": "Brief explanation" },
    { "title": "Step 2", "description": "Brief explanation" },
    { "title": "Step 3", "description": "Brief explanation" },
    { "title": "Step 4", "description": "Brief explanation" }
  ],
  "sections": [
    {
      "title": "1. Section Title",
      "content": "Direct, human-written paragraph with concrete substance.",
      "bullets": ["Specific point 1", "Specific point 2", "Specific point 3"]
    },
    {
      "title": "2. Breakdown & Benchmarks",
      "content": "Context for the data table below.",
      "table": {
        "headers": ["Column 1", "Column 2", "Column 3", "Column 4"],
        "rows": [
          ["Cell 1A", "Cell 1B", "Cell 1C", "Cell 1D"],
          ["Cell 2A", "Cell 2B", "Cell 2C", "Cell 2D"]
        ]
      }
    }
  ]
}`;
}

/**
 * Extracts a JSON object from raw LLM output even if wrapped in markdown or conversational text
 */
function parseStructuredJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
  }
  return null;
}

/**
 * Main orchestrator for Office Document generation
 */
async function generateOfficeDocument({
  prompt,
  docType = 'pptx',
  theme = 'midnight',
  blueprint = 'auto',
  config = {},
  agentBrain = null,
}) {
  const cleanPrompt = (prompt || '').trim();
  if (!cleanPrompt) {
    throw new Error('Please enter a description for the document you want to create.');
  }

  const normalizedType = String(docType || 'pptx').toLowerCase();
  let structuredData = null;

  // 1. Synthesize real topic-specific structure via active LLM provider
  if (agentBrain && typeof agentBrain.generateAcademicLLM === 'function') {
    try {
      if (config && Object.keys(config).length > 0) {
        agentBrain.activeConfig = { ...(agentBrain.activeConfig || {}), ...config };
      }

      const systemPrompt = buildSystemPrompt(normalizedType, blueprint);
      const userPrompt = `Topic / Request:\n"${cleanPrompt}"\n\nWrite direct, human-toned, specific content with visual flowchart steps and concrete numbers. Return strictly valid JSON:`;

      const llmPromise = agentBrain.generateAcademicLLM(systemPrompt, userPrompt, 3500);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('LLM synthesis timed out')), 30000)
      );

      const rawText = await Promise.race([llmPromise, timeoutPromise]);
      structuredData = parseStructuredJSON(rawText);
    } catch (err) {
      console.warn('[OfficeService] LLM JSON synthesis warning, using fallback:', err.message);
    }
  }

  // 2. Fallback if no LLM key is configured or JSON failed
  if (!structuredData || typeof structuredData !== 'object') {
    structuredData = getFallbackData(normalizedType, cleanPrompt, theme, blueprint);
  }

  // 3. Compile real binary/text file using open-source generators
  let buffer = null;
  let fileExt = normalizedType;
  let textPreview = null;

  if (normalizedType === 'pptx') {
    buffer = await generatePresentation(structuredData, theme);
    fileExt = 'pptx';
  } else if (normalizedType === 'docx') {
    buffer = await generateDocument(structuredData, theme);
    fileExt = 'docx';
  } else if (normalizedType === 'xlsx') {
    buffer = await generateSpreadsheet(structuredData, theme);
    fileExt = 'xlsx';
  } else if (normalizedType === 'pdf') {
    buffer = await generatePDF(structuredData, theme);
    fileExt = 'pdf';
  } else if (normalizedType === 'csv') {
    buffer = generateCSV(structuredData);
    fileExt = 'csv';
    textPreview = buffer.toString('utf8');
  } else if (normalizedType === 'md') {
    buffer = generateMarkdown(structuredData);
    fileExt = 'md';
    textPreview = buffer.toString('utf8');
  } else if (normalizedType === 'tex') {
    buffer = generateLaTeX(structuredData);
    fileExt = 'tex';
    textPreview = buffer.toString('utf8');
  } else if (normalizedType === 'html') {
    buffer = generateHTML(structuredData, theme);
    fileExt = 'html';
    textPreview = buffer.toString('utf8');
  } else if (normalizedType === 'json') {
    const jsonString = JSON.stringify(structuredData, null, 2);
    buffer = Buffer.from(jsonString, 'utf8');
    fileExt = 'json';
    textPreview = jsonString;
  } else {
    throw new Error(`Unsupported document type: ${normalizedType}`);
  }

  // 4. Save to Downloads directory
  const safeTitle = (structuredData.title || cleanPrompt || 'document')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .slice(0, 38)
    .trim();
  const fileName = `${safeTitle}_${Date.now()}.${fileExt}`;

  let saveDir = path.join(os.homedir(), 'Downloads');
  try {
    if (app && typeof app.getPath === 'function') {
      saveDir = app.getPath('downloads') || app.getPath('documents') || os.homedir();
    }
  } catch {}

  const filePath = path.join(saveDir, fileName);
  fs.writeFileSync(filePath, buffer);

  const base64Data = buffer.toString('base64');

  return {
    success: true,
    fileName,
    filePath,
    fileType: fileExt,
    theme,
    blueprint,
    base64Data,
    textPreview,
    structuredData,
  };
}

module.exports = {
  generateOfficeDocument,
  getFallbackData,
};
