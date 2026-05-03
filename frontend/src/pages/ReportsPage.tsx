import { useState, useEffect } from 'react';
import { FileText, Sheet, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

interface Shop { id: string; shop_no: string; shop_name: string; }

const LEASE_OPTIONS  = ['Vacant', 'LOI', 'Signed'];
const FITOUT_OPTIONS = ['Not Started', 'Ongoing', 'Ceiling Closed', 'Ready to Open', 'Opened'];
const TYPE_OPTIONS   = [
  { value: 'daily_general',   label: 'Daily General Inspection' },
  { value: 'daily_hse',       label: 'Daily HSE Inspection' },
  { value: 'ceiling_closure', label: 'Ceiling Closure Inspection' },
  { value: 'pre_opening',     label: 'Pre-Opening Inspection' },
  { value: 'post_opening',    label: 'Post Opening Inspection' },
];

export default function ReportsPage() {
  const [shops,  setShops]  = useState<Shop[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => { api.get('/shops').then(r => setShops(r.data)); }, []);

  const download = async (endpoint: string, params: Record<string, string>, filename: string) => {
    setLoading(filename);
    try {
      const qs = new URLSearchParams(params).toString();
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reports/${endpoint}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Download failed');
    } finally { setLoading(null); }
  };

  const ReportCard = ({ title, description, onPDF, onExcel }: {
    title: string; description: string;
    onPDF: () => void; onExcel: () => void;
  }) => (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onPDF} disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50">
            <FileText size={13}/> PDF
          </button>
          <button onClick={onExcel} disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50">
            <Sheet size={13}/> Excel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-600">Reports</h1>
        <p className="text-sm text-gray-500">Download PDF or Excel reports. All reports include DERNA FM / SUMOU GATE MADINAH branding.</p>
      </div>

      {loading && (
        <div className="card bg-brand-50 border border-brand-200 flex items-center gap-3">
          <Download size={16} className="text-brand-600 animate-bounce"/>
          <p className="text-brand-700 text-sm">Generating <strong>{loading}</strong>…</p>
        </div>
      )}

      {/* Dashboard */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Dashboard Summary</h2>
        <ReportCard
          title="Full Dashboard Report"
          description="KPIs, lease status breakdown, fit-out status distribution"
          onPDF={()   => download('dashboard', { format: 'pdf' },   'dashboard-report.pdf')}
          onExcel={() => download('dashboard', { format: 'excel' }, 'dashboard-report.xlsx')}
        />
      </section>

      {/* Shops */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Shops</h2>
        <div className="space-y-3">
          <ReportCard
            title="All Shops"
            description="Complete list of all registered shops with all statuses"
            onPDF={()   => download('shops', { format: 'pdf' },   'all-shops.pdf')}
            onExcel={() => download('shops', { format: 'excel' }, 'all-shops.xlsx')}
          />
          {LEASE_OPTIONS.map(ls => (
            <ReportCard key={ls}
              title={`${ls} Shops`}
              description={`Shops with lease status: ${ls}`}
              onPDF={()   => download('shops', { format: 'pdf',   lease_status: ls }, `shops-${ls.toLowerCase()}.pdf`)}
              onExcel={() => download('shops', { format: 'excel', lease_status: ls }, `shops-${ls.toLowerCase()}.xlsx`)}
            />
          ))}
          {FITOUT_OPTIONS.map(fs => (
            <ReportCard key={fs}
              title={`${fs} Shops`}
              description={`Shops with fit-out status: ${fs}`}
              onPDF={()   => download('shops', { format: 'pdf',   fitout_status: fs }, `shops-${fs.replace(/ /g,'-').toLowerCase()}.pdf`)}
              onExcel={() => download('shops', { format: 'excel', fitout_status: fs }, `shops-${fs.replace(/ /g,'-').toLowerCase()}.xlsx`)}
            />
          ))}
        </div>
      </section>

      {/* Issues & Violations */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Issues & Violations</h2>
        <div className="space-y-3">
          <ReportCard
            title="All Issues & Violations"
            description="Complete list of all issues and violations across all shops"
            onPDF={()   => download('issues', { format: 'pdf' },   'all-issues.pdf')}
            onExcel={() => download('issues', { format: 'excel' }, 'all-issues.xlsx')}
          />
          {[
            { type: 'issue',     label: 'All Fit-Out Issues' },
            { type: 'violation', label: 'All HSE Violations' },
          ].map(({ type, label }) => (
            <ReportCard key={type}
              title={label}
              description={`Filtered by type: ${type}`}
              onPDF={()   => download('issues', { format: 'pdf',   type }, `${type}s.pdf`)}
              onExcel={() => download('issues', { format: 'excel', type }, `${type}s.xlsx`)}
            />
          ))}
          {['Open','Work Done','Closed'].map(status => (
            <ReportCard key={status}
              title={`Issues – Status: ${status}`}
              description={`Issues and violations with status "${status}"`}
              onPDF={()   => download('issues', { format: 'pdf',   status }, `issues-${status.replace(/ /g,'-').toLowerCase()}.pdf`)}
              onExcel={() => download('issues', { format: 'excel', status }, `issues-${status.replace(/ /g,'-').toLowerCase()}.xlsx`)}
            />
          ))}
        </div>
      </section>

      {/* Inspections */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Inspections</h2>
        <div className="space-y-3">
          <ReportCard
            title="All Inspections"
            description="All inspection records across all shops and types"
            onPDF={()   => download('inspections', { format: 'pdf' },   'all-inspections.pdf')}
            onExcel={() => download('inspections', { format: 'excel' }, 'all-inspections.xlsx')}
          />
          {TYPE_OPTIONS.map(({ value, label }) => (
            <ReportCard key={value}
              title={label}
              description={`All records for: ${label}`}
              onPDF={()   => download('inspections', { format: 'pdf',   type_code: value }, `${value}-inspections.pdf`)}
              onExcel={() => download('inspections', { format: 'excel', type_code: value }, `${value}-inspections.xlsx`)}
            />
          ))}
        </div>
      </section>

      {/* Per-shop reports */}
      {shops.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Per-Shop Reports</h2>
          <div className="space-y-3">
            {shops.map(s => (
              <ReportCard key={s.id}
                title={`${s.shop_no} – ${s.shop_name}`}
                description="Issues and inspections for this shop only"
                onPDF={()   => download('issues', { format: 'pdf',   shop_id: s.id }, `shop-${s.shop_no}-issues.pdf`)}
                onExcel={() => download('issues', { format: 'excel', shop_id: s.id }, `shop-${s.shop_no}-issues.xlsx`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
