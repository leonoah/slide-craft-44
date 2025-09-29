import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ArrowLeft, Grid3X3, List, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePPTXStore } from "@/store/pptx-store";

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
      // Create a simple text file with the placeholder data for now
      const exportData = {
        filename: currentFile.filename,
        slides: currentFile.slideCount,
        placeholders: currentFile.placeholders.map(p => ({
          key: p.key,
          type: p.type,
          slideIndex: p.slideIndex,
          value: updates[p.id]?.value || '',
          filled: !!updates[p.id]?.value
        }))
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentFile.filename.replace('.pptx', '')}_data.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export completed",
        description: "Placeholder data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Create a simple text summary for PDF export
      const summary = `PowerPoint Placeholder Summary
      
Filename: ${currentFile.filename}
Slides: ${currentFile.slideCount}
Total Placeholders: ${currentFile.placeholders.length}
Completed: ${filledCount}
Remaining: ${currentFile.placeholders.length - filledCount}

Placeholder Details:
${currentFile.placeholders.map(p => 
  `- ${p.key} (${p.type}) - Slide ${p.slideIndex + 1}: ${updates[p.id]?.value ? 'FILLED' : 'EMPTY'}`
).join('\n')}`;

      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentFile.filename.replace('.pptx', '')}_summary.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export completed",
        description: "Summary exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export summary",
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
                {isExporting ? 'Exporting...' : 'Export Data (JSON)'}
              </Button>
              
              <Button 
                onClick={handleExportPDF} 
                variant="outline" 
                disabled={isExporting}
                className="glass-button"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Summary (TXT)'}
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