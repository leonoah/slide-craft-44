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
    console.log('PPTXParser: Starting placeholder extraction from', this.slideTexts.length, 'slides');
    
    this.slideTexts.forEach((slideContent, index) => {
      console.log(`PPTXParser: Processing slide ${index + 1}, content length:`, slideContent.length);
      
      // Extract text placeholders like {{title}}, {{subtitle}}
      const textMatches = slideContent.match(/\{\{([^}]+)\}\}/g) || [];
      console.log(`PPTXParser: Found ${textMatches.length} text placeholders in slide ${index + 1}:`, textMatches);
      
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
      console.log(`PPTXParser: Found ${imageMatches.length} image placeholders in slide ${index + 1}:`, imageMatches);
      
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

    console.log('PPTXParser: Total placeholders found:', placeholders.length);
    return placeholders;
  }
}

export const pptxParser = new PPTXParser();