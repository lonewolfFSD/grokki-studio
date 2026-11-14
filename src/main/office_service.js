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
 * Creates high-quality fallback data if LLM call times out or returns malformed JSON
 */
function getFallbackData(type, userPrompt, themeKey, blueprint = 'auto') {
  const cleanTitle =
    userPrompt && userPrompt.length > 4
      ? userPrompt.slice(0, 56).replace(/\n/g, ' ')
      : 'Executive Strategic Overview';

  if (type === 'pptx') {
    return {
      title: cleanTitle,
      subtitle: 'Comprehensive Strategy, Key Metrics & Tactical Roadmap',
      category: blueprint !== 'auto' ? blueprint.toUpperCase() : 'STRATEGIC DECK',
      slides: [
        {
          type: 'title',
          tag: 'Confidential Strategy',
          title: cleanTitle,
          subtitle: `A comprehensive presentation covering key pillars, metrics, and execution roadmap for ${cleanTitle}.`,
        },
        {
          type: 'metrics',
          tag: 'Key Performance Indicators',
          title: 'Core Metrics & Benchmarks',
          subtitle: 'Quantitative indicators and target operational outcomes.',
          metrics: [
            { value: '3.4x', label: 'Efficiency Gain', description: 'Measured improvement across primary operational workflows.' },
            { value: '99.4%', label: 'Reliability Target', description: 'High-availability execution standard with fault tolerance.' },
            { value: '42%', label: 'Cost Reduction', description: 'Optimized resource allocation and unit economics.' },
          ],
        },
        {
          type: 'cards',
          tag: 'Core Pillars',
          title: 'Strategic Focus Areas',
          subtitle: 'Three foundational pillars driving execution and long-term impact.',
          cards: [
            {
              title: 'Architecture & Foundation',
              description: 'Scalable, modular design built for reliability and rapid iteration.',
              bullets: ['Modular component design', 'Automated quality verification', 'Zero-bottleneck scaling'],
            },
            {
              title: 'Operational Velocity',
              description: 'Streamlined workflows accelerating delivery from concept to production.',
              bullets: ['Continuous feedback loops', 'Clear milestone ownership', 'Frictionless deployment'],
            },
            {
              title: 'Measurable Impact',
              description: 'Data-driven telemetry ensuring every milestone delivers concrete results.',
              bullets: ['Real-time KPI tracking', 'Proactive risk mitigation', 'Sustained ROI growth'],
            },
          ],
        },
        {
          type: 'bullets',
          tag: 'Action Plan',
          title: 'Execution Roadmap & Next Steps',
          subtitle: 'Immediate priorities and upcoming delivery milestones.',
          bullets: [
            'Finalize core requirements, architecture specifications, and stakeholder alignment.',
            'Execute phase-1 rollout with real-time telemetry and quality benchmarks.',
            'Conduct comprehensive review and optimize high-leverage bottlenecks.',
            'Scale deployment across all target workflows and document best practices.',
          ],
          takeaway: `Disciplined execution on ${cleanTitle} will deliver measurable impact and long-term strategic advantage.`,
        },
      ],
    };
  }

  if (type === 'xlsx' || type === 'csv') {
    return {
      title: cleanTitle,
      subtitle: 'Quantitative Breakdown, Variance Analysis & Projections',
      sheetName: 'Model Data',
      headers: ['Category / Line Item', 'Q1 Baseline', 'Q2 Actual', 'Variance', 'Growth %', 'Annual Projected'],
      rows: [
        ['Core Platform Operations', 125000, 148000, 23000, 0.184, 592000],
        ['Product & Engineering R&D', 85000, 92000, 7000, 0.082, 368000],
        ['Infrastructure & Compute', 42000, 39000, -3000, -0.071, 156000],
        ['Growth & Distribution', 64000, 78000, 14000, 0.218, 312000],
        ['Customer Success & Support', 31000, 34500, 3500, 0.112, 138000],
        ['General & Administrative', 24000, 23500, -500, -0.021, 94000],
      ],
    };
  }

  return {
    title: cleanTitle,
    subtitle: 'Comprehensive Analysis, Structured Findings & Action Plan',
    category: blueprint !== 'auto' ? blueprint.toUpperCase() : 'EXECUTIVE DOCUMENT',
    summary: `This document provides a structured analysis and actionable framework for ${cleanTitle}, covering key findings, comparative benchmarks, and strategic recommendations.`,
    sections: [
      {
        title: '1. Executive Overview & Scope',
        content: `A thorough evaluation of ${cleanTitle} highlights critical opportunities for optimization, structural clarity, and measurable execution. The sections below establish the foundational principles and operational requirements.`,
        bullets: [
          'Clear alignment between core objectives and measurable deliverables.',
          'Structured methodology designed for scalability and long-term maintainability.',
          'Proactive risk identification and quality assurance built into each stage.',
        ],
      },
      {
        title: '2. Structured Benchmark & Milestone Breakdown',
        content: 'The table below summarizes the primary workstreams, ownership, timelines, and status indicators:',
        table: {
          headers: ['Phase / Workstream', 'Owner', 'Timeline', 'Priority', 'Status'],
          rows: [
            ['Phase 1: Research & Architecture', 'Core Team', 'Weeks 1-2', 'High', 'Completed'],
            ['Phase 2: Core Implementation', 'Engineering', 'Weeks 3-6', 'Critical', 'In Progress'],
            ['Phase 3: Validation & QA Testing', 'Quality Assurance', 'Weeks 7-8', 'High', 'Scheduled'],
            ['Phase 4: Production Rollout', 'Operations', 'Week 9+', 'High', 'Planned'],
          ],
        },
      },
      {
        title: '3. Strategic Recommendations & Next Steps',
        content: 'To maximize impact and maintain momentum, stakeholders should prioritize the following immediate actions:',
        bullets: [
          'Review and ratify the milestone schedule and resource allocations.',
          'Establish weekly progress checkpoints against the quantitative benchmarks.',
          'Document key learnings and iterate based on real-world performance data.',
        ],
      },
    ],
  };
}

/**
 * Builds the LLM system prompt based on document type and blueprint
 */
function buildSystemPrompt(docType, blueprint = 'auto') {
  const blueprintGuidance =
    blueprint && blueprint !== 'auto'
      ? `\nDocument Archetype: "${blueprint}". Tailor all content, terminology, metrics, and structure specifically to an authentic ${blueprint}.`
      : '';

  if (docType === 'pptx') {
    return `You are an elite presentation designer creating an executive-grade PowerPoint deck structure in JSON format.${blueprintGuidance}
Write rich, specific, real-world content directly tailored to the user's topic (never use generic placeholders).
Design 5 to 6 slides:
- Slide 1: Hero title slide (type: "title", tag, title, subtitle)
- Slide 2: 3 Key Metrics / KPIs (type: "metrics", tag, title, subtitle, metrics: [{ value, label, description }])
- Slide 3: 3 Core Pillars / Feature Cards (type: "cards", tag, title, subtitle, cards: [{ title, description, bullets: ["point 1", "point 2"] }])
- Slide 4: Deep-dive analysis or architecture (type: "cards" or "bullets", tag, title, subtitle, bullets: [], takeaway)
- Slide 5: Roadmap / Conclusions / Next Steps (type: "bullets", tag, title, subtitle, bullets: [], takeaway)

CRITICAL: Return ONLY valid raw JSON with no markdown fences:
{
  "title": "Specific Presentation Title",
  "subtitle": "Specific Executive Subtitle",
  "category": "Category Tag",
  "slides": [
    { "type": "title", "tag": "Tag", "title": "Slide Title", "subtitle": "Detailed subtitle" },
    { "type": "metrics", "tag": "KPIs", "title": "Key Metrics", "subtitle": "Context", "metrics": [{ "value": "99.9%", "label": "Metric Name", "description": "Specific explanation" }] },
    { "type": "cards", "tag": "Pillars", "title": "Core Pillars", "subtitle": "Context", "cards": [{ "title": "Pillar 1", "description": "Explanation", "bullets": ["Point A", "Point B"] }] },
    { "type": "bullets", "tag": "Roadmap", "title": "Execution Plan", "subtitle": "Context", "bullets": ["Detailed step 1", "Detailed step 2", "Detailed step 3", "Detailed step 4"], "takeaway": "Key bottom-line takeaway" }
  ]
}`;
  }

  if (docType === 'xlsx' || docType === 'csv') {
    return `You are an elite financial modeling and data analysis expert creating a realistic spreadsheet in JSON format.${blueprintGuidance}
Write specific, realistic line items and numbers directly tailored to the user's request:
- Use raw numbers (e.g. 150000, not "$150k") for numeric columns so Excel =SUM() formulas work automatically.
- Provide 7 to 12 detailed rows.
- Return ONLY valid raw JSON with no markdown fences:
{
  "title": "Specific Model Title",
  "subtitle": "Model Scope and Description",
  "sheetName": "Data Sheet",
  "headers": ["Line Item", "Q1", "Q2", "Q3", "Q4", "Total / Projected"],
  "rows": [
    ["Specific Row 1", 120000, 135000, 150000, 175000, 580000]
  ]
}`;
  }

  return `You are an elite strategy consultant, researcher, and technical author writing a comprehensive, publication-grade document in JSON format.${blueprintGuidance}
Write thorough, specific, well-researched content directly addressing the user's topic with an executive summary, 4 detailed sections, bullet points, and a structured data table.
- Return ONLY valid raw JSON with no markdown fences:
{
  "title": "Specific Document Title",
  "subtitle": "Clear Subtitle and Scope",
  "category": "Document Category",
  "summary": "Thorough 3-sentence executive summary of the topic.",
  "sections": [
    {
      "title": "1. Section Heading",
      "content": "Detailed, substantive multi-sentence paragraph explaining this section in depth.",
      "bullets": ["Specific point 1", "Specific point 2", "Specific point 3"]
    },
    {
      "title": "2. Comparative Breakdown",
      "content": "Analysis introducing the structured table below.",
      "table": {
        "headers": ["Column 1", "Column 2", "Column 3", "Column 4"],
        "rows": [
          ["Row 1A", "Row 1B", "Row 1C", "Row 1D"],
          ["Row 2A", "Row 2B", "Row 2C", "Row 2D"]
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
      // Ensure agentBrain has the latest loaded config (API keys & active provider)
      if (config && Object.keys(config).length > 0) {
        agentBrain.activeConfig = { ...(agentBrain.activeConfig || {}), ...config };
      }

      const systemPrompt = buildSystemPrompt(normalizedType, blueprint);
      const userPrompt = `Create a complete, detailed ${normalizedType.toUpperCase()} document for:\n"${cleanPrompt}"\n\nReturn strictly valid JSON:`;

      const llmPromise = agentBrain.generateAcademicLLM(systemPrompt, userPrompt, 3200);
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
  const safeTitle = (structuredData.title || cleanPrompt || 'grokki_doc')
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
