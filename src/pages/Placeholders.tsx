import { useState } from "react";
import { Search, FileText, Image, CheckCircle, Circle, ArrowLeft, Download, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { usePPTXStore } from "@/store/pptx-store";
import { PlaceholderEditor } from "@/components/PlaceholderEditor";

const Placeholders = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "text" | "image">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "empty" | "filled">("all");
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null);
  
  const { currentFile, getPlaceholderStatus } = usePPTXStore();

  console.log('Placeholders component - currentFile:', currentFile);
  console.log('Placeholders component - placeholders:', currentFile?.placeholders);

  if (!currentFile) {
    console.log('No currentFile found, redirecting to upload...');
    navigate('/');
    return null;
  }

  const placeholders = currentFile.placeholders;

  const filteredPlaceholders = placeholders.filter((placeholder) => {
    const matchesSearch = placeholder.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || placeholder.type === filterType;
    const matchesStatus = filterStatus === "all" || getPlaceholderStatus(placeholder.id) === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const groupedPlaceholders = filteredPlaceholders.reduce((acc, placeholder) => {
    const slideKey = `slide-${placeholder.slideIndex}`;
    if (!acc[slideKey]) {
      acc[slideKey] = {
        slideIndex: placeholder.slideIndex,
        slideTitle: placeholder.slideTitle || `Slide ${placeholder.slideIndex + 1}`,
        placeholders: []
      };
    }
    acc[slideKey].placeholders.push(placeholder);
    return acc;
  }, {} as Record<string, { slideIndex: number; slideTitle: string; placeholders: typeof placeholders }>);

  const filledCount = placeholders.filter(p => getPlaceholderStatus(p.id) === "filled").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Top Bar */}
        <div className="sticky top-0 z-50 glass border-b border-border/20 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/')} className="hover-glow">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Upload
              </Button>
              <div>
                <h1 className="text-xl font-bold gradient-text">PowerPoint Placeholders</h1>
                <p className="text-sm text-muted-foreground">
                  {currentFile.filename} • {placeholders.length} placeholders • {filledCount} completed
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate('/preview')} className="hover-glow">
                <Download className="w-4 h-4 mr-2" />
                Preview & Export
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r border-border/20 glass overflow-auto">
            <div className="p-6 space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search placeholders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <div className="flex gap-2">
                    <Button
                      variant={filterType === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("all")}
                      className="flex-1"
                    >
                      All
                    </Button>
                    <Button
                      variant={filterType === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("text")}
                      className="flex-1"
                    >
                      Text
                    </Button>
                    <Button
                      variant={filterType === "image" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("image")}
                      className="flex-1"
                    >
                      Image
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <div className="flex gap-2">
                    <Button
                      variant={filterStatus === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus("all")}
                      className="flex-1"
                    >
                      All
                    </Button>
                    <Button
                      variant={filterStatus === "empty" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus("empty")}
                      className="flex-1"
                    >
                      Empty
                    </Button>
                    <Button
                      variant={filterStatus === "filled" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus("filled")}
                      className="flex-1"
                    >
                      Filled
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="glass-card p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Placeholders</span>
                  <span className="font-medium">{placeholders.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Completed</span>
                  <span className="font-medium text-green-600">{filledCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining</span>
                  <span className="font-medium text-orange-600">{placeholders.length - filledCount}</span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2 mt-3">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(filledCount / placeholders.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-6">
            {selectedPlaceholder ? (
              <PlaceholderEditor
                placeholderId={selectedPlaceholder}
                onClose={() => setSelectedPlaceholder(null)}
              />
            ) : (
              <div className="space-y-6">
                {Object.values(groupedPlaceholders).map((group) => (
                  <div key={group.slideIndex} className="glass-card space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-border/20">
                      <div className="w-12 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">{group.slideIndex + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{group.slideTitle}</h3>
                        <p className="text-sm text-muted-foreground">
                          {group.placeholders.length} placeholders
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid gap-3">
                      {group.placeholders.map((placeholder) => (
                        <div
                          key={placeholder.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border/20 hover:border-primary/30 transition-colors hover-lift"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {placeholder.type === "text" ? (
                                <FileText className="w-4 h-4 text-blue-500" />
                              ) : (
                                <Image className="w-4 h-4 text-green-500" />
                              )}
                              {getPlaceholderStatus(placeholder.id) === "filled" ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            
                            <div>
                              <p className="font-medium">{placeholder.key}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant={placeholder.type === "text" ? "default" : "secondary"}>
                                  {placeholder.type}
                                </Badge>
                                <Badge variant={getPlaceholderStatus(placeholder.id) === "filled" ? "default" : "outline"}>
                                  {getPlaceholderStatus(placeholder.id)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="hover-glow"
                            onClick={() => setSelectedPlaceholder(placeholder.id)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Placeholders;