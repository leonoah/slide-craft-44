import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Image, 
  Eye, 
  Search, 
  Filter, 
  CheckCircle, 
  Circle, 
  ArrowRight,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Mock data for demonstration
const mockPlaceholders = [
  { 
    id: "1", 
    key: "title", 
    type: "text" as const, 
    slideIndex: 1, 
    status: "empty" as const,
    preview: "Slide 1 - Introduction"
  },
  { 
    id: "2", 
    key: "subtitle", 
    type: "text" as const, 
    slideIndex: 1, 
    status: "filled" as const,
    preview: "Slide 1 - Introduction"
  },
  { 
    id: "3", 
    key: "image:hero", 
    type: "image" as const, 
    slideIndex: 1, 
    status: "empty" as const,
    preview: "Slide 1 - Introduction"
  },
  { 
    id: "4", 
    key: "bullet_1", 
    type: "text" as const, 
    slideIndex: 2, 
    status: "empty" as const,
    preview: "Slide 2 - Features"
  },
  { 
    id: "5", 
    key: "image:feature", 
    type: "image" as const, 
    slideIndex: 2, 
    status: "empty" as const,
    preview: "Slide 2 - Features"
  },
];

const Placeholders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "text" | "image">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "empty" | "filled">("all");
  const navigate = useNavigate();

  const filteredPlaceholders = mockPlaceholders.filter(placeholder => {
    const matchesSearch = placeholder.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || placeholder.type === filterType;
    const matchesStatus = filterStatus === "all" || placeholder.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const groupedBySlide = filteredPlaceholders.reduce((acc, placeholder) => {
    const slideKey = `slide-${placeholder.slideIndex}`;
    if (!acc[slideKey]) {
      acc[slideKey] = {
        slideIndex: placeholder.slideIndex,
        preview: placeholder.preview,
        placeholders: []
      };
    }
    acc[slideKey].placeholders.push(placeholder);
    return acc;
  }, {} as Record<string, { slideIndex: number; preview: string; placeholders: typeof mockPlaceholders }>);

  const handleFillAll = () => {
    // Navigate through placeholders sequentially
    const firstEmpty = mockPlaceholders.find(p => p.status === "empty");
    if (firstEmpty) {
      // Would open editor for first empty placeholder
      console.log("Opening editor for:", firstEmpty.key);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="glass-card px-4 py-2">
                <span className="font-semibold">presentation.pptx</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers className="w-4 h-4" />
                <span>5 slides</span>
                <span>•</span>
                <span>8 placeholders</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleFillAll}
                className="glass-button"
              >
                Fill All Sequentially
              </Button>
              <Button 
                onClick={() => navigate('/preview')}
                className="glass-button hover-glow"
              >
                Preview & Export
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters and Search */}
          <div className="lg:col-span-1">
            <div className="glass-card sticky top-24 space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search & Filter
                </h3>
                
                <div className="space-y-4">
                  <Input
                    placeholder="Search placeholders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass"
                  />
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["all", "text", "image"] as const).map((type) => (
                        <Button
                          key={type}
                          variant={filterType === type ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterType(type)}
                          className="capitalize"
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["all", "empty", "filled"] as const).map((status) => (
                        <Button
                          key={status}
                          variant={filterStatus === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterStatus(status)}
                          className="capitalize"
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Placeholders List */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              <div className="animate-fade-in">
                <h1 className="text-3xl font-bold mb-2">Placeholder Management</h1>
                <p className="text-muted-foreground">
                  Click on any placeholder to edit its content
                </p>
              </div>

              <div className="space-y-6 animate-slide-up">
                {Object.values(groupedBySlide).map((slide) => (
                  <div key={`slide-${slide.slideIndex}`} className="glass-card">
                    <div className="border-b border-border/50 pb-4 mb-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Slide {slide.slideIndex}
                        </h3>
                        <Badge variant="secondary" className="glass">
                          {slide.placeholders.length} placeholders
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {slide.preview}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {slide.placeholders.map((placeholder) => (
                        <div
                          key={placeholder.id}
                          className="glass border border-border/50 rounded-lg p-4 hover-lift cursor-pointer transition-all duration-200 hover:border-primary/50"
                          onClick={() => console.log("Edit placeholder:", placeholder.key)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {placeholder.type === "text" ? (
                                <FileText className="w-4 h-4 text-primary" />
                              ) : (
                                <Image className="w-4 h-4 text-primary" />
                              )}
                              <span className="font-medium">{placeholder.key}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {placeholder.status === "filled" ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground" />
                              )}
                              <Badge 
                                variant={placeholder.type === "text" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {placeholder.type}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {placeholder.status === "filled" ? (
                              <span className="text-green-600 font-medium">✓ Content added</span>
                            ) : (
                              <span>Click to add content</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Placeholders;