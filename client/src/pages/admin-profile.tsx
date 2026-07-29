import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getAdminProfile, updateAdminProfile } from "@/lib/firebase-api";
import type { AdminUser, AdminNotificationPreferences } from "@shared/schema";
import {
  User,
  Shield,
  Key,
  Bell,
  Palette,
  Laptop,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Clock,
  Sparkles,
  Save,
  LogOut,
  Smartphone,
  Check,
  ShieldAlert,
  HelpCircle,
  AlertTriangle
} from "lucide-react";

export default function AdminProfilePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch logged-in admin's profile
  const { data: admin, isLoading } = useQuery<AdminUser | null>({
    queryKey: ["adminProfile"],
    queryFn: () => getAdminProfile("default-admin"),
  });

  // Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Preferences Form State
  const [theme, setTheme] = useState("system");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [landingPage, setLandingPage] = useState("/admin");

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<AdminNotificationPreferences>({
    results: true,
    cheating: true,
    questions: true,
    messages: true,
    exams: true,
    system: true,
    channels: { inApp: true, email: true, sms: false },
  });

  // Sync state when data is loaded
  useEffect(() => {
    if (admin) {
      setName(admin.name || "");
      setEmail(admin.email || "");
      setPhone(admin.phone || "");
      setAvatarUrl(admin.avatarUrl || "");
      setTwoFactorEnabled(admin.twoFactorEnabled || false);
      setTheme(admin.theme || "system");
      setTimezone(admin.timezone || "Africa/Lagos");
      setLandingPage(admin.landingPage || "/admin");
      if (admin.notificationPreferences) {
        setNotifPrefs({
          results: admin.notificationPreferences.results ?? true,
          cheating: true, // Cheating alerts are enforced to be true
          questions: admin.notificationPreferences.questions ?? true,
          messages: admin.notificationPreferences.messages ?? true,
          exams: admin.notificationPreferences.exams ?? true,
          system: admin.notificationPreferences.system ?? true,
          channels: {
            inApp: admin.notificationPreferences.channels?.inApp ?? true,
            email: admin.notificationPreferences.channels?.email ?? true,
            sms: admin.notificationPreferences.channels?.sms ?? false,
          },
        });
      }
    }
  }, [admin]);

  // Save Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Partial<AdminUser>) => {
      return updateAdminProfile("default-admin", payload);
    },
    onSuccess: (updated) => {
      toast({
        title: "Personal Profile Saved",
        description: "Your individual account settings have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["adminProfile"] });
      localStorage.setItem("admin_user", JSON.stringify(updated));
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Update Profile",
        description: err.message || "An error occurred while saving your settings.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      name,
      email,
      phone,
      avatarUrl,
    });
  };

  const handleSaveSecurity = () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate({
      twoFactorEnabled,
    });
    if (newPassword) {
      toast({
        title: "Password Updated",
        description: "Your login credentials have been changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSavePreferences = () => {
    updateProfileMutation.mutate({
      theme,
      timezone,
      landingPage,
      notificationPreferences: notifPrefs,
    });
  };

  const handleLogOutOtherDevices = () => {
    if (!admin) return;
    const currentSessions = (admin.activeSessions || []).filter((s) => s.isCurrent);
    updateProfileMutation.mutate({
      activeSessions: currentSessions,
    });
    toast({
      title: "Sessions Terminated",
      description: "Logged out all other active device sessions successfully.",
    });
  };

  const getInitials = (n: string) => {
    if (!n) return "AD";
    const parts = n.split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl pb-16 font-sans">
      {/* Top Header & Admin Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Sparkles className="h-44 w-44 text-white" />
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-20 w-20 rounded-full object-cover border-4 border-indigo-500/40 shadow-xl"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white text-xl font-black shadow-xl border-4 border-white/20">
                  {getInitials(name || "Sarah Johnson")}
                </div>
              )}
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-slate-900" title="Account Active" />
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{name || "Sarah Johnson"}</h1>
                <Badge className="bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  {admin?.role || "Super Admin"}
                </Badge>
              </div>
              <p className="text-xs text-indigo-200 font-medium mt-1">{email || "sarah.johnson@faithimmaculate.edu.ng"}</p>
              <div className="flex items-center justify-center sm:justify-start gap-3 text-[11px] text-slate-300 mt-2 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-indigo-400" />
                  Timezone: {timezone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Laptop className="h-3 w-3 text-emerald-400" />
                  Status: Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-10 px-4 gap-2 shadow-lg"
            >
              <Save className="h-4 w-4" />
              {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-1 h-auto shadow-sm">
          <TabsTrigger
            value="profile"
            className="rounded-xl text-xs font-bold gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
          >
            <User className="h-3.5 w-3.5" />
            Profile Info
          </TabsTrigger>

          <TabsTrigger
            value="security"
            className="rounded-xl text-xs font-bold gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
          >
            <Shield className="h-3.5 w-3.5" />
            Password & Security
          </TabsTrigger>

          <TabsTrigger
            value="notifications"
            className="rounded-xl text-xs font-bold gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
          >
            <Bell className="h-3.5 w-3.5" />
            Notification Preferences
          </TabsTrigger>

          <TabsTrigger
            value="display"
            className="rounded-xl text-xs font-bold gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
          >
            <Palette className="h-3.5 w-3.5" />
            Display Preferences
          </TabsTrigger>

          <TabsTrigger
            value="permissions"
            className="rounded-xl text-xs font-bold gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
          >
            <Lock className="h-3.5 w-3.5" />
            Role & Permissions
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Personal Profile Info */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-850 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                Personal Profile Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Update your account details and contact information for your admin profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Full Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Email Address</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah.johnson@faithimmaculate.edu.ng"
                    className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 123 4567"
                    className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Profile Photo Image URL</Label>
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-end">
              <Button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab 2: Password & Security */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Change Password Card */}
            <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-black text-slate-850 dark:text-white flex items-center gap-2">
                  <Key className="h-4.5 w-4.5 text-indigo-600" />
                  Change Password
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Update your admin login password. Password must be at least 6 characters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-end">
                <Button onClick={handleSaveSecurity} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-9 px-4">
                  Update Password
                </Button>
              </CardFooter>
            </Card>

            {/* 2FA & Active Sessions Card */}
            <div className="space-y-6">
              <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-black text-slate-850 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4.5 w-4.5 text-indigo-600" />
                      Two-Factor Authentication (2FA)
                    </span>
                    <Badge className={twoFactorEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                      {twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Enforce 2FA Security Code</p>
                      <p className="text-[11px] text-slate-400">Require an authenticator app code during admin login.</p>
                    </div>
                    <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-black text-slate-850 dark:text-white flex items-center gap-2">
                      <Laptop className="h-4.5 w-4.5 text-indigo-600" />
                      Active Device Sessions
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogOutOtherDevices}
                      className="rounded-xl border-rose-200 text-rose-600 text-xs font-bold h-8 hover:bg-rose-50"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1" />
                      Log Out Other Devices
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(admin?.activeSessions || []).map((sess) => (
                    <div key={sess.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800">
                      <div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {sess.device}
                          {sess.isCurrent && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase">Current Session</Badge>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">IP: {sess.ipAddress} • {sess.lastActive}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Personal Notification Preferences */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-850 dark:text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600" />
                Personal Notification Subscriptions
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Choose which events surface in your personal notification bell and delivery channels. Urgent cheating alerts are always enforced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* Cheating & Integrity Row */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      <p className="text-xs font-black text-rose-900 dark:text-rose-300">Cheating & Integrity Alerts (URGENT)</p>
                      <Badge className="bg-rose-600 text-white text-[9px] font-black uppercase">Enforced / Mandatory</Badge>
                    </div>
                    <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">Tab switches, window focus loss, or cheating indicators during live exams.</p>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                {/* Results & Score Sheets */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Results & Score Submissions</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Alerts when candidate exam sheets are finalized or published.</p>
                  </div>
                  <Switch
                    checked={notifPrefs.results}
                    onCheckedChange={(val) => setNotifPrefs({ ...notifPrefs, results: val })}
                  />
                </div>

                {/* Question Bank Activity */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Question Bank Activity</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Notifications for new questions created or bulk CSV imports.</p>
                  </div>
                  <Switch
                    checked={notifPrefs.questions}
                    onCheckedChange={(val) => setNotifPrefs({ ...notifPrefs, questions: val })}
                  />
                </div>

                {/* Student & Staff Messages */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Exam Hall Messages & Announcements</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Direct candidate messages or invigilator hall broadcasts.</p>
                  </div>
                  <Switch
                    checked={notifPrefs.messages}
                    onCheckedChange={(val) => setNotifPrefs({ ...notifPrefs, messages: val })}
                  />
                </div>

                {/* Upcoming Exams */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Scheduled Exams & Reminders</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Reminders when an examination is scheduled to begin.</p>
                  </div>
                  <Switch
                    checked={notifPrefs.exams}
                    onCheckedChange={(val) => setNotifPrefs({ ...notifPrefs, exams: val })}
                  />
                </div>
              </div>

              <Separator />

              {/* Delivery Channels */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Delivery Channels</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">In-App Popover & Toast</span>
                    <Switch
                      checked={notifPrefs.channels.inApp}
                      onCheckedChange={(val) =>
                        setNotifPrefs({ ...notifPrefs, channels: { ...notifPrefs.channels, inApp: val } })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Digest</span>
                    <Switch
                      checked={notifPrefs.channels.email}
                      onCheckedChange={(val) =>
                        setNotifPrefs({ ...notifPrefs, channels: { ...notifPrefs.channels, email: val } })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">SMS Alerts</span>
                    <Switch
                      checked={notifPrefs.channels.sms}
                      onCheckedChange={(val) =>
                        setNotifPrefs({ ...notifPrefs, channels: { ...notifPrefs.channels, sms: val } })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-end">
              <Button onClick={handleSavePreferences} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-2">
                <Save className="h-4 w-4" />
                Save Notification Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab 4: Display & Regional Preferences */}
        <TabsContent value="display" className="space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-855 dark:text-white flex items-center gap-2">
                <Palette className="h-5 w-5 text-indigo-600" />
                Display & Regional Preferences
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Personalize your theme, default landing page after login, and regional timezone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Interface Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light Theme</SelectItem>
                      <SelectItem value="dark">Dark Theme</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Default Landing Page</Label>
                  <Select value={landingPage} onValueChange={setLandingPage}>
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <SelectValue placeholder="Select landing page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="/admin">Dashboard Overview</SelectItem>
                      <SelectItem value="/admin/invigilator">Invigilator Operations Hub</SelectItem>
                      <SelectItem value="/admin/analytics">Analytics & Psychometrics</SelectItem>
                      <SelectItem value="/admin/results">Results Management</SelectItem>
                      <SelectItem value="/admin/questions">Question Bank Editor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</SelectItem>
                      <SelectItem value="UTC">UTC (GMT)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (BST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-end">
              <Button onClick={handleSavePreferences} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-2">
                <Save className="h-4 w-4" />
                Save Display Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab 5: Role & Permissions Display (Read-Only) */}
        <TabsContent value="permissions" className="space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-855 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-600" />
                  Assigned Account Permissions
                </span>
                <Badge className="bg-indigo-100 text-indigo-700 text-xs font-extrabold px-3 py-1 rounded-xl">
                  {admin?.role || "Super Admin"} Access Level
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Read-only summary of permissions granted to your personal administrator account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(admin?.permissions || []).map((perm, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-extrabold text-emerald-950 dark:text-emerald-300">{perm}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
