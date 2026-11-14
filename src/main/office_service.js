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
    userPrompt && userPrompt.length > 8
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
          subtitle: 'A high-impact presentation outlining market positioning, unit economics, and operational milestones.',
        },
        {
          type: 'metrics',
          tag: 'Key Performance Indicators',
          title: 'Growth & Core Metrics',
          subtitle: 'Historical performance and forward-looking operational projections.',
          metrics: [
            { value: '$4.2M', label: 'Annual Run-Rate', description: '240% YoY ARR expansion across enterprise accounts.' },
            { value: '88.4%', label: 'Gross Margin', description: 'Highly scalable architecture with lean marginal compute cost.' },
            { value: '142%', label: 'Net Retention', description: 'Best-in-class product stickiness and organic contract expansions.' },
          ],
        },
        {
          type: 'cards',
          tag: 'Core Pillars',
          title: 'Strategic Focus Areas',
          subtitle: 'Three high-conviction initiatives driving product velocity and market capture.',
          cards: [
            {
              title: 'Autonomous Architecture',
              description: 'Next-generation intelligent pipelines with self-healing fault tolerance and zero downtime.',
              bullets: ['Sub-millisecond inference routing', 'Cross-region automated failover', 'Continuous compliance audit logging'],
            },
            {
              title: 'Distribution Moat',
              description: 'Direct-to-enterprise channel partnerships accelerating acquisition flywheel velocity.',
              bullets: ['Pre-integrated partner ecosystems', 'Frictionless single-click onboarding', 'Zero-touch billing automation'],
            },
            {
              title: 'Capital Efficiency',
              description: 'Disciplined resource allocation targeting cashflow breakeven with maximal agility.',
              bullets: ['Sustained 18+ months runway', 'Target payback period < 6 months', 'High-density engineering yield'],
            },
          ],
        },
        {
          type: 'bullets',
          tag: 'Action Plan',
          title: 'Execution Roadmap & Next Steps',
          subtitle: 'Immediate priorities for upcoming quarterly milestones.',
          bullets: [
            'Finalize production rollout and telemetry monitoring across all tier-1 clusters.',
            'Expand enterprise integration library with turnkey customer migration tooling.',
            'Initiate SOC2 Type II audit readiness review with third-party security assessors.',
            'Scale dedicated developer advocacy and partner community evangelism programs.',
          ],
          takeaway: 'Focus remains on uncompromising product quality, customer retention, and aggressive margin expansion throughout Q1-Q2.',
        },
      ],
    };
  }

  if (type === 'xlsx' || type === 'csv') {
    return {
      title: cleanTitle,
      subtitle: 'Q1-Q4 Financial Performance, Variance Analysis & Growth Forecast',
      sheetName: 'Financial Forecast',
      headers: ['Department / Line Item', 'Q1 Target', 'Q1 Actual', 'Variance', 'Growth %', 'FY Projected'],
      rows: [
        ['Enterprise Platform Revenue', 1250000, 1380000, 130000, 0.28, 5900000],
        ['Pro Subscription ARR', 450000, 495000, 45000, 0.22, 2100000],
        ['Professional Services', 180000, 165000, -15000, -0.05, 680000],
        ['Cloud & GPU Compute Infrastructure', 280000, 260000, -20000, -0.08, 1100000],
        ['Engineering & Product R&D', 520000, 510000, -10000, 0.15, 2150000],
        ['Sales & Growth Marketing', 310000, 325000, 15000, 0.18, 1350000],
        ['Operations & General Admin', 140000, 135000, -5000, 0.05, 560000],
      ],
    };
  }

  // Document-style formats (docx, pdf, html, md, tex, json)
  return {
    title: cleanTitle,
    subtitle: 'Confidential Advisory & Strategic Documentation',
    category: blueprint !== 'auto' ? blueprint.toUpperCase() : 'EXECUTIVE BRIEF',
    summary:
      'This document synthesizes strategic priorities, unit economics, and operational action items. Findings underscore strong competitive advantages and disciplined resource allocation across high-leverage deliverables.',
    sections: [
      {
        title: '1. Executive Overview & Context',
        content:
          'In evaluating current ecosystem dynamics, strategic agility and execution speed remain paramount. This briefing synthesizes operational milestones, resource requirements, and risk mitigation protocols established to guarantee predictable execution.',
        bullets: [
          'High alignment between product roadmap velocity and customer demand drivers.',
          'Sustainable margin structure supported by streamlined automation architectures.',
          'Proactive compliance and security governance integrated across all delivery stages.',
        ],
      },
      {
        title: '2. Comparative Milestone Analysis',
        content: 'The following structured benchmark highlights critical delivery metrics against baseline expectations:',
        table: {
          headers: ['Workstream', 'Lead', 'Target Date', 'Status', 'Risk Level'],
          rows: [
            ['Core Infrastructure Modernization', 'Engineering', 'Q1 End', 'On Track', 'Low'],
            ['Enterprise Data Security Audit', 'SecOps', 'Q2 Mid', 'In Review', 'Low'],
            ['Revenue Automation Pipeline', 'Growth', 'Q1 Mid', 'Completed', 'Minimal'],
            ['Partner API Gateway Integration', 'Product', 'Q2 End', 'Planning', 'Medium'],
          ],
        },
      },
      {
        title: '3. Strategic Conclusions & Directives',
        content:
          'Sustained execution across these initiatives will cement platform leadership. Leadership mandates rigorous weekly telemetry checkpoints, proactive risk triage, and uncompromised focus on core client outcomes.',
        bullets: [
          'Maintain bi-weekly sprint velocity telemetry reviews.',
          'Enforce strict code audit and automated regression testing standards.',
          'Consolidate operational vendor contracts to optimize unit economics.',
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
      ? `\nBlueprint / Document Archetype: "${blueprint}". Tailor all terminology, metrics, headings, and structure specifically to an authentic ${blueprint} document.`
      : '';

  if (docType === 'pptx') {
    return `You are an elite Silicon Valley presentation designer creating an executive-grade PowerPoint deck structure (JSON format).${blueprintGuidance}
Design 5 to 6 slides with modern, punchy narrative flow:
- Slide 1: Hero title slide (type: "title", tag, title, subtitle)
- Slide 2: 3 Big bold KPIs / Metrics (type: "metrics", tag, title, subtitle, metrics: [{ value, label, description }])
- Slide 3: 3 structured feature/pillar cards (type: "cards", tag, title, subtitle, cards: [{ title, description, bullets: [] }])
- Slide 4+: Process flow, detailed takeaways, or conclusions (type: "bullets", tag, title, subtitle, bullets: [], takeaway)

CRITICAL INSTRUCTIONS:
- Return ONLY valid raw JSON with no markdown formatting, no \`\`\`json wrappers.
- The JSON must follow this exact structure:
{
  "title": "Main Presentation Title",
  "subtitle": "Clear Executive Subtitle",
  "category": "Deck Category",
  "slides": [
    { "type": "title", "tag": "Tag", "title": "Title", "subtitle": "Subtitle" },
    { "type": "metrics", "tag": "KPIs", "title": "Market Impact", "subtitle": "Sub", "metrics": [{ "value": "$10M+", "label": "Revenue", "description": "Details" }] },
    { "type": "cards", "tag": "Pillars", "title": "Key Features", "subtitle": "Sub", "cards": [{ "title": "Card 1", "description": "Text", "bullets": ["A", "B"] }] },
    { "type": "bullets", "tag": "Roadmap", "title": "Action Plan", "subtitle": "Sub", "bullets": ["Action 1", "Action 2"], "takeaway": "Key Conclusion" }
  ]
}`;
  }

  if (docType === 'xlsx' || docType === 'csv') {
    return `You are an elite financial modeling and data engineering expert creating a structured spreadsheet dataset (JSON format).${blueprintGuidance}
Create clean, realistic quantitative data with professional column headers and numeric values:
- Use raw numbers (e.g. 150000, not text "$150k") for quantitative columns so Excel formulas can calculate sums.
- Provide 6 to 12 detailed rows.
- Return ONLY valid raw JSON with no markdown formatting, no \`\`\`json wrappers.

The JSON must follow this exact structure:
{
  "title": "Model Title",
  "subtitle": "Model Purpose and Scope",
  "sheetName": "Financial Model",
  "headers": ["Line Item", "Q1 Actual", "Q2 Budget", "Variance", "Growth Rate", "FY Projected"],
  "rows": [
    ["Enterprise Subscription Revenue", 1200000, 1350000, 150000, 0.25, 5400000],
    ["Cloud Infrastructure Cost", 320000, 290000, -30000, -0.09, 1180000]
  ]
}`;
  }

  // docx, pdf, html, md, tex, json
  return `You are an elite strategy consultant, technical writer, and legal documentation specialist writing a comprehensive publication-grade document (JSON format).${blueprintGuidance}
Structure the document with an executive summary, 3 to 5 thorough sections, actionable bullet points, and at least one structured data table.
- Return ONLY valid raw JSON with no markdown formatting, no \`\`\`json wrappers.

The JSON must follow this exact structure:
{
  "title": "Document Title",
  "subtitle": "Document Subtitle and Purpose",
  "category": "Category / Tag",
  "summary": "High-impact 2-3 sentence executive summary.",
  "sections": [
    {
      "title": "1. Section Heading",
      "content": "Detailed explanatory paragraph.",
      "bullets": ["Key finding 1", "Key finding 2"]
    },
    {
      "title": "2. Benchmark Data",
      "content": "Table analysis overview.",
      "table": {
        "headers": ["Milestone", "Owner", "Target Date", "Status"],
        "rows": [
          ["Alpha Release", "Engineering", "Oct 15", "Completed"],
          ["SOC2 Certification", "Security", "Nov 30", "On Track"]
        ]
      }
    }
  ]
}`;
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

  // 1. Try LLM synthesis
  if (agentBrain && typeof agentBrain.generateAcademicLLM === 'function') {
    try {
      const systemPrompt = buildSystemPrompt(normalizedType, blueprint);
      const userPrompt = `User Document Request:\n"${cleanPrompt}"\n\nReturn strictly valid JSON:`;

      const llmPromise = agentBrain.generateAcademicLLM(systemPrompt, userPrompt, 2200);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('LLM synthesis timed out')), 24000)
      );

      const rawText = await Promise.race([llmPromise, timeoutPromise]);
      if (rawText && typeof rawText === 'string') {
        let cleaned = rawText.trim();
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
        }

        structuredData = JSON.parse(cleaned);
      }
    } catch (err) {
      console.warn('[OfficeService] LLM JSON generation failed, using intelligent fallback:', err.message);
    }
  }

  // 2. Fallback to rich default data if LLM was unavailable or returned non-JSON
  if (!structuredData || typeof structuredData !== 'object') {
    structuredData = getFallbackData(normalizedType, cleanPrompt, theme, blueprint);
  }

  // 3. Compile binary/text file using open-source generator
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
  } else if (normalizedType === 'html') {
    buffer = generateHTML(structuredData, theme);
    fileExt = 'html';
    textPreview = buffer.toString('utf8');
  } else if (normalizedType === 'md') {
    buffer = generateMarkdown(structuredData);
    fileExt = 'md';
    textPreview = buffer.toString('utf8');
  } else if (normalizedType === 'tex') {
    buffer = generateLaTeX(structuredData);
    fileExt = 'tex';
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
