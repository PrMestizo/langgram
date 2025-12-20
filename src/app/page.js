import Image from "next/image";
import Link from "next/link";
import styles from "./landing.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.brand} aria-label="Ir a Home">
          <span className={styles.brandMark}>LG</span>
          <span>Langgram</span>
        </Link>
        <nav className={styles.navLinks} aria-label="Navegación principal">
          <Link className={styles.navLink} href="#producto">
            Producto
          </Link>
          <Link className={styles.navLink} href="#recursos">
            Recursos
          </Link>
          <Link className={styles.navLink} href="#precios">
            Precios
          </Link>
          <Link className={styles.navLink} href="#clientes">
            Clientes
          </Link>
          <Link className={styles.navLink} href="/studio">
            Studio
          </Link>
        </nav>
        <div className={styles.actions}>
          <Link className={styles.secondaryButton} href="/demo">
            Ver demo
          </Link>
          <Link className={styles.actionButton} href="/studio">
            Empezar gratis
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.overline} id="producto">
            Conecta ideas · Construye más rápido
          </p>
          <h1 className={styles.title}>
            La forma más rápida de planificar y construir tus agentes y flujos
            de IA
          </h1>
          <p className={styles.subtitle}>
            Organiza diagramas, prompts y herramientas en un canvas visual
            potente. Pasa de la idea al prototipo con un generador de código
            listo para producción y una biblioteca de componentes reutilizables.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.actionButton} href="/studio">
              Comenzar ahora
            </Link>
            <Link className={styles.secondaryButton} href="/demo" id="recursos">
              Ver ejemplos
            </Link>
          </div>
          <div className={styles.meta}>
            <span className={styles.badge}>Nuevo: asistentes con tools</span>
            <span>Sin instalaciones · Colaboración en vivo · Exporta a código</span>
          </div>
          <div className={styles.trusted} id="clientes">
            <span>Equipos productivos ya confían en Langgram:</span>
            <span className={styles.trustedBadge}>Builders</span>
            <span className={styles.trustedBadge}>Product Managers</span>
            <span className={styles.trustedBadge}>Consultoras IA</span>
          </div>
        </div>

        <div className={styles.previewCard} aria-label="Vista previa del estudio">
          <div className={styles.faintGlow} aria-hidden />
          <div className={styles.previewShell}>
            <Image
              src="/images/langgram-studio.svg"
              alt="Vista del diagrama en Langgram Studio"
              className={styles.previewImage}
              width={1280}
              height={720}
              priority
            />
          </div>
          <p className={styles.previewCaption} id="precios">
            Diseña y ajusta tus agentes visualmente, exporta a JSON o código en
            segundos.
          </p>
        </div>
      </section>
    </main>
  );
}
