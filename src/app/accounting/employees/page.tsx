"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { Plus, Trash2, Loader2, CheckCircle } from "lucide-react";

interface Employee { id: number; name: string; designation?: string; phone?: string; monthlySalary: number; advanceBalance: number; isActive: boolean; }
interface Advance { id: number; employee: { name: string }; amount: number; repaid: number; reason?: string; advanceDate: string; }
interface Salary { id: number; employee: { name: string; designation?: string }; month: number; year: number; baseSalary: number; advanceDeducted: number; netSalary: number; isPaid: boolean; paidAt?: string; }
interface Labour { id: number; workerName: string; description?: string; amount: number; weekStart?: string; weekEnd?: string; paymentDate: string; }

type Tab = "employees" | "advances" | "salaries" | "labour";
function fmt(n: number) { return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function EmployeesPage() {
  const [tab, setTab] = useState<Tab>("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [labour, setLabour] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showEmpForm, setShowEmpForm] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showLabourForm, setShowLabourForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: string; name: string } | null>(null);

  const [empForm, setEmpForm] = useState({ name: "", designation: "", phone: "", monthlySalary: "" });
  const [advanceForm, setAdvanceForm] = useState({ employeeId: "", amount: "", reason: "", advanceDate: "" });
  const [salaryForm, setSalaryForm] = useState({ employeeId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), baseSalary: "", advanceDeducted: "0", note: "" });
  const [labourForm, setLabourForm] = useState({ workerName: "", description: "", amount: "", weekStart: "", weekEnd: "", paymentDate: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, advRes, salRes, labRes] = await Promise.all([
        apiGet("/accounting/employees"),
        apiGet("/accounting/employees/advances"),
        apiGet("/accounting/employees/salaries"),
        apiGet("/accounting/employees/labour"),
      ]);
      setEmployees(empRes.employees || []);
      setAdvances(advRes.advances || []);
      setSalaries(salRes.salaries || []);
      setLabour(labRes.payments || []);
    } catch { showToast("Failed to load", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name) { showToast("Name required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/employees", empForm);
      showToast("Employee added", "success");
      setShowEmpForm(false);
      setEmpForm({ name: "", designation: "", phone: "", monthlySalary: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceForm.employeeId || !advanceForm.amount) { showToast("Employee and amount required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/employees/advances", advanceForm);
      showToast("Advance recorded", "success");
      setShowAdvanceForm(false);
      setAdvanceForm({ employeeId: "", amount: "", reason: "", advanceDate: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryForm.employeeId || !salaryForm.baseSalary) { showToast("Employee and salary required", "error"); return; }
    const emp = employees.find(e => e.id === parseInt(salaryForm.employeeId));
    setSaving(true);
    try {
      await apiPost("/accounting/employees/salaries", {
        ...salaryForm,
        baseSalary: parseFloat(salaryForm.baseSalary) || (emp?.monthlySalary || 0),
      });
      showToast("Salary record created", "success");
      setShowSalaryForm(false);
      setSalaryForm({ employeeId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), baseSalary: "", advanceDeducted: "0", note: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleLabourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labourForm.workerName || !labourForm.amount) { showToast("Worker name and amount required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/employees/labour", labourForm);
      showToast("Labour payment recorded", "success");
      setShowLabourForm(false);
      setLabourForm({ workerName: "", description: "", amount: "", weekStart: "", weekEnd: "", paymentDate: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const markPaid = async (id: number) => {
    try {
      await apiPut(`/accounting/employees/salaries/${id}/paid`, {});
      showToast("Marked as paid", "success");
      load();
    } catch { showToast("Failed", "error"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === "employee") await apiDelete(`/accounting/employees/${deleteTarget.id}`);
      else if (deleteTarget.type === "advance") await apiDelete(`/accounting/employees/advances/${deleteTarget.id}`);
      else if (deleteTarget.type === "salary") await apiDelete(`/accounting/employees/salaries/${deleteTarget.id}`);
      else if (deleteTarget.type === "labour") await apiDelete(`/accounting/employees/labour/${deleteTarget.id}`);
      showToast("Deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Employees & Labour</h1>
            <p className="text-sm text-muted-foreground">Payroll, advances and labour payments</p>
          </div>
          <div className="flex gap-2">
            {tab === "employees" && <Button size="sm" onClick={() => setShowEmpForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Employee</Button>}
            {tab === "advances" && <Button size="sm" onClick={() => setShowAdvanceForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Record Advance</Button>}
            {tab === "salaries" && <Button size="sm" onClick={() => setShowSalaryForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Salary</Button>}
            {tab === "labour" && <Button size="sm" onClick={() => setShowLabourForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Record Labour</Button>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {(["employees", "advances", "salaries", "labour"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors cursor-pointer ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
          : tab === "employees" ? (
            employees.length === 0 ? <div className="text-center py-12 text-muted-foreground">No employees yet.</div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.map(emp => (
                  <div key={emp.id} className="bg-background rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.designation || "No designation"}</p>
                        {emp.phone && <p className="text-xs text-muted-foreground">{emp.phone}</p>}
                      </div>
                      <button onClick={() => setDeleteTarget({ id: emp.id, type: "employee", name: emp.name })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Salary</p>
                        <p className="font-semibold text-foreground">Rs {fmt(emp.monthlySalary)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Advance Balance</p>
                        <p className={`font-semibold ${emp.advanceBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(emp.advanceBalance)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tab === "advances" ? (
            advances.length === 0 ? <div className="text-center py-12 text-muted-foreground">No advances recorded.</div> : (
              <div className="bg-background rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Repaid</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {advances.map(a => (
                      <tr key={a.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(a.advanceDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium">{a.employee.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.reason || "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold">Rs {fmt(a.amount)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">Rs {fmt(a.repaid)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${a.amount - a.repaid > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(a.amount - a.repaid)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setDeleteTarget({ id: a.id, type: "advance", name: `Advance for ${a.employee.name}` })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === "salaries" ? (
            salaries.length === 0 ? <div className="text-center py-12 text-muted-foreground">No salary records yet.</div> : (
              <div className="bg-background rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deducted</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salaries.map(s => (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{months[s.month - 1]} {s.year}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.employee.name}</p>
                          {s.employee.designation && <p className="text-xs text-muted-foreground">{s.employee.designation}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">Rs {fmt(s.baseSalary)}</td>
                        <td className="px-4 py-3 text-right text-red-500">Rs {fmt(s.advanceDeducted)}</td>
                        <td className="px-4 py-3 text-right font-bold">Rs {fmt(s.netSalary)}</td>
                        <td className="px-4 py-3 text-center">
                          {s.isPaid ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Paid</span>
                          ) : (
                            <button onClick={() => markPaid(s.id)} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 cursor-pointer hover:bg-amber-200 transition-colors">Mark Paid</button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setDeleteTarget({ id: s.id, type: "salary", name: `${s.employee.name} - ${months[s.month - 1]} ${s.year}` })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            labour.length === 0 ? <div className="text-center py-12 text-muted-foreground">No labour payments recorded.</div> : (
              <div className="bg-background rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Worker</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {labour.map(l => (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(l.paymentDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium">{l.workerName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.description || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {l.weekStart && l.weekEnd ? `${new Date(l.weekStart).toLocaleDateString()} – ${new Date(l.weekEnd).toLocaleDateString()}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">Rs {fmt(l.amount)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setDeleteTarget({ id: l.id, type: "labour", name: `Payment to ${l.workerName}` })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
      </div>

      <Dialog open={showEmpForm} onClose={() => setShowEmpForm(false)} title="Add Employee" description="Add a new employee">
        <form onSubmit={handleEmpSubmit} className="space-y-3">
          <FormField label="Name" required><Input value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} placeholder="Full name" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Designation"><Input value={empForm.designation} onChange={e => setEmpForm({ ...empForm, designation: e.target.value })} placeholder="e.g. Tailor, Cutter" /></FormField>
            <FormField label="Phone"><Input value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} placeholder="Phone number" /></FormField>
          </div>
          <FormField label="Monthly Salary (Rs)"><Input type="number" value={empForm.monthlySalary} onChange={e => setEmpForm({ ...empForm, monthlySalary: e.target.value })} placeholder="0" min="0" step="any" /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowEmpForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Add Employee"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={showAdvanceForm} onClose={() => setShowAdvanceForm(false)} title="Record Advance" description="Record advance payment">
        <form onSubmit={handleAdvanceSubmit} className="space-y-3">
          <FormField label="Employee" required>
            <Select value={advanceForm.employeeId} onChange={val => setAdvanceForm({ ...advanceForm, employeeId: val})} options={[{ label: "Select employee", value: "" }, ...employees.map(e => ({ label: e.name, value: String(e.id) }))]} />
          </FormField>
          <FormField label="Amount" required><Input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })} placeholder="0.00" min="0.01" step="0.01" /></FormField>
          <FormField label="Reason"><Input value={advanceForm.reason} onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })} placeholder="Optional reason" /></FormField>
          <FormField label="Date"><Input type="date" value={advanceForm.advanceDate} onChange={e => setAdvanceForm({ ...advanceForm, advanceDate: e.target.value })} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdvanceForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Record"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={showSalaryForm} onClose={() => setShowSalaryForm(false)} title="Salary Record" description="Create a monthly salary record">
        <form onSubmit={handleSalarySubmit} className="space-y-3">
          <FormField label="Employee" required>
            <Select value={salaryForm.employeeId} onChange={val => {
              const emp = employees.find(em => em.id === parseInt(val));
              setSalaryForm({ ...salaryForm, employeeId: val, baseSalary: emp ? String(emp.monthlySalary) : salaryForm.baseSalary, advanceDeducted: emp ? String(emp.advanceBalance) : "0" });
            }} options={[{ label: "Select employee", value: "" }, ...employees.map(e => ({ label: `${e.name} (Rs ${fmt(e.monthlySalary)}/mo)`, value: String(e.id) }))]} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Month">
              <Select value={salaryForm.month} onChange={val => setSalaryForm({ ...salaryForm, month: val})} options={months.map((m, i) => ({ label: m, value: String(i + 1) }))} />
            </FormField>
            <FormField label="Year"><Input type="number" value={salaryForm.year} onChange={e => setSalaryForm({ ...salaryForm, year: e.target.value })} min="2020" max="2030" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Base Salary" required><Input type="number" value={salaryForm.baseSalary} onChange={e => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })} placeholder="0" min="0" step="any" /></FormField>
            <FormField label="Advance Deducted"><Input type="number" value={salaryForm.advanceDeducted} onChange={e => setSalaryForm({ ...salaryForm, advanceDeducted: e.target.value })} placeholder="0" min="0" step="any" /></FormField>
          </div>
          {salaryForm.baseSalary && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              Net Salary: <span className="font-bold">Rs {fmt((parseFloat(salaryForm.baseSalary) || 0) - (parseFloat(salaryForm.advanceDeducted) || 0))}</span>
            </div>
          )}
          <FormField label="Note"><Input value={salaryForm.note} onChange={e => setSalaryForm({ ...salaryForm, note: e.target.value })} placeholder="Optional note" /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowSalaryForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Create"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={showLabourForm} onClose={() => setShowLabourForm(false)} title="Labour Payment" description="Record weekly labour payment">
        <form onSubmit={handleLabourSubmit} className="space-y-3">
          <FormField label="Worker Name" required><Input value={labourForm.workerName} onChange={e => setLabourForm({ ...labourForm, workerName: e.target.value })} placeholder="Worker's name" /></FormField>
          <FormField label="Description"><Input value={labourForm.description} onChange={e => setLabourForm({ ...labourForm, description: e.target.value })} placeholder="Type of work done" /></FormField>
          <FormField label="Amount" required><Input type="number" value={labourForm.amount} onChange={e => setLabourForm({ ...labourForm, amount: e.target.value })} placeholder="0.00" min="0.01" step="0.01" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Week Start"><Input type="date" value={labourForm.weekStart} onChange={e => setLabourForm({ ...labourForm, weekStart: e.target.value })} /></FormField>
            <FormField label="Week End"><Input type="date" value={labourForm.weekEnd} onChange={e => setLabourForm({ ...labourForm, weekEnd: e.target.value })} /></FormField>
          </div>
          <FormField label="Payment Date"><Input type="date" value={labourForm.paymentDate} onChange={e => setLabourForm({ ...labourForm, paymentDate: e.target.value })} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowLabourForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Record"}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Confirm Delete" message={`Delete "${deleteTarget?.name}"?`} loading={saving} />
    </DashboardLayout>
  );
}
