import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Download, 
  FileText, 
  Image, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Grid3X3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Mock data for slides preview
const mockSlides = [
  {
    id: 1,
    title: "Introduction",
    thumbnail: "/placeholder-slide.jpg",
    placeholders: [
      { key: "title", status: "filled" as const, type: "text" as const },
      { key: "subtitle", status: "filled" as const, type: "text" as const },
      { key: "image:hero", status: "empty" as const, type: "image" as const }
    ]
  },
  {
    id: 2,
    title: "Features",
    thumbnail: "/placeholder-slide.jpg",
    placeholders: [
      { key: "bullet_1", status: "empty" as const, type: "text" as const },
      { key: "image:feature", status: "empty" as const, type: "image" as const }
    ]
  },
  {
    id: 3,
    title: "Conclusion",
    thumbnail: "/placeholder-slide.jpg",
    placeholders: [
      { key: "closing_text", status: "filled" as const, type: "text" as const }
    ]
  }
];

const Preview = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalPlaceholders = mockSlides.reduce((acc, slide) => acc + slide.placeholders.length, 0);
  const filledPlaceholders = mockSlides.reduce(
    (acc, slide) => acc + slide.placeholders.filter(p => p.status === "filled").length, 
    0
  );
  const completionRate = Math.round((filledPlaceholders / totalPlaceholders) * 100);

  const handleExport = async (format: "pptx" | "pdf") => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    toast({
      title: `${format.toUpperCase()} exported successfully!`,
      description: "Your file is ready for download",
    });
    
    setIsExporting(false);
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
                className="glass-button"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Editor
              </Button>
              
              <div className="glass-card px-4 py-2">
                <span className="font-semibold">presentation.pptx</span>
              </div>
              
              <div className="glass-card px-4 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    completionRate === 100 ? "bg-green-500" : 
                    completionRate > 50 ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                  <span>{completionRate}% Complete</span>
                  <span className="text-muted-foreground">
                    ({filledPlaceholders}/{totalPlaceholders} placeholders)
                  </span>
                </div>
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
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                onClick={() => handleExport("pptx")}
                disabled={isExporting}
                className="glass-button hover-glow"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PPTX
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
                className="glass-button"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
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
              <h3 className="text-lg font-semibold mb-2">Exporting your presentation...</h3>
              <p className="text-muted-foreground">This might take a moment</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8 animate-fade-in">
          <div className="glass-card text-center">
            <div className="w-12 h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Preview Ready</h3>
            <p className="text-sm text-muted-foreground">
              Review your slides before exporting
            </p>
          </div>
          
          <div className="glass-card text-center">
            <div className="w-12 h-12 mx-auto rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">{filledPlaceholders} Completed</h3>
            <p className="text-sm text-muted-foreground">
              Out of {totalPlaceholders} total placeholders
            </p>
          </div>
          
          <div className="glass-card text-center">
            <div className="w-12 h-12 mx-auto rounded-lg bg-yellow-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold mb-2">{totalPlaceholders - filledPlaceholders} Pending</h3>
            <p className="text-sm text-muted-foreground">
              Placeholders still need content
            </p>
          </div>
        </div>

        {/* Slides Preview */}
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Slide Preview</h1>
            <p className="text-muted-foreground">
              {mockSlides.length} slides total
            </p>
          </div>

          <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {mockSlides.map((slide) => (
              <div
                key={slide.id}
                className={`glass-card hover-lift ${
                  viewMode === "list" ? "flex items-center gap-6" : ""
                }`}
              >
                {/* Slide Thumbnail */}
                <div className={`${
                  viewMode === "list" ? "w-48 h-32" : "aspect-video"
                } bg-muted rounded-lg mb-4 ${viewMode === "list" ? "mb-0" : ""} flex items-center justify-center`}>
                  <div className="text-center text-muted-foreground">
                    <Image className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Slide {slide.id}</p>
                  </div>
                </div>

                {/* Slide Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Slide {slide.id}: {slide.title}</h3>
                    <Badge 
                      variant={slide.placeholders.every(p => p.status === "filled") ? "default" : "secondary"}
                      className="glass"
                    >
                      {slide.placeholders.filter(p => p.status === "filled").length}/{slide.placeholders.length}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {slide.placeholders.map((placeholder, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {placeholder.type === "text" ? (
                          <FileText className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Image className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="flex-1">{placeholder.key}</span>
                        {placeholder.status === "filled" ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;