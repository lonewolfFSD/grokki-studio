const fs = require('fs');
const path = require('path');
const os = require('os');
const pptxgen = require('pptxgenjs');
const docx = require('docx');
const ExcelJS = require('exceljs');

// Color palettes for presentation and document themes
const THEMES = {
  midnight: {
    name: 'Midnight Dark',
    bg: '0F172A',
    surface: '1E293B',
    surfaceSubtle: '334155',
    primary: '6366F1', // Indigo
    secondary: '38BDF8', // Cyan
    text: 'F8FAFC',
    textMuted: '94A3B8',
    accent: '10B981',
    border: '334155',
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
    textMuted: '64748B',
    accent: '0EA5E9',
    border: 'E2E8F0',
    isDark: false,
  },
  editorial: {
    name: 'Warm Editorial',
    bg: 'FAFAF9',
    surface: 'F5F5F4',
    surfaceSubtle: 'E7E5E4',
    primary: '1C1917',
    secondary: 'BE123C',
    text: '1C1917',
    textMuted: '78716C',
    accent: 'D97706',
    border: 'E7E5E4',
    isDark: false,
  },
  emerald: {
    name: 'Emerald Growth',
    bg: '064E3B',
    surface: '065F46',
    surfaceSubtle: '047857',
    primary: '10B981',
    secondary: '34D399',
    text: 'ECFDF5',
    textMuted: 'A7F3D0',
    accent: 'F59E0B',
    border: '047857',
    isDark: true,
  },
};

/**
 * Generates an executive-grade PowerPoint presentation (.pptx)
 */
async function generatePresentation(data, themeKey = 'midnight') {
  const theme = THEMES[themeKey] || THEMES.midnight;
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'Grokki Office Studio';
  pres.title = data.title || 'Executive Presentation';

  const slides = Array.isArray(data.slides) ? data.slides : [];

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const slide = pres.addSlide();

    // 1. Background fill
    slide.background = { color: theme.bg };

    // 2. Decorative top accent bar
    slide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.08,
      fill: { color: theme.primary },
      line: { type: 'none' },
    });

    // 3. Slide Number & Footer
    slide.addText(
      `${data.title || 'Grokki Studio'}  |  Slide ${i + 1} of ${slides.length}`,
      {
        x: 0.8,
        y: 7.05,
        w: 11.73,
        h: 0.35,
        fontSize: 10,
        fontFace: 'Arial',
        color: theme.textMuted,
        align: 'left',
      }
    );

    // SLIDE TYPE A: Hero Title Slide (first slide or type === 'title')
    if (i === 0 || s.type === 'title') {
      // Category / Tag pill badge
      if (s.tag || data.category) {
        slide.addShape(pres.ShapeType.roundRect, {
          x: 1.2,
          y: 1.5,
          w: 2.4,
          h: 0.42,
          rectRadius: 0.1,
          fill: { color: theme.surfaceSubtle },
          line: { color: theme.border, width: 1 },
        });
        slide.addText((s.tag || data.category || 'EXECUTIVE BRIEF').toUpperCase(), {
          x: 1.2,
          y: 1.5,
          w: 2.4,
          h: 0.42,
          fontSize: 10,
          fontFace: 'Arial',
          bold: true,
          color: theme.secondary,
          align: 'center',
          valign: 'middle',
        });
      }

      // Main big title
      slide.addText(s.title || data.title || 'Executive Strategy', {
        x: 1.2,
        y: 2.2,
        w: 10.8,
        h: 1.8,
        fontSize: 38,
        fontFace: 'Arial',
        bold: true,
        color: theme.text,
        lineSpacing: 44,
        valign: 'top',
      });

      // Subtitle / Executive hook
      if (s.subtitle || data.subtitle) {
        slide.addText(s.subtitle || data.subtitle, {
          x: 1.2,
          y: 4.2,
          w: 9.5,
          h: 1.2,
          fontSize: 16,
          fontFace: 'Arial',
          color: theme.textMuted,
          lineSpacing: 22,
        });
      }

      // Presenter / Metadata box
      slide.addShape(pres.ShapeType.line, {
        x: 1.2,
        y: 5.6,
        w: 4.0,
        h: 0,
        line: { color: theme.primary, width: 2 },
      });
      slide.addText(`Prepared by Grokki Office Studio  •  ${new Date().toLocaleDateString()}`, {
        x: 1.2,
        y: 5.8,
        w: 8.0,
        h: 0.4,
        fontSize: 11,
        fontFace: 'Arial',
        color: theme.textMuted,
      });
      continue;
    }

    // Header section for content slides
    // Category label
    if (s.tag) {
      slide.addText(s.tag.toUpperCase(), {
        x: 0.8,
        y: 0.5,
        w: 10,
        h: 0.3,
        fontSize: 10,
        fontFace: 'Arial',
        bold: true,
        color: theme.secondary,
      });
    }

    // Slide Title
    slide.addText(s.title || 'Key Insights', {
      x: 0.8,
      y: 0.78,
      w: 11.5,
      h: 0.75,
      fontSize: 24,
      fontFace: 'Arial',
      bold: true,
      color: theme.text,
    });

    // Subtitle / Context note
    if (s.subtitle) {
      slide.addText(s.subtitle, {
        x: 0.8,
        y: 1.45,
        w: 11.5,
        h: 0.45,
        fontSize: 13,
        fontFace: 'Arial',
        color: theme.textMuted,
      });
    }

    const contentStartY = s.subtitle ? 2.1 : 1.75;

    // SLIDE TYPE B: 3-Metric / KPI Stat Slide
    if (s.type === 'metrics' || (s.metrics && s.metrics.length > 0)) {
      const metrics = s.metrics.slice(0, 3);
      const cardWidth = 3.65;
      const cardGap = 0.4;
      const startX = 0.8;

      metrics.forEach((m, idx) => {
        const x = startX + idx * (cardWidth + cardGap);
        // Card background
        slide.addShape(pres.ShapeType.roundRect, {
          x,
          y: contentStartY,
          w: cardWidth,
          h: 4.4,
          rectRadius: 0.15,
          fill: { color: theme.surface },
          line: { color: theme.border, width: 1 },
        });

        // Metric Number (Huge & Bold)
        slide.addText(m.value || '100%', {
          x: x + 0.3,
          y: contentStartY + 0.4,
          w: cardWidth - 0.6,
          h: 1.1,
          fontSize: 36,
          fontFace: 'Arial',
          bold: true,
          color: idx === 0 ? theme.primary : idx === 1 ? theme.secondary : theme.accent,
          align: 'left',
        });

        // Metric Label
        slide.addText(m.label || 'Metric', {
          x: x + 0.3,
          y: contentStartY + 1.5,
          w: cardWidth - 0.6,
          h: 0.5,
          fontSize: 14,
          fontFace: 'Arial',
          bold: true,
          color: theme.text,
        });

        // Description
        slide.addText(m.description || '', {
          x: x + 0.3,
          y: contentStartY + 2.1,
          w: cardWidth - 0.6,
          h: 1.8,
          fontSize: 12,
          fontFace: 'Arial',
          color: theme.textMuted,
          lineSpacing: 17,
        });
      });
      continue;
    }

    // SLIDE TYPE C: 2 or 3 Column Feature / Card Grid
    if (s.cards && s.cards.length > 0) {
      const count = Math.min(s.cards.length, 3);
      const cardWidth = count === 2 ? 5.65 : 3.65;
      const cardGap = count === 2 ? 0.43 : 0.4;
      const startX = 0.8;

      s.cards.slice(0, count).forEach((card, idx) => {
        const x = startX + idx * (cardWidth + cardGap);
        slide.addShape(pres.ShapeType.roundRect, {
          x,
          y: contentStartY,
          w: cardWidth,
          h: 4.5,
          rectRadius: 0.15,
          fill: { color: theme.surface },
          line: { color: theme.border, width: 1 },
        });

        // Step / Number icon circle
        slide.addShape(pres.ShapeType.ellipse, {
          x: x + 0.35,
          y: contentStartY + 0.35,
          w: 0.45,
          h: 0.45,
          fill: { color: theme.primary },
          line: { type: 'none' },
        });
        slide.addText(`${idx + 1}`, {
          x: x + 0.35,
          y: contentStartY + 0.35,
          w: 0.45,
          h: 0.45,
          fontSize: 11,
          fontFace: 'Arial',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle',
        });

        // Card Title
        slide.addText(card.title || 'Feature', {
          x: x + 0.95,
          y: contentStartY + 0.32,
          w: cardWidth - 1.3,
          h: 0.5,
          fontSize: 15,
          fontFace: 'Arial',
          bold: true,
          color: theme.text,
        });

        // Bullets or description
        if (Array.isArray(card.bullets) && card.bullets.length > 0) {
          const textRuns = card.bullets.map((b) => ({
            text: b,
            options: { bullet: true, fontSize: 12, color: theme.textMuted, lineSpacing: 20 },
          }));
          slide.addText(textRuns, {
            x: x + 0.35,
            y: contentStartY + 1.1,
            w: cardWidth - 0.7,
            h: 3.1,
            fontFace: 'Arial',
          });
        } else if (card.description) {
          slide.addText(card.description, {
            x: x + 0.35,
            y: contentStartY + 1.1,
            w: cardWidth - 0.7,
            h: 3.1,
            fontSize: 12,
            fontFace: 'Arial',
            color: theme.textMuted,
            lineSpacing: 18,
          });
        }
      });
      continue;
    }

    // SLIDE TYPE D: Clean Bullet / Overview Layout with Highlight Box
    if (Array.isArray(s.bullets) && s.bullets.length > 0) {
      // Main bullets on left (7.0 width)
      const textRuns = s.bullets.map((b) => ({
        text: typeof b === 'string' ? b : b.text || '',
        options: {
          bullet: true,
          fontSize: 14,
          color: theme.text,
          bold: false,
          lineSpacing: 26,
        },
      }));

      slide.addText(textRuns, {
        x: 0.8,
        y: contentStartY,
        w: 7.2,
        h: 4.5,
        fontFace: 'Arial',
      });

      // Key Takeaway callout box on right (4.0 width)
      if (s.callout || s.takeaway) {
        slide.addShape(pres.ShapeType.roundRect, {
          x: 8.4,
          y: contentStartY,
          w: 4.1,
          h: 4.4,
          rectRadius: 0.15,
          fill: { color: theme.surface },
          line: { color: theme.primary, width: 1.5 },
        });

        slide.addText('CORE TAKEAWAY', {
          x: 8.7,
          y: contentStartY + 0.4,
          w: 3.5,
          h: 0.3,
          fontSize: 10,
          fontFace: 'Arial',
          bold: true,
          color: theme.secondary,
        });

        slide.addText(s.callout || s.takeaway, {
          x: 8.7,
          y: contentStartY + 0.8,
          w: 3.5,
          h: 3.1,
          fontSize: 13,
          fontFace: 'Arial',
          color: theme.text,
          lineSpacing: 20,
        });
      }
    }
  }

  const buffer = await pres.write({ outputType: 'nodebuffer' });
  return buffer;
}

/**
 * Generates an executive-grade Word Document (.docx)
 */
async function generateDocument(data, themeKey = 'slate') {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType } = docx;

  const docThemeColor = themeKey === 'midnight' ? '4F46E5' : themeKey === 'editorial' ? 'BE123C' : themeKey === 'emerald' ? '059669' : '2563EB';
  const docBorderColor = 'E2E8F0';
  const tableHeaderBg = '1E293B';
  const zebraBg = 'F8FAFC';

  const docChildren = [];

  // 1. Header / Category Pill
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: (data.category || 'EXECUTIVE BRIEFING').toUpperCase(),
          bold: true,
          size: 19, // 9.5pt
          color: docThemeColor,
          font: 'Arial',
        }),
      ],
    })
  );

  // 2. Document Main Title
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: data.title || 'Executive Report',
          bold: true,
          size: 52, // 26pt
          color: '0F172A',
          font: 'Arial',
        }),
      ],
    })
  );

  // 3. Subtitle / Author Meta
  docChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `${data.subtitle || 'Prepared for Strategy & Operations Review'}  •  ${new Date().toLocaleDateString()}`,
          italics: true,
          size: 21, // 10.5pt
          color: '64748B',
          font: 'Arial',
        }),
      ],
    })
  );

  // 4. Executive Summary Callout Box
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
                margins: { top: 160, bottom: 160, left: 240, right: 240 },
                children: [
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: 'EXECUTIVE SUMMARY',
                        bold: true,
                        size: 18,
                        color: docThemeColor,
                        font: 'Arial',
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: data.summary,
                        size: 22,
                        color: '334155',
                        font: 'Arial',
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
    docChildren.push(new Paragraph({ spacing: { after: 240 } }));
  }

  // 5. Sections
  const sections = Array.isArray(data.sections) ? data.sections : [];
  for (const sec of sections) {
    // Section Heading (H1)
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({
            text: sec.title || 'Section',
            bold: true,
            size: 32, // 16pt
            color: '0F172A',
            font: 'Arial',
          }),
        ],
      })
    );

    // Section narrative paragraphs
    if (sec.content) {
      docChildren.push(
        new Paragraph({
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: sec.content,
              size: 22, // 11pt
              color: '334155',
              font: 'Arial',
            }),
          ],
        })
      );
    }

    // Section bullet points
    if (Array.isArray(sec.bullets) && sec.bullets.length > 0) {
      for (const bullet of sec.bullets) {
        docChildren.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: typeof bullet === 'string' ? bullet : bullet.text || '',
                size: 22,
                color: '334155',
                font: 'Arial',
              }),
            ],
          })
        );
      }
      docChildren.push(new Paragraph({ spacing: { after: 140 } }));
    }

    // Section Table (if provided)
    if (sec.table && Array.isArray(sec.table.headers) && Array.isArray(sec.table.rows)) {
      const tableRows = [];

      // Header row
      tableRows.push(
        new TableRow({
          tableHeader: true,
          children: sec.table.headers.map(
            (h) =>
              new TableCell({
                shading: { fill: tableHeaderBg },
                margins: { top: 120, bottom: 120, left: 140, right: 140 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: h,
                        bold: true,
                        size: 20,
                        color: 'FFFFFF',
                        font: 'Arial',
                      }),
                    ],
                  }),
                ],
              })
          ),
        })
      );

      // Data rows
      sec.table.rows.forEach((row, rowIdx) => {
        tableRows.push(
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  shading: { fill: rowIdx % 2 === 0 ? 'FFFFFF' : zebraBg },
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: String(cell),
                          size: 20,
                          color: '1E293B',
                          font: 'Arial',
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
      docChildren.push(new Paragraph({ spacing: { after: 200 } }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
          },
        },
        children: docChildren,
      },
    ],
  });

  const buffer = await docx.Packer.toBuffer(doc);
  return buffer;
}

/**
 * Generates an executive-grade Excel Workbook (.xlsx) with actual formulas and styling
 */
async function generateSpreadsheet(data, themeKey = 'slate') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Grokki Office Studio';
  workbook.created = new Date();

  const sheetData = Array.isArray(data.sheets) && data.sheets.length > 0 ? data.sheets : [data];

  for (const sheetInfo of sheetData) {
    const ws = workbook.addWorksheet(sheetInfo.sheetName || 'Financial Model', {
      views: [{ showGridLines: true }],
    });

    let currentRow = 1;

    // 1. Title Banner
    const titleCell = ws.getCell(`A${currentRow}`);
    titleCell.value = (sheetInfo.title || data.title || 'FINANCIAL & OPERATIONAL MODEL').toUpperCase();
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    currentRow += 1;

    if (sheetInfo.subtitle || data.subtitle) {
      const subCell = ws.getCell(`A${currentRow}`);
      subCell.value = `${sheetInfo.subtitle || data.subtitle}  •  Generated by Grokki Office Studio`;
      subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
      currentRow += 2; // leave blank line
    } else {
      currentRow += 1;
    }

    // 2. Table Headers
    const headers = sheetInfo.headers || ['Item', 'Category', 'Target Q1', 'Actual Q1', 'Variance', '% Achievement'];
    const headerRow = ws.getRow(currentRow);
    headerRow.values = headers;
    headerRow.height = 26;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }, // Dark slate
      };
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      };
    });

    const headerRowNum = currentRow;
    currentRow += 1;

    // 3. Data Rows
    const rows = sheetInfo.rows || [];
    const dataStartRow = currentRow;

    rows.forEach((r, idx) => {
      const row = ws.getRow(currentRow);
      row.values = r;
      row.height = 20;

      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Auto format numbers
        if (typeof cell.value === 'number') {
          if (cell.value > 1000 || cell.value < -1000) {
            cell.numFmt = '$#,##0';
            cell.alignment = { horizontal: 'right' };
          } else if (cell.value >= 0 && cell.value <= 1 && colNumber > 2) {
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

    // 4. Totals / Summary Row with Real Formulas
    if (rows.length > 0) {
      const totalRow = ws.getRow(currentRow);
      const totalValues = ['Total'];

      for (let c = 2; c <= headers.length; c++) {
        const colLetter = String.fromCharCode(64 + c);
        // Check if data in this column is numeric
        const sampleVal = rows[0]?.[c - 1];
        if (typeof sampleVal === 'number') {
          totalValues.push({ formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` });
        } else {
          totalValues.push('');
        }
      }

      totalRow.values = totalValues;
      totalRow.height = 24;

      totalRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'double', color: { argb: 'FF0F172A' } }, // Classic accounting double line
        };
        if (typeof cell.value === 'object' && cell.value.formula) {
          cell.numFmt = '$#,##0';
          cell.alignment = { horizontal: 'right' };
        }
      });
    }

    // 5. Auto-fit column widths with breathing room
    ws.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const str = String(cell.value || '');
        if (str.length > maxLen && str.length < 50) {
          maxLen = str.length;
        }
      });
      col.width = Math.min(Math.max(maxLen + 4, 14), 45);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  THEMES,
  generatePresentation,
  generateDocument,
  generateSpreadsheet,
};
