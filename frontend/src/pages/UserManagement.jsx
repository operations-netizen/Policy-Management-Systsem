import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Briefcase,
  Loader2,
  Mail,
  Pencil,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, PageShell } from "@/components/layout/PageLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 
export default function UserManagement() {
  const { user: authUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    employeeType: "permanent_india",
    hodId: "",
    freelancerInitiatorIds: [],
  });

  const { data: users, isLoading, refetch } = api.users.getAll.useQuery();

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "employee",
      employeeType: "permanent_india",
      hodId: "",
      freelancerInitiatorIds: [],
    });
  };

  const createUser = api.users.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      resetForm();
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateUser = api.users.update.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      setIsDialogOpen(false);
      setEditingUser(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteUser = api.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (formData.role === "hod" && !formData.hodId) {
      toast.error("Please assign an Admin as HOD for this HOD user");
      return;
    }

    if ((formData.role === "employee" || formData.role === "account") && !formData.hodId) {
      toast.error("Please assign a HOD for this user");
      return;
    }

    if (editingUser) {
      const { freelancerInitiatorIds, ...payload } = formData;
      updateUser.mutate({
        id: editingUser._id,
        ...payload,
        password: formData.password || undefined,
      });
      return;
    }

    const { freelancerInitiatorIds, ...payload } = formData;
    createUser.mutate(payload);
  };

  const handleEdit = (entry) => {
    setEditingUser(entry);
    setFormData({
      name: entry.name || "",
      email: entry.email,
      password: "",
      role: entry.role,
      employeeType: entry.employeeType || "permanent_india",
      hodId: entry.hodId?.toString() || "",
      freelancerInitiatorIds: entry.freelancerInitiatorIds || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (userId) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUser.mutate({ id: userId });
    }
  };

  const handleDialogClose = (open) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingUser(null);
      resetForm();
    }
  };

  const admins = useMemo(() => users?.filter((entry) => entry.role === "admin") || [], [users]);

  const hodOptions = useMemo(
    () => users?.filter((entry) => entry.role === "hod" || entry.role === "admin") || [],
    [users],
  );

  const usersById = useMemo(() => {
    const map = new Map();
    (users || []).forEach((entry) => {
      map.set(entry._id?.toString(), entry);
    });
    return map;
  }, [users]);

  const visibleUsers = useMemo(() => {
    if (!authUser || authUser.role !== "hod") {
      return users || [];
    }

    return (users || []).filter(
      (entry) => entry?._id?.toString() === authUser.id || entry?.hodId?.toString() === authUser.id,
    );
  }, [users, authUser]);

  useEffect(() => {
    if (isDialogOpen && !editingUser) {
      resetForm();
    }
  }, [isDialogOpen, editingUser]);

  const roleBadgeTone = (role) => {
    switch (role) {
      case "admin":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "hod":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "account":
        return "bg-violet-100 text-violet-800 border-violet-200";
      case "employee":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const roleLabel = (role) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "hod":
        return "HOD";
      case "account":
        return "Account";
      case "employee":
        return "Employee";
      default:
        return "Employee";
    }
  };

  const getEmployeeTypeLabel = (type) => {
    switch (type) {
      case "permanent_india":
        return "Permanent (India)";
      case "permanent_usa":
        return "Permanent (USA)";
      case "freelancer_india":
        return "Freelancer (India)";
      case "freelancer_usa":
        return "Freelancer (USA)";
      default:
        return "Employee";
    }
  };

  const getInitials = (nameOrEmail) => {
    if (!nameOrEmail) return "U";
    const cleaned = nameOrEmail.split("@")[0];
    const parts = cleaned.replace(/[^a-zA-Z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return (visibleUsers || [])
      .filter((entry) => {
        if (!query) {
          return true;
        }

        const manager = entry?.hodId ? usersById.get(entry.hodId?.toString()) : null;
        const searchable = [
          entry.name || "",
          entry.email || "",
          entry.role || "",
          entry.employeeType || "",
          manager?.name || "",
          manager?.email || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => {
        const priority = { admin: 0, hod: 1, account: 2, employee: 3 };
        const roleDiff = (priority[a.role] ?? 99) - (priority[b.role] ?? 99);
        if (roleDiff !== 0) return roleDiff;
        return (a.name || a.email || "").localeCompare(b.name || b.email || "");
      });
  }, [visibleUsers, searchQuery, usersById]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="User Management"
        description="Manage user identities, access roles, and organization hierarchy"
        action={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => {
                  setEditingUser(null);
                  resetForm();
                }}
              >
                <UserPlus className="h-5 w-5" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl text-foreground">
                  {editingUser ? "Edit User" : "Create New User"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-2 space-y-5">
                <div className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                        <Users className="h-4 w-4 text-primary" />
                        Full Name *
                      </Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        className="h-11"
                        required
                      />
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="h-4 w-4 text-primary" />
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                        className="h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                      <Shield className="h-4 w-4 text-primary" />
                      Password {editingUser ? "(leave blank to keep current)" : "*"}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                      className="h-11"
                      required={!editingUser}
                    />
                  </div>
                </div>

                <div className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Shield className="h-4 w-4 text-primary" />
                        Role *
                      </Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="hod">HOD</SelectItem>
                          <SelectItem value="account">Account</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Employee Type *
                      </Label>
                      <Select
                        value={formData.employeeType}
                        onValueChange={(value) => setFormData({ ...formData, employeeType: value })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="permanent_india">Permanent (India)</SelectItem>
                          <SelectItem value="permanent_usa">Permanent (USA)</SelectItem>
                          <SelectItem value="freelancer_india">Freelancer (India)</SelectItem>
                          <SelectItem value="freelancer_usa">Freelancer (USA)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {formData.role !== "admin" ? (
                  <div className="space-y-4 rounded-xl border border-border/60 bg-muted/40 p-4 sm:p-5">
                    <div className="space-y-2.5">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Users className="h-4 w-4 text-primary" />
                        {formData.role === "hod" ? "Assign Admin as HOD *" : "Assign HOD *"}
                      </Label>
                      <Select
                        value={formData.hodId || ""}
                        onValueChange={(value) => setFormData({ ...formData, hodId: value })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={formData.role === "hod" ? "Select Admin" : "Select HOD"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(formData.role === "hod" ? admins : hodOptions).map((entry) => (
                            <SelectItem key={entry._id.toString()} value={entry._id.toString()}>
                              {entry.name || entry.email} ({entry.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.employeeType?.startsWith("freelancer") ? (
                      <div className="rounded-lg border border-dashed bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                        Initiators are assigned later from Employee Management.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
                  <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUser.isPending || updateUser.isPending}
                    className="gap-2"
                  >
                    {createUser.isPending || updateUser.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {editingUser ? "Update User" : "Create User"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="w-full max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search users..."
            className="pl-9"
          />
        </div>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Users ({filteredUsers.length})</CardTitle>
            <p className="text-sm text-muted-foreground">Select a user to manage access</p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No users found for this search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((entry) => (
                  <TableRow key={entry._id.toString()}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {getInitials(entry.name || entry.email)}
                        </div>
                        <span className="font-medium text-foreground">{entry.name || "Unnamed User"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.email}</TableCell>
                    <TableCell>
                      <Badge className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBadgeTone(entry.role)}`}>
                        {roleLabel(entry.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(entry)} className="gap-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(entry._id.toString())}
                          className="gap-1.5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
