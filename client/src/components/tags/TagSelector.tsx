import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Tag as TagIcon, Plus, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tag } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  tradeId?: string; // If provided, will show/manage tags for this trade
  selectedTags?: Tag[]; // For creating new trades (before trade ID exists)
  onTagsChange?: (tags: Tag[]) => void; // Callback for tag changes in creation mode
  readOnly?: boolean;
}

export function TagSelector({ tradeId, selectedTags = [], onTagsChange, readOnly = false }: TagSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch all available tags
  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Fetch tags for this trade (if tradeId exists)
  const { data: tradeTags = [] } = useQuery<Tag[]>({
    queryKey: [`/api/trades/${tradeId}/tags`],
    enabled: !!tradeId,
  });

  // Use tradeTags if tradeId exists, otherwise use selectedTags
  const currentTags = tradeId ? tradeTags : selectedTags;

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      if (!tradeId) {
        // In creation mode, just update the parent component
        const tag = allTags.find(t => t.id === tagId);
        if (tag && onTagsChange) {
          onTagsChange([...currentTags, tag]);
        }
        return;
      }

      const res = await fetch(`/api/trades/${tradeId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tagId }),
      });
      if (!res.ok) throw new Error("Failed to add tag");
      return res.json();
    },
    onSuccess: () => {
      if (tradeId) {
        queryClient.invalidateQueries({ queryKey: [`/api/trades/${tradeId}/tags`] });
      }
      toast({
        title: "Tag Added",
        description: "Tag has been added to the trade",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add tag",
        variant: "destructive",
      });
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      if (!tradeId) {
        // In creation mode, just update the parent component
        if (onTagsChange) {
          onTagsChange(currentTags.filter(t => t.id !== tagId));
        }
        return;
      }

      const res = await fetch(`/api/trades/${tradeId}/tags/${tagId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove tag");
      return res.json();
    },
    onSuccess: () => {
      if (tradeId) {
        queryClient.invalidateQueries({ queryKey: [`/api/trades/${tradeId}/tags`] });
      }
      toast({
        title: "Tag Removed",
        description: "Tag has been removed from the trade",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove tag",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = (tagId: string) => {
    addTagMutation.mutate(tagId);
    setOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    removeTagMutation.mutate(tagId);
  };

  const availableTags = allTags.filter(
    (tag) => !currentTags.some((t) => t.id === tag.id)
  );

  return (
    <div className="space-y-2">
      {/* Current Tags */}
      <div className="flex flex-wrap gap-2">
        {currentTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="px-2 py-1 text-xs font-medium group"
            style={{
              borderColor: tag.color,
              color: tag.color,
              backgroundColor: `${tag.color}10`,
            }}
          >
            {tag.name}
            {!readOnly && (
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={removeTagMutation.isPending}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}

        {/* Add Tag Button */}
        {!readOnly && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search tags..." />
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup>
                  {availableTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => handleAddTag(tag.id)}
                      className="gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </CommandItem>
                  ))}
                  {availableTags.length === 0 && allTags.length > 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      All tags already added
                    </div>
                  )}
                  {allTags.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      No tags available. Create tags in Settings.
                    </div>
                  )}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
