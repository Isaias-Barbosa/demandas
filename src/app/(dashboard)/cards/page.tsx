import { JiraCards } from '@/components/JiraCards';

export default function CardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Jira</p>
        <h1 className="page-title">Cards</h1>
        <p className="page-subtitle">
          Issues que você relatou, com status, tipo, espaço e projeto.
        </p>
      </div>
      <JiraCards />
    </div>
  );
}
