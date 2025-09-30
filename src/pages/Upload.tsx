import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, FileText, Image, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { pptxParser } from "@/lib/pptx-parser";
import { usePPTXStore } from "@/store/pptx-store";

const Upload = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setCurrentFile, setOriginalArrayBuffer } = usePPTXStore();

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.match(/\.(pptx|pot)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .pptx or .pot file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      console.log('Starting PPTX parsing...');
      const arrayBuffer = await file.arrayBuffer();
      setOriginalArrayBuffer(arrayBuffer);
      const pptxData = await pptxParser.parseFile(file);
      console.log('PPTX parsing completed:', pptxData);
      
      setCurrentFile(pptxData);
      console.log('Store updated with PPTX data');
      
      toast({
        title: "File uploaded successfully!",
        description: `Found ${pptxData.placeholders.length} placeholders in ${pptxData.slideCount} slides`,
      });

      setTimeout(() => {
        navigate('/placeholders');
      }, 1000);
    } catch (error) {
      console.error('Error parsing PPTX:', error);
      toast({
        title: "Error processing file",
        description: "Unable to parse the PowerPoint file. Please try another file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [navigate, toast, setCurrentFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <div className="glass-card inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <span className="font-semibold text-base sm:text-lg">PowerPoint Editor</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 gradient-text px-4">
            Transform Your Presentations
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed px-4">
            Upload your PowerPoint file and we'll automatically detect placeholders for easy content management
          </p>
        </div>

        {/* Upload Card */}
        <div className="animate-slide-up">
          <div
            className={`glass-card border-2 border-dashed transition-all duration-300 hover-lift ${
              isDragOver 
                ? 'border-primary bg-primary/5 scale-105' 
                : 'border-border hover:border-primary/50'
            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center p-6 sm:p-8 md:p-12">
              {isUploading ? (
                <div className="space-y-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full glass border-4 border-primary/20 border-t-primary animate-spin" />
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Processing your file...</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">This might take a moment</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-[var(--radius-lg)] glass flex items-center justify-center">
                    <UploadIcon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl sm:text-2xl font-semibold mb-2">Drop your PowerPoint file here</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                      Supports .pptx and .pot files up to 50MB
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Button size="lg" className="glass-button hover-glow" type="button" asChild>
                        <span>Choose File</span>
                      </Button>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pptx,.pot"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <p className="text-sm text-muted-foreground">
                      or drag and drop your file above
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mt-8 sm:mt-12 animate-fade-in">
          <div className="glass-card text-center space-y-3 sm:space-y-4 hover-lift p-4 sm:p-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base">Smart Text Detection</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Automatically finds and organizes text placeholders like {"{{title}}"} and {"{{subtitle}}"}
            </p>
          </div>
          
          <div className="glass-card text-center space-y-3 sm:space-y-4 hover-lift p-4 sm:p-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
              <Image className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base">Image Placeholders</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Identifies image slots like {"{{image:hero}}"} for easy drag-and-drop replacement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;