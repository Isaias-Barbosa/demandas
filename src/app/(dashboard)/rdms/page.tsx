import { JiraRdms } from '@/components/JiraRdms';

export default function RdmsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Acompanhamento</p>
        <h1 className="page-title">Minhas RDMs</h1>
        <p className="page-subtitle">
          Atribuídas a você, acompanhadas ou relatadas por você no Jira.
        </p>
      </div>
      <JiraRdms />
    </div>
  );
}
