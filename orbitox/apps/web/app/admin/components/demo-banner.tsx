import Link from 'next/link';
import styles from './demo-banner.module.css';

/**
 * The legacy /admin screens run on built-in sample data, not on projects that are
 * actually connected. Say so plainly and point to the live view.
 */
export function DemoBanner() {
  return (
    <div className={styles.banner} role="note">
      <span>
        <strong>Sample data.</strong> These legacy admin screens are not connected to your real projects, so the numbers here are illustrative.
      </span>
      <Link className={styles.link} href="/platform/fleet">
        Open live Fleet →
      </Link>
    </div>
  );
}
