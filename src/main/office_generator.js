const pptxgen = require('pptxgenjs');
const docx = require('docx');
const ExcelJS = require('exceljs');

const THEMES = {
  midnight: {
    name: 'Midnight Dark',
    bg: '0F172A',
    surface: '1E293B',
    surfaceSubtle: '334155',
    primary: '6366F1',
    secondary: '38BDF8',
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
  navy: {
    name: 'Executive Navy',
    bg: '0B192C',
    surface: '1E3E62',
    surfaceSubtle: '2B5278',
    primary: 'F59E0B',
    secondary: '38BDF8',
    text: 'FFFFFF',
    textMuted: 'CBD5E1',
    accent: '10B981',
    border: '2B5278',
    isDark: true,
  },
  mono: {
    name: 'Minimal Mono',
    bg: '18181B',
    surface: '27272A',
    surfaceSubtle: '3F3F46',
    primary: 'F4F4F5',
    secondary: 'A1A1AA',
    text: 'FAFAFA',
    textMuted: 'A1A1AA',
    accent: 'E4E4E7',
    border: '3F3F46',
    isDark: true,
  },
};

/**
 * 1. PowerPoint (.pptx)
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
    slide.background = { color: theme.bg };

    slide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.08,
      fill: { color: theme.primary },
      line: { type: 'none' },
    });

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

    if (i === 0 || s.type === 'title') {
      if (s.tag || data.category) {
        slide.addShape(pres.ShapeType.roundRect, {
          x: 1.2,
          y: 1.5,
          w: 2.6,
          h: 0.42,
          rectRadius: 0.1,
          fill: { color: theme.surfaceSubtle },
          line: { color: theme.border, width: 1 },
        });
        slide.addText((s.tag || data.category || 'EXECUTIVE BRIEF').toUpperCase(), {
          x: 1.2,
          y: 1.5,
          w: 2.6,
          h: 0.42,
          fontSize: 10,
          fontFace: 'Arial',
          bold: true,
          color: theme.secondary,
          align: 'center',
          valign: 'middle',
        });
      }

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

    if (s.type === 'metrics' || (s.metrics && s.metrics.length > 0)) {
      const metrics = s.metrics.slice(0, 3);
      const cardWidth = 3.65;
      const cardGap = 0.4;
      const startX = 0.8;

      metrics.forEach((m, idx) => {
        const x = startX + idx * (cardWidth + cardGap);
        slide.addShape(pres.ShapeType.roundRect, {
          x,
          y: contentStartY,
          w: cardWidth,
          h: 4.4,
          rectRadius: 0.15,
          fill: { color: theme.surface },
          line: { color: theme.border, width: 1 },
        });

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

    if (Array.isArray(s.bullets) && s.bullets.length > 0) {
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

  return await pres.write({ outputType: 'nodebuffer' });
}

/**
 * 2. Word Document (.docx)
 */
async function generateDocument(data, themeKey = 'slate') {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType } = docx;

  const docThemeColor =
    themeKey === 'midnight' ? '4F46E5' :
    themeKey === 'editorial' ? 'BE123C' :
    themeKey === 'emerald' ? '059669' :
    themeKey === 'navy' ? '1E3E62' : '2563EB';
  const docBorderColor = 'E2E8F0';
  const tableHeaderBg = '1E293B';
  const zebraBg = 'F8FAFC';

  const docChildren = [];

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: (data.category || 'EXECUTIVE BRIEFING').toUpperCase(),
          bold: true,
          size: 19,
          color: docThemeColor,
          font: 'Arial',
        }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: data.title || 'Executive Report',
          bold: true,
          size: 52,
          color: '0F172A',
          font: 'Arial',
        }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `${data.subtitle || 'Prepared for Strategy & Operations Review'}  •  ${new Date().toLocaleDateString()}`,
          italics: true,
          size: 21,
          color: '64748B',
          font: 'Arial',
        }),
      ],
    })
  );

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

  const sections = Array.isArray(data.sections) ? data.sections : [];
  for (const sec of sections) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({
            text: sec.title || 'Section',
            bold: true,
            size: 32,
            color: '0F172A',
            font: 'Arial',
          }),
        ],
      })
    );

    if (sec.content) {
      docChildren.push(
        new Paragraph({
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: sec.content,
              size: 22,
              color: '334155',
              font: 'Arial',
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

    if (sec.table && Array.isArray(sec.table.headers) && Array.isArray(sec.table.rows)) {
      const tableRows = [];

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
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await docx.Packer.toBuffer(doc);
}

/**
 * 3. Excel Workbook (.xlsx)
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

    const titleCell = ws.getCell(`A${currentRow}`);
    titleCell.value = (sheetInfo.title || data.title || 'FINANCIAL & OPERATIONAL MODEL').toUpperCase();
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    currentRow += 1;

    if (sheetInfo.subtitle || data.subtitle) {
      const subCell = ws.getCell(`A${currentRow}`);
      subCell.value = `${sheetInfo.subtitle || data.subtitle}  •  Generated by Grokki Office Studio`;
      subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
      currentRow += 2;
    } else {
      currentRow += 1;
    }

    const headers = sheetInfo.headers || ['Item', 'Category', 'Target Q1', 'Actual Q1', 'Variance', '% Achievement'];
    const headerRow = ws.getRow(currentRow);
    headerRow.values = headers;
    headerRow.height = 26;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      };
    });

    currentRow += 1;

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

    if (rows.length > 0) {
      const totalRow = ws.getRow(currentRow);
      const totalValues = ['Total'];

      for (let c = 2; c <= headers.length; c++) {
        const colLetter = String.fromCharCode(64 + c);
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
          bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        };
        if (typeof cell.value === 'object' && cell.value.formula) {
          cell.numFmt = '$#,##0';
          cell.alignment = { horizontal: 'right' };
        }
      });
    }

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
 * 5. Markdown Spec (.md)
 */
function generateMarkdown(data) {
  const lines = [];
  if (data.category) lines.push(`> **${data.category.toUpperCase()}**\n`);
  lines.push(`# ${data.title || 'Executive Specification'}`);
  if (data.subtitle) lines.push(`*${data.subtitle} — ${new Date().toLocaleDateString()}*\n`);
  lines.push('---\n');

  if (data.summary) {
    lines.push(`## Executive Summary\n\n> ${data.summary}\n`);
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
 * 6. LaTeX Academic Paper (.tex)
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
    '\\usepackage{hyperref}',
    '\\usepackage{parskip}',
    `\\title{\\textbf{${esc(data.title || 'Technical Research Paper')}}\\\\ \\large ${esc(data.subtitle || '')}}`,
    '\\author{Prepared via Grokki Office Studio}',
    '\\date{\\today}',
    '\\begin{document}',
    '\\maketitle',
  ];

  if (data.summary) {
    lines.push('\\begin{abstract}');
    lines.push(esc(data.summary));
    lines.push('\\end{abstract}');
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
 * 7. Standalone Executive HTML Report (.html) & PDF Source
 */
function generateHTMLString(data, themeKey = 'slate') {
  const theme = THEMES[themeKey] || THEMES.slate;
  const accentHex = `#${theme.primary}`;

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
<title>${data.title || 'Executive Report'}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    line-height: 1.65;
    max-width: 820px;
    margin: 40px auto;
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
    margin-bottom: 12px;
  }
  h1 {
    font-size: 32px;
    font-weight: 800;
    margin: 0 0 8px 0;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .subtitle {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 28px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 18px;
  }
  .summary {
    background: #f8fafc;
    border-left: 4px solid ${accentHex};
    padding: 16px 20px;
    border-radius: 0 8px 8px 0;
    margin-bottom: 28px;
    font-size: 14px;
    color: #334155;
  }
  .summary strong {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${accentHex};
    margin-bottom: 6px;
  }
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 28px;
    margin-bottom: 10px;
  }
  p, li {
    font-size: 14px;
    color: #334155;
  }
  ul {
    padding-left: 20px;
    margin-bottom: 18px;
  }
  li { margin-bottom: 6px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0 24px 0;
    font-size: 13px;
  }
  th {
    background: #1e293b;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 10px 14px;
  }
  td {
    padding: 10px 14px;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
  }
  tr:nth-child(even) td { background: #f8fafc; }
  footer {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="tag">${data.category || 'Executive Document'}</div>
  <h1>${data.title || 'Executive Briefing'}</h1>
  <div class="subtitle">${data.subtitle || 'Strategic Analysis & Operational Report'} • ${new Date().toLocaleDateString()}</div>
  ${data.summary ? `<div class="summary"><strong>Executive Summary</strong>${data.summary}</div>` : ''}
  ${sectionsHtml}
  <footer>
    <span>Generated by Grokki Office Studio</span>
    <span>Confidential</span>
  </footer>
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
        width: 800,
        height: 1100,
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
    console.warn('[OfficeGenerator] Electron printToPDF unavailable, falling back to HTML buffer:', e.message);
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
