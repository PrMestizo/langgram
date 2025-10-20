"use client";

import { dividerClasses } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  FiSettings,
  FiBell,
  FiSliders,
  FiGrid,
  FiCalendar,
  FiDatabase,
  FiShield,
  FiUsers,
  FiUser,
} from "react-icons/fi";

const SECTIONS = [
  { id: "general", label: "General", icon: FiSettings },
  { id: "account", label: "Cuenta", icon: FiUser },
  { id: "notifications", label: "Notificaciones", icon: FiBell },
  { id: "personalization", label: "Personalización", icon: FiSliders },
  { id: "apps", label: "Aplicaciones y conecto...", icon: FiGrid },
  { id: "data", label: "Controles de datos", icon: FiDatabase },
  { id: "security", label: "Seguridad", icon: FiShield },
];

const accentOptions = [
  { value: "blue", label: "Azul" },
  { value: "purple", label: "Púrpura" },
  { value: "green", label: "Verde" },
];

const voiceOptions = [
  { value: "juniper", label: "Juniper" },
  { value: "maple", label: "Maple" },
  { value: "river", label: "River" },
];

function SettingsModal({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState("general");
  const [theme, setTheme] = useState("system");
  const [accentColor, setAccentColor] = useState("blue");
  const [language, setLanguage] = useState("automatic");
  const [spokenLanguage, setSpokenLanguage] = useState("automatic");
  const [voice, setVoice] = useState("juniper");
  const [showExtraModels, setShowExtraModels] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveSection("general");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const sectionTitles = useMemo(
    () => ({
      general: "Configuración General",
      account: "Configuración de Cuenta",
      notifications: "Notificaciones",
      personalization: "Personalización",
      apps: "Aplicaciones y Conexiones",
      data: "Controles de Datos",
      security: "Seguridad",
    }),
    []
  );

  const sectionDescriptions = useMemo(
    () => ({
      general:
        "Personaliza tu experiencia de Langgram y ajusta tus preferencias generales.",
      account:
        "Administra la información de tu cuenta y configuración de perfil.",
      notifications: "Controla cómo y cuándo recibes notificaciones.",
      personalization:
        "Ajusta la apariencia y comportamiento de la aplicación.",
      apps: "Gestiona las aplicaciones y servicios conectados a tu cuenta.",
      data: "Controla cómo se recopilan y utilizan tus datos.",
      security:
        "Administra la seguridad de tu cuenta y protege tu información.",
    }),
    []
  );

  const activeSectionTitle = useMemo(() => {
    return sectionTitles[activeSection] || "";
  }, [activeSection, sectionTitles]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="settings-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="settings-modal">
        <button
          type="button"
          className="settings-modal__close"
          onClick={onClose}
          aria-label="Cerrar ajustes"
        >
          ×
        </button>
        <aside className="settings-modal__sidebar">
          <div className="settings-modal__sidebar-header">Ajustes</div>
          <ul className="settings-modal__sidebar-list">
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = id === activeSection;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`settings-modal__sidebar-button${
                      isActive ? " settings-modal__sidebar-button--active" : ""
                    }`}
                    onClick={() => setActiveSection(id)}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <section className="settings-modal__content">
          <header className="settings-modal__header">
            <h2 id="settings-modal-title">{activeSectionTitle}</h2>
            <p className="settings-modal__description">
              {sectionDescriptions[activeSection] ||
                "Configuración personalizada."}
            </p>
          </header>

          {activeSection === "general" ? (
            <div className="settings-modal__group">
              <div className="settings-modal__item">
                <div className="settings-modal__item-label">Tema</div>
                <div className="settings-modal__control">
                  <select
                    value={theme}
                    onChange={(event) => setTheme(event.target.value)}
                    className="settings-modal__select"
                  >
                    <option value="system">Sistema</option>
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                  </select>
                </div>
              </div>

              <div className="settings-modal__item">
                <div className="settings-modal__item-label">
                  Color de acento
                </div>
                <div className="settings-modal__control settings-modal__control--inline">
                  {accentOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`settings-modal__radio${
                        accentColor === option.value
                          ? " settings-modal__radio--active"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="accent-color"
                        value={option.value}
                        checked={accentColor === option.value}
                        onChange={() => setAccentColor(option.value)}
                      />
                      <span className="settings-modal__radio-indicator" />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="settings-modal__item">
                <div className="settings-modal__item-label">Idioma</div>
                <div className="settings-modal__control">
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="settings-modal__select"
                  >
                    <option value="automatic">Automático</option>
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>
              </div>

              <div className="settings-modal__item">
                <div className="settings-modal__item-label">Idioma hablado</div>
                <div className="settings-modal__control settings-modal__control--column">
                  <select
                    value={spokenLanguage}
                    onChange={(event) => setSpokenLanguage(event.target.value)}
                    className="settings-modal__select"
                  >
                    <option value="automatic">Automático</option>
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                  <p className="settings-modal__helper">
                    Para obtener los mejores resultados, selecciona el idioma
                    que hablas principalmente cuando interactúas con el
                    asistente.
                  </p>
                </div>
              </div>

              <div className="settings-modal__item">
                <div className="settings-modal__item-label">Voz</div>
                <div className="settings-modal__control settings-modal__control--voice">
                  <button
                    type="button"
                    className="settings-modal__ghost-button"
                    onClick={() => {
                      // Placeholder: here a preview action could be triggered.
                    }}
                  >
                    Reproducir
                  </button>
                  <select
                    value={voice}
                    onChange={(event) => setVoice(event.target.value)}
                    className="settings-modal__select"
                  >
                    {voiceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="settings-modal__item settings-modal__item--last">
                <div className="settings-modal__item-label">
                  Mostrar modelos adicionales
                </div>
                <div className="settings-modal__control">
                  <label className="settings-modal__switch">
                    <input
                      type="checkbox"
                      checked={showExtraModels}
                      onChange={(event) =>
                        setShowExtraModels(event.target.checked)
                      }
                    />
                    <span className="settings-modal__switch-track">
                      <span className="settings-modal__switch-thumb" />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="settings-modal__placeholder">
              Esta sección estará disponible próximamente.
            </div>
          )}
          {activeSection === "account" && (
            <div className="settings-modal__group">
              <div className="settings-modal__item">
                <div className="settings-modal__item-label">Nombre</div>
                <div className="settings-modal__control">
                  <input
                    type="text"
                    name="name"
                    className="settings-modal__input"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default SettingsModal;
