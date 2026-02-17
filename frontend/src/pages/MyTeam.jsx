import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, UserPlus, Settings2, Trash2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
export default function MyTeam() {
    const [selectedUser, setSelectedUser] = useState(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [assignmentForm, setAssignmentForm] = useState({
        policyId: "",
        initiatorIds: [], 
        effectiveDate: "",
    });  
    const { data: team, isLoading, refetch } = api.team.getMyTeam.useQuery();
    const { data: policies } = api.policies.getAll.useQuery();
    const { data: allUsers } = api.users.getAll.useQuery();
    const assignPolicy = api.team.assignPolicy.useMutation({
        onSuccess: () => {
            toast.success("Policy assigned successfully");
            setIsSheetOpen(false);
            setSelectedUser(null);
            setAssignmentForm({ policyId: "", initiatorIds: [], effectiveDate: "" });
            refetch();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
    const removeAssignment = api.team.removePolicy.useMutation({
        onSuccess: () => {
            toast.success("Policy assignment removed");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
    const handleAssignPolicy = () => {
        if (!assignmentForm.policyId || assignmentForm.initiatorIds.length === 0) {
            toast.error("Please select a policy and at least one initiator");
            return;
        }
        const effectiveDate = assignmentForm.effectiveDate || new Date().toISOString().slice(0, 10);
        assignPolicy.mutate({
            userId: selectedUser._id.toString(),
            policyId: assignmentForm.policyId,
            initiatorIds: assignmentForm.initiatorIds,
            effectiveDate,
        });
    };
    const handleRemoveAssignment = (assignmentId) => {
        if (confirm("Are you sure you want to remove this policy assignment?")) {
            removeAssignment.mutate({ assignmentId });
        }
    };
    const toggleInitiator = (initiatorId) => {
        setAssignmentForm(prev => ({
            ...prev,
            initiatorIds: prev.initiatorIds.includes(initiatorId)
                ? prev.initiatorIds.filter(id => id !== initiatorId)
                : [...prev.initiatorIds, initiatorId],
        }));
    };
    if (isLoading) {
        return (<div className="flex justify-center items-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary"/>
      </div>);
    }
    const activePolicies = policies?.filter(p => p.status === "active") || [];
    const potentialInitiators = allUsers?.filter(u => u._id?.toString() !== selectedUser?._id?.toString()) || [];
    return (<div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Team</h1>
        <p className="text-muted-foreground mt-1">Manage team members and assign policies</p>
      </div>

      {!team || team.length === 0 ? (<Card>
          <CardContent className="py-12">
            <div className="text-center">
              <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4"/>
              <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
              <p className="text-muted-foreground">Team members will appear here once assigned</p>
            </div>
          </CardContent>
        </Card>) : (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (<Card key={member._id?.toString()} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{member.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <Sheet open={isSheetOpen && selectedUser?._id?.toString() === member._id?.toString()} onOpenChange={(open) => {
                    setIsSheetOpen(open);
                    if (!open) {
                        setSelectedUser(null);
                    setAssignmentForm({ policyId: "", initiatorIds: [], effectiveDate: "" });
                }
            }}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUser(member)}>
                        <Settings2 className="w-4 h-4"/>
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-100 sm:w-135 overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Assign Policy to {member.name}</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 space-y-6">
                        <div className="space-y-2">
                          <Label>Select Policy</Label>
                          <Select value={assignmentForm.policyId} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, policyId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a policy"/>
                            </SelectTrigger>
                            <SelectContent>
                              {activePolicies.map((policy) => (<SelectItem key={policy._id.toString()} value={policy._id.toString()}>
                                  {policy.name}
                                </SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Effective Date</Label>
                          <Input type="date" value={assignmentForm.effectiveDate} onChange={(e) => setAssignmentForm({ ...assignmentForm, effectiveDate: e.target.value })}/>
                        </div>

                        <div className="space-y-3">
                          <Label>Select Initiators</Label>
                          <p className="text-xs text-muted-foreground">
                            Choose who can submit credit requests for this policy
                          </p>
                          <div className="space-y-2 max-h-50 overflow-y-auto border rounded-md p-3">
                            {potentialInitiators.map((initiator) => (<div key={initiator._id.toString()} className="flex items-center space-x-2">
                                <Checkbox id={`initiator-${initiator._id.toString()}`} checked={assignmentForm.initiatorIds.includes(initiator._id.toString())} onCheckedChange={() => toggleInitiator(initiator._id.toString())}/>
                                <label htmlFor={`initiator-${initiator._id.toString()}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                  {initiator.name} ({initiator.role})
                                </label>
                              </div>))}
                          </div>
                        </div>

                        <Button onClick={handleAssignPolicy} disabled={assignPolicy.isPending} className="w-full">
                          {assignPolicy.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                          Assign Policy
                        </Button>

                        {member.policyAssignments && member.policyAssignments.length > 0 && (<div className="mt-6 pt-6 border-t">
                            <h4 className="font-semibold mb-3">Current Assignments</h4>
                            <div className="space-y-3">
                              {member.policyAssignments.map((assignment) => (<div key={assignment._id.toString()} className="border rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{assignment.policy?.name}</p>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Calendar className="w-3 h-3"/>
                                        {new Date(assignment.effectiveDate).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveAssignment(assignment._id.toString())} className="text-destructive hover:text-destructive">
                                      <Trash2 className="w-4 h-4"/>
                                    </Button>
                                  </div>
                                  {assignment.initiators && assignment.initiators.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">
                                      {assignment.initiators.map((init) => (<Badge key={init._id.toString()} variant="outline" className="text-xs">
                                          {init.name}
                                        </Badge>))}
                                    </div>)}
                                </div>))}
                            </div>
                          </div>)}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <Badge variant="secondary">{member.role}</Badge>
                  </div>
                  {member.employeeType && (<div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="outline">{member.employeeType.replace("_", " ")}</Badge>
                    </div>)}
                  {member.policyAssignments && member.policyAssignments.length > 0 && (<div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">Assigned Policies</p>
                      <div className="flex flex-wrap gap-1">
                        {member.policyAssignments.map((assignment) => (<Badge key={assignment._id.toString()} variant="default" className="text-xs">
                            {assignment.policy?.name}
                          </Badge>))}
                      </div>
                    </div>)}
                </div>
              </CardContent>
            </Card>))}
        </div>)}
    </div>);
}


