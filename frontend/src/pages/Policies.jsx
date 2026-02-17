import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, FileText, CheckCircle2, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/PageLayout";
export default function Policies() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [formData, setFormData] = useState({ 
        name: "",
        description: "",
        eligibilityCriteria: "",
        calculationLogic: "",
        status: "active",
    });  
    const { data: policies, isLoading, refetch } = api.policies.getAll.useQuery();
    const createPolicy = api.policies.create.useMutation();
    const updatePolicy = api.policies.update.useMutation();
    const uploadAttachments = api.policies.uploadAttachments.useMutation();
    const deleteAttachment = api.policies.deleteAttachment.useMutation();
    const deletePolicy = api.policies.delete.useMutation({
        onSuccess: () => {
            toast.success("Policy deleted successfully");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            eligibilityCriteria: "",
            calculationLogic: "",
            status: "active",
        });
        setAttachmentFiles([]);
        setExistingAttachments([]);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let policyId = editingPolicy?._id?.toString();
            if (editingPolicy) {
                await updatePolicy.mutateAsync({
                    id: policyId,
                    ...formData,
                });
            }
            else {
                const result = await createPolicy.mutateAsync(formData);
                policyId = result?.policy?._id?.toString?.() || result?.policy?._id || result?.policy?.id;
            }
            if (attachmentFiles.length > 0 && policyId) {
                try {
                    await uploadAttachments.mutateAsync({ id: policyId, files: attachmentFiles });
                }
                catch (uploadError) {
                    toast.error(uploadError?.message || "Policy saved, but attachments failed to upload.");
                }
            }
            toast.success(editingPolicy ? "Policy updated successfully" : "Policy created successfully");
            setIsDialogOpen(false);
            setEditingPolicy(null);
            resetForm();
            refetch();
        }
        catch (error) {
            toast.error(error?.message || "Something went wrong");
        }
    };
    const handleEdit = (policy) => {
        setEditingPolicy(policy);
        setFormData({
            name: policy.name || "",
            description: policy.description || "",
            eligibilityCriteria: policy.eligibilityCriteria || "",
            calculationLogic: policy.calculationLogic || "",
            status: policy.status || "active",
        });
        setExistingAttachments(policy.attachments || []);
        setAttachmentFiles([]);
        setIsDialogOpen(true);
    };
    const handleDelete = (policyId) => {
        if (confirm("Are you sure you want to delete this policy? This will affect all users assigned to it.")) {
            deletePolicy.mutate({ id: policyId });
        }
    };
    const handleDialogClose = (open) => {
        setIsDialogOpen(open);
        if (!open) {
            setEditingPolicy(null);
            resetForm();
        }
    };
    const handleFileChange = (event) => {
        const files = Array.from(event.target.files || []);
        setAttachmentFiles(files);
    };
    const handleRemoveAttachment = async (attachmentId) => {
        if (!editingPolicy) {
            return;
        }
        if (!attachmentId) {
            toast.error("Attachment not found");
            return;
        }
        try {
            await deleteAttachment.mutateAsync({
                id: editingPolicy._id.toString(),
                attachmentId,
            });
            setExistingAttachments((prev) => prev.filter((item) => item._id?.toString() !== attachmentId));
            refetch();
            toast.success("Attachment removed");
        }
        catch (error) {
            toast.error(error?.message || "Failed to remove attachment");
        }
    };
    if (isLoading) {
        return (<div className="flex justify-center items-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary"/>
      </div>);
    }
    const getStatusIcon = (status) => {
        switch (status) {
            case "active":
                return <CheckCircle2 className="w-4 h-4"/>;
            case "draft":
                return <FileText className="w-4 h-4"/>;
            case "archived":
                return <Archive className="w-4 h-4"/>;
            default:
                return null;
        }
    };
    const getStatusColor = (status) => {
        const colors = {
            active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
            archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        };
        return colors[status] || colors.draft;
    };
    return (<PageShell>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policy Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage incentive policies</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingPolicy(null);
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2"/>
              Create Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? "Edit Policy" : "Create New Policy"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Policy Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., Sales Commission Policy"/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required placeholder="Describe the purpose and scope of this policy" rows={3}/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eligibility">Eligibility Criteria *</Label>
                <Textarea id="eligibility" value={formData.eligibilityCriteria} onChange={(e) => setFormData({ ...formData, eligibilityCriteria: e.target.value })} required placeholder="e.g., All sales representatives with 6+ months tenure" rows={2}/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calculation">Calculation Logic *</Label>
                <Textarea id="calculation" value={formData.calculationLogic} onChange={(e) => setFormData({ ...formData, calculationLogic: e.target.value })} required placeholder="e.g., 5% of total sales value, capped at $5000 per month" rows={3}/>
                <p className="text-xs text-muted-foreground">
                  Describe how credits are calculated based on performance metrics
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="policy-attachments">Attach Documents</Label>
                <Input
                  id="policy-attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx"
                />
                <p className="text-xs text-muted-foreground">PDF, images, DOC/DOCX, XLS/XLSX up to 20MB each.</p>
                {attachmentFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Files to upload</p>
                    <div className="flex flex-wrap gap-2">
                      {attachmentFiles.map((file) => (
                        <Badge key={`${file.name}-${file.size}`} variant="secondary" className="gap-2">
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-45">{file.name}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {editingPolicy && existingAttachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing Attachments</Label>
                  <div className="space-y-2">
                    {existingAttachments.map((attachment) => (
                      <div
                        key={attachment._id?.toString() || attachment.filename}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <a
                          className="text-sm font-medium text-primary hover:underline"
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {attachment.originalName || attachment.filename}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAttachment(attachment._id?.toString())}
                          disabled={deleteAttachment.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPolicy.isPending || updatePolicy.isPending || uploadAttachments.isPending}>
                  {(createPolicy.isPending || updatePolicy.isPending || uploadAttachments.isPending) && (<Loader2 className="w-4 h-4 mr-2 animate-spin"/>)}
                  {editingPolicy ? "Update Policy" : "Create Policy"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Policies ({policies?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!policies || policies.length === 0 ? (<div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4"/>
              <h3 className="text-lg font-semibold mb-2">No policies yet</h3>
              <p className="text-muted-foreground mb-4">Create your first incentive policy to get started</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2"/>
                Create Policy
              </Button>
            </div>) : (<div className="space-y-4">
              {policies.map((policy) => (<div key={policy._id?.toString()} className="border rounded-lg p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{policy.name}</h3>
                        <Badge className={`${getStatusColor(policy.status)} flex items-center gap-1`}>
                          {getStatusIcon(policy.status)}
                          {policy.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{policy.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(policy)}>
                        <Pencil className="w-4 h-4"/>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(policy._id.toString())} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4"/>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Eligibility</p>
                      <p className="text-foreground">{policy.eligibilityCriteria}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Calculation</p>
                      <p className="text-foreground">{policy.calculationLogic}</p>
                    </div>
                  </div>
                  {policy.attachments && policy.attachments.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium text-muted-foreground mb-2">Attachments</p>
                      <div className="flex flex-wrap gap-2">
                        {policy.attachments.map((attachment) => (
                          <a
                            key={attachment._id?.toString() || attachment.filename}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex"
                          >
                            <Badge variant="secondary" className="gap-2">
                              <FileText className="w-3 h-3" />
                              <span className="truncate max-w-40">
                                {attachment.originalName || attachment.filename}
                              </span>
                            </Badge>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>))}
            </div>)}
        </CardContent>
      </Card>
    </PageShell>);
}

