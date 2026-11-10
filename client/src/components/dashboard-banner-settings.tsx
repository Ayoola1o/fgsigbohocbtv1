import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const endpoint = "/api/admin/dashboard/banner";
const queryKey = [endpoint];

export function DashboardBannerSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const banner = useQuery<{ image: string }>({ queryKey, retry: false });
  const save = useMutation({
    mutationFn: async (file: File | null) => {
      let image = "";
      if (file) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
          throw new Error("Choose a JPEG, PNG, or WebP image up to 1 MB.");
        }
        image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read the image."));
          reader.readAsDataURL(file);
        });
      }
      return apiRequest<{ image: string }>("PUT", endpoint, { image });
    },
    onSuccess: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, data);
      toast({ title: data.image ? "Dashboard banner saved" : "Dashboard banner removed" });
    },
    onError: (error: Error) => toast({ title: "Banner could not be saved", description: error.message, variant: "destructive" }),
  });

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ImagePlus size={18} /> Dashboard header image</CardTitle>
        <CardDescription>Use a wide school photo, ideally 1600 × 400 pixels. JPEG, PNG, or WebP up to 1 MB. Changes save immediately.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {banner.data?.image && <img src={banner.data.image} alt="Current dashboard header" className="aspect-[4/1] w-full rounded-xl object-cover" />}
        {banner.isError && <p className="text-sm text-destructive" role="alert">Banner storage is unavailable. <button className="underline" onClick={() => void banner.refetch()}>Retry</button></p>}
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) save.mutate(file);
          }} />
          <Button type="button" variant="outline" disabled={save.isPending || !banner.data} onClick={() => input.current?.click()}>
            {save.isPending ? "Saving…" : banner.data?.image ? "Replace image" : "Upload image"}
          </Button>
          {banner.data?.image && <Button type="button" variant="ghost" disabled={save.isPending} onClick={() => save.mutate(null)}>Remove image</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
