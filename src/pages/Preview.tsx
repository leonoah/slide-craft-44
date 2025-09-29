import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ArrowLeft, Grid3X3, List, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePPTXStore } from "@/store/pptx-store";
import PptxGenJS from "pptxgenjs";
import jsPDF from "jspdf";

const Preview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isExporting, setIsExporting] = useState(false);
  const { currentFile, updates } = usePPTXStore();

  if (!currentFile) {
    navigate('/');
    return null;
  }

  const filledCount = currentFile.placeholders.filter(p => updates[p.id]?.value).length;

  const handleExportPPTX = async () => {
    setIsExporting(true);
    try {
      const pptx = new PptxGenJS();

      // Group placeholders by slide
      const slideGroups = currentFile.placeholders.reduce((acc, placeholder) => {
        const slideIndex = placeholder.slideIndex;
        if (!acc[slideIndex]) acc[slideIndex] = [];
        acc[slideIndex].push(placeholder);
        return acc;
      }, {} as Record<number, typeof currentFile.placeholders>);

      // Create slides with updated content
      Object.entries(slideGroups).forEach(([_, placeholders]) => {
        const slide = pptx.addSlide();

        // Add slide title if available
        const firstPlaceholder = placeholders[0];
        if (firstPlaceholder?.slideTitle) {
          slide.addText(firstPlaceholder.slideTitle, {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 1,
            fontSize: 24,
            bold: true,
            color: "363636",
          });
        }

        // Dynamic y-positioning
        let y = firstPlaceholder?.slideTitle ? 1.6 : 0.8;

        placeholders.forEach((placeholder) => {
          const update = updates[placeholder.id]?.value;

          if (placeholder.type === 'text') {
            const textValue = update || `[${placeholder.key}]`;
            slide.addText(`${placeholder.key}: ${textValue}`, {
              x: 0.5,
              y,
              w: 9,
              h: 0.7,
              fontSize: 14,
              color: "363636",
            });
            y += 0.6;
          } else if (placeholder.type === 'image') {
            // If image exists, embed it; otherwise show placeholder text
            if (update && update.startsWith('data:image')) {
              // Optional label
              slide.addText(`${placeholder.key}:`, {
                x: 0.5,
                y,
                w: 9,
                h: 0.5,
                fontSize: 12,
                color: "363636",
                italic: true,
              });
              y += 0.4;

              // Add image (fit within slide width)
              slide.addImage({ data: update, x: 0.5, y, w: 5.5, h: 3.2 });
              y += 3.6; // spacing after image
            } else {
              slide.addText(`${placeholder.key}: [Image placeholder]`, {
                x: 0.5,
                y,
                w: 9,
                h: 0.7,
                fontSize: 14,
                color: "777777",
                italic: true,
              });
              y += 0.6;
            }
          }
        });
      });

      // Save using original filename
      const fileName = currentFile.filename.endsWith('.pptx')
        ? currentFile.filename
        : `${currentFile.filename}.pptx`;
      await pptx.writeFile({ fileName });

      toast({
        title: "PPTX Export completed",
        description: "PowerPoint file exported successfully",
      });
    } catch (error) {
      console.error('PPTX Export error:', error);
      toast({
        title: "Export failed",
        description: "Unable to export PPTX file",
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/placeholders')}
                className="glass-button hover-glow"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Editor
              </Button>
              
              <div>
                <h1 className="text-xl font-bold gradient-text">Preview & Export</h1>
                <p className="text-sm text-muted-foreground">
                  {currentFile.filename} • {currentFile.slideCount} slides • {filledCount}/{currentFile.placeholders.length} completed
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
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
                className="glass-button hover-glow"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export PPTX'}
              </Button>
              
              <Button 
                onClick={handleExportPDF} 
                variant="outline" 
                disabled={isExporting}
                className="glass-button"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
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

      <div className="max-w-7xl mx-auto p-6">
        {/* Main Content */}
        <div className="animate-slide-up">
          <div className="space-y-6">
            <div className="text-center text-muted-foreground">
              <p>Slide previews will be available in the full version</p>
              <p className="text-sm mt-2">Currently showing placeholder data structure</p>
            </div>
            
            {/* Show placeholder summary */}
            <div className="grid gap-4">
              {currentFile.placeholders.map((placeholder) => (
                <div key={placeholder.id} className="glass-card p-4 hover-lift">
                  <div className="flex items-center justify-between">
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