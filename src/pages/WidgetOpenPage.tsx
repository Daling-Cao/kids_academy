import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../App';
import WidgetModal from '../components/WidgetModal';

export default function WidgetOpenPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [widget, setWidget] = useState<{ id: number; name: string; entryFile: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    authFetch(`/api/widgets/${id}`)
      .then(r => r.json())
      .then(w => {
        if (w.id) setWidget({ id: w.id, name: w.name, entryFile: w.entryFile || 'index.html' });
        else setError('Widget not found');
      })
      .catch(() => setError('Failed to load widget'));
  }, [id]);

  if (error) return <div className="text-center p-12 text-red-500">{error}</div>;
  if (!widget) return null;

  return (
    <WidgetModal
      widgetId={widget.id}
      widgetName={widget.name}
      entryFile={widget.entryFile}
      onClose={() => navigate(-1)}
    />
  );
}
