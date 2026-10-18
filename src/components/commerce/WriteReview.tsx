import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function WriteReview({ orderId, productId, productName }: { orderId: string; productId: string; productName: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!rating || saving) return;
    setSaving(true);
    setError("");
    try {
      const { error: failure } = await supabase.rpc("submit_product_review", {
        _order_id: orderId, _product_id: productId, _rating: rating, _comment: comment,
      });
      if (failure) throw failure;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["buyer-reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] }),
      ]);
      setOpen(false);
      toast.success("Review submitted");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : (failure as { message?: string })?.message ?? "Unable to submit your review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!saving) setOpen(value); }}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="mt-2">Write Review</Button></DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <DialogHeader>
          <DialogTitle>Write Review</DialogTitle>
          <DialogDescription className="break-words">{productName}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <fieldset disabled={saving}>
            <legend className="mb-2 text-sm font-semibold">Rating</legend>
            <div className="flex gap-1" role="group" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button key={value} type="button" variant="ghost" size="icon" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} onClick={() => setRating(value)} className="text-warning">
                  <Star className={cn("size-6", value <= rating && "fill-current")} />
                </Button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="review-comment" className="text-sm font-semibold">Comment <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} disabled={saving} className="mt-2" rows={4} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!rating || saving} className="w-full">{saving && <Loader2 className="size-4 animate-spin" />}Submit Review</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}