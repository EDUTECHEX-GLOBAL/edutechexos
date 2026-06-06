import React from 'react';

export default function InternalPlatform() {
  return (
    <main style={styles.container}>
      <h1 style={styles.title}>Internal Platform v1.0</h1>
      <p style={styles.subtitle}>The team OS – EduTechEx runs on.</p>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Features</h2>
        <ul style={styles.list}>
          <li>Channels</li>
          <li>Embedded AI</li>
          <li>Auto‑extracted tasks</li>
          <li>Morning digests</li>
          <li>All the context your team needs, without the noise.</li>
        </ul>
      </section>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Built on</h2>
        <ul style={styles.list}>
          <li>Python</li>
          <li>FastAPI</li>
          <li>React</li>
          <li>MongoDB</li>
          <li>Gemini</li>
        </ul>
      </section>
      <div style={styles.actions}>
        <a href="#" style={styles.button}>Open the platform</a>
        <a href="#" style={styles.buttonSecondary}>Sign in to your account</a>
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    color: '#1F2937',
    background: 'linear-gradient(135deg, #fafbff 0%, #e0e7ff 100%)',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
    color: '#111827',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '2rem',
    color: '#4B5563',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '0.75rem',
    color: '#1E40AF',
  },
  list: {
    listStyleType: 'disc',
    paddingLeft: '1.5rem',
    lineHeight: '1.8',
    color: '#374151',
  },
  actions: {
    marginTop: '2rem',
    display: 'flex',
    gap: '1rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3E4A89',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  buttonSecondary: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#E5E7EB',
    color: '#111827',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
};
