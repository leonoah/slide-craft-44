import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ArrowLeft, Grid3X3, List, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePPTXStore } from "@/store/pptx-store";
import JSZip from "jszip";
import jsPDF from "jspdf";

const Preview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isExporting, setIsExporting] = useState(false);
  const { currentFile, updates, originalArrayBuffer } = usePPTXStore();

  if (!currentFile) {
    navigate('/');
    return null;
  }

  const filledCount = currentFile.placeholders.filter(p => updates[p.id]?.value).length;

  const handleExportPPTX = async () => {
    setIsExporting(true);
    try {
      if (!originalArrayBuffer) {
        toast({
          title: "Original file not available",
          description: "Please re-upload your PPTX so we can fill placeholders in the original design.",
          variant: "destructive",
        });
        return;
      }

      const zip = await JSZip.loadAsync(originalArrayBuffer);

      // Find slide files in correct order
      const slideFiles = Object.keys(zip.files)
        .filter((name) => /ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
          const aNum = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
          const bNum = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
          return aNum - bNum;
        });

      // Build replacement maps from updates
      const textMap = new Map<string, string>();
      const imageMap = new Map<string, string>();
      currentFile.placeholders.forEach((p) => {
        const update = updates[p.id]?.value;
        if (!update) return;
        if (p.type === 'text') {
          textMap.set(p.key, update);
          const trimmedKey = p.key.trim();
          if (trimmedKey && trimmedKey !== p.key) {
            textMap.set(trimmedKey, update);
          }
        }
        if (p.type === 'image' && update.startsWith('data:image')) imageMap.set(p.key, update);
      });

      const dataURLToUint8Array = (dataUrl: string): Uint8Array => {
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      };

      const normalizeMediaPath = (slidePath: string, target: string): string => {
        // slidePath: ppt/slides/slideN.xml
        if (target.startsWith('../')) {
          return 'ppt/' + target.replace(/^\.\.\//, '');
        }
        if (target.startsWith('media/')) {
          return 'ppt/' + target;
        }
        if (target.startsWith('/ppt/')) {
          return target.replace(/^\//, '');
        }
        // Fallback to relative to slides folder
        const base = 'ppt/slides/';
        return base + target;
      };

      for (let i = 0; i < slideFiles.length; i++) {
        const slidePath = slideFiles[i];
        const xmlText = await zip.file(slidePath)!.async('text');

        const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

        const replaceTextPlaceholders = () => {
          if (textMap.size === 0) return;

          const allEls = Array.from(doc.getElementsByTagName('*')) as Element[];
          const textNodes = allEls.filter((el) => el.localName === 't');
          if (textNodes.length === 0) return;

          type TextRun = {
            node: Element;
            text: string;
            start: number;
            end: number;
          };

          const runs: TextRun[] = textNodes.map((node) => ({
            node,
            text: node.textContent || '',
            start: 0,
            end: 0,
          }));

          let cursor = 0;
          runs.forEach((run) => {
            run.start = cursor;
            cursor += run.text.length;
            run.end = cursor;
          });

          const replaceToken = (token: string, replacement: string) => {
            if (!token) return;

            let combined = runs.map((run) => run.text).join('');
            if (!combined.includes(token)) return;

            let searchIndex = 0;
            while (searchIndex <= combined.length) {
              const matchIndex = combined.indexOf(token, searchIndex);
              if (matchIndex === -1) break;
              const matchEnd = matchIndex + token.length;

              const startRunIndex = runs.findIndex((run) => run.end > matchIndex);
              if (startRunIndex === -1) break;

              let endRunIndex = startRunIndex;
              while (endRunIndex < runs.length && runs[endRunIndex].start < matchEnd) {
                endRunIndex++;
              }
              endRunIndex--;
              if (endRunIndex < startRunIndex) {
                searchIndex = matchEnd;
                continue;
              }

              const startRun = runs[startRunIndex];
              const endRun = runs[endRunIndex];

              const prefix = startRun.text.slice(0, matchIndex - startRun.start);
              const suffix = endRun.text.slice(matchEnd - endRun.start);

              startRun.text = `${prefix}${replacement}${suffix}`;
              startRun.node.textContent = startRun.text;

              for (let idx = startRunIndex + 1; idx <= endRunIndex; idx++) {
                runs[idx].text = '';
                runs[idx].node.textContent = '';
              }

              startRun.end = startRun.start + startRun.text.length;
              let prevEnd = startRun.end;
              for (let idx = startRunIndex + 1; idx < runs.length; idx++) {
                runs[idx].start = prevEnd;
                prevEnd += runs[idx].text.length;
                runs[idx].end = prevEnd;
              }

              combined = runs.map((run) => run.text).join('');
              searchIndex = matchIndex + replacement.length;
            }
          };

          textMap.forEach((val, key) => {
            const token = `{{${key}}}`;
            replaceToken(token, val);
          });
        };

        replaceTextPlaceholders();

        // Replace image content for picture shapes matching {{image:*}} keys
        if (imageMap.size > 0) {
          const allEls = Array.from(doc.getElementsByTagName('*')) as Element[];
          const cNvPrEls = allEls.filter((el) => el.localName === 'cNvPr');

          for (const cNvPr of cNvPrEls) {
            const nameAttr = cNvPr.getAttribute('name') || '';
            const descrAttr = cNvPr.getAttribute('descr') || '';
            const combined = `${nameAttr} ${descrAttr}`;

            // Find which image key this shape corresponds to
            let matchedKey: string | null = null;
            for (const key of imageMap.keys()) {
              const token = `{{${key}}}`;
              if (combined.includes(token)) {
                matchedKey = key;
                break;
              }
            }
            if (!matchedKey) continue;

            // Traverse up to the <p:pic> element
            let node: Element | null = cNvPr;
            let picEl: Element | null = null;
            for (let up = 0; up < 6 && node; up++) {
              if (node.localName === 'pic') { picEl = node; break; }
              node = node.parentElement;
            }
            if (!picEl) continue;

            // Find <a:blip r:embed="rIdX">
            const blip = Array.from(picEl.getElementsByTagName('*')).find((el) => el.localName === 'blip') as Element | undefined;
            const rId = blip?.getAttribute('r:embed') || blip?.getAttribute('embed') || null;
            if (!rId) continue;

            // Read rels file
            const slideNum = parseInt(slidePath.match(/slide(\d+)\.xml$/)?.[1] || '0');
            const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
            const relsXml = await zip.file(relsPath)?.async('text');
            if (!relsXml) continue;

            const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
            const relationships = Array.from(relsDoc.getElementsByTagName('Relationship')) as Element[];
            const rel = relationships.find((r) => r.getAttribute('Id') === rId);
            const target = rel?.getAttribute('Target');
            if (!target) continue;

            const mediaPath = normalizeMediaPath(slidePath, target);
            const dataUrl = imageMap.get(matchedKey)!;
            const bytes = dataURLToUint8Array(dataUrl);
            zip.file(mediaPath, bytes);
          }

          // After image replacements, serialize slide XML back (even if unchanged for safety)
        }

        // Write back updated slide XML
        const updatedXml = new XMLSerializer().serializeToString(doc);
        zip.file(slidePath, updatedXml);
      }

      // Generate updated PPTX preserving original name
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = currentFile.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export completed",
        description: "Your original PPTX was filled and downloaded.",
      });
    } catch (error) {
      console.error('PPTX fill export error:', error);
      toast({
        title: "Export failed",
        description: "Unable to fill placeholders in the original PPTX.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF();

      // Add title
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('PowerPoint Placeholder Report', 20, 30);

      // Add file info
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Filename: ${currentFile.filename}`, 20, 50);
      pdf.text(`Slides: ${currentFile.slideCount}`, 20, 60);
      pdf.text(`Total Placeholders: ${currentFile.placeholders.length}`, 20, 70);
      pdf.text(`Completed: ${filledCount}`, 20, 80);
      pdf.text(`Remaining: ${currentFile.placeholders.length - filledCount}`, 20, 90);

      // Add placeholder details
      pdf.setFont(undefined, 'bold');
      pdf.text('Placeholder Details:', 20, 110);

      let yPos = 125;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);

      const addNewPageIfNeeded = (neededHeight: number) => {
        if (yPos + neededHeight > 285) {
          pdf.addPage();
          yPos = 30;
        }
      };

      currentFile.placeholders.forEach((placeholder) => {
        const update = updates[placeholder.id]?.value;
        const status = update ? 'FILLED' : 'EMPTY';

        addNewPageIfNeeded(20);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${placeholder.key} (${placeholder.type}) - Slide ${placeholder.slideIndex + 1}:`, 20, yPos);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Status: ${status}`, 25, yPos + 8);
        yPos += 14;

        if (placeholder.type === 'text' && update) {
          const lines = pdf.splitTextToSize(`Content: ${update}`, 170);
          addNewPageIfNeeded(lines.length * 5 + 10);
          pdf.text(lines, 25, yPos);
          yPos += (lines.length * 5) + 10;
        } else if (placeholder.type === 'image') {
          if (update && update.startsWith('data:image')) {
            // Detect image type from data URL
            const mime = update.substring(update.indexOf(':') + 1, update.indexOf(';')).toUpperCase();
            // Common types map
            const type = mime.includes('PNG') ? 'PNG' : mime.includes('JPEG') || mime.includes('JPG') ? 'JPEG' : mime.includes('WEBP') ? 'WEBP' : 'PNG';
            const imgWidth = 160; // mm
            const imgHeight = 90; // mm, approx 16:9
            addNewPageIfNeeded(imgHeight + 10);
            try {
              pdf.addImage(update, type as any, 25, yPos, imgWidth, imgHeight);
              yPos += imgHeight + 8;
            } catch (e) {
              // Fallback to text if addImage fails
              const lines = pdf.splitTextToSize(`Content: [Image could not be embedded]`, 170);
              addNewPageIfNeeded(lines.length * 5 + 10);
              pdf.text(lines, 25, yPos);
              yPos += (lines.length * 5) + 10;
            }
          } else {
            const lines = pdf.splitTextToSize(`Content: No image`, 170);
            addNewPageIfNeeded(lines.length * 5 + 10);
            pdf.text(lines, 25, yPos);
            yPos += (lines.length * 5) + 10;
          }
        }

        yPos += 4; // spacing between items
      });

      // Save the PDF with original base name
      const base = currentFile.filename.replace(/\.pptx$/i, '');
      const fileName = `${base}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Export completed",
        description: "PDF report exported successfully",
      });
    } catch (error) {
      console.error('PDF Export error:', error);
      toast({
        title: "Export failed",
        description: "Unable to export PDF file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/placeholders')}
                className="glass-button hover-glow flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg md:text-xl font-bold gradient-text truncate">Preview & Export</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {currentFile.slideCount} slides • {filledCount}/{currentFile.placeholders.length} done
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="p-2"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="p-2"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                onClick={handleExportPPTX} 
                disabled={isExporting}
                className="glass-button hover-glow text-xs sm:text-sm"
                size="sm"
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export PPTX'}</span>
              </Button>
              
              <Button 
                onClick={handleExportPDF} 
                variant="outline" 
                disabled={isExporting}
                className="glass-button text-xs sm:text-sm"
                size="sm"
              >
                <FileText className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'PDF'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay during export */}
      {isExporting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass-card p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full glass border-4 border-primary/20 border-t-primary animate-spin" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Exporting your data...</h3>
              <p className="text-muted-foreground">This will download shortly</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
        {/* Main Content */}
        <div className="animate-slide-up">
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center text-muted-foreground">
              <p className="text-sm sm:text-base">Slide previews will be available in the full version</p>
              <p className="text-xs sm:text-sm mt-2">Currently showing placeholder data structure</p>
            </div>
            
            {/* Show placeholder summary */}
            <div className="grid gap-3 sm:gap-4">
              {currentFile.placeholders.map((placeholder) => (
                <div key={placeholder.id} className="glass-card p-3 sm:p-4 hover-lift">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{placeholder.key}</h3>
                      <p className="text-sm text-muted-foreground">
                        {placeholder.slideTitle} • {placeholder.type}
                      </p>
                    </div>
                    <Badge variant={updates[placeholder.id]?.value ? "default" : "outline"}>
                      {updates[placeholder.id]?.value ? "Filled" : "Empty"}
                    </Badge>
                  </div>
                  {updates[placeholder.id]?.value && (
                    <div className="mt-3 p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm">
                        {placeholder.type === 'image' ? 'Image uploaded' : updates[placeholder.id].value}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;