import { useState } from "react";
import { Search, FileText, Image, CheckCircle, Circle, ArrowLeft, Download, Edit, Menu, X } from "lucide-react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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
        <div className="sticky top-0 z-50 glass border-b border-border/20 p-3 sm:p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden flex-shrink-0"
              >
                <Menu className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/')} 
                className="hover-glow hidden sm:flex flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg md:text-xl font-bold gradient-text truncate">PowerPoint Placeholders</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {placeholders.length} items • {filledCount} done
                </p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/preview')} 
              className="hover-glow flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline sm:ml-2">Export</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <div className={`
            fixed md:relative inset-y-0 left-0 z-40
            w-80 md:w-64 lg:w-80
            border-r border-border/20 glass overflow-auto
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Close button for mobile */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>
              {/* Search */}
              <div className="relative mt-8 md:mt-0">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search placeholders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium mb-2 block">Type</label>
                  <div className="flex gap-2">
                    <Button
                      variant={filterType === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("all")}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      All
                    </Button>
                    <Button
                      variant={filterType === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("text")}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      Text
                    </Button>
                    <Button
                      variant={filterType === "image" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("image")}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      Image
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium mb-2 block">Status</label>
                  <div className="flex gap-2">
                    <Button
                      variant={filterStatus === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus("all")}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      All
                    </Button>
                    <Button
                      variant={filterStatus === "empty" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus("empty")}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      Empty
                    </Button>
                    <Button
                      variant={filterStatus === "filled" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus("filled")}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      Filled
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="glass-card p-3 sm:p-4 space-y-2">
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
          <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            {selectedPlaceholder ? (
              <PlaceholderEditor
                placeholderId={selectedPlaceholder}
                onClose={() => {
                  setSelectedPlaceholder(null);
                  setIsSidebarOpen(false);
                }}
              />
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {Object.values(groupedPlaceholders).map((group) => (
                  <div key={group.slideIndex} className="glass-card space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-border/20">
                      <div className="w-10 h-7 sm:w-12 sm:h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-medium text-primary">{group.slideIndex + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{group.slideTitle}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {group.placeholders.length} placeholders
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid gap-2 sm:gap-3">
                      {group.placeholders.map((placeholder) => (
                        <div
                          key={placeholder.id}
                          className="flex items-center justify-between p-3 sm:p-4 rounded-lg border border-border/20 hover:border-primary/30 transition-colors hover-lift gap-2"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                              {placeholder.type === "text" ? (
                                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                              ) : (
                                <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                              )}
                              {getPlaceholderStatus(placeholder.id) === "filled" ? (
                                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                              )}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm sm:text-base truncate">{placeholder.key}</p>
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <Badge variant={placeholder.type === "text" ? "default" : "secondary"} className="text-xs">
                                  {placeholder.type}
                                </Badge>
                                <Badge variant={getPlaceholderStatus(placeholder.id) === "filled" ? "default" : "outline"} className="text-xs">
                                  {getPlaceholderStatus(placeholder.id)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="hover-glow flex-shrink-0"
                            onClick={() => {
                              setSelectedPlaceholder(placeholder.id);
                              setIsSidebarOpen(false);
                            }}
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Edit</span>
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