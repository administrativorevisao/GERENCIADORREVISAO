import { useEffect, useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";

export interface LayerPref {
  visible: boolean;
  color: string;
}

// Preferência PESSOAL (não compartilhada): quais agendas cada usuário vê e
// com qual cor — mesma ideia do Google Agenda, onde cada pessoa customiza
// sua própria lista sem afetar o que os outros veem. Guardado no
// localStorage do navegador, por usuário.
export function useLayerPrefs(defaults: Record<string, string>) {
  const { profile } = useAuth();
  const storageKey = `revisionOS_calLayers_${profile?.id ?? "anon"}`;
  const [prefs, setPrefs] = useState<Record<string, LayerPref>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    } catch {
      // localStorage indisponível (modo privado etc.) — preferência só não persiste.
    }
  }, [prefs, storageKey]);

  function get(layerId: string): LayerPref {
    return prefs[layerId] ?? { visible: true, color: defaults[layerId] ?? "#6d28d9" };
  }

  function toggleVisible(layerId: string) {
    setPrefs((prev) => {
      const current = prev[layerId] ?? { visible: true, color: defaults[layerId] ?? "#6d28d9" };
      return { ...prev, [layerId]: { ...current, visible: !current.visible } };
    });
  }

  function setColor(layerId: string, color: string) {
    setPrefs((prev) => {
      const current = prev[layerId] ?? { visible: true, color: defaults[layerId] ?? "#6d28d9" };
      return { ...prev, [layerId]: { ...current, color } };
    });
  }

  return { get, toggleVisible, setColor };
}
