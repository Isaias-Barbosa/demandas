import { RdmExcelExport } from '@/components/RdmExcelExport';

export default function ExportarExcelPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Exportar RDMs para Excel</h1>
        <p className="mt-1 text-sm text-gray-500">Selecione os campos e filtros para exportar suas RDMs do Jira.</p>
      </div>
      <RdmExcelExport />
    </div>
  );
}
