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
    this.zip = await JSZip.loadAsync(file);
    await this.extractSlideTexts();
    
    const placeholders = this.extractPlaceholders();
    
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
    
    this.slideTexts.forEach((slideContent, index) => {
      // Extract text placeholders like {{title}}, {{subtitle}}
      const textMatches = slideContent.match(/\{\{([^}]+)\}\}/g) || [];
      textMatches.forEach((match, matchIndex) => {
        const key = match.replace(/[{}]/g, '');
        if (!key.startsWith('image:')) {
          placeholders.push({
            id: `text-${index}-${matchIndex}`,
            key,
            type: 'text',
            slideIndex: index,
            status: 'empty',
            slideTitle: `Slide ${index + 1}`
          });
        }
      });

      // Extract image placeholders like {{image:hero}}
      const imageMatches = slideContent.match(/\{\{image:([^}]+)\}\}/g) || [];
      imageMatches.forEach((match, matchIndex) => {
        const key = match.replace(/[{}]/g, '');
        placeholders.push({
          id: `image-${index}-${matchIndex}`,
          key,
          type: 'image',
          slideIndex: index,
          status: 'empty',
          slideTitle: `Slide ${index + 1}`
        });
      });
    });

    return placeholders;
  }
}

export const pptxParser = new PPTXParser();