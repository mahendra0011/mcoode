import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Generate a styled PDF report for stakeholders / due-diligence.
 *
 * @param {object} auditResult - Output from runAudit()
 * @param {string} outputPath - Path to write the PDF file
 * @returns {Promise<string>}
 */
export async function generateAuditPDF(auditResult, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', (err) => reject(err));

    doc.pipe(stream);

    // Title & Header
    doc.fontSize(26).fillColor('#111827').text('mcode Audit Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#6B7280').text(`Generated: ${new Date().toLocaleDateString()} · Read-Only Health Assessment`, { align: 'center' });
    doc.moveDown(1);

    // Overall Grade Banner
    const grade = auditResult.overallGrade || 'B';
    const gradeColor = grade.startsWith('A') ? '#10B981' : grade.startsWith('B') ? '#3B82F6' : grade.startsWith('C') ? '#F59E0B' : '#EF4444';

    doc.rect(50, doc.y, 495, 60).fillAndStroke('#F9FAFB', '#E5E7EB');
    doc.fillColor(gradeColor).fontSize(28).text(`Overall Grade: ${grade}`, 70, doc.y - 45, { align: 'left' });
    doc.fillColor('#4B5563').fontSize(11).text('Zero-modification assessment across 5 core health categories.', 70, doc.y + 5);
    doc.moveDown(3);

    // Category Breakdowns
    for (const [category, catGrade] of Object.entries(auditResult.grades || {})) {
      const catTitle = category.charAt(0).toUpperCase() + category.slice(1);
      const catColor = catGrade.startsWith('A') ? '#059669' : catGrade.startsWith('B') ? '#2563EB' : catGrade.startsWith('C') ? '#D97706' : '#DC2626';

      doc.fontSize(15).fillColor('#1F2937').text(`${catTitle} `, { continued: true });
      doc.fillColor(catColor).fontSize(15).text(`[Grade: ${catGrade}]`);
      doc.fontSize(10).fillColor('#4B5563');

      const findings = auditResult.results?.[category]?.findings || [];
      if (findings.length === 0) {
        doc.text('  ✓ No issues detected in this category.');
      } else {
        for (const finding of findings.slice(0, 10)) {
          const sev = String(finding.severity || 'info').toUpperCase();
          doc.text(`  • [${sev}] ${finding.msg || finding.label || 'Issue found'}`);
        }
        if (findings.length > 10) {
          doc.text(`  ... and ${findings.length - 10} more finding${findings.length - 10 !== 1 ? 's' : ''}`);
        }
      }
      doc.moveDown(1);
    }

    // Disclaimer footer
    doc.moveDown(1);
    doc.fontSize(9).fillColor('#9CA3AF').text(
      'This was an automated, read-only scan — zero project files were modified. To apply remediation for security and bug findings, use "mcode security-check" or "mcode bugcheck".',
      { align: 'center' }
    );

    doc.end();
  });
}
