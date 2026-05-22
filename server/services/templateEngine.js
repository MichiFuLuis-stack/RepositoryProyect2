/**
 * DocPlant 🌱 - Motor de Plantillas
 * 
 * Analiza plantillas, extrae estructura y mapea
 * contenido a la estructura detectada.
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { getFileExtension } = require('../utils/helpers');

/**
 * Analizar una plantilla y detectar su tipo y estructura
 * @param {string} filePath - Ruta al archivo de plantilla
 * @returns {Object} Análisis de la plantilla
 */
async function analyzeTemplate(filePath) {
  const ext = getFileExtension(filePath);

  const analysis = {
    type: 'unknown',
    extension: ext,
    fileName: path.basename(filePath),
    fileSize: 0,
    structure: null,
    placeholders: [],
    sections: [],
    metadata: {}
  };

  try {
    const stats = fs.statSync(filePath);
    analysis.fileSize = stats.size;

    switch (ext) {
      case '.docx':
      case '.doc':
        analysis.type = 'document';
        analysis.structure = await extractStructure(filePath);
        break;

      case '.jpg':
      case '.jpeg':
      case '.png':
        analysis.type = 'image';
        analysis.structure = await extractImageLayout(filePath);
        break;

      case '.pdf':
        analysis.type = 'pdf';
        analysis.structure = {
          type: 'pdf',
          note: 'Análisis de PDF limitado. Se usará estructura básica.',
          sections: [{ title: 'Contenido', placeholders: [] }]
        };
        break;

      default:
        analysis.type = 'unsupported';
        analysis.structure = {
          type: 'unsupported',
          note: `Tipo de archivo no soportado: ${ext}`
        };
    }

    // Extraer placeholders detectados
    if (analysis.structure && analysis.structure.placeholders) {
      analysis.placeholders = analysis.structure.placeholders;
    }

    if (analysis.structure && analysis.structure.sections) {
      analysis.sections = analysis.structure.sections;
    }

  } catch (error) {
    analysis.error = error.message;
  }

  return analysis;
}

/**
 * Extraer estructura detallada de un archivo DOCX
 * @param {string} docxPath - Ruta al archivo DOCX
 * @returns {Object} Estructura del documento
 */
async function extractStructure(docxPath) {
  const structure = {
    type: 'document',
    title: '',
    headings: [],
    sections: [],
    placeholders: [],
    paragraphCount: 0,
    wordCount: 0,
    hasImages: false,
    hasTables: false,
    hasLists: false,
    styles: []
  };

  try {
    // Convertir a HTML para analizar estructura
    const htmlResult = await mammoth.convertToHtml({ path: docxPath });
    const html = htmlResult.value;

    // Extraer texto plano
    const textResult = await mammoth.extractRawText({ path: docxPath });
    const rawText = textResult.value;

    // Contar palabras
    structure.wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;

    // Detectar elementos
    structure.hasImages = html.includes('<img');
    structure.hasTables = html.includes('<table');
    structure.hasLists = html.includes('<li') || html.includes('<ul') || html.includes('<ol');

    // Extraer headings
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      structure.headings.push({
        level: parseInt(match[1]),
        text: text
      });
    }

    // Título = primer heading
    if (structure.headings.length > 0) {
      structure.title = structure.headings[0].text;
    }

    // Detectar placeholders (patrones como {{nombre}}, [NOMBRE], %nombre%)
    const placeholderPatterns = [
      /\{\{(\w+)\}\}/g,           // {{placeholder}}
      /\[([A-Z_]+)\]/g,          // [PLACEHOLDER]
      /%(\w+)%/g,                 // %placeholder%
      /\$\{(\w+)\}/g,            // ${placeholder}
      /<(\w+)>/g                  // <placeholder>
    ];

    const foundPlaceholders = new Set();
    for (const pattern of placeholderPatterns) {
      let placeholderMatch;
      while ((placeholderMatch = pattern.exec(rawText)) !== null) {
        foundPlaceholders.add(placeholderMatch[1]);
      }
    }
    structure.placeholders = Array.from(foundPlaceholders);

    // Construir secciones
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    let currentSection = { title: structure.title || 'Inicio', content: [], placeholders: [] };

    for (const line of lines) {
      const trimmed = line.trim();
      const isHeading = structure.headings.some(h => h.text === trimmed);

      if (isHeading && trimmed !== currentSection.title) {
        if (currentSection.content.length > 0 || currentSection.title) {
          structure.sections.push({ ...currentSection });
        }
        currentSection = { title: trimmed, content: [], placeholders: [] };
      } else {
        currentSection.content.push(trimmed);

        // Buscar placeholders en esta línea
        for (const pattern of placeholderPatterns) {
          pattern.lastIndex = 0;
          let m;
          while ((m = pattern.exec(trimmed)) !== null) {
            if (!currentSection.placeholders.includes(m[1])) {
              currentSection.placeholders.push(m[1]);
            }
          }
        }
      }
    }

    // Agregar última sección
    if (currentSection.content.length > 0 || currentSection.title) {
      structure.sections.push(currentSection);
    }

    structure.paragraphCount = lines.length;

  } catch (error) {
    console.error('Error extrayendo estructura DOCX:', error.message);
    structure.error = error.message;
  }

  return structure;
}

/**
 * Analizar layout de una imagen de plantilla
 * @param {string} imagePath - Ruta a la imagen
 * @returns {Object} Análisis del layout
 */
async function extractImageLayout(imagePath) {
  const layout = {
    type: 'image',
    width: 0,
    height: 0,
    orientation: 'portrait',
    format: '',
    colorSpace: '',
    dpi: 0,
    regions: [],
    suggestedSections: []
  };

  try {
    const sharp = require('sharp');
    const metadata = await sharp(imagePath).metadata();

    layout.width = metadata.width;
    layout.height = metadata.height;
    layout.format = metadata.format;
    layout.colorSpace = metadata.space || 'unknown';
    layout.dpi = metadata.density || 72;
    layout.orientation = metadata.width > metadata.height ? 'landscape' : 'portrait';

    // Análisis básico de regiones (dividir en zonas)
    const regions = [];
    const numRegions = layout.orientation === 'portrait' ? 3 : 2;

    for (let i = 0; i < numRegions; i++) {
      const regionHeight = Math.floor(metadata.height / numRegions);
      const y = i * regionHeight;

      // Extraer una muestra de la región para analizar
      try {
        const regionBuffer = await sharp(imagePath)
          .extract({
            left: 0,
            top: y,
            width: metadata.width,
            height: regionHeight
          })
          .stats();

        regions.push({
          index: i,
          y: y,
          height: regionHeight,
          dominantColor: regionBuffer.dominant ? 
            `rgb(${regionBuffer.dominant.r},${regionBuffer.dominant.g},${regionBuffer.dominant.b})` : 
            'unknown',
          isLight: regionBuffer.dominant ? 
            (regionBuffer.dominant.r + regionBuffer.dominant.g + regionBuffer.dominant.b) / 3 > 128 : 
            true
        });
      } catch (regionErr) {
        regions.push({
          index: i,
          y: y,
          height: regionHeight,
          dominantColor: 'unknown',
          isLight: true
        });
      }
    }

    layout.regions = regions;

    // Sugerir secciones basadas en el layout
    if (layout.orientation === 'portrait') {
      layout.suggestedSections = [
        { name: 'Encabezado', position: 'top' },
        { name: 'Contenido Principal', position: 'middle' },
        { name: 'Pie de Página', position: 'bottom' }
      ];
    } else {
      layout.suggestedSections = [
        { name: 'Contenido Izquierdo', position: 'left' },
        { name: 'Contenido Derecho', position: 'right' }
      ];
    }

  } catch (error) {
    console.error('Error analizando imagen:', error.message);
    layout.error = error.message;
    layout.suggestedSections = [
      { name: 'Contenido', position: 'full' }
    ];
  }

  return layout;
}

/**
 * Mapear contenido a la estructura de una plantilla
 * @param {Object} structure - Estructura de la plantilla
 * @param {Object} content - Contenido a mapear
 * @returns {Object} Contenido mapeado a la estructura
 */
function mapContentToTemplate(structure, content) {
  const mapped = {
    title: structure.title || 'Documento',
    sections: [],
    unmappedContent: []
  };

  if (!structure.sections || structure.sections.length === 0) {
    // Sin estructura, crear una sección con todo el contenido
    mapped.sections.push({
      title: mapped.title,
      content: content.sections ? 
        content.sections.flatMap(s => s.paragraphs || s.content || []) :
        [content.fullText || '']
    });
    return mapped;
  }

  // Intentar mapear contenido a cada sección de la plantilla
  const contentSections = content.sections || [];

  for (let i = 0; i < structure.sections.length; i++) {
    const templateSection = structure.sections[i];
    const contentSection = contentSections[i];

    const mappedSection = {
      title: templateSection.title || `Sección ${i + 1}`,
      content: [],
      placeholders: templateSection.placeholders || []
    };

    if (contentSection) {
      // Hay contenido correspondiente
      mappedSection.content = contentSection.paragraphs || contentSection.content || [];

      // Reemplazar placeholders si existen
      if (mappedSection.placeholders.length > 0 && content.rawData) {
        mappedSection.content = mappedSection.content.map(text => {
          let result = text;
          for (const placeholder of mappedSection.placeholders) {
            const value = content.rawData[placeholder] || 
                         content.rawData[placeholder.toLowerCase()] ||
                         '';
            if (value) {
              result = result
                .replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), value)
                .replace(new RegExp(`\\[${placeholder}\\]`, 'g'), value)
                .replace(new RegExp(`%${placeholder}%`, 'g'), value)
                .replace(new RegExp(`\\$\\{${placeholder}\\}`, 'g'), value);
            }
          }
          return result;
        });
      }
    } else if (templateSection.content && templateSection.content.length > 0) {
      // Usar el contenido original de la plantilla
      mappedSection.content = templateSection.content;
    }

    mapped.sections.push(mappedSection);
  }

  // Contenido sobrante que no se mapeó
  if (contentSections.length > structure.sections.length) {
    for (let i = structure.sections.length; i < contentSections.length; i++) {
      mapped.unmappedContent.push({
        title: contentSections[i].title || `Contenido adicional ${i + 1}`,
        content: contentSections[i].paragraphs || contentSections[i].content || []
      });
    }
  }

  return mapped;
}

module.exports = {
  analyzeTemplate,
  extractStructure,
  extractImageLayout,
  mapContentToTemplate
};
