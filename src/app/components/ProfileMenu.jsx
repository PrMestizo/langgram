"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CgProfile } from "react-icons/cg";

const USER_STORAGE_KEY = "langgramUser";
const CREDENTIALS_STORAGE_KEY = "langgramCredentials";

const sanitizeName = (name) => name?.trim() ?? "";
const sanitizeEmail = (email) => email?.trim().toLowerCase() ?? "";

function ProfileMenu() {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const profileButtonRef = useRef(null);
  const dropdownRef = useRef(null);

  const avatarLetter = useMemo(() => {
    if (!user?.name) {
      return "";
    }
    return user.name.trim().charAt(0).toUpperCase();
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.name && parsed.email) {
          setUser(parsed);
        }
      }
    } catch (err) {
      console.warn("No se pudo cargar el usuario guardado", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      if (user) {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (err) {
      console.warn("No se pudo sincronizar el usuario", err);
    }
  }, [user]);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (
        dropdownRef.current?.contains(event.target) ||
        profileButtonRef.current?.contains(event.target)
      ) {
        return;
      }
      closeDropdown();
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen, closeDropdown]);

  const resetForm = useCallback(() => {
    setFormData({ name: "", email: "", password: "" });
    setError("");
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthOpen(false);
    resetForm();
  }, [resetForm]);

  const handleProfileClick = useCallback(() => {
    if (user) {
      setIsDropdownOpen((prev) => !prev);
    } else {
      setAuthMode("login");
      setIsAuthOpen(true);
    }
  }, [user]);

  const toggleAuthMode = useCallback(() => {
    setAuthMode((prev) => (prev === "login" ? "register" : "login"));
    resetForm();
  }, [resetForm]);

  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    closeDropdown();
  }, [closeDropdown]);

  const handleNavigate = useCallback(
    (destination) => {
      closeDropdown();
      window.dispatchEvent(
        new CustomEvent("profile-navigation", { detail: { destination } })
      );
    },
    [closeDropdown]
  );

  const handleAuthSubmit = useCallback(
    (event) => {
      event.preventDefault();
      setError("");

      const trimmedEmail = sanitizeEmail(formData.email);
      const trimmedPassword = formData.password.trim();

      if (!trimmedEmail || !trimmedPassword) {
        setError("Por favor completa todos los campos.");
        return;
      }

      if (authMode === "register") {
        const trimmedName = sanitizeName(formData.name);
        if (!trimmedName) {
          setError("El nombre es obligatorio para registrarse.");
          return;
        }

        const newUser = { name: trimmedName, email: trimmedEmail };
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              CREDENTIALS_STORAGE_KEY,
              JSON.stringify({ ...newUser, password: trimmedPassword })
            );
          }
        } catch (err) {
          console.warn("No se pudieron guardar las credenciales", err);
        }
        setUser(newUser);
        closeAuthModal();
        return;
      }

      try {
        if (typeof window === "undefined") {
          setError("No se pudo validar la sesión.");
          return;
        }
        const storedCredentials = window.localStorage.getItem(
          CREDENTIALS_STORAGE_KEY
        );
        if (!storedCredentials) {
          setError("No encontramos una cuenta registrada. Regístrate primero.");
          return;
        }
        const parsedCredentials = JSON.parse(storedCredentials);
        if (
          !parsedCredentials ||
          sanitizeEmail(parsedCredentials.email) !== trimmedEmail ||
          parsedCredentials.password !== trimmedPassword
        ) {
          setError("Correo o contraseña incorrectos.");
          return;
        }
        setUser({ name: parsedCredentials.name, email: trimmedEmail });
        closeAuthModal();
      } catch (err) {
        console.warn("No se pudieron leer las credenciales", err);
        setError("Ocurrió un error al iniciar sesión.");
      }
    },
    [authMode, formData, closeAuthModal]
  );

  return (
    <div className="profile-menu">
      <button
        ref={profileButtonRef}
        type="button"
        className={`perfil-button${avatarLetter ? " perfil-button--avatar" : ""}`}
        onClick={handleProfileClick}
        aria-haspopup={user ? "menu" : "dialog"}
        aria-expanded={user ? isDropdownOpen : isAuthOpen}
        aria-controls={user ? "profile-dropdown" : undefined}
      >
        {avatarLetter ? (
          <span className="perfil-avatar-letter" aria-hidden="true">
            {avatarLetter}
          </span>
        ) : (
          <CgProfile className="perfil-icon" aria-hidden="true" />
        )}
        <span className="sr-only">
          {user ? "Abrir menú de perfil" : "Iniciar sesión"}
        </span>
      </button>

      {user && isDropdownOpen && (
        <div
          id="profile-dropdown"
          ref={dropdownRef}
          className="profile-dropdown"
          role="menu"
        >
          <div className="profile-dropdown__header">
            <div className="profile-dropdown__avatar" aria-hidden="true">
              {avatarLetter}
            </div>
            <div className="profile-dropdown__details">
              <span className="profile-dropdown__name">{user.name}</span>
              <span className="profile-dropdown__email">{user.email}</span>
            </div>
          </div>
          <button
            type="button"
            className="profile-dropdown__item"
            onClick={() => handleNavigate("profile")}
          >
            Perfil
          </button>
          <button
            type="button"
            className="profile-dropdown__item"
            onClick={() => handleNavigate("settings")}
          >
            Settings
          </button>
          <div className="profile-dropdown__separator" />
          <button
            type="button"
            className="profile-dropdown__item profile-dropdown__item--danger"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {isAuthOpen && (
        <div
          className="profile-auth-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-auth-title"
        >
          <div className="profile-auth-modal">
            <button
              type="button"
              className="profile-auth-close"
              onClick={closeAuthModal}
              aria-label="Cerrar"
            >
              ×
            </button>
            <h2 id="profile-auth-title" className="profile-auth-title">
              {authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h2>
            <p className="profile-auth-subtitle">
              {authMode === "login"
                ? "Accede con tu correo y contraseña."
                : "Registra una nueva cuenta para guardar tus diagramas."}
            </p>
            <form className="profile-auth-form" onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <label className="profile-auth-field">
                  <span>Nombre</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Tu nombre"
                    required
                  />
                </label>
              )}
              <label className="profile-auth-field">
                <span>Correo electrónico</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="tucorreo@ejemplo.com"
                  required
                />
              </label>
              <label className="profile-auth-field">
                <span>Contraseña</span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Ingresa tu contraseña"
                  required
                  minLength={6}
                />
              </label>
              {error && <p className="profile-auth-error">{error}</p>}
              <button type="submit" className="profile-auth-submit">
                {authMode === "login" ? "Iniciar sesión" : "Registrarme"}
              </button>
            </form>
            <div className="profile-auth-toggle">
              {authMode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
              <button type="button" onClick={toggleAuthMode}>
                {authMode === "login" ? "Regístrate" : "Inicia sesión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
