import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, UserPlus, Settings2, Trash2, Calendar, Pencil, Check, ChevronsUpDown, X, Search, Users, Briefcase, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getUserCurrency } from "@/lib/currency";
import { KpiCard, PageHeader, PageShell } from "@/components/layout/PageLayout";
  
const EMPLOYEE_CARD_GRID_CLASS = "grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3";
 
const employeeTypeLabel = (type) => {
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
      return "Permanent (India)";
  }
};

export default function EmployeeManagement() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "hod";
  const currentUserId = useMemo(
    () => user?.id?.toString?.() || user?._id?.toString?.() || "",
    [user?.id, user?._id],
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitiateDialogOpen, setIsInitiateDialogOpen] = useState(false);
  const [initiateTarget, setInitiateTarget] = useState(null);
  const [initiateForm, setInitiateForm] = useState({ details: "", amount: "", files: [] });
  const [isInitiateSubmitting, setIsInitiateSubmitting] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [policyTarget, setPolicyTarget] = useState(null);
  const [policyForm, setPolicyForm] = useState({
    assignmentId: "",
    details: "",
    amount: "",
    files: [],
  });
  const [isPolicySubmitting, setIsPolicySubmitting] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    policyId: "",
    initiatorIds: [],
    effectiveDate: "",
  });
  const [initiatorSearchQuery, setInitiatorSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    employeeType: "permanent_india",
    hodId: "",
    freelancerInitiatorIds: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState("all");

  const { data: team, isLoading, refetch } = api.team.getMyTeam.useQuery();
  const { data: users } = api.users.getAll.useQuery(undefined, { enabled: isManager });
  const { data: policies } = api.policies.getAll.useQuery(undefined, { enabled: isManager });

  const updateEmployee = api.users.update.useMutation();
  const uploadCreditAttachments = api.creditRequests.uploadAttachments.useMutation();
  const createCreditRequest = api.creditRequests.create.useMutation();

  const removeEmployee = api.users.update.useMutation({
    onSuccess: () => {
      toast.success("Removed from employee management");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const assignPolicy = api.team.assignPolicy.useMutation({
    onSuccess: () => {
      toast.success("Policy assigned successfully");
      setAssignmentForm({ policyId: "", initiatorIds: [], effectiveDate: "" });
      setInitiatorSearchQuery("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removePolicy = api.team.removePolicy.useMutation({
    onSuccess: () => {
      toast.success("Policy removed successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      employeeType: "permanent_india",
      hodId: user?.role === "hod" ? currentUserId : "",
      freelancerInitiatorIds: [],
    });
    setSelectedUserIds([]);
  };

  const hodOptions = users?.filter((user) => user.role === "hod" || user.role === "admin") || [];
  const initiatorOptions = users || [];
  const userPickerOptions = useMemo(() => {
    if (!isManager) {
      return [];
    }
    if (user?.role === "hod") {
      return (users || []).filter((entry) => entry?.hodId?.toString() === currentUserId);
    }
    return users || [];
  }, [isManager, user?.role, currentUserId, users]);
  const employees = useMemo(
    () => (team || []).filter((member) => member.role === "employee" && member.isEmployee !== false),
    [team],
  );
  const activePolicies = policies?.filter((policy) => policy.status === "active") || [];
  const usersById = useMemo(() => {
    const map = new Map();
    (users || []).forEach((entry) => {
      map.set(entry._id.toString(), entry);
    });
    return map;
  }, [users]);
  const selectedUsers = useMemo(
    () => selectedUserIds.map((id) => usersById.get(id)).filter(Boolean),
    [selectedUserIds, usersById],
  );
  const selectedUsersMissingHod = useMemo(
    () => selectedUsers.filter((entry) => !entry?.hodId),
    [selectedUsers],
  );
  const selectedAssignedHodIds = useMemo(
    () =>
      Array.from(
        new Set(
          selectedUsers
            .map((entry) => entry?.hodId?.toString?.())
            .filter(Boolean),
        ),
      ),
    [selectedUsers],
  );
  const shouldShowHodPicker =
    user?.role !== "hod" && (editingEmployee || selectedUsers.length === 0 || selectedUsersMissingHod.length > 0);
  const assignedHodSummary = useMemo(() => {
    if (selectedAssignedHodIds.length === 0) {
      return "";
    }
    if (selectedAssignedHodIds.length === 1) {
      const assigned = usersById.get(selectedAssignedHodIds[0]);
      return assigned
        ? `${assigned.name || assigned.email} (${assigned.role})`
        : "Assigned HOD";
    }
    return "Multiple HODs already assigned";
  }, [selectedAssignedHodIds, usersById]);
  const selectedUsersMissingEmployeeType = useMemo(
    () => selectedUsers.filter((entry) => !entry?.employeeType),
    [selectedUsers],
  );
  const selectedAssignedEmployeeTypes = useMemo(
    () =>
      Array.from(
        new Set(
          selectedUsers
            .map((entry) => entry?.employeeType)
            .filter(Boolean),
        ),
      ),
    [selectedUsers],
  );
  const shouldShowEmployeeTypePicker =
    !!editingEmployee || selectedUsers.length === 0 || selectedUsersMissingEmployeeType.length > 0;
  const assignedEmployeeTypeSummary = useMemo(() => {
    if (selectedAssignedEmployeeTypes.length === 0) {
      return "";
    }
    if (selectedAssignedEmployeeTypes.length === 1) {
      return employeeTypeLabel(selectedAssignedEmployeeTypes[0]);
    }
    return "Multiple employee types already assigned";
  }, [selectedAssignedEmployeeTypes]);
  const shouldConfigureFreelancerInitiators = useMemo(() => {
    if (editingEmployee) {
      return formData.employeeType?.startsWith("freelancer");
    }
    if (selectedUsers.length === 0) {
      return formData.employeeType?.startsWith("freelancer");
    }
    return selectedUsers.some((entry) => {
      const resolvedType = entry?.employeeType || formData.employeeType;
      return resolvedType?.startsWith("freelancer");
    });
  }, [editingEmployee, selectedUsers, formData.employeeType]);
  const filteredInitiatorOptions = useMemo(() => {
    const query = initiatorSearchQuery.trim().toLowerCase();
    const sorted = [...initiatorOptions].sort((left, right) => {
      const leftValue = (left?.name || left?.email || "").toLowerCase();
      const rightValue = (right?.name || right?.email || "").toLowerCase();
      return leftValue.localeCompare(rightValue);
    });
    if (!query) {
      return sorted;
    }
    return sorted.filter((entry) => {
      const searchable = `${entry?.name || ""} ${entry?.email || ""} ${entry?.role || ""}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [initiatorOptions, initiatorSearchQuery]);
  const selectedInitiatorUsers = useMemo(
    () => assignmentForm.initiatorIds.map((id) => usersById.get(id)).filter(Boolean),
    [assignmentForm.initiatorIds, usersById],
  );
  const getInitiatorNames = (employee) => {
    if (!employee?.employeeType?.startsWith("freelancer")) {
      return [];
    }
    const direct = employee.freelancerInitiators || [];
    const namesFromDirect = direct.map((init) => init?.name || init?.email).filter(Boolean);
    if (namesFromDirect.length > 0) {
      return namesFromDirect;
    }
    const ids = employee.freelancerInitiatorIds || [];
    return ids
      .map((id) => usersById.get(id))
      .map((init) => init?.name || init?.email)
      .filter(Boolean);
  };
  const getPolicyInitiatorNames = (employee) => {
    if (!employee?.policyAssignments) {
      return [];
    }
    const names = employee.policyAssignments
      .flatMap((assignment) => assignment?.initiators || [])
      .map((init) => init?.name || init?.email)
      .filter(Boolean);
    return Array.from(new Set(names));
  };
  const getHodDisplayName = (employee) => {
    if (!employee?.hodId) {
      return "-";
    }
    const fromHydration = employee?.hod?.name || employee?.hod?.email;
    if (fromHydration) {
      return fromHydration;
    }
    const fallback = users?.find((u) => u._id.toString() === employee.hodId?.toString());
    return fallback?.name || fallback?.email || "-";
  };
  const canInitiateForEmployee = (employee) => {
    if (!currentUserId) {
      return false;
    }
    if (!employee?.employeeType?.startsWith("freelancer")) {
      return false;
    }
    const hydratedIds = (employee.freelancerInitiators || [])
      .map((init) => init?._id?.toString())
      .filter(Boolean);
    const fallbackIds = (employee.freelancerInitiatorIds || []).map((id) => id?.toString()).filter(Boolean);
    const allIds = hydratedIds.length > 0 ? hydratedIds : fallbackIds;
    return allIds.includes(currentUserId);
  };
  const getInitiatablePolicyAssignments = (employee) => {
    if (!employee?.policyAssignments || !currentUserId) {
      return [];
    }
    return employee.policyAssignments.filter((assignment) => {
      const initiatorIds = (assignment.initiators || [])
        .map((init) => init?._id?.toString())
        .filter(Boolean);
      return initiatorIds.includes(currentUserId);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isManager) {
      toast.error("You do not have permission to add employees.");
      return;
    }
    const targetUserIds = editingEmployee ? [editingEmployee._id.toString()] : selectedUserIds;
    if (targetUserIds.length === 0) {
      toast.error("Please select at least one user.");
      return;
    }
    const resolveEmployeeTypeForUser = (id) => {
      if (editingEmployee) {
        return formData.employeeType;
      }
      const existingEmployeeType = usersById.get(id)?.employeeType || editingEmployee?.employeeType || "";
      if (existingEmployeeType) {
        return existingEmployeeType;
      }
      return formData.employeeType;
    };
    const missingEmployeeTypeIds = targetUserIds.filter((id) => !resolveEmployeeTypeForUser(id));
    if (missingEmployeeTypeIds.length > 0) {
      toast.error("Please select employee type for users without a type.");
      return;
    }
    const resolveHodIdForUser = (id) => {
      if (editingEmployee && user?.role !== "hod") {
        return formData.hodId;
      }
      if (user?.role === "hod") {
        return currentUserId;
      }
      const existingHodId =
        usersById.get(id)?.hodId?.toString?.() || editingEmployee?.hodId?.toString?.() || "";
      if (existingHodId) {
        return existingHodId;
      }
      return formData.hodId;
    };
    const missingHodIds = targetUserIds.filter((id) => !resolveHodIdForUser(id));
    if (missingHodIds.length > 0) {
      toast.error("Please select HOD for users without an assigned HOD.");
      return;
    }
    const freelancerTargetsWithoutInitiators = targetUserIds.filter((id) => {
      const resolvedEmployeeType = resolveEmployeeTypeForUser(id);
      if (!resolvedEmployeeType?.startsWith("freelancer")) {
        return false;
      }
      const existingInitiators = usersById.get(id)?.freelancerInitiatorIds || editingEmployee?.freelancerInitiatorIds || [];
      return existingInitiators.length === 0;
    });
    if (freelancerTargetsWithoutInitiators.length > 0 && formData.freelancerInitiatorIds.length === 0) {
      toast.error("Please assign at least one initiator for freelancers");
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.all(
        targetUserIds.map((id) => {
          const resolvedEmployeeType = resolveEmployeeTypeForUser(id);
          const shouldSendFreelancerInitiators =
            resolvedEmployeeType?.startsWith("freelancer") && formData.freelancerInitiatorIds.length > 0;
          return updateEmployee.mutateAsync({
            id,
            role: "employee",
            employeeType: resolvedEmployeeType,
            hodId: resolveHodIdForUser(id),
            isEmployee: true,
            freelancerInitiatorIds: shouldSendFreelancerInitiators
              ? formData.freelancerInitiatorIds
              : undefined,
          });
        }),
      );
      toast.success(
        editingEmployee
          ? "Employee updated successfully"
          : targetUserIds.length > 1
            ? "Employees added successfully"
            : "Employee added successfully",
      );
      setIsDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
      refetch();
    } catch (error) {
      toast.error(error?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setSelectedUserIds([employee._id.toString()]);
    setFormData({
      employeeType: employee.employeeType || "permanent_india",
      hodId: employee.hodId?.toString() || "",
      freelancerInitiatorIds: employee.freelancerInitiatorIds || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (!isManager) {
      return;
    }
    if (confirm("Remove this user from Employee Management?")) {
      removeEmployee.mutate({ id, isEmployee: false });
    }
  };

  const toggleFreelancerInitiator = (initiatorId) => {
    setFormData((prev) => ({
      ...prev,
      freelancerInitiatorIds: prev.freelancerInitiatorIds.includes(initiatorId)
        ? prev.freelancerInitiatorIds.filter((id) => id !== initiatorId)
        : [...prev.freelancerInitiatorIds, initiatorId],
    }));
  };

  const togglePolicyInitiator = (initiatorId) => {
    setAssignmentForm((prev) => ({
      ...prev,
      initiatorIds: prev.initiatorIds.includes(initiatorId)
        ? prev.initiatorIds.filter((id) => id !== initiatorId)
        : [...prev.initiatorIds, initiatorId],
    }));
  };
  const clearPolicyInitiators = () => {
    setAssignmentForm((prev) => ({ ...prev, initiatorIds: [] }));
  };
  const selectAllVisiblePolicyInitiators = () => {
    const visibleIds = filteredInitiatorOptions.map((entry) => entry._id.toString());
    setAssignmentForm((prev) => ({
      ...prev,
      initiatorIds: Array.from(new Set([...prev.initiatorIds, ...visibleIds])),
    }));
  };

  const handleAssignPolicy = () => {
    if (!selectedEmployee) {
      return;
    }
    if (!assignmentForm.policyId || assignmentForm.initiatorIds.length === 0) {
      toast.error("Select a policy and at least one initiator");
      return;
    }
    const effectiveDate = assignmentForm.effectiveDate || new Date().toISOString().slice(0, 10);
    assignPolicy.mutate({
      userId: selectedEmployee._id.toString(),
      policyId: assignmentForm.policyId,
      initiatorIds: assignmentForm.initiatorIds,
      effectiveDate,
    });
  };

  const handleRemoveAssignment = (assignmentId) => {
    if (confirm("Remove this policy assignment?")) {
      removePolicy.mutate({ assignmentId });
    }
  };

  const openInitiateDialog = (employee) => {
    setInitiateTarget(employee);
    setInitiateForm({ details: "", amount: "", files: [] });
    setIsInitiateDialogOpen(true);
  };

  const handleInitiateDialogChange = (open) => {
    setIsInitiateDialogOpen(open);
    if (!open) {
      setInitiateTarget(null);
      setInitiateForm({ details: "", amount: "", files: [] });
    }
  };

  const handleInitiateSubmit = async (event) => {
    event.preventDefault();
    if (!initiateTarget) {
      return;
    }
    if (!canInitiateForEmployee(initiateTarget)) {
      toast.error("You are not allowed to initiate for this freelancer.");
      return;
    }
    const amountValue = Number(initiateForm.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!initiateForm.details.trim()) {
      toast.error("Please provide freelancer details.");
      return;
    }
    setIsInitiateSubmitting(true);
    try {
      let attachments = [];
      if (initiateForm.files.length > 0) {
        const uploadResult = await uploadCreditAttachments.mutateAsync({
          files: initiateForm.files,
        });
        attachments = uploadResult?.attachments || [];
      }
      await createCreditRequest.mutateAsync({
        userId: initiateTarget._id.toString(),
        type: "freelancer",
        baseAmount: amountValue,
        bonus: 0,
        deductions: 0,
        amount: amountValue,
        amountItems: [
          {
            amount: amountValue,
            note: "Initiator submission",
            addedBy: currentUserId || undefined,
            addedAt: new Date().toISOString(),
          },
        ],
        calculationBreakdown: "Freelancer initiation",
        notes: initiateForm.details.trim(),
        attachments,
      });
      toast.success("Freelancer request submitted for approval.");
      handleInitiateDialogChange(false);
    } catch (error) {
      toast.error(error?.message || "Failed to submit request.");
    } finally {
      setIsInitiateSubmitting(false);
    }
  };
  const openPolicyDialog = (employee) => {
    const assignments = getInitiatablePolicyAssignments(employee);
    setPolicyTarget(employee);
    setPolicyForm({
      assignmentId: assignments[0]?._id?.toString() || "",
      details: "",
      amount: "",
      files: [],
    });
    setIsPolicyDialogOpen(true);
  };

  const handlePolicyDialogChange = (open) => {
    setIsPolicyDialogOpen(open);
    if (!open) {
      setPolicyTarget(null);
      setPolicyForm({ assignmentId: "", details: "", amount: "", files: [] });
    }
  };

  const handlePolicySubmit = async (event) => {
    event.preventDefault();
    if (!policyTarget) {
      return;
    }
    if (!policyForm.assignmentId) {
      toast.error("Please select a policy.");
      return;
    }
    const amountValue = Number(policyForm.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!policyForm.details.trim()) {
      toast.error("Please provide policy details.");
      return;
    }
    setIsPolicySubmitting(true);
    try {
      let attachments = [];
      if (policyForm.files.length > 0) {
        const uploadResult = await uploadCreditAttachments.mutateAsync({
          files: policyForm.files,
        });
        attachments = uploadResult?.attachments || [];
      }
      const assignment = policyTarget.policyAssignments?.find(
        (item) => item._id?.toString() === policyForm.assignmentId,
      );
      await createCreditRequest.mutateAsync({
        userId: policyTarget._id.toString(),
        type: "policy",
        policyId: assignment?.policyId || assignment?.policy?._id?.toString(),
        baseAmount: amountValue,
        bonus: 0,
        deductions: 0,
        amount: amountValue,
        amountItems: [
          {
            amount: amountValue,
            note: "Policy initiation",
            addedBy: currentUserId || undefined,
            addedAt: new Date().toISOString(),
          },
        ],
        calculationBreakdown: `Policy initiation${assignment?.policy?.name ? ` (${assignment.policy.name})` : ""}`,
        notes: policyForm.details.trim(),
        attachments,
      });
      toast.success("Policy request submitted for approval.");
      handlePolicyDialogChange(false);
    } catch (error) {
      toast.error(error?.message || "Failed to submit policy request.");
    } finally {
      setIsPolicySubmitting(false);
    }
  };
  const openAssignmentDrawer = (employee) => {
    setSelectedEmployee(employee);
    setAssignmentForm({ policyId: "", initiatorIds: [], effectiveDate: "" });
    setInitiatorSearchQuery("");
  };

  const handleDialogClose = (open) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingEmployee(null);
      setIsUserPickerOpen(false);
      resetForm();
    }
  };

  const toggleSelectedUser = (userId) => {
    if (editingEmployee) {
      return;
    }
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const getInitials = (nameOrEmail) => {
    if (!nameOrEmail) return "U";
    const cleaned = nameOrEmail.split("@")[0];
    const parts = cleaned.replace(/[^a-zA-Z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees
      .filter((employee) => {
        if (employeeTypeFilter !== "all" && employee.employeeType !== employeeTypeFilter) {
          return false;
        }
        if (!query) {
          return true;
        }
        const policyNames = (employee.policyAssignments || [])
          .map((assignment) => assignment.policy?.name)
          .filter(Boolean)
          .join(" ");
        const searchable = [
          employee.name,
          employee.email,
          employeeTypeLabel(employee.employeeType),
          getHodDisplayName(employee),
          getInitiatorNames(employee).join(" "),
          getPolicyInitiatorNames(employee).join(" "),
          policyNames,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) => {
        const left = (a?.name || a?.email || "").toLowerCase();
        const right = (b?.name || b?.email || "").toLowerCase();
        return left.localeCompare(right);
      });
  }, [employees, searchQuery, employeeTypeFilter, usersById]);
  const employeeStats = useMemo(() => {
    const total = employees.length;
    const permanent = employees.filter((entry) => entry.employeeType?.startsWith("permanent")).length;
    const freelancer = employees.filter((entry) => entry.employeeType?.startsWith("freelancer")).length;
    const withPolicies = employees.filter((entry) => (entry.policyAssignments || []).length > 0).length;
    return { total, permanent, freelancer, withPolicies };
  }, [employees]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Employee Management"
        description="Manage employees, freelancers, and policy assignments"
        action={isManager && (
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setEditingEmployee(null);
                resetForm();
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 space-y-5">
              <div className="space-y-2.5 rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
                <Label>Select Users *</Label>
                <Popover open={isUserPickerOpen} onOpenChange={setIsUserPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isUserPickerOpen}
                      disabled={!!editingEmployee}
                      className="h-auto min-h-12 w-full justify-between rounded-xl"
                    >
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.length > 0 ? (
                          selectedUsers.map((selected) => (
                            <Badge
                              key={selected._id.toString()}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              <span className="font-semibold">
                                {getInitials(selected.name || selected.email)}
                              </span>
                              <span className="truncate max-w-30">{selected.name || selected.email}</span>
                              {!editingEmployee && (
                                <button
                                  type="button"
                                  className="ml-1 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectedUser(selected._id.toString());
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">Select users...</span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search users..." />
                      <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                          {userPickerOptions.map((userOption) => {
                            const userId = userOption._id.toString();
                            const isSelected = selectedUserIds.includes(userId);
                            return (
                              <CommandItem
                                key={userId}
                                value={`${userOption.name || ""} ${userOption.email || ""} ${userOption.role || ""}`}
                                onSelect={() => toggleSelectedUser(userId)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-muted text-muted-foreground font-semibold flex items-center justify-center text-xs">
                                    {getInitials(userOption.name || userOption.email)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{userOption.name || "Unnamed User"}</span>
                                    <span className="text-xs text-muted-foreground">{userOption.email}</span>
                                  </div>
                                </div>
                                <div className="ml-auto flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground uppercase">{userOption.role}</span>
                                  <Check className={`h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {editingEmployee && selectedUsers[0] && (
                  <p className="text-xs text-muted-foreground">
                    Editing {selectedUsers[0].name || selectedUsers[0].email}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-5 rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5 md:grid-cols-2">
                <div className="space-y-2.5">
                  <Label htmlFor="employeeType">Employee Type *</Label>
                  {!shouldShowEmployeeTypePicker ? (
                    <Input value={assignedEmployeeTypeSummary || "Employee type already assigned"} className="h-11" readOnly />
                  ) : (
                    <Select
                      value={formData.employeeType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          employeeType: value,
                          freelancerInitiatorIds: value.startsWith("freelancer") ? prev.freelancerInitiatorIds : [],
                        }))
                      }
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
                  )}
                  {!editingEmployee && !shouldShowEmployeeTypePicker && selectedUsers.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Employee type is already assigned in User Management.
                    </p>
                  )}
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="hodId">Assign HOD *</Label>
                  {user?.role === "hod" ? (
                    <Input value={user?.name || user?.email || "Assigned to you"} className="h-11" readOnly />
                  ) : !shouldShowHodPicker ? (
                    <Input value={assignedHodSummary || "HOD already assigned"} className="h-11" readOnly />
                  ) : (
                    <Select value={formData.hodId} onValueChange={(value) => setFormData({ ...formData, hodId: value })}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select HOD" />
                      </SelectTrigger>
                      <SelectContent>
                        {hodOptions.map((hod) => (
                          <SelectItem key={hod._id.toString()} value={hod._id.toString()}>
                            {hod.name || hod.email} ({hod.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!editingEmployee && !shouldShowHodPicker && user?.role !== "hod" && selectedUsers.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      HOD is already assigned in User Management.
                    </p>
                  )}
                </div>
              </div>

              {shouldConfigureFreelancerInitiators && (
                <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/40 p-4 sm:p-5">
                  <Label>Assign Initiators *</Label>
                  <div className="mt-1 max-h-44 space-y-2 overflow-y-auto rounded-lg border bg-background p-3">
                    {initiatorOptions.map((user) => (
                      <div key={user._id.toString()} className="flex items-center space-x-2">
                        <Checkbox
                          id={`freelancer-init-${user._id.toString()}`}
                          checked={formData.freelancerInitiatorIds.includes(user._id.toString())}
                          onCheckedChange={() => toggleFreelancerInitiator(user._id.toString())}
                        />
                        <label htmlFor={`freelancer-init-${user._id.toString()}`} className="text-sm cursor-pointer">
                          {user.name || user.email} ({user.role})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || updateEmployee.isPending}>
                  {(isSubmitting || updateEmployee.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingEmployee ? "Update Employee" : "Add Employee"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Employees" value={employeeStats.total} hint="Current team size" icon={Users} tone="primary" />
        <KpiCard title="Permanent" value={employeeStats.permanent} hint="Permanent workforce" icon={ShieldCheck} tone="neutral" />
        <KpiCard title="Freelancers" value={employeeStats.freelancer} hint="Freelancer contributors" icon={Briefcase} tone="warning" />
        <KpiCard title="With Policies" value={employeeStats.withPolicies} hint="Assigned policy coverage" icon={Calendar} tone="success" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search employee, email, policy, initiator..."
                className="pl-9"
              />
            </div>
            <Select value={employeeTypeFilter} onValueChange={setEmployeeTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employee types</SelectItem>
                <SelectItem value="permanent_india">Permanent (India)</SelectItem>
                <SelectItem value="permanent_usa">Permanent (USA)</SelectItem>
                <SelectItem value="freelancer_india">Freelancer (India)</SelectItem>
                <SelectItem value="freelancer_usa">Freelancer (USA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {isManager
                ? "No employees yet. Add your first employee to get started."
                : "No employees assigned to you yet."}
            </p>
          </CardContent>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No employees matched your search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={EMPLOYEE_CARD_GRID_CLASS}>
          {filteredEmployees.map((employee) => {
            const initiatablePolicyAssignments = getInitiatablePolicyAssignments(employee);
            const canInitiate = canInitiateForEmployee(employee);
            const hasCardActions = canInitiate || initiatablePolicyAssignments.length > 0;
            const initiatorsText = employee.employeeType?.startsWith("freelancer")
              ? getInitiatorNames(employee).join(", ") || "-"
              : "-";
            const policiesText = (employee.policyAssignments || [])
              .map((assignment) => assignment.policy?.name)
              .filter(Boolean)
              .join(", ");
            const policyInitiatorsText = getPolicyInitiatorNames(employee).join(", ");
            const selectedPolicyName =
              activePolicies.find((policy) => policy._id.toString() === assignmentForm.policyId)?.name || "";
            const canSubmitPolicyAssignment = Boolean(assignmentForm.policyId) && assignmentForm.initiatorIds.length > 0;

            return (
            <Card key={employee._id.toString()} className="card-hover h-[460px] overflow-hidden border-border/80">
              <CardHeader className="pb-2">
                <div
                  className={`grid items-start overflow-hidden ${
                    isManager ? "grid-cols-[minmax(0,1fr)_auto] gap-3" : "grid-cols-1"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                      {getInitials(employee.name || employee.email)}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden pr-1">
                    <CardTitle className="truncate text-base" title={employee.name || "Unnamed"}>
                      {employee.name || "Unnamed"}
                    </CardTitle>
                    <p className="mt-1 truncate text-sm text-muted-foreground" title={employee.email || "-"}>
                      {employee.email || "-"}
                    </p>
                    </div>
                  </div>
                  {isManager && (
                    <div className="flex h-8 w-[116px] shrink-0 items-center justify-end gap-1.5 pl-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(employee._id.toString())}
                        className="h-8 w-8 shrink-0 rounded-lg text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8 shrink-0 rounded-lg"
                        onClick={() => handleEdit(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Sheet
                        open={selectedEmployee?._id?.toString() === employee._id?.toString()}
                        onOpenChange={(open) => {
                          if (!open) {
                            setSelectedEmployee(null);
                            setAssignmentForm({ policyId: "", initiatorIds: [], effectiveDate: "" });
                            setInitiatorSearchQuery("");
                          }
                        }}
                      >
                        <SheetTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 shrink-0 rounded-lg"
                            onClick={() => openAssignmentDrawer(employee)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="h-dvh w-full overflow-hidden p-0 sm:max-w-[620px]">
                          <SheetHeader className="border-b px-6 py-5">
                            <SheetTitle className="text-xl">Assign Policy</SheetTitle>
                            <SheetDescription>
                              {employee.name || "Unnamed"} ({employee.email || "-"})
                            </SheetDescription>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                                {employeeTypeLabel(employee.employeeType)}
                              </Badge>
                              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                                {(employee.policyAssignments || []).length} Current Assignments
                              </Badge>
                            </div>
                          </SheetHeader>

                          <div className="flex min-h-0 flex-1 flex-col">
                            <ScrollArea className="min-h-0 flex-1">
                              <div className="space-y-6 px-6 py-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Select Policy</Label>
                                    <Select
                                      value={assignmentForm.policyId}
                                      onValueChange={(value) =>
                                        setAssignmentForm((prev) => ({ ...prev, policyId: value }))
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose a policy" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {activePolicies.map((policy) => (
                                          <SelectItem key={policy._id.toString()} value={policy._id.toString()}>
                                            {policy.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Effective Date</Label>
                                    <Input
                                      type="date"
                                      value={assignmentForm.effectiveDate}
                                      onChange={(e) =>
                                        setAssignmentForm((prev) => ({ ...prev, effectiveDate: e.target.value }))
                                      }
                                    />
                                  </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <Label>Policy Initiators</Label>
                                      <p className="text-xs text-muted-foreground">
                                        Choose who can initiate requests for this policy.
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                                      {assignmentForm.initiatorIds.length} Selected
                                    </Badge>
                                  </div>

                                  <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      value={initiatorSearchQuery}
                                      onChange={(event) => setInitiatorSearchQuery(event.target.value)}
                                      placeholder="Search initiator by name, email, or role"
                                      className="pl-9"
                                    />
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={selectAllVisiblePolicyInitiators}
                                      disabled={filteredInitiatorOptions.length === 0}
                                    >
                                      Select Visible
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={clearPolicyInitiators}
                                      disabled={assignmentForm.initiatorIds.length === 0}
                                    >
                                      Clear Selection
                                    </Button>
                                  </div>

                                  {selectedInitiatorUsers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {selectedInitiatorUsers.map((selectedInit) => (
                                        <Badge
                                          key={selectedInit._id.toString()}
                                          variant="outline"
                                          className="max-w-full rounded-full px-3 py-1 text-xs"
                                        >
                                          <span className="truncate">{selectedInit.name || selectedInit.email}</span>
                                        </Badge>
                                      ))}
                                    </div>
                                  )}

                                  <div className="overflow-hidden rounded-xl border">
                                    <ScrollArea className="h-[280px]">
                                      <div className="space-y-1 p-2">
                                        {filteredInitiatorOptions.length === 0 ? (
                                          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                                            No initiators match your search.
                                          </p>
                                        ) : (
                                          filteredInitiatorOptions.map((initiatorUser) => {
                                            const initiatorId = initiatorUser._id.toString();
                                            const isChecked = assignmentForm.initiatorIds.includes(initiatorId);
                                            const roleLabel = (initiatorUser.role || "")
                                              .replace(/_/g, " ")
                                              .replace(/\b\w/g, (match) => match.toUpperCase());

                                            return (
                                              <label
                                                key={initiatorId}
                                                htmlFor={`policy-init-${employee._id.toString()}-${initiatorId}`}
                                                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/55"
                                              >
                                                <Checkbox
                                                  id={`policy-init-${employee._id.toString()}-${initiatorId}`}
                                                  checked={isChecked}
                                                  onCheckedChange={() => togglePolicyInitiator(initiatorId)}
                                                />
                                                <div className="min-w-0 flex-1">
                                                  <p className="truncate text-sm font-medium">
                                                    {initiatorUser.name || initiatorUser.email}
                                                  </p>
                                                  <p className="truncate text-xs text-muted-foreground">
                                                    {initiatorUser.email || "-"}
                                                  </p>
                                                </div>
                                                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                                                  {roleLabel}
                                                </Badge>
                                              </label>
                                            );
                                          })
                                        )}
                                      </div>
                                    </ScrollArea>
                                  </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <h4 className="text-base font-semibold">Current Assignments</h4>
                                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                                      {(employee.policyAssignments || []).length}
                                    </Badge>
                                  </div>

                                  {employee.policyAssignments && employee.policyAssignments.length > 0 ? (
                                    <div className="space-y-3">
                                      {employee.policyAssignments.map((assignment) => (
                                        <div key={assignment._id.toString()} className="rounded-xl border bg-card/50 p-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-semibold">
                                                {assignment.policy?.name || "Policy"}
                                              </p>
                                              <p className="mt-1 text-xs text-muted-foreground">
                                                Effective date:{" "}
                                                {assignment.effectiveDate
                                                  ? new Date(assignment.effectiveDate).toLocaleDateString()
                                                  : "-"}
                                              </p>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleRemoveAssignment(assignment._id.toString())}
                                              className="text-destructive hover:text-destructive"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>

                                          {assignment.initiators && assignment.initiators.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                              {assignment.initiators.map((init) => (
                                                <Badge key={init._id.toString()} variant="outline" className="text-xs">
                                                  {init.name || init.email}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                                      No policy assignments yet for this user.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </ScrollArea>

                            <div className="border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span>
                                  Policy: <span className="font-medium text-foreground">{selectedPolicyName || "Not selected"}</span>
                                </span>
                                <span>
                                  Initiators:{" "}
                                  <span className="font-medium text-foreground">{assignmentForm.initiatorIds.length}</span>
                                </span>
                              </div>
                              <Button
                                type="button"
                                onClick={handleAssignPolicy}
                                disabled={assignPolicy.isPending || !canSubmitPolicyAssignment}
                                className="h-10 w-full"
                              >
                                {assignPolicy.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Assign Policy
                              </Button>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex h-full flex-1 flex-col gap-4 overflow-hidden">
                <div className="flex min-h-[62px] flex-wrap content-start items-start gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {employeeTypeLabel(employee.employeeType)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {getUserCurrency(employee)}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    {(employee.policyAssignments || []).length} Policies
                  </Badge>
                </div>

                <div className="grid flex-1 content-start grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <span className="text-muted-foreground">HOD</span>
                  <span className="min-w-0 truncate text-right font-medium" title={getHodDisplayName(employee)}>
                    {getHodDisplayName(employee)}
                  </span>

                  <span className="text-muted-foreground">Initiators</span>
                  <span className="min-w-0 truncate text-right font-medium" title={initiatorsText}>
                    {initiatorsText}
                  </span>

                  <span className="text-muted-foreground">Policies</span>
                  <span className="min-w-0 truncate text-right font-medium" title={policiesText || "-"}>
                    {policiesText || "-"}
                  </span>

                  <span className="text-muted-foreground">Policy Initiators</span>
                  <span className="min-w-0 truncate text-right font-medium" title={policyInitiatorsText || "-"}>
                    {policyInitiatorsText || "-"}
                  </span>
                </div>

                <div className="mt-auto h-[66px] border-t pt-3">
                  {hasCardActions ? (
                    <div className="grid grid-cols-2 gap-3">
                      {initiatablePolicyAssignments.length > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-full min-w-0 whitespace-nowrap px-3"
                          onClick={() => openPolicyDialog(employee)}
                        >
                        Initiate Policy
                        </Button>
                      ) : (
                        <div />
                      )}
                      {canInitiate ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-full min-w-0 whitespace-nowrap px-3"
                          onClick={() => openInitiateDialog(employee)}
                        >
                        Initiate Freelance
                        </Button>
                      ) : (
                        <div />
                      )}
                    </div>
                  ) : (
                    <div className="flex h-[36px] items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">No actions available</span>
                    </div>
                  )}
                  </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      <Dialog open={isInitiateDialogOpen} onOpenChange={handleInitiateDialogChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Initiate Freelancer Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInitiateSubmit} className="space-y-4">
            {initiateTarget && (
              <div className="rounded-md bg-accent/30 p-3 text-sm space-y-1">
                <p>
                  <span className="font-medium">User:</span> {initiateTarget.name || "Unnamed"} (
                  {initiateTarget.email})
                </p>
                <p>
                  <span className="font-medium">Type:</span> {employeeTypeLabel(initiateTarget.employeeType)}
                </p>
                <p>
                  <span className="font-medium">HOD:</span> {getHodDisplayName(initiateTarget)}
                </p>
                <p>
                  <span className="font-medium">Currency:</span> {getUserCurrency(initiateTarget)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="freelancer-details">Freelancer Details *</Label>
              <Textarea
                id="freelancer-details"
                value={initiateForm.details}
                onChange={(event) => setInitiateForm((prev) => ({ ...prev, details: event.target.value }))}
                placeholder="Share freelancer details (max 1000+ words)"
                rows={5}
                maxLength={2000}
                className="h-32 max-h-40 break-words break-all overflow-y-auto overflow-x-hidden resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freelancer-amount">Amount ({getUserCurrency(initiateTarget)}) *</Label>
              <Input
                id="freelancer-amount"
                type="number"
                min="0"
                step="0.01"
                value={initiateForm.amount}
                onChange={(event) => setInitiateForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freelancer-files">Upload / Attach Document</Label>
              <Input
                id="freelancer-files"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx"
                onChange={(event) =>
                  setInitiateForm((prev) => ({
                    ...prev,
                    files: Array.from(event.target.files || []),
                  }))
                }
              />
              {initiateForm.files.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Selected files</p>
                  <ul className="list-disc list-inside">
                    {initiateForm.files.map((file) => (
                      <li key={file.name}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleInitiateDialogChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isInitiateSubmitting || uploadCreditAttachments.isPending || createCreditRequest.isPending
                }
              >
                {(isInitiateSubmitting || uploadCreditAttachments.isPending || createCreditRequest.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Initiate Freelance
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPolicyDialogOpen} onOpenChange={handlePolicyDialogChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Initiate Policy Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePolicySubmit} className="space-y-4">
            {policyTarget && (
              <div className="rounded-md bg-accent/30 p-3 text-sm space-y-1">
                <p>
                  <span className="font-medium">User:</span> {policyTarget.name || "Unnamed"} ({policyTarget.email})
                </p>
                <p>
                  <span className="font-medium">Type:</span> {employeeTypeLabel(policyTarget.employeeType)}
                </p>
                <p>
                  <span className="font-medium">HOD:</span> {getHodDisplayName(policyTarget)}
                </p>
                <p>
                  <span className="font-medium">Currency:</span> {getUserCurrency(policyTarget)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Select Policy *</Label>
              <Select
                value={policyForm.assignmentId}
                onValueChange={(value) => setPolicyForm((prev) => ({ ...prev, assignmentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a policy" />
                </SelectTrigger>
                <SelectContent>
                  {getInitiatablePolicyAssignments(policyTarget || {}).map((assignment) => (
                    <SelectItem key={assignment._id.toString()} value={assignment._id.toString()}>
                      {assignment.policy?.name || "Policy"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-details">Policy Details *</Label>
              <Textarea
                id="policy-details"
                value={policyForm.details}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, details: event.target.value }))}
                placeholder="Share policy details (max 1000+ words)"
                rows={5}
                maxLength={2000}
                className="h-32 max-h-40 break-words break-all overflow-y-auto overflow-x-hidden resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-amount">Amount ({getUserCurrency(policyTarget)}) *</Label>
              <Input
                id="policy-amount"
                type="number"
                min="0"
                step="0.01"
                value={policyForm.amount}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-files">Upload / Attach Document</Label>
              <Input
                id="policy-files"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx"
                onChange={(event) =>
                  setPolicyForm((prev) => ({
                    ...prev,
                    files: Array.from(event.target.files || []),
                  }))
                }
              />
              {policyForm.files.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Selected files</p>
                  <ul className="list-disc list-inside">
                    {policyForm.files.map((file) => (
                      <li key={file.name}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handlePolicyDialogChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPolicySubmitting || uploadCreditAttachments.isPending || createCreditRequest.isPending}
              >
                {(isPolicySubmitting || uploadCreditAttachments.isPending || createCreditRequest.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Initiate Policy
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
