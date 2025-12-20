import Link from 'next/link';
import styles from './page.module.css';

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon} />
          LANGGRAM
        </div>
        <div className={styles.navLinks}>
          <a href="#">Product</a>
          <a href="#">Resources</a>
          <a href="#">Pricing</a>
          <a href="#">Customers</a>
          <a href="#">Now</a>
          <a href="#">Contact</a>
        </div>
        <div className={styles.auth}>
          <Link href="/studio">Log in</Link>
          <Link href="/studio" className={styles.signupBtn}>Sign up</Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <h1 className={styles.title}>
          Langgram is a purpose-built tool for<br/>
          planning and building products
        </h1>
        
        <p className={styles.subtitle}>
          Meet the system for modern software development.<br/>
          Streamline issues, projects, and product roadmaps.
        </p>

        <div className={styles.ctaGroup}>
          <Link href="/studio" className={styles.primaryBtn}>
            Start building
          </Link>
          <div className={styles.cmdInfo}>
            New: Linear agent for Slack &gt;
          </div>
        </div>

        <div className={styles.heroImageWrapper}>
          {/* Using the uploaded diagram image as the hero with 3D tilt */}
          <img 
            src="/hero-diagram.png" 
            alt="Langgram Studio Diagram Interface" 
            className={styles.heroImage} 
          />
        </div>
      </header>
    </div>
  );
}
