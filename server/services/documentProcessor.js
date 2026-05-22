/**
 * DocPlant 🌱 - Procesador de Documentos
 * 
 * Motor principal de generación de documentos.
 * Lee plantillas (DOCX o imágenes), extrae contenido,
 * y genera nuevos documentos Word.
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, 
        AlignmentType, Tab, TabStopPosition, TabStopType,
        BorderStyle, ImageRun, Table, TableRow, TableCell,
        WidthType, ShadingType, PageBreak } = require('docx');
const config = require('../config/config');
const { generateUniqueFilename, getFileExtension, sanitizeFilename } = require('../utils/helpers');

/**
 * Procesar documento: combinar plantilla con contenido
 * @param {string} templateFilePath - Ruta al archivo de plantilla
 * @param {string} contentFilePath - Ruta al archivo de contenido
 * @param {string} outputFormat - Formato de salida ('docx' o 'pdf')
 * @returns {Object} { success, filePath, fileName, fileSize, format }
 */
async function processDocument(templateFilePath, contentFilePath, outputFormat = 'docx') {
  try {
    // Verificar que los archivos existen
    if (!fs.existsSync(templateFilePath)) {
      throw new Error(`Archivo de plantilla no encontrado: ${templateFilePath}`);
    }
    if (!fs.existsSync(contentFilePath)) {
      throw new Error(`Archivo de contenido no encontrado: ${contentFilePath}`);
    }

    // Leer la plantilla
    const templateExt = getFileExtension(templateFilePath);
    let templateStructure;

    if (['.jpg', '.jpeg', '.png'].includes(templateExt)) {
      // Plantilla es una imagen - extraer concepto de diseño
      templateStructure = await analyzeImageTemplate(templateFilePath);
    } else if (['.docx', '.doc'].includes(templateExt)) {
      // Plantilla es un documento Word - extraer estructura
      templateStructure = await analyzeDocxTemplate(templateFilePath);
    } else if (templateExt === '.pdf') {
      // Plantilla PDF - usar estructura básica
      templateStructure = getDefaultStructure('Documento basado en PDF');
    } else {
      templateStructure = getDefaultStructure('Documento generado');
    }

    // Leer el contenido
    const contentExt = getFileExtension(contentFilePath);
    let content;

    if (contentExt === '.txt') {
      content = readTextContent(contentFilePath);
    } else if (contentExt === '.json') {
      content = readJsonContent(contentFilePath);
    } else if (['.docx', '.doc'].includes(contentExt)) {
      content = await readDocxContent(contentFilePath);
    } else {
      content = readTextContent(contentFilePath);
    }

    // Generar el documento Word
    const outputFileName = generateUniqueFilename('documento_generado.docx');
    const outputPath = path.join(config.generatedPath, outputFileName);

    // Asegurar que existe el directorio de salida
    if (!fs.existsSync(config.generatedPath)) {
      fs.mkdirSync(config.generatedPath, { recursive: true });
    }

    // Crear el documento con la estructura de la plantilla y el contenido
    const doc = buildDocument(templateStructure, content);

    // Generar el buffer del documento
    const buffer = await Packer.toBuffer(doc);

    // Guardar el archivo
    fs.writeFileSync(outputPath, buffer);

    const stats = fs.statSync(outputPath);

    return {
      success: true,
      filePath: outputPath,
      fileName: outputFileName,
      fileSize: stats.size,
      format: 'docx',
      message: 'Documento generado exitosamente'
    };
  } catch (error) {
    console.error('Error procesando documento:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Analizar plantilla DOCX y extraer estructura
 * @param {string} filePath - Ruta al archivo DOCX
 * @returns {Object} Estructura extraída
 */
async function analyzeDocxTemplate(filePath) {
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = result.value;
    const messages = result.messages;

    // Extraer texto plano también
    const textResult = await mammoth.extractRawText({ path: filePath });
    const rawText = textResult.value;

    // Analizar la estructura del HTML para detectar elementos
    const structure = {
      type: 'docx',
      title: '',
      sections: [],
      headings: [],
      paragraphs: [],
      hasImages: html.includes('<img'),
      hasTables: html.includes('<table'),
      hasLists: html.includes('<li'),
      rawText: rawText,
      htmlPreview: html
    };

    // Extraer encabezados
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      structure.headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, '').trim()
      });
    }

    // Usar el primer heading como título
    if (structure.headings.length > 0) {
      structure.title = structure.headings[0].text;
    }

    // Extraer párrafos
    const paraRegex = /<p[^>]*>(.*?)<\/p>/gi;
    while ((match = paraRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      if (text.length > 0) {
        structure.paragraphs.push(text);
      }
    }

    // Crear secciones basadas en headings
    let currentSection = { title: 'Introducción', content: [] };
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);

    for (const line of lines) {
      const isHeading = structure.headings.some(h => h.text === line.trim());
      if (isHeading) {
        if (currentSection.content.length > 0 || currentSection.title) {
          structure.sections.push({ ...currentSection });
        }
        currentSection = { title: line.trim(), content: [] };
      } else {
        currentSection.content.push(line.trim());
      }
    }

    if (currentSection.content.length > 0 || currentSection.title) {
      structure.sections.push(currentSection);
    }

    return structure;
  } catch (error) {
    console.error('Error analizando plantilla DOCX:', error.message);
    return getDefaultStructure('Documento');
  }
}

/**
 * Analizar plantilla de imagen y crear estructura básica
 * @param {string} filePath - Ruta a la imagen
 * @returns {Object} Estructura basada en análisis de imagen
 */
async function analyzeImageTemplate(filePath) {
  try {
    const sharp = require('sharp');
    const metadata = await sharp(filePath).metadata();

    // Determinar orientación y tipo de documento
    const isLandscape = metadata.width > metadata.height;
    const isLetter = Math.abs(metadata.width / metadata.height - 8.5 / 11) < 0.1;

    return {
      type: 'image',
      title: 'Documento basado en imagen',
      imageWidth: metadata.width,
      imageHeight: metadata.height,
      isLandscape,
      format: metadata.format,
      sections: [
        { title: 'Contenido del Documento', content: [] }
      ],
      headings: [
        { level: 1, text: 'Documento Generado' }
      ],
      paragraphs: [],
      hasImages: true,
      sourceImagePath: filePath
    };
  } catch (error) {
    console.error('Error analizando imagen:', error.message);
    return {
      type: 'image',
      title: 'Documento basado en imagen',
      sections: [{ title: 'Contenido', content: [] }],
      headings: [{ level: 1, text: 'Documento Generado' }],
      paragraphs: []
    };
  }
}

/**
 * Obtener estructura por defecto para documentos
 * @param {string} title - Título del documento
 * @returns {Object} Estructura por defecto
 */
function getDefaultStructure(title) {
  return {
    type: 'default',
    title: title,
    sections: [
      { title: title, content: [] }
    ],
    headings: [
      { level: 1, text: title }
    ],
    paragraphs: []
  };
}

/**
 * Leer contenido de archivo de texto
 * @param {string} filePath - Ruta al archivo
 * @returns {Object} Contenido estructurado
 */
function readTextContent(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  // Intentar detectar estructura en el texto
  const sections = [];
  let currentSection = { title: '', paragraphs: [] };

  for (const line of lines) {
    const trimmed = line.trim();

    // Detectar posibles títulos (líneas cortas en mayúsculas o con #)
    if (trimmed.startsWith('#')) {
      if (currentSection.paragraphs.length > 0 || currentSection.title) {
        sections.push({ ...currentSection });
      }
      currentSection = {
        title: trimmed.replace(/^#+\s*/, ''),
        paragraphs: []
      };
    } else if (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
      if (currentSection.paragraphs.length > 0 || currentSection.title) {
        sections.push({ ...currentSection });
      }
      currentSection = {
        title: trimmed,
        paragraphs: []
      };
    } else {
      currentSection.paragraphs.push(trimmed);
    }
  }

  if (currentSection.paragraphs.length > 0 || currentSection.title) {
    sections.push(currentSection);
  }

  // Si no se detectaron secciones, crear una por defecto
  if (sections.length === 0) {
    sections.push({
      title: '',
      paragraphs: lines
    });
  }

  return {
    type: 'text',
    fullText: text,
    sections,
    lineCount: lines.length
  };
}

/**
 * Leer contenido de archivo JSON
 * @param {string} filePath - Ruta al archivo JSON
 * @returns {Object} Contenido estructurado
 */
function readJsonContent(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  // Convertir JSON a secciones
  const sections = [];

  if (typeof data === 'object' && !Array.isArray(data)) {
    // Objeto: cada clave de primer nivel es una sección
    for (const [key, value] of Object.entries(data)) {
      const section = {
        title: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        paragraphs: []
      };

      if (typeof value === 'string') {
        section.paragraphs.push(value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') {
            section.paragraphs.push(item);
          } else if (typeof item === 'object') {
            section.paragraphs.push(JSON.stringify(item, null, 2));
          }
        }
      } else if (typeof value === 'object') {
        for (const [subKey, subValue] of Object.entries(value)) {
          section.paragraphs.push(`${subKey}: ${typeof subValue === 'object' ? JSON.stringify(subValue) : subValue}`);
        }
      }

      sections.push(section);
    }
  } else if (Array.isArray(data)) {
    sections.push({
      title: 'Contenido',
      paragraphs: data.map(item =>
        typeof item === 'string' ? item : JSON.stringify(item, null, 2)
      )
    });
  }

  return {
    type: 'json',
    rawData: data,
    sections,
    fullText: JSON.stringify(data, null, 2)
  };
}

/**
 * Leer contenido de archivo DOCX
 * @param {string} filePath - Ruta al archivo DOCX
 * @returns {Object} Contenido estructurado
 */
async function readDocxContent(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  return {
    type: 'docx',
    fullText: text,
    sections: [{
      title: '',
      paragraphs: lines
    }],
    lineCount: lines.length
  };
}

/**
 * Construir el documento Word final
 * @param {Object} templateStructure - Estructura de la plantilla
 * @param {Object} content - Contenido a insertar
 * @returns {Document} Documento docx
 */
function buildDocument(templateStructure, content) {
  const children = [];

  // Título del documento
  const title = templateStructure.title || 'Documento Generado';
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48, // 24pt
          color: '0D9668',
          font: 'Calibri'
        })
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  // Línea decorativa
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          color: '10B981',
          size: 20
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  );

  // Subtítulo con fecha
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generado por DocPlant 🌱 — ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          italics: true,
          size: 20,
          color: '666666',
          font: 'Calibri'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    })
  );

  // Insertar contenido según la estructura de la plantilla
  if (templateStructure.sections && templateStructure.sections.length > 0) {
    // Usar la estructura de la plantilla como guía
    for (let i = 0; i < templateStructure.sections.length; i++) {
      const templateSection = templateStructure.sections[i];

      // Título de sección
      if (templateSection.title) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: templateSection.title,
                bold: true,
                size: 32, // 16pt
                color: '1A1A1A',
                font: 'Calibri'
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: {
              bottom: {
                color: '10B981',
                space: 4,
                size: 6,
                style: BorderStyle.SINGLE
              }
            }
          })
        );
      }

      // Insertar contenido correspondiente
      const contentSection = content.sections && content.sections[i]
        ? content.sections[i]
        : (content.sections && content.sections[0] ? content.sections[0] : null);

      if (contentSection) {
        // Subtítulo de contenido si existe
        if (contentSection.title && contentSection.title !== templateSection.title) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: contentSection.title,
                  bold: true,
                  size: 26,
                  color: '333333',
                  font: 'Calibri'
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 150 }
            })
          );
        }

        // Párrafos de contenido
        if (contentSection.paragraphs) {
          for (const para of contentSection.paragraphs) {
            // Detectar si es una lista (empieza con -, *, •, número)
            if (/^[\-\*•]\s/.test(para)) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `  •  ${para.replace(/^[\-\*•]\s*/, '')}`,
                      size: 22,
                      font: 'Calibri'
                    })
                  ],
                  spacing: { after: 80 },
                  indent: { left: 720 }
                })
              );
            } else if (/^\d+[\.\)]\s/.test(para)) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `  ${para}`,
                      size: 22,
                      font: 'Calibri'
                    })
                  ],
                  spacing: { after: 80 },
                  indent: { left: 720 }
                })
              );
            } else {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: para,
                      size: 22,
                      font: 'Calibri'
                    })
                  ],
                  spacing: { after: 150 }
                })
              );
            }
          }
        }
      }

      // Insertar contenido original de la plantilla si no hay contenido correspondiente
      if (!contentSection && templateSection.content && templateSection.content.length > 0) {
        for (const line of templateSection.content) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 22,
                  font: 'Calibri'
                })
              ],
              spacing: { after: 150 }
            })
          );
        }
      }
    }
  } else {
    // Sin estructura de plantilla, volcar todo el contenido
    if (content.sections) {
      for (const section of content.sections) {
        if (section.title) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: section.title,
                  bold: true,
                  size: 28,
                  font: 'Calibri'
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 }
            })
          );
        }

        if (section.paragraphs) {
          for (const para of section.paragraphs) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: para,
                    size: 22,
                    font: 'Calibri'
                  })
                ],
                spacing: { after: 150 }
              })
            );
          }
        }
      }
    }
  }

  // Si la plantilla es una imagen, incluir referencia
  if (templateStructure.type === 'image' && templateStructure.sourceImagePath) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '',
            size: 22
          })
        ],
        spacing: { before: 400 }
      })
    );

    try {
      const imageBuffer = fs.readFileSync(templateStructure.sourceImagePath);
      const imageWidth = templateStructure.imageWidth || 600;
      const imageHeight = templateStructure.imageHeight || 400;

      // Escalar la imagen para que quepa en el documento
      const maxWidth = 550; // ~14.5cm en puntos aprox
      const scale = Math.min(1, maxWidth / imageWidth);

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: Math.round(imageWidth * scale),
                height: Math.round(imageHeight * scale)
              },
              type: templateStructure.format === 'png' ? 'png' : 'jpg'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 }
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Imagen de referencia (plantilla original)',
              italics: true,
              size: 18,
              color: '888888'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    } catch (imgError) {
      console.warn('No se pudo incluir la imagen de plantilla:', imgError.message);
    }
  }

  // Pie de documento
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '' })
      ],
      spacing: { before: 600 }
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          color: '10B981',
          size: 20
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Documento generado con DocPlant 🌱 — docplant.com',
          italics: true,
          size: 18,
          color: '999999',
          font: 'Calibri'
        })
      ],
      alignment: AlignmentType.CENTER
    })
  );

  // Crear el documento final
  const doc = new Document({
    creator: 'DocPlant',
    title: title,
    description: 'Documento generado por DocPlant - Plataforma de Transformación de Documentos',
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 pulgada
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: children
    }]
  });

  return doc;
}

/**
 * Generar vista previa HTML del documento
 * @param {string} filePath - Ruta al archivo DOCX generado
 * @returns {string} HTML de la vista previa
 */
async function generatePreview(filePath) {
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    
    // Envolver en un HTML con estilos
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vista Previa - DocPlant</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 40px;
            background: #f8f9fa;
            color: #333;
            line-height: 1.6;
          }
          .preview-container {
            background: white;
            padding: 60px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #0D9668; border-bottom: 2px solid #10B981; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; }
          h3 { color: #555; }
          p { margin-bottom: 12px; }
          img { max-width: 100%; height: auto; border-radius: 4px; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
          th { background: #f0f0f0; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="preview-container">
          ${result.value}
          <div class="footer">
            Vista previa generada por DocPlant 🌱
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  } catch (error) {
    throw new Error(`Error generando vista previa: ${error.message}`);
  }
}

module.exports = {
  processDocument,
  analyzeDocxTemplate,
  analyzeImageTemplate,
  generatePreview,
  readTextContent,
  readJsonContent,
  readDocxContent,
  buildDocument
};
