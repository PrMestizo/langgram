"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CgProfile } from "react-icons/cg";
import { signIn, signOut, useSession } from "next-auth/react";

const sanitizeName = (name) => name?.trim() ?? "";
const sanitizeEmail = (email) => email?.trim().toLowerCase() ?? "";

function ProfileMenu() {
  const { data: session, status } = useSession();
  const user = session?.user ?? null;
  const isSessionLoading = status === "loading";
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileButtonRef = useRef(null);
  const dropdownRef = useRef(null);

  const avatarLetter = useMemo(() => {
    if (!user?.name) {
      return "";
    }
    return user.name.trim().charAt(0).toUpperCase();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsDropdownOpen(false);
    }
  }, [user]);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const showAlert = useCallback((message) => {
    if (typeof window === "undefined" || !message) {
      return;
    }
    window.alert(message);
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
    setIsSubmitting(false);
  }, [resetForm]);

  useEffect(() => {
    if (user && isAuthOpen) {
      closeAuthModal();
    }
  }, [user, isAuthOpen, closeAuthModal]);

  const handleProfileClick = useCallback(() => {
    if (user) {
      setIsDropdownOpen((prev) => !prev);
    } else if (!isSessionLoading) {
      setAuthMode("login");
      setIsAuthOpen(true);
    }
  }, [user, isSessionLoading]);

  const toggleAuthMode = useCallback(() => {
    setAuthMode((prev) => (prev === "login" ? "register" : "login"));
    resetForm();
  }, [resetForm]);

  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleLogout = useCallback(() => {
    closeDropdown();
    signOut({ callbackUrl: "/" });
  }, [closeDropdown, signOut]);

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
    async (event) => {
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

        try {
          setIsSubmitting(true);
          const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmedName,
              email: trimmedEmail,
              password: trimmedPassword,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error ?? "No se pudo completar el registro.");
          }
          const signInResult = await signIn("credentials", {
            redirect: false,
            email: trimmedEmail,
            password: trimmedPassword,
          });

          if (signInResult?.error) {
            throw new Error(signInResult.error);
          }

          showAlert("Registro exitoso.");
          closeAuthModal();
        } catch (err) {
          setError(err.message ?? "Ocurrió un error al registrarse.");
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      try {
        setIsSubmitting(true);
        const signInResult = await signIn("credentials", {
          redirect: false,
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (signInResult?.error) {
          const message =
            signInResult.error === "CredentialsSignin"
              ? "Correo o contraseña incorrectos."
              : signInResult.error ?? "No se pudo iniciar sesión.";
          throw new Error(message);
        }
        showAlert("Inicio de sesión exitoso.");
        closeAuthModal();
      } catch (err) {
        setError(err.message ?? "Ocurrió un error al iniciar sesión.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [authMode, formData, closeAuthModal, showAlert, signIn]
  );

  const handleGoogleSignIn = useCallback(() => {
    signIn("google");
  }, [signIn]);

  return (
    <div className="profile-menu">
      <button
        ref={profileButtonRef}
        type="button"
        className={`perfil-button${
          avatarLetter ? " perfil-button--avatar" : ""
        }`}
        onClick={handleProfileClick}
        aria-haspopup={user ? "menu" : "dialog"}
        aria-expanded={user ? isDropdownOpen : isAuthOpen}
        aria-controls={user ? "profile-dropdown" : undefined}
        disabled={isSessionLoading}
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
              <button
                type="submit"
                className="profile-auth-submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Procesando..."
                  : authMode === "login"
                  ? "Iniciar sesión"
                  : "Registrarme"}
              </button>
            </form>
            <div className="profile-auth-separator">o</div>
            <button
              type="button"
              className="profile-auth-provider"
              onClick={handleGoogleSignIn}
            >
              Continuar con Google
            </button>
            <div className="profile-auth-toggle">
              {authMode === "login"
                ? "¿Aún no tienes cuenta?"
                : "¿Ya tienes cuenta?"}{" "}
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
