import { useContext, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getVisibleModule, resolveLabel } from './navigationConfig';
import NavCard from './NavCard';

// NÍVEL 2 — Hub do módulo: grid de subitens no mesmo padrão visual do
// hub principal. Só renderiza subitens permitidos; módulo sem acesso
// devolve o usuário ao início (sem tela branca).
export default function ModuleHub() {
  const { moduleId } = useParams();
  const { user } = useContext(AuthContext);

  const mod = useMemo(() => getVisibleModule(user, moduleId), [user, moduleId]);

  if (!mod) {
    return <Navigate to="/" replace />;
  }

  if (mod.children.length === 1) {
    return <Navigate to={mod.children[0].to} replace />;
  }

  return (
    <div className="hub-page">
      <header className="hub-header">
        <h1 className="hub-title">{resolveLabel(mod, user)}</h1>
        <p className="hub-subtitle">{mod.desc}</p>
      </header>

      <nav aria-label={`Telas do módulo ${mod.label}`}>
        <ul className="hub-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {mod.children.map((item) => (
            <li key={item.id}>
              <NavCard
                to={item.to}
                icon={item.icon}
                label={resolveLabel(item, user)}
                desc={item.desc}
                accentVar={`--module-${mod.id}`}
              />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
