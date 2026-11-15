const pptxgen = require('pptxgenjs');
const docx = require('docx');
const ExcelJS = require('exceljs');
const https = require('https');

const THEMES = {
  midnight: {
    name: 'Midnight Dark',
    bg: '0B0F19',
    surface: '151C2C',
    surfaceSubtle: '1E293B',
    primary: '6366F1',
    secondary: '38BDF8',
    text: 'F8FAFC',
    textMuted: '94A3B8',
    accent: '10B981',
    border: '26334D',
    isDark: true,
  },
  slate: {
    name: 'Tech Slate',
    bg: 'FFFFFF',
    surface: 'F8FAFC',
    surfaceSubtle: 'F1F5F9',
    primary: '0F172A',
    secondary: '2563EB',
    text: '0F172A',
    textMuted: '475569',
    accent: '0EA5E9',
    border: 'CBD5E1',
    isDark: false,
  },
  editorial: {
    name: 'Warm Editorial',
    bg: 'FAF8F5',
    surface: 'F3EFEA',
    surfaceSubtle: 'E7E0D6',
    primary: '1C1917',
    secondary: 'BE123C',
    text: '1C1917',
    textMuted: '57534E',
    accent: 'D97706',
    border: 'D6CFC7',
    isDark: false,
  },
  emerald: {
    name: 'Emerald Growth',
    bg: '052E24',
    surface: '064E3B',
    surfaceSubtle: '047857',
    primary: '10B981',
    secondary: '34D399',
    text: 'ECFDF5',
    textMuted: 'A7F3D0',
    accent: 'F59E0B',
    border: '065F46',
    isDark: true,
  },
  navy: {
    name: 'Executive Navy',
    bg: '0A192F',
    surface: '112240',
    surfaceSubtle: '1D3557',
    primary: '38BDF8',
    secondary: 'F59E0B',
    text: 'F8FAFC',
    textMuted: '94A3B8',
    accent: '10B981',
    border: '233554',
    isDark: true,
  },
  mono: {
    name: 'Minimal Mono',
    bg: '121214',
    surface: '1C1C21',
    surfaceSubtle: '27272A',
    primary: 'FAFAFA',
    secondary: 'A1A1AA',
    text: 'FAFAFA',
    textMuted: 'A1A1AA',
    accent: '10B981',
    border: '2E2E36',
    isDark: true,
  },
};

/**
 * Fetches an AI illustration as base64 data URI with a fast timeout so slide generation never hangs
 */
function fetchSlideImageBase64(imagePrompt, width = 800, height = 600, timeoutMs = 6500) {
  return new Promise((resolve) => {
    if (!imagePrompt) return resolve(null);
    const clean = encodeURIComponent(
      `${imagePrompt}, clean modern editorial photography, minimalist lighting, no text, high resolution`
    );
    const url = `https://image.pollinations.ai/prompt/${clean}?width=${width}&height=${height}&nologo=true&seed=42`;

    const timer = setTimeout(() => resolve(null), timeoutMs);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          clearTimeout(timer);
          res.resume();
          return resolve(null);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          clearTimeout(timer);
          try {
            const buf = Buffer.concat(chunks);
            if (buf.length < 1000) return resolve(null);
            const mime = res.headers['content-type'] || 'image/jpeg';
            resolve(`data:${mime};base64,${buf.toString('base64')}`);
          } catch {
            resolve(null);
          }
        });
      })
      .on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

/**
 * Generates an inline SVG flowchart diagram for HTML / PDF documents
 */
function buildFlowchartSvg(flowchart, theme) {
  const steps = Array.isArray(flowchart) ? flowchart.slice(0, 5) : [];
  if (steps.length === 0) return '';

  const boxW = 140;
  const boxH = 68;
  const gap = 28;
  const totalW = steps.length * boxW + (steps.length - 1) * gap + 20;
  const primary = `#${theme.secondary || theme.primary}`;

  let nodesSvg = '';
  steps.forEach((step, idx) => {
    const x = 10 + idx * (boxW + gap);
    const y = 14;
    const title = String(step.title || step.label || `Step ${idx + 1}`).slice(0, 20);
    const desc = String(step.description || step.sub || '').slice(0, 26);

    nodesSvg += `
      <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="8" fill="#f8fafc" stroke="${primary}" stroke-width="1.8" />
      <rect x="${x}" y="${y}" width="${boxW}" height="6" rx="3" fill="${primary}" />
      <text x="${x + boxW / 2}" y="${y + 28}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="11.5" font-weight="700" fill="#0f172a">${idx + 1}. ${title.replace(/[<>&]/g, '')}</text>
      <text x="${x + boxW / 2}" y="${y + 48}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="9.5" fill="#475569">${desc.replace(/[<>&]/g, '')}</text>
    `;

    if (idx < steps.length - 1) {
      const arrowX1 = x + boxW + 3;
      const arrowX2 = x + boxW + gap - 4;
      const midY = y + boxH / 2;
      nodesSvg += `
        <line x1="${arrowX1}" y1="${midY}" x2="${arrowX2}" y2="${midY}" stroke="${primary}" stroke-width="2" />
        <polygon points="${arrowX2},${midY - 4} ${arrowX2 + 5},${midY} ${arrowX2},${midY + 4}" fill="${primary}" />
      `;
    }
  });

  return `<div style="margin: 22px 0; overflow-x: auto;">
    <svg viewBox="0 0 ${totalW} 96" width="100%" height="96" xmlns="http://www.w3.org/2000/svg">
      ${nodesSvg}
    </svg>
  </div>`;
}

/**
 * 1. PowerPoint (.pptx) — with Images, Flowcharts, Native Charts, Metrics, and Pillars
 */
async function generatePresentation(data, themeKey = 'midnight') {
  const theme = THEMES[themeKey] || THEMES.midnight;
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = data.author || 'Strategy & Research';
  pres.title = data.title || 'Presentation';

  const slides = Array.isArray(data.slides) ? data.slides : [];

  // Pre-fetch cover or visual slide image in parallel (non-blocking with 6s cap)
  let heroImageData = null;
  try {
    const imgQuery =
      data.imagePrompt ||
      slides.find((s) => s.imagePrompt)?.imagePrompt ||
      data.title ||
      'modern architecture technology';
    heroImageData = await fetchSlideImageBase64(imgQuery, 768, 576, 6000);
  } catch {}

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const slide = pres.addSlide();
    slide.background = { color: theme.bg };

    // Subtle top accent bar
    slide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.06,
      fill: { color: theme.primary },
      line: { type: 'none' },
    });

    // Clean human footer (no robotic watermark)
    slide.addText(`${data.title || ''}   •   ${i + 1} / ${slides.length}`, {
      x: 0.8,
      y: 7.05,
      w: 11.73,
      h: 0.3,
      fontSize: 9.5,
      fontFace: 'Calibri',
      color: theme.textMuted,
      align: 'right',
    });

    // --- SLIDE TYPE A: COVER / TITLE SLIDE (with Hero Visual Image on Right if available) ---
    if (i === 0 || s.type === 'title') {
      const hasImage = Boolean(heroImageData);
      const textWidth = hasImage ? 6.8 : 10.8;

      if (s.tag || data.category) {
        slide.addShape(pres.ShapeType.roundRect, {
          x: 0.9,
          y: 1.35,
          w: 2.5,
          h: 0.38,
          rectRadius: 0.08,
          fill: { color: theme.surfaceSubtle },
          line: { color: theme.border, width: 1 },
        });
        slide.addText((s.tag || data.category).toUpperCase(), {
          x: 0.9,
          y: 1.35,
          w: 2.5,
          h: 0.38,
          fontSize: 9.5,
          fontFace: 'Calibri',
          bold: true,
          color: theme.secondary,
          align: 'center',
          valign: 'middle',
        });
      }

      slide.addText(s.title || data.title || 'Overview', {
        x: 0.9,
        y: 1.95,
        w: textWidth,
        h: 2.1,
        fontSize: hasImage ? 34 : 40,
        fontFace: 'Calibri',
        bold: true,
        color: theme.text,
        lineSpacing: hasImage ? 38 : 44,
        valign: 'top',
      });

      if (s.subtitle || data.subtitle) {
        slide.addText(s.subtitle || data.subtitle, {
          x: 0.9,
          y: 4.15,
          w: textWidth - 0.3,
          h: 1.3,
          fontSize: 15,
          fontFace: 'Calibri',
          color: theme.textMuted,
          lineSpacing: 21,
        });
      }

      slide.addShape(pres.ShapeType.line, {
        x: 0.9,
        y: 5.65,
        w: 3.2,
        h: 0,
        line: { color: theme.accent, width: 2.5 },
      });

      slide.addText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), {
        x: 0.9,
        y: 5.82,
        w: 5.0,
        h: 0.35,
        fontSize: 11,
        fontFace: 'Calibri',
        color: theme.textMuted,
      });

      if (hasImage) {
        // Framed visual card on the right
        slide.addShape(pres.ShapeType.roundRect, {
          x: 8.05,
          y: 1.15,
          w: 4.55,
          h: 5.2,
          rectRadius: 0.14,
          fill: { color: theme.surface },
          line: { color: theme.border, width: 1.5 },
        });
        slide.addImage({
          data: heroImageData,
          x: 8.15,
          y: 1.25,
          w: 4.35,
          h: 5.0,
          sizing: { type: 'cover', w: 4.35, h: 5.0 },
        });
      }
      continue;
    }

    // Standard Slide Header
    if (s.tag) {
      slide.addText(s.tag.toUpperCase(), {
        x: 0.8,
        y: 0.45,
        w: 10,
        h: 0.28,
        fontSize: 9.5,
        fontFace: 'Calibri',
        bold: true,
        color: theme.secondary,
      });
    }

    slide.addText(s.title || 'Key Insights', {
      x: 0.8,
      y: 0.72,
      w: 11.5,
      h: 0.65,
      fontSize: 24,
      fontFace: 'Calibri',
      bold: true,
      color: theme.text,
    });

    if (s.subtitle) {
      slide.addText(s.subtitle, {
        x: 0.8,
        y: 1.35,
        w: 11.5,
        h: 0.4,
        fontSize: 13,
        fontFace: 'Calibri',
        color: theme.textMuted,
      });
    }

    const contentStartY = s.subtitle ? 1.95 : 1.65;

    // --- SLIDE TYPE B: FLOWCHART / ARCHITECTURE DIAGRAM SLIDE ---
    if (s.type === 'flowchart' || (Array.isArray(s.steps) && s.steps.length > 0)) {
      const steps = (s.steps || s.flowchart || []).slice(0, 4);
      const count = Math.max(steps.length, 1);
      const arrowGap = 0.42;
      const totalGap = (count - 1) * arrowGap;
      const boxW = (11.73 - totalGap) / count;
      const startX = 0.8;

      steps.forEach((step, idx) => {
        const x = startX + idx * (boxW + arrowGap);

        // Node Card
        slide.addShape(pres.ShapeType.roundRect, {
          x,
          y: contentStartY + 0.2,
          w: boxW,
          h: 3.3,
          rectRadius: 0.12,
          fill: { color: theme.surface },
          line: { color: idx === 0 ? theme.primary : theme.border, width: 1.5 },
        });

        // Step Pill Badge
        slide.addShape(pres.ShapeType.roundRect, {
          x: x + 0.25,
          y: contentStartY + 0.45,
          w: 0.95,
          h: 0.34,
          rectRadius: 0.08,
          fill: { color: idx % 2 === 0 ? theme.primary : theme.accent },
          line: { type: 'none' },
        });
        slide.addText(`STEP ${idx + 1}`, {
          x: x + 0.25,
          y: contentStartY + 0.45,
          w: 0.95,
          h: 0.34,
          fontSize: 8.5,
          fontFace: 'Calibri',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle',
        });

        slide.addText(step.title || step.label || `Stage ${idx + 1}`, {
          x: x + 0.25,
          y: contentStartY + 0.95,
          w: boxW - 0.5,
          h: 0.65,
          fontSize: 14,
          fontFace: 'Calibri',
          bold: true,
          color: theme.text,
          valign: 'top',
        });

        slide.addText(step.description || step.detail || '', {
          x: x + 0.25,
          y: contentStartY + 1.65,
          w: boxW - 0.5,
          h: 1.65,
          fontSize: 11.5,
          fontFace: 'Calibri',
          color: theme.textMuted,
          lineSpacing: 16,
          valign: 'top',
        });

        // Connector Arrow to Next Node
        if (idx < count - 1) {
          slide.addShape(pres.ShapeType.rightArrow, {
            x: x + boxW + 0.06,
            y: contentStartY + 1.65,
            w: arrowGap - 0.12,
            h: 0.32,
            fill: { color: theme.secondary },
            line: { type: 'none' },
          });
        }
      });

      if (s.takeaway) {
        slide.addShape(pres.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY + 3.75,
          w: 11.73,
          h: 0.85,
          rectRadius: 0.1,
          fill: { color: theme.surfaceSubtle },
          line: { color: theme.border, width: 1 },
        });
        slide.addText(`Key Flow Insight:  ${s.takeaway}`, {
          x: 1.05,
          y: contentStartY + 3.85,
          w: 11.2,
          h: 0.65,
          fontSize: 12,
          fontFace: 'Calibri',
          bold: true,
          color: theme.text,
          valign: 'middle',
        });
      }
      continue;
    }

    // --- SLIDE TYPE C: NATIVE DATA CHART SLIDE ---
    if (
      s.type === 'chart' ||
      (s.chart && Array.isArray(s.chart.labels) && Array.isArray(s.chart.values))
    ) {
      const chartObj = s.chart || {};
      const labels = chartObj.labels || ['Q1', 'Q2', 'Q3', 'Q4'];
      const values = (chartObj.values || [42, 68, 95, 134]).map((v) => Number(v) || 0);

      try {
        slide.addShape(pres.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 7.4,
          h: 4.5,
          rectRadius: 0.12,
          fill: { color: theme.surface },
          line: { color: theme.border, width: 1 },
        });

        slide.addChart(
          pres.ChartType.bar,
          [
            {
              name: chartObj.seriesName || s.title || 'Performance',
              labels,
              values,
            },
          ],
          {
            x: 1.0,
            y: contentStartY + 0.25,
            w: 7.0,
            h: 4.0,
            barDir: 'col',
            chartColors: [theme.primary],
            showLegend: false,
            showTitle: false,
            valAxisLabelColor: theme.textMuted,
            catAxisLabelColor: theme.text,
            valGridLine: { color: theme.border, size: 0.5 },
          }
        );
      } catch {}

      // Right-hand commentary panel
      slide.addShape(pres.ShapeType.roundRect, {
        x: 8.5,
        y: contentStartY,
        w: 4.03,
        h: 4.5,
        rectRadius: 0.12,
        fill: { color: theme.surface },
        line: { color: theme.border, width: 1 },
      });

      slide.addText('DATA BREAKDOWN', {
        x: 8.8,
        y: contentStartY + 0.35,
        w: 3.4,
        h: 0.3,
        fontSize: 10,
        fontFace: 'Calibri',
        bold: true,
        color: theme.secondary,
      });

      const chartBullets = Array.isArray(s.bullets) && s.bullets.length > 0
        ? s.bullets
        : labels.map((l, idx) => `${l}: ${values[idx]}`);

      slide.addText(
        chartBullets.map((b) => ({
          text: String(b),
          options: { bullet: true, fontSize: 12, color: theme.text, lineSpacing: 20 },
        })),
        {
          x: 8.8,
          y: contentStartY + 0.8,
          w: 3.4,
          h: 3.3,
          fontFace: 'Calibri',
          valign: 'top',
        }
      );
      continue;
    }

    // --- SLIDE TYPE D: KPI METRICS SLIDE ---
    if (s.type === 'metrics' || (s.metrics && s.metrics.length > 0)) {
      const metrics = s.metrics.slice(0, 3);
      const cardWidth = 3.65;
      const cardGap = 0.39;
      const startX = 0.8;

      metrics.forEach((m, idx) => {
        const x = startX + idx * (cardWidth + cardGap);
        slide.addShape(pres.ShapeType.roundRect, {
          x,
          y: contentStartY,
          w: cardWidth,
          h: 4.4,
          rectRadius: 0.14,
          fill: { color: theme.surface },
          line: { color: theme.border, width: 1 },
        });

        slide.addText(m.value || '100%', {
          x: x + 0.3,
          y: contentStartY + 0.4,
          w: cardWidth - 0.6,
          h: 1.0,
          fontSize: 36,
          fontFace: 'Calibri',
          bold: true,
          color: idx === 0 ? theme.primary : idx === 1 ? theme.secondary : theme.accent,
        });

        slide.addText(m.label || 'Metric', {
          x: x + 0.3,
          y: contentStartY + 1.5,
          w: cardWidth - 0.6,
          h: 0.45,
          fontSize: 14,
          fontFace: 'Calibri',
          bold: true,
          color: theme.text,
        });

        slide.addText(m.description || '', {
          x: x + 0.3,
          y: contentStartY + 2.05,
          w: cardWidth - 0.6,
          h: 1.9,
          fontSize: 12,
          fontFace: 'Calibri',
          color: theme.textMuted,
          lineSpacing: 17,
        });
      });
      continue;
    }

    // --- SLIDE TYPE E: PILLAR CARDS SLIDE ---
    if (s.cards && s.cards.length > 0) {
      const count = Math.min(s.cards.length, 3);
      const cardWidth = count === 2 ? 5.65 : 3.65;
      const cardGap = count === 2 ? 0.43 : 0.39;
      const startX = 0.8;

      s.cards.slice(0, count).forEach((card, idx) => {
        const x = startX + idx * (cardWidth + cardGap);
        slide.addShape(pres.ShapeType.roundRect, {
          x,
          y: contentStartY,
          w: cardWidth,
          h: 4.5,
          rectRadius: 0.14,
          fill: { color: theme.surface },
          line: { color: theme.border, width: 1 },
        });

        slide.addShape(pres.ShapeType.ellipse, {
          x: x + 0.3,
          y: contentStartY + 0.32,
          w: 0.42,
          h: 0.42,
          fill: { color: theme.primary },
          line: { type: 'none' },
        });
        slide.addText(`${idx + 1}`, {
          x: x + 0.3,
          y: contentStartY + 0.32,
          w: 0.42,
          h: 0.42,
          fontSize: 11,
          fontFace: 'Calibri',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle',
        });

        slide.addText(card.title || 'Pillar', {
          x: x + 0.85,
          y: contentStartY + 0.3,
          w: cardWidth - 1.15,
          h: 0.48,
          fontSize: 14.5,
          fontFace: 'Calibri',
          bold: true,
          color: theme.text,
        });

        if (card.description) {
          slide.addText(card.description, {
            x: x + 0.3,
            y: contentStartY + 0.9,
            w: cardWidth - 0.6,
            h: 1.15,
            fontSize: 11.5,
            fontFace: 'Calibri',
            color: theme.textMuted,
            lineSpacing: 16,
          });
        }

        if (Array.isArray(card.bullets) && card.bullets.length > 0) {
          const textRuns = card.bullets.map((b) => ({
            text: String(b),
            options: { bullet: true, fontSize: 11.5, color: theme.text, lineSpacing: 18 },
          }));
          slide.addText(textRuns, {
            x: x + 0.3,
            y: contentStartY + (card.description ? 2.1 : 1.0),
            w: cardWidth - 0.6,
            h: 2.1,
            fontFace: 'Calibri',
            valign: 'top',
          });
        }
      });
      continue;
    }

    // --- SLIDE TYPE F: BULLETS + TAKEAWAY / VISUAL SPLIT ---
    if (Array.isArray(s.bullets) && s.bullets.length > 0) {
      const textRuns = s.bullets.map((b) => ({
        text: typeof b === 'string' ? b : b.text || '',
        options: {
          bullet: true,
          fontSize: 14,
          color: theme.text,
          lineSpacing: 24,
        },
      }));

      slide.addText(textRuns, {
        x: 0.8,
        y: contentStartY,
        w: 7.2,
        h: 4.5,
        fontFace: 'Calibri',
        valign: 'top',
      });

      if (s.callout || s.takeaway) {
        slide.addShape(pres.ShapeType.roundRect, {
          x: 8.35,
          y: contentStartY,
          w: 4.18,
          h: 4.4,
          rectRadius: 0.14,
          fill: { color: theme.surface },
          line: { color: theme.primary, width: 1.5 },
        });

        slide.addText('BOTTOM LINE', {
          x: 8.65,
          y: contentStartY + 0.38,
          w: 3.55,
          h: 0.3,
          fontSize: 10,
          fontFace: 'Calibri',
          bold: true,
          color: theme.secondary,
        });

        slide.addText(s.callout || s.takeaway, {
          x: 8.65,
          y: contentStartY + 0.8,
          w: 3.55,
          h: 3.2,
          fontSize: 13,
          fontFace: 'Calibri',
          color: theme.text,
          lineSpacing: 20,
          valign: 'top',
        });
      }
    }
  }

  return await pres.write({ outputType: 'nodebuffer' });
}

/**
 * 2. Word Document (.docx) — with KPI Scorecard Row, Flowchart Diagram Block, Callouts & Tables
 */
async function generateDocument(data, themeKey = 'slate') {
  const {
    Document,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    HeadingLevel,
    AlignmentType,
  } = docx;

  const docThemeColor =
    themeKey === 'midnight'
      ? '4F46E5'
      : themeKey === 'editorial'
      ? 'BE123C'
      : themeKey === 'emerald'
      ? '059669'
      : themeKey === 'navy'
      ? '1E3E62'
      : '2563EB';
  const docBorderColor = 'CBD5E1';
  const tableHeaderBg = '0F172A';
  const zebraBg = 'F8FAFC';

  const docChildren = [];

  // Category tag
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: (data.category || 'BRIEFING & ANALYSIS').toUpperCase(),
          bold: true,
          size: 18,
          color: docThemeColor,
          font: 'Calibri',
        }),
      ],
    })
  );

  // Title
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: data.title || 'Strategic Document',
          bold: true,
          size: 48,
          color: '0F172A',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Subtitle
  docChildren.push(
    new Paragraph({
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: `${data.subtitle || 'Analysis & Action Plan'}  •  ${new Date().toLocaleDateString()}`,
          italics: true,
          size: 21,
          color: '64748B',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Executive Summary Callout
  if (data.summary) {
    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          left: { style: BorderStyle.SINGLE, size: 24, color: docThemeColor },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: 'F8FAFC' },
                margins: { top: 160, bottom: 160, left: 220, right: 220 },
                children: [
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: 'EXECUTIVE SUMMARY',
                        bold: true,
                        size: 18,
                        color: docThemeColor,
                        font: 'Calibri',
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: data.summary,
                        size: 22,
                        color: '1E293B',
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
    docChildren.push(new Paragraph({ spacing: { after: 220 } }));
  }

  // Optional KPI Metrics Row (3-column scorecard table)
  if (Array.isArray(data.metrics) && data.metrics.length > 0) {
    const kpis = data.metrics.slice(0, 3);
    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
          left: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
          right: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
        },
        rows: [
          new TableRow({
            children: kpis.map(
              (m) =>
                new TableCell({
                  shading: { fill: 'F8FAFC' },
                  margins: { top: 140, bottom: 140, left: 160, right: 160 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: String(m.value || ''),
                          bold: true,
                          size: 32,
                          color: docThemeColor,
                          font: 'Calibri',
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: String(m.label || ''),
                          bold: true,
                          size: 20,
                          color: '0F172A',
                          font: 'Calibri',
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: String(m.description || ''),
                          size: 18,
                          color: '64748B',
                          font: 'Calibri',
                        }),
                      ],
                    }),
                  ],
                })
            ),
          }),
        ],
      })
    );
    docChildren.push(new Paragraph({ spacing: { after: 220 } }));
  }

  // Optional Process Flowchart Diagram Block in Word
  if (Array.isArray(data.flowchart) && data.flowchart.length > 0) {
    const steps = data.flowchart.slice(0, 4);
    docChildren.push(
      new Paragraph({
        spacing: { before: 120, after: 100 },
        children: [
          new TextRun({
            text: 'PROCESS & ARCHITECTURE FLOW',
            bold: true,
            size: 19,
            color: docThemeColor,
            font: 'Calibri',
          }),
        ],
      })
    );

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: docThemeColor },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: docBorderColor },
          left: { style: BorderStyle.SINGLE, size: 6, color: docBorderColor },
          right: { style: BorderStyle.SINGLE, size: 6, color: docBorderColor },
          insideVertical: { style: BorderStyle.SINGLE, size: 6, color: docBorderColor },
        },
        rows: [
          new TableRow({
            children: steps.map((st, idx) =>
              new TableCell({
                shading: { fill: idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
                margins: { top: 120, bottom: 120, left: 130, right: 130 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `STEP ${idx + 1}${idx < steps.length - 1 ? '  →' : ''}`,
                        bold: true,
                        size: 17,
                        color: docThemeColor,
                        font: 'Calibri',
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: String(st.title || st.label || `Stage ${idx + 1}`),
                        bold: true,
                        size: 20,
                        color: '0F172A',
                        font: 'Calibri',
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: String(st.description || ''),
                        size: 18,
                        color: '475569',
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
              })
            ),
          }),
        ],
      })
    );
    docChildren.push(new Paragraph({ spacing: { after: 220 } }));
  }

  // Sections
  const sections = Array.isArray(data.sections) ? data.sections : [];
  for (const sec of sections) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 260, after: 110 },
        children: [
          new TextRun({
            text: sec.title || 'Section',
            bold: true,
            size: 30,
            color: '0F172A',
            font: 'Calibri',
          }),
        ],
      })
    );

    if (sec.content) {
      docChildren.push(
        new Paragraph({
          spacing: { after: 130 },
          children: [
            new TextRun({
              text: sec.content,
              size: 22,
              color: '334155',
              font: 'Calibri',
            }),
          ],
        })
      );
    }

    if (Array.isArray(sec.bullets) && sec.bullets.length > 0) {
      for (const bullet of sec.bullets) {
        docChildren.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 70 },
            children: [
              new TextRun({
                text: typeof bullet === 'string' ? bullet : bullet.text || '',
                size: 22,
                color: '334155',
                font: 'Calibri',
              }),
            ],
          })
        );
      }
      docChildren.push(new Paragraph({ spacing: { after: 120 } }));
    }

    if (sec.table && Array.isArray(sec.table.headers) && Array.isArray(sec.table.rows)) {
      const tableRows = [];

      tableRows.push(
        new TableRow({
          tableHeader: true,
          children: sec.table.headers.map(
            (h) =>
              new TableCell({
                shading: { fill: tableHeaderBg },
                margins: { top: 110, bottom: 110, left: 130, right: 130 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: String(h),
                        bold: true,
                        size: 20,
                        color: 'FFFFFF',
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
              })
          ),
        })
      );

      sec.table.rows.forEach((row, rowIdx) => {
        tableRows.push(
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  shading: { fill: rowIdx % 2 === 0 ? 'FFFFFF' : zebraBg },
                  margins: { top: 95, bottom: 95, left: 130, right: 130 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: String(cell ?? ''),
                          size: 20,
                          color: '1E293B',
                          font: 'Calibri',
                        }),
                      ],
                    }),
                  ],
                })
            ),
          })
        );
      });

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
            left: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
            right: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: docBorderColor },
          },
          rows: tableRows,
        })
      );
      docChildren.push(new Paragraph({ spacing: { after: 180 } }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1260, right: 1260, bottom: 1260, left: 1260 },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await docx.Packer.toBuffer(doc);
}

/**
 * 3. Excel Workbook (.xlsx) — with Visual Share Bars, Live =SUM & =AVERAGE Formulas, Variance Highlighting
 */
async function generateSpreadsheet(data, themeKey = 'slate') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Scribe';
  workbook.created = new Date();

  const sheetData = Array.isArray(data.sheets) && data.sheets.length > 0 ? data.sheets : [data];

  for (const sheetInfo of sheetData) {
    const ws = workbook.addWorksheet(sheetInfo.sheetName || 'Model', {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 4 }],
    });

    let currentRow = 1;

    const titleCell = ws.getCell(`A${currentRow}`);
    titleCell.value = (sheetInfo.title || data.title || 'FINANCIAL & OPERATIONAL MODEL').toUpperCase();
    titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0F172A' } };
    currentRow += 1;

    const subCell = ws.getCell(`A${currentRow}`);
    subCell.value = `${sheetInfo.subtitle || data.subtitle || 'Quantitative Model'}  •  ${new Date().toLocaleDateString()}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
    currentRow += 2;

    const baseHeaders = sheetInfo.headers || ['Line Item', 'Q1', 'Q2', 'Variance', 'Growth %', 'Projected'];
    const headers = [...baseHeaders, 'Visual Trend'];
    const headerRow = ws.getRow(currentRow);
    headerRow.values = headers;
    headerRow.height = 26;

    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' },
      };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 ? 'left' : 'right',
        wrapText: true,
      };
    });

    currentRow += 1;

    const rows = sheetInfo.rows || [];
    const dataStartRow = currentRow;

    // Find max numeric value in last numeric column to build visual bar chart column
    let maxNumeric = 1;
    rows.forEach((r) => {
      if (Array.isArray(r)) {
        const nums = r.filter((v) => typeof v === 'number' && Math.abs(v) > 1);
        const lastNum = nums[nums.length - 1] || 0;
        if (Math.abs(lastNum) > maxNumeric) maxNumeric = Math.abs(lastNum);
      }
    });

    rows.forEach((r, idx) => {
      const nums = Array.isArray(r) ? r.filter((v) => typeof v === 'number' && Math.abs(v) > 1) : [];
      const lastNum = Math.abs(nums[nums.length - 1] || 0);
      const filledBlocks = Math.max(1, Math.min(10, Math.round((lastNum / maxNumeric) * 10)));
      const visualBar = '█'.repeat(filledBlocks) + '░'.repeat(10 - filledBlocks);

      const row = ws.getRow(currentRow);
      row.values = [...r, visualBar];
      row.height = 21;

      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF1E293B' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (colNumber === headers.length) {
          cell.font = { name: 'Consolas', size: 10, color: { argb: 'FF10B981' } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (typeof cell.value === 'number') {
          const isNegative = cell.value < 0;
          if (isNegative) {
            cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FFDC2626' } };
          }
          if (Math.abs(cell.value) >= 100) {
            cell.numFmt = '$#,##0;($#,##0)';
            cell.alignment = { horizontal: 'right' };
          } else if (Math.abs(cell.value) <= 1 && colNumber > 2) {
            cell.numFmt = '0.0%';
            cell.alignment = { horizontal: 'right' };
          } else {
            cell.numFmt = '#,##0.00';
            cell.alignment = { horizontal: 'right' };
          }
        }
      });
      currentRow += 1;
    });

    const dataEndRow = currentRow - 1;

    if (rows.length > 0) {
      // Total Row
      const totalRow = ws.getRow(currentRow);
      const totalValues = ['TOTAL'];

      for (let c = 2; c <= baseHeaders.length; c++) {
        const colLetter = String.fromCharCode(64 + c);
        const sampleVal = rows[0]?.[c - 1];
        if (typeof sampleVal === 'number') {
          if (Math.abs(sampleVal) <= 1 && c > 2) {
            totalValues.push({ formula: `AVERAGE(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` });
          } else {
            totalValues.push({ formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` });
          }
        } else {
          totalValues.push('');
        }
      }
      totalValues.push('');

      totalRow.values = totalValues;
      totalRow.height = 24;

      totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF64748B' } },
          bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        };
        const sampleVal = rows[0]?.[colNumber - 1];
        if (typeof cell.value === 'object' && cell.value.formula) {
          cell.numFmt = Math.abs(sampleVal || 0) <= 1 && colNumber > 2 ? '0.0%' : '$#,##0';
          cell.alignment = { horizontal: 'right' };
        }
      });
    }

    ws.columns.forEach((col) => {
      let maxLen = 13;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const str = String(cell.value?.formula ? '$999,999,999' : cell.value || '');
        if (str.length > maxLen && str.length < 48) {
          maxLen = str.length;
        }
      });
      col.width = Math.min(Math.max(maxLen + 4, 15), 42);
    });
  }

  return await workbook.xlsx.writeBuffer();
}

/**
 * 4. CSV Dataset (.csv)
 */
function generateCSV(data) {
  const headers = data.headers || ['Item', 'Q1', 'Q2', 'Variance', 'Growth'];
  const rows = data.rows || [];

  const escapeCell = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => (Array.isArray(r) ? r.map(escapeCell).join(',') : '')),
  ];

  return Buffer.from(lines.join('\r\n'), 'utf8');
}

/**
 * 5. Markdown Spec (.md) — with Mermaid.js Flowchart Diagram, KPI Table & Clean Sections
 */
function generateMarkdown(data) {
  const lines = [];
  if (data.category) lines.push(`> **${data.category.toUpperCase()}**\n`);
  lines.push(`# ${data.title || 'Specification & Report'}`);
  if (data.subtitle) lines.push(`*${data.subtitle} — ${new Date().toLocaleDateString()}*\n`);
  lines.push('---\n');

  if (data.summary) {
    lines.push(`> [!IMPORTANT]\n> **Executive Summary:** ${data.summary}\n`);
  }

  if (Array.isArray(data.metrics) && data.metrics.length > 0) {
    lines.push(`## Key Metrics\n`);
    lines.push(`| Metric | Value | Context |`);
    lines.push(`| :--- | :--- | :--- |`);
    for (const m of data.metrics) {
      lines.push(`| **${m.label || ''}** | \`${m.value || ''}\` | ${m.description || ''} |`);
    }
    lines.push('');
  }

  if (Array.isArray(data.flowchart) && data.flowchart.length > 0) {
    lines.push(`## Architecture & Process Flow\n`);
    lines.push('```mermaid');
    lines.push('flowchart LR');
    data.flowchart.forEach((step, idx) => {
      const nodeId = `S${idx + 1}`;
      const label = String(step.title || step.label || `Step ${idx + 1}`).replace(/"/g, "'");
      lines.push(`  ${nodeId}["${idx + 1}. ${label}"]`);
      if (idx > 0) {
        lines.push(`  S${idx} --> ${nodeId}`);
      }
    });
    lines.push('```\n');
  }

  const sections = Array.isArray(data.sections) ? data.sections : [];
  for (const sec of sections) {
    lines.push(`## ${sec.title || 'Section'}\n`);
    if (sec.content) lines.push(`${sec.content}\n`);
    if (Array.isArray(sec.bullets) && sec.bullets.length > 0) {
      for (const b of sec.bullets) {
        lines.push(`- ${typeof b === 'string' ? b : b.text || ''}`);
      }
      lines.push('');
    }
    if (sec.table && Array.isArray(sec.table.headers) && Array.isArray(sec.table.rows)) {
      lines.push(`| ${sec.table.headers.join(' | ')} |`);
      lines.push(`| ${sec.table.headers.map(() => '---').join(' | ')} |`);
      for (const r of sec.table.rows) {
        lines.push(`| ${r.map((c) => String(c)).join(' | ')} |`);
      }
      lines.push('');
    }
  }

  return Buffer.from(lines.join('\n'), 'utf8');
}

/**
 * 6. LaTeX Academic Paper (.tex) — with TikZ Flowchart Diagram & Booktabs Tables
 */
function generateLaTeX(data) {
  const esc = (s) =>
    String(s || '')
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/[&%$#_{}]/g, (m) => `\\${m}`);

  const lines = [
    '\\documentclass[11pt,a4paper]{article}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage[margin=1in]{geometry}',
    '\\usepackage{booktabs}',
    '\\usepackage{tikz}',
    '\\usetikzlibrary{shapes.geometric, arrows.meta, positioning}',
    '\\usepackage{hyperref}',
    '\\usepackage{parskip}',
    `\\title{\\textbf{${esc(data.title || 'Research Paper')}}\\\\ \\large ${esc(data.subtitle || '')}}`,
    `\\author{${esc(data.author || 'Research & Strategy Group')}}`,
    '\\date{\\today}',
    '\\begin{document}',
    '\\maketitle',
  ];

  if (data.summary) {
    lines.push('\\begin{abstract}');
    lines.push(esc(data.summary));
    lines.push('\\end{abstract}');
  }

  if (Array.isArray(data.flowchart) && data.flowchart.length > 0) {
    const steps = data.flowchart.slice(0, 4);
    lines.push('\\section*{System Architecture \\& Process Flow}');
    lines.push('\\begin{center}');
    lines.push('\\begin{tikzpicture}[node distance=0.8cm, box/.style={rectangle, rounded corners, draw=black!70, fill=gray!10, thick, minimum width=3.1cm, minimum height=1.1cm, align=center, font=\\small}]');
    steps.forEach((st, idx) => {
      const pos = idx === 0 ? '' : `[right=of n${idx - 1}]`;
      lines.push(`  \\node[box] (n${idx}) ${pos} {\\textbf{${idx + 1}. ${esc(st.title || st.label || 'Stage')}}};`);
      if (idx > 0) {
        lines.push(`  \\draw[-{Stealth[length=2.5mm]}, thick] (n${idx - 1}) -- (n${idx});`);
      }
    });
    lines.push('\\end{tikzpicture}');
    lines.push('\\end{center}');
  }

  const sections = Array.isArray(data.sections) ? data.sections : [];
  for (const sec of sections) {
    lines.push(`\\section{${esc((sec.title || 'Section').replace(/^\d+\.\s*/, ''))}}`);
    if (sec.content) lines.push(esc(sec.content) + '\n');
    if (Array.isArray(sec.bullets) && sec.bullets.length > 0) {
      lines.push('\\begin{itemize}');
      for (const b of sec.bullets) {
        lines.push(`  \\item ${esc(typeof b === 'string' ? b : b.text || '')}`);
      }
      lines.push('\\end{itemize}');
    }
    if (sec.table && Array.isArray(sec.table.headers) && Array.isArray(sec.table.rows)) {
      const cols = sec.table.headers.map(() => 'l').join(' ');
      lines.push('\\begin{table}[h!]');
      lines.push('\\centering');
      lines.push(`\\begin{tabular}{${cols}}`);
      lines.push('\\toprule');
      lines.push(sec.table.headers.map((h) => `\\textbf{${esc(h)}}`).join(' & ') + ' \\\\');
      lines.push('\\midrule');
      for (const r of sec.table.rows) {
        lines.push(r.map((c) => esc(c)).join(' & ') + ' \\\\');
      }
      lines.push('\\bottomrule');
      lines.push('\\end{tabular}');
      lines.push('\\end{table}');
    }
  }

  lines.push('\\end{document}');
  return Buffer.from(lines.join('\n'), 'utf8');
}

/**
 * 7. Standalone HTML & Vector PDF Source — with Embedded SVG Flowchart & KPI Grid
 */
function generateHTMLString(data, themeKey = 'slate') {
  const theme = THEMES[themeKey] || THEMES.slate;
  const accentHex = `#${theme.secondary || theme.primary}`;

  const kpiHtml =
    Array.isArray(data.metrics) && data.metrics.length > 0
      ? `<div class="kpi-grid">
          ${data.metrics
            .slice(0, 3)
            .map(
              (m) => `<div class="kpi-card">
                <div class="kpi-val">${m.value || ''}</div>
                <div class="kpi-lbl">${m.label || ''}</div>
                <div class="kpi-desc">${m.description || ''}</div>
              </div>`
            )
            .join('')}
        </div>`
      : '';

  const flowchartSvg = buildFlowchartSvg(data.flowchart, theme);

  const sectionsHtml = (Array.isArray(data.sections) ? data.sections : [])
    .map((sec) => {
      const bulletsHtml =
        Array.isArray(sec.bullets) && sec.bullets.length > 0
          ? `<ul>${sec.bullets.map((b) => `<li>${typeof b === 'string' ? b : b.text || ''}</li>`).join('')}</ul>`
          : '';
      const tableHtml =
        sec.table && Array.isArray(sec.table.headers)
          ? `<table>
              <thead><tr>${sec.table.headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
              <tbody>${(sec.table.rows || [])
                .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
                .join('')}</tbody>
            </table>`
          : '';
      return `<section>
        <h2>${sec.title || 'Section'}</h2>
        ${sec.content ? `<p>${sec.content}</p>` : ''}
        ${bulletsHtml}
        ${tableHtml}
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${data.title || 'Report'}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    line-height: 1.65;
    max-width: 820px;
    margin: 32px auto;
    padding: 0 24px;
  }
  .tag {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${accentHex};
    background: #f1f5f9;
    padding: 4px 10px;
    border-radius: 6px;
    margin-bottom: 10px;
  }
  h1 {
    font-size: 30px;
    font-weight: 800;
    margin: 0 0 8px 0;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .subtitle {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 24px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 16px;
  }
  .summary {
    background: #f8fafc;
    border-left: 4px solid ${accentHex};
    padding: 15px 18px;
    border-radius: 0 8px 8px 0;
    margin-bottom: 22px;
    font-size: 14px;
    color: #1e293b;
  }
  .summary strong {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${accentHex};
    margin-bottom: 4px;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin: 20px 0 24px 0;
  }
  .kpi-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 14px;
  }
  .kpi-val {
    font-size: 22px;
    font-weight: 800;
    color: ${accentHex};
  }
  .kpi-lbl {
    font-size: 12.5px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 2px;
  }
  .kpi-desc {
    font-size: 11.5px;
    color: #64748b;
    margin-top: 4px;
  }
  h2 {
    font-size: 19px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 24px;
    margin-bottom: 8px;
  }
  p, li {
    font-size: 13.5px;
    color: #334155;
  }
  ul {
    padding-left: 20px;
    margin-bottom: 16px;
  }
  li { margin-bottom: 5px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 22px 0;
    font-size: 12.5px;
  }
  th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 9px 12px;
  }
  td {
    padding: 9px 12px;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
  }
  tr:nth-child(even) td { background: #f8fafc; }
</style>
</head>
<body>
  <div class="tag">${data.category || 'Briefing'}</div>
  <h1>${data.title || 'Report'}</h1>
  <div class="subtitle">${data.subtitle || ''} • ${new Date().toLocaleDateString()}</div>
  ${data.summary ? `<div class="summary"><strong>Summary</strong>${data.summary}</div>` : ''}
  ${kpiHtml}
  ${flowchartSvg}
  ${sectionsHtml}
</body>
</html>`;
}

function generateHTML(data, themeKey = 'slate') {
  return Buffer.from(generateHTMLString(data, themeKey), 'utf8');
}

/**
 * 8. Vector PDF Document (.pdf) via Chromium printToPDF
 */
async function generatePDF(data, themeKey = 'slate') {
  const htmlContent = generateHTMLString(data, themeKey);
  try {
    const { BrowserWindow } = require('electron');
    if (BrowserWindow) {
      const win = new BrowserWindow({
        width: 840,
        height: 1188,
        show: false,
        webPreferences: { offscreen: true },
      });
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
      });
      win.destroy();
      return Buffer.from(pdfBuffer);
    }
  } catch (e) {
    console.warn('[OfficeGenerator] Electron printToPDF warning:', e.message);
  }
  return Buffer.from(htmlContent, 'utf8');
}

module.exports = {
  THEMES,
  generatePresentation,
  generateDocument,
  generateSpreadsheet,
  generateCSV,
  generateMarkdown,
  generateLaTeX,
  generateHTML,
  generatePDF,
};
