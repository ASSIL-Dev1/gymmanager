import { useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('Vérifiez la connexion à l’API et à PostgreSQL pour démarrer.');
  const [checking, setChecking] = useState(false);

  async function checkConnection(): Promise<void> {
    setChecking(true);
    setMessage('Vérification en cours…');
    try {
      const response = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw new Error('Service indisponible');
      }
      setMessage('L’API et la base PostgreSQL sont disponibles.');
    } catch {
      setMessage('Connexion indisponible. Vérifiez que la base et le serveur NestJS sont démarrés.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <main>
      <p className="eyebrow">Gestion de salle de sport</p>
      <h1>GymManager</h1>
      <p className="description">Adhérents, abonnements et paiements dans un même espace.</p>
      <section aria-labelledby="environment-title">
        <h2 id="environment-title">Environnement de développement</h2>
        <p role="status">{message}</p>
        <button type="button" onClick={() => void checkConnection()} disabled={checking}>
          {checking ? 'Vérification…' : 'Vérifier la connexion'}
        </button>
      </section>
    </main>
  );
}
