"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { TbPrompt } from "react-icons/tb";
import { GiCrossedChains } from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import { useDnD } from "./DnDContext";

const buildPromptPayload = (prompt) => ({
  kind: "prompt",
  type: "prompt",
  name: prompt.name,
  content: prompt.content ?? "",
});

const buildChainPayload = (chain) => ({
  kind: "chain",
  type: "chain",
  name: chain.name,
  code: chain.code ?? "",
});

const normalizeList = (value) => (Array.isArray(value) ? value : []);

const ResourceDock = ({ resources, onRemoveResource }) => {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [isOpen, setIsOpen] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [chains, setChains] = useState([]);
  const { setDragPayload, setType, setCode, resetDrag } = useDnD();

  const currentPrompts = normalizeList(resources?.prompts);
  const currentChains = normalizeList(resources?.chains);

  const toggleDock = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (!isAuthenticated && isOpen) {
      setIsOpen(false);
    }
  }, [isAuthenticated, isOpen]);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setPrompts([]);
      setChains([]);
      return undefined;
    }

    const fetchTemplates = async () => {
      try {
        const [promptsRes, chainsRes] = await Promise.all([
          fetch("/api/prompts"),
          fetch("/api/chains"),
        ]);

        if (cancelled) {
          return;
        }

        if (promptsRes.ok) {
          const promptData = await promptsRes.json();
          setPrompts(Array.isArray(promptData) ? promptData : []);
        } else {
          setPrompts([]);
        }

        if (chainsRes.ok) {
          const chainData = await chainsRes.json();
          setChains(Array.isArray(chainData) ? chainData : []);
        } else {
          setChains([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error al cargar plantillas de recursos:", error);
          setPrompts([]);
          setChains([]);
        }
      }
    };

    fetchTemplates();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handlePromptsChanged = (event) => {
      const next = normalizeList(event?.detail);
      setPrompts(next);
    };

    const handleChainsChanged = (event) => {
      const next = normalizeList(event?.detail);
      setChains(next);
    };

    window.addEventListener("prompt-templates-changed", handlePromptsChanged);
    window.addEventListener("chain-templates-changed", handleChainsChanged);

    return () => {
      window.removeEventListener(
        "prompt-templates-changed",
        handlePromptsChanged
      );
      window.removeEventListener(
        "chain-templates-changed",
        handleChainsChanged
      );
    };
  }, []);

  const handleDragEnd = useCallback(() => {
    resetDrag();
  }, [resetDrag]);

  const startPromptDrag = useCallback(
    (event, prompt) => {
      if (!prompt) {
        return;
      }

      const payload = buildPromptPayload(prompt);
      setType(null);
      setCode(null);
      setDragPayload(payload);
      event.dataTransfer.setData("application/prompt-name", prompt.name ?? "");
      event.dataTransfer.effectAllowed = "copy";
    },
    [setCode, setDragPayload, setType]
  );

  const startChainDrag = useCallback(
    (event, chain) => {
      if (!chain) {
        return;
      }

      const payload = buildChainPayload(chain);
      setType(null);
      setCode(null);
      setDragPayload(payload);
      event.dataTransfer.setData("application/chain-name", chain.name ?? "");
      event.dataTransfer.setData("application/chain-code", chain.code ?? "");
      event.dataTransfer.effectAllowed = "copy";
    },
    [setCode, setDragPayload, setType]
  );

  const handleRemove = useCallback(
    (kind, name) => {
      if (!onRemoveResource) {
        return;
      }
      onRemoveResource(kind, name);
    },
    [onRemoveResource]
  );

  const authMessage = useMemo(() => {
    if (status === "loading") {
      return "Cargando sesión...";
    }
    if (!isAuthenticated) {
      return "Inicia sesión para gestionar prompts y chains";
    }
    return null;
  }, [isAuthenticated, status]);

  return (
    <>
      <button
        type="button"
        className={`resource-drawer-tab${isOpen ? " resource-drawer-tab--open" : ""}`}
        onClick={toggleDock}
        aria-expanded={isOpen}
        aria-controls="resource-drawer"
      >
        <span className="resource-drawer-tab__label">Recursos</span>
      </button>

      <aside
        id="resource-drawer"
        className={`resource-drawer${isOpen ? " resource-drawer--open" : ""}`}
        aria-hidden={!isOpen}
      >
        <header className="resource-drawer__header">
          <div>
            <h2 className="resource-drawer__title">Recursos</h2>
            <p className="resource-drawer__subtitle">
              Arrastra prompts y chains al lienzo activo
            </p>
          </div>
          <button
            type="button"
            className="resource-drawer__close"
            onClick={toggleDock}
            aria-label="Cerrar panel de recursos"
          >
            <IoClose />
          </button>
        </header>

        {authMessage ? (
          <div className="resource-drawer__message">{authMessage}</div>
        ) : (
          <div className="resource-drawer__body">
            <section className="resource-drawer__section">
              <h3 className="resource-drawer__section-title">
                <TbPrompt aria-hidden="true" />
                Prompts disponibles
              </h3>
              <div className="resource-drawer__list">
                {prompts.length === 0 ? (
                  <p className="resource-drawer__empty">
                    Aún no tienes prompts guardados
                  </p>
                ) : (
                  prompts.map((prompt) => (
                    <div
                      key={prompt.id ?? prompt.name}
                      className="resource-drawer__item resource-drawer__item--draggable"
                      draggable
                      onDragStart={(event) => startPromptDrag(event, prompt)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="resource-drawer__item-icon" aria-hidden="true">
                        <TbPrompt />
                      </div>
                      <div className="resource-drawer__item-content">
                        <span className="resource-drawer__item-title">{prompt.name}</span>
                        {prompt.description ? (
                          <span className="resource-drawer__item-hint">
                            {prompt.description}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="resource-drawer__section">
              <h3 className="resource-drawer__section-title">
                <GiCrossedChains aria-hidden="true" />
                Chains disponibles
              </h3>
              <div className="resource-drawer__list">
                {chains.length === 0 ? (
                  <p className="resource-drawer__empty">
                    Aún no tienes chains guardadas
                  </p>
                ) : (
                  chains.map((chain) => (
                    <div
                      key={chain.id ?? chain.name}
                      className="resource-drawer__item resource-drawer__item--draggable"
                      draggable
                      onDragStart={(event) => startChainDrag(event, chain)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="resource-drawer__item-icon" aria-hidden="true">
                        <GiCrossedChains />
                      </div>
                      <div className="resource-drawer__item-content">
                        <span className="resource-drawer__item-title">{chain.name}</span>
                        {chain.description ? (
                          <span className="resource-drawer__item-hint">
                            {chain.description}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="resource-drawer__section">
              <h3 className="resource-drawer__section-title">
                Recursos en el diagrama
              </h3>
              <div className="resource-drawer__list">
                {currentPrompts.length === 0 && currentChains.length === 0 ? (
                  <p className="resource-drawer__empty">
                    Arrastra un recurso para añadirlo al diagrama
                  </p>
                ) : (
                  <>
                    {currentPrompts.map((prompt) => (
                      <div
                        key={`diagram-prompt-${prompt.name}`}
                        className="resource-drawer__item"
                      >
                        <div className="resource-drawer__item-icon" aria-hidden="true">
                          <TbPrompt />
                        </div>
                        <div className="resource-drawer__item-content">
                          <span className="resource-drawer__item-title">
                            {prompt.name}
                          </span>
                          <span className="resource-drawer__item-hint">
                            En el JSON del diagrama
                          </span>
                        </div>
                        <button
                          type="button"
                          className="resource-drawer__remove"
                          onClick={() => handleRemove("prompt", prompt.name)}
                          aria-label={`Quitar prompt ${prompt.name} del diagrama`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {currentChains.map((chain) => (
                      <div
                        key={`diagram-chain-${chain.name}`}
                        className="resource-drawer__item"
                      >
                        <div className="resource-drawer__item-icon" aria-hidden="true">
                          <GiCrossedChains />
                        </div>
                        <div className="resource-drawer__item-content">
                          <span className="resource-drawer__item-title">
                            {chain.name}
                          </span>
                          <span className="resource-drawer__item-hint">
                            En el JSON del diagrama
                          </span>
                        </div>
                        <button
                          type="button"
                          className="resource-drawer__remove"
                          onClick={() => handleRemove("chain", chain.name)}
                          aria-label={`Quitar chain ${chain.name} del diagrama`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </aside>
    </>
  );
};

export default ResourceDock;
