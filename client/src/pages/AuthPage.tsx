import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const { toast } = useToast();
  
  const onSubmit = async (data: InsertUser) => {
    try {
      await apiRequest("POST", "/api/login", data);
      
      toast({
        title: "Access Granted",
        description: "Loading terminal...",
      });
      
      // We use window.location.href to force a full reload 
      // ensuring the secure session cookie is picked up correctly.
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: error.message || "Invalid credentials.",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] relative overflow-hidden p-4">
      {/* Subtle noise overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')]" />
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />

      {/* Main Branding Section */}
      <div className="z-10 text-center mb-8 flex flex-col items-center">
        {/* BIG OPES TITLE */}
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-2 font-heading">
          OPES FORGE
        </h1>
        
        {/* SUBTITLE */}
        <p className="text-sm md:text-base text-zinc-400 uppercase tracking-[0.2em] mb-8 border-b border-zinc-800 pb-4">
          Where Strategy Becomes Capital
        </p>

        {/* QUOTE */}
        <div className="max-w-md px-4 mb-4">
          <p className="text-sm italic text-zinc-500 leading-relaxed">
            "The goal of a successful trader is to make the best trades. Money is secondary."
          </p>
          <p className="text-xs text-zinc-600 mt-2 uppercase tracking-wider">
            — Alexander Elder
          </p>
        </div>
      </div>

      {/* Login Card with gradient border */}
      <div className="w-full max-w-md z-10 p-[1px] rounded-xl bg-gradient-to-br from-blue-600/50 via-zinc-600/30 to-amber-600/30 shadow-2xl shadow-blue-900/20">
        <Card className="w-full border-0 bg-zinc-950/90 backdrop-blur-xl rounded-xl">
          <CardHeader className="text-center pb-2">
            <CardDescription className="text-zinc-500">
              Identity verification required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm onSubmit={onSubmit} />
          </CardContent>
        </Card>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-6 z-10">
        <p className="text-xs text-zinc-600 uppercase tracking-widest">
          Fhynk Capital © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

function AuthForm({ onSubmit }: { onSubmit: (data: InsertUser) => void | Promise<void> }) {
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-400 text-xs uppercase tracking-wide">ID</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  className="bg-zinc-900/50 border-zinc-800 focus:border-blue-600/50 focus:ring-0 transition-all text-white placeholder:text-zinc-600" 
                  placeholder="Enter ID"
                  autoComplete="username"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-400 text-xs uppercase tracking-wide">Key</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  {...field} 
                  className="bg-zinc-900/50 border-zinc-800 focus:border-blue-600/50 focus:ring-0 transition-all text-white placeholder:text-zinc-600"
                  placeholder="Enter Key"
                  autoComplete="current-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_20px_rgba(37,99,235,0.15)] hover:shadow-[0_0_30px_rgba(37,99,235,0.25)] transition-all" 
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Verifying..." : "Authenticate"}
        </Button>
      </form>
    </Form>
  );
}