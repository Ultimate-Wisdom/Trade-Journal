import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Tag as TagIcon, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { Tag } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BatchOperationsProps {
  trades: any[];
  selectedTrades: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function BatchOperations({ trades, selectedTrades, onSelectionChange }: BatchOperationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("");

  // Fetch available tags
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map(id =>
          fetch(`/api/trades/${id}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "Trades Deleted",
        description: `Successfully deleted ${selectedTrades.length} trades`,
      });
      onSelectionChange([]);
      setShowDeleteDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete some trades",
        variant: "destructive",
      });
    },
  });

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: async ({ tradeIds, tagId }: { tradeIds: string[]; tagId: string }) => {
      const results = await Promise.all(
        tradeIds.map(id =>
          fetch(`/api/trades/${id}/tags`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ tagId }),
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "Tags Added",
        description: `Added tag to ${selectedTrades.length} trades`,
      });
      setShowTagDialog(false);
      setSelectedTag("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add tags to some trades",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedTrades.length === trades.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(trades.map(t => t.id));
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(selectedTrades);
  };

  const handleAddTag = () => {
    if (!selectedTag) {
      toast({
        title: "Error",
        description: "Please select a tag",
        variant: "destructive",
      });
      return;
    }
    addTagMutation.mutate({ tradeIds: selectedTrades, tagId: selectedTag });
  };

  const allSelected = selectedTrades.length === trades.length && trades.length > 0;
  const someSelected = selectedTrades.length > 0 && selectedTrades.length < trades.length;

  if (trades.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
        {/* Select All Checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            {allSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : someSelected ? (
              <Square className="h-4 w-4 fill-current text-primary/50" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </label>
        </div>

        {/* Selection count */}
        {selectedTrades.length > 0 && (
          <>
            <Badge variant="secondary">
              {selectedTrades.length} selected
            </Badge>

            {/* Batch actions */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTagDialog(true)}
                className="gap-2"
              >
                <TagIcon className="h-4 w-4" />
                Add Tag
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTrades.length} Trades?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected trades.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Tag Dialog */}
      <AlertDialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Tag to {selectedTrades.length} Trades</AlertDialogTitle>
            <AlertDialogDescription>
              Select a tag to add to all selected trades.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tag" />
              </SelectTrigger>
              <SelectContent>
                {tags.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No tags available. Create tags in Settings.
                  </div>
                ) : (
                  tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddTag}
              disabled={addTagMutation.isPending || !selectedTag}
            >
              {addTagMutation.isPending ? "Adding..." : "Add Tag"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
