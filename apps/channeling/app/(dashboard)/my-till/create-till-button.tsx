"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { createMyTillAccount } from "@/app/actions/till.actions";
import { PlusCircle, Loader2 } from "lucide-react";

export function CreateTillButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const result = await createMyTillAccount();
      if (result.success) {
        toast({
          title: "Till created",
          description: result.message ?? "Your till account has been created.",
          variant: "default",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.message ?? "Could not create till account.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleCreate} disabled={loading} className="gap-2">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <PlusCircle className="h-4 w-4" />
      )}
      Create your Till
    </Button>
  );
}
