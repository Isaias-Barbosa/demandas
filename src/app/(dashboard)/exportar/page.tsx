import { RdmExcelExport } from '@/components/RdmExcelExport';

export default function ExportarExcelPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="page-eyebrow">Relatórios</p>
        <h1 className="page-title">Exportar RDMs para Excel</h1>
        <p className="page-subtitle">
          Escolha as colunas e filtre as RDMs atribuídas, acompanhadas ou relatadas por você.
        </p>
      </div>
      <RdmExcelExport />
    </div>
  );
}
