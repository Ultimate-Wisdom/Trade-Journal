import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { Account } from "@shared/schema";
import { cn } from "@/lib/utils";

// Color presets
const COLOR_PRESETS = [
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#10b981" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f97316" },
  { name: "Teal", value: "#14b8a6" },
];

// Currency conversion rate (1 USD = 4.45 MYR)
const MYR_TO_USD_RATE = 4.45;

const formSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["Prop", "Live", "Demo"]),
  initialBalance: z.string().min(1, "Initial balance is required"),
  currency: z.enum(["USD", "MYR"]),
  color: z.string().min(1, "Color is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddAccountDialogProps {
  account?: Account; // If provided, we're in edit mode
  trigger?: React.ReactNode; // Custom trigger button
}

export function AddAccountDialog({ account, trigger }: AddAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [conversionNote, setConversionNote] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!account;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account?.name || "",
      type: (account?.type as "Prop" | "Live" | "Demo") || "Prop",
      initialBalance: account?.initialBalance || "100000",
      currency: "USD",
      color: account?.color || "#2563eb",
    },
  });

  const watchedCurrency = form.watch("currency");
  const watchedBalance = form.watch("initialBalance");

  // Update conversion note when currency or balance changes
  useEffect(() => {
    if (watchedCurrency === "MYR" && watchedBalance) {
      const myrAmount = parseFloat(watchedBalance) || 0;
      const usdAmount = myrAmount / MYR_TO_USD_RATE;
      setConversionNote(
        `≈ $${usdAmount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} USD`
      );
    } else {
      setConversionNote("");
    }
  }, [watchedCurrency, watchedBalance]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert MYR to USD if needed
      let balanceInUSD = parseFloat(values.initialBalance);
      if (values.currency === "MYR") {
        balanceInUSD = balanceInUSD / MYR_TO_USD_RATE;
      }

      const payload = {
        name: values.name,
        type: values.type,
        initialBalance: balanceInUSD.toFixed(2),
        color: values.color,
      };

      if (isEditMode && account) {
        // Update existing account
        return apiRequest("PATCH", `/api/accounts/${account.id}`, payload);
      } else {
        // Create new account
        return apiRequest("POST", "/api/accounts", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Success",
        description: isEditMode
          ? "Account updated successfully"
          : "Account added successfully",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Mutation Failed:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? "update" : "create"} account`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  const defaultTrigger = (
    <Button className="gap-2">
      <Plus className="h-4 w-4" />
      Add Account
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Trading Account" : "Add Trading Account"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., FTMO 100k Swing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Prop">Prop Firm</SelectItem>
                      <SelectItem value="Live">Live Personal</SelectItem>
                      <SelectItem value="Demo">Demo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="MYR">MYR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Balance</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="100000"
                        {...field}
                      />
                    </FormControl>
                    {conversionNote && (
                      <FormDescription className="text-xs">
                        {conversionNote}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => field.onChange(preset.value)}
                          className={cn(
                            "w-10 h-10 rounded-full border-2 transition-all",
                            field.value === preset.value
                              ? "border-foreground scale-110"
                              : "border-transparent hover:border-foreground/50"
                          )}
                          style={{ backgroundColor: preset.value }}
                          aria-label={`Select ${preset.name} color`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Choose a color to categorize this account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Account"
                : "Create Account"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
