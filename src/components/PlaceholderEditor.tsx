import { useState, useCallback, useRef } from "react";
import { ArrowLeft, Save, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePPTXStore } from "@/store/pptx-store";

interface PlaceholderEditorProps {
  placeholderId: string;
  onClose: () => void;
}

export const PlaceholderEditor = ({ placeholderId, onClose }: PlaceholderEditorProps) => {
  const { toast } = useToast();
  const { currentFile, updatePlaceholder, getPlaceholderValue } = usePPTXStore();
  
  const placeholder = currentFile?.placeholders.find(p => p.id === placeholderId);
  const currentValue = getPlaceholderValue(placeholderId) || '';
  
  const [value, setValue] = useState(currentValue);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!placeholder) {
    return null;
  }

  const handleSave = () => {
    updatePlaceholder(placeholderId, value, placeholder.type);
    toast({
      title: "Placeholder updated",
      description: `${placeholder.key} has been saved successfully`,
    });
    onClose();
  };

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setValue(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
      // Reset the input value so the same file can be reselected if needed
      e.target.value = "";
    }
  }, [handleImageUpload]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-border/20">
        <Button variant="outline" size="sm" onClick={onClose} className="hover-glow">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold gradient-text">Edit Placeholder</h2>
          <p className="text-muted-foreground">
            {placeholder.key} • {placeholder.slideTitle} • {placeholder.type}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Editor Panel */}
        <div className="glass-card space-y-6">
          <div className="flex items-center gap-3">
            {placeholder.type === "text" ? (
              <FileText className="w-5 h-5 text-blue-500" />
            ) : (
              <ImageIcon className="w-5 h-5 text-green-500" />
            )}
            <h3 className="text-lg font-semibold">
              {placeholder.type === "text" ? "Text Content" : "Image Upload"}
            </h3>
          </div>

          {placeholder.type === "text" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="text-input">Text Content</Label>
                <Textarea
                  id="text-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={`Enter text for ${placeholder.key}...`}
                  className="min-h-[120px] resize-none"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {value.length} characters
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {value ? (
                <div className="space-y-4">
                  <div className="aspect-video rounded-lg overflow-hidden border">
                    <img
                      src={value}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={openFileDialog}
                    >
                      Replace Image
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setValue('')}
                    >
                      Remove Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="font-medium mb-2">Drop your image here</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports JPG, PNG, WebP up to 5MB
                  </p>
                  <Button variant="outline" className="cursor-pointer" onClick={openFileDialog}>
                    Choose File
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    ref={fileInputRef}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1 hover-glow">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="glass-card space-y-4">
          <h3 className="text-lg font-semibold">Preview</h3>
          <div className="aspect-video rounded-lg bg-muted/20 border border-dashed border-border/40 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted/40 flex items-center justify-center">
                <span className="text-2xl font-bold">{placeholder.slideIndex + 1}</span>
              </div>
              <p className="text-sm">Slide Preview</p>
              <p className="text-xs">Coming soon</p>
            </div>
          </div>
          {value && (
            <div className="p-4 bg-muted/10 rounded-lg">
              <Label className="text-sm font-medium">Current Value:</Label>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                {placeholder.type === "image" 
                  ? "Image uploaded" 
                  : value.length > 100 
                    ? `${value.substring(0, 100)}...` 
                    : value
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};