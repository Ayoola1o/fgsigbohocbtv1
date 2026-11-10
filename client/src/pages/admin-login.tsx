import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function AdminLoginPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast({
                title: "Error",
                description: "Please enter your Supabase email and password",
                variant: "destructive",
            });
            return;
        }
        setLoading(true);
        try {
            const admin = await apiRequest<{ id: string; username: string }>(
                "POST",
                "/api/admin/login",
                { email: email.trim(), password },
                { timeoutMs: 20_000 },
            );
            toast({ title: "Logged in", description: `Welcome back, ${admin.username}!` });
            setLocation("/admin");
        } catch (err: any) {
            toast({
                title: "Login failed",
                description: err?.message || "Invalid credentials",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
            style={{ backgroundImage: 'url("/login-bg.jpg")' }}
        >
            <div className="absolute inset-0 bg-black/50" />
            <div className="w-full max-w-md p-4 relative z-10">
                <Card className="shadow-2xl bg-white/10 backdrop-blur-md border-white/20">
                    <CardContent className="p-8">
                        <div className="flex justify-center mb-6">
                            <img src="/logo.png" alt="Faith Immaculate Academy" className="w-24 h-24 drop-shadow-lg" />
                        </div>
                        <h1 className="text-2xl font-bold text-center mb-2 text-white">Admin Portal</h1>
                        <p className="text-gray-200 text-center mb-8">Sign in to manage the system</p>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <Label htmlFor="email" className="text-white">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your Supabase email"
                                    className="mt-1 bg-white/20 border-white/20 text-white placeholder:text-gray-300 focus-visible:ring-white/50"
                                    autoCapitalize="none"
                                    autoComplete="username"
                                />
                            </div>
                            <div className="mb-6">
                                <Label htmlFor="password" className="text-white">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="mt-1 bg-white/20 border-white/20 text-white placeholder:text-gray-300 focus-visible:ring-white/50"
                                />
                            </div>
                            <Button type="submit" disabled={loading} className="w-full bg-white text-primary hover:bg-white/90 font-semibold shadow-lg">
                                {loading ? "Logging in..." : "Login"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
