import JSZip from 'jszip';

export interface Placeholder {
  id: string;
  key: string;
  type: 'text' | 'image';
  slideIndex: number;
  value?: string;
  status: 'empty' | 'filled';
  slideTitle?: string;
}

export interface PPTXData {
  filename: string;
  slideCount: number;
  placeholders: Placeholder[];
}

export class PPTXParser {
  private zip: JSZip | null = null;
  private slideTexts: string[] = [];

  async parseFile(file: File): Promise<PPTXData> {
    console.log('PPTXParser: Starting to parse file:', file.name);
    this.zip = await JSZip.loadAsync(file);
    console.log('PPTXParser: ZIP loaded successfully');
    
    await this.extractSlideTexts();
    console.log('PPTXParser: Slide texts extracted:', this.slideTexts.length, 'slides');
    
    const placeholders = this.extractPlaceholders();
    console.log('PPTXParser: Placeholders extracted:', placeholders);
    
    return {
      filename: file.name,
      slideCount: this.slideTexts.length,
      placeholders
    };
  }

  private async extractSlideTexts(): Promise<void> {
    this.slideTexts = [];
    
    // Get all slide files
    const slideFiles = Object.keys(this.zip!.files)
      .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
        const bNum = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
        return aNum - bNum;
      });

    for (const slideFile of slideFiles) {
      const content = await this.zip!.file(slideFile)?.async('text') || '';
      this.slideTexts.push(content);
    }
  }

  private extractPlaceholders(): Placeholder[] {
    const placeholders: Placeholder[] = [];
    const seen = new Set<string>();
    console.log('PPTXParser: Starting placeholder extraction from', this.slideTexts.length, 'slides');

    const pushUnique = (slideIndex: number, key: string) => {
      const type: 'text' | 'image' = key.startsWith('image:') ? 'image' : 'text';
      const signature = `${slideIndex}-${type}-${key}`;
      if (seen.has(signature)) return;
      seen.add(signature);
      placeholders.push({
        id: `${type}-${slideIndex}-${placeholders.length}`,
        key,
        type,
        slideIndex,
        status: 'empty',
        slideTitle: `Slide ${slideIndex + 1}`,
      });
    };

    this.slideTexts.forEach((slideContent, index) => {
      console.log(`PPTXParser: Processing slide ${index + 1}, content length:`, slideContent.length);

      // Parse XML DOM to inspect text nodes and shape metadata (name/descr)
      let doc: Document | null = null;
      try {
        doc = new DOMParser().parseFromString(slideContent, 'application/xml');
      } catch (e) {
        console.warn('PPTXParser: Failed to parse XML for slide', index + 1, e);
      }

      // 1) Text runs like <a:t>...{{title}}...</a:t>
      if (doc) {
        const allTextNodes = Array.from(doc.getElementsByTagName('*')).filter(el => el.localName === 't');
        const textContent = allTextNodes.map(el => el.textContent || '').join(' ');
        const textMatches = textContent.match(/\{\{([^}]+)\}\}/g) || [];
        console.log(`PPTXParser: [a:t] found ${textMatches.length} placeholders in slide ${index + 1}:`, textMatches);
        textMatches.forEach(m => pushUnique(index, m.replace(/[{}]/g, '')));

        // 2) Shape and picture metadata: <p:cNvPr name="..." descr="...">
        const allEls = Array.from(doc.getElementsByTagName('*')) as Element[];
        const cNvPrEls = allEls.filter(el => el.localName === 'cNvPr');
        cNvPrEls.forEach((el) => {
          const nameAttr = el.getAttribute('name') || '';
          const descrAttr = el.getAttribute('descr') || '';
          const combined = [nameAttr, descrAttr].join(' ');
          const matches = combined.match(/\{\{([^}]+)\}\}/g) || [];
          if (matches.length) {
            console.log(`PPTXParser: [cNvPr] found ${matches.length} placeholders in slide ${index + 1}:`, matches);
          }
          matches.forEach(m => pushUnique(index, m.replace(/[{}]/g, '')));
        });
      } else {
        // Fallback: regex over raw XML
        const rawMatches = slideContent.match(/\{\{([^}]+)\}\}/g) || [];
        console.log(`PPTXParser: [raw] found ${rawMatches.length} placeholders in slide ${index + 1}`);
        rawMatches.forEach(m => pushUnique(index, m.replace(/[{}]/g, '')));
      }
    });

    console.log('PPTXParser: Total placeholders found:', placeholders.length);
    return placeholders;
  }
}

export const pptxParser = new PPTXParser();