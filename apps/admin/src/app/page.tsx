export default function AdminDashboard() {
  const apiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? 'http://localhost:4000/api/v1'
  const docsUrl = apiUrl.replace('/api/v1', '') + '/api/docs'

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕋</div>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#133C2A',
            margin: '0 0 8px 0',
          }}
        >
          Yala Haji Admin
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Dashboard is under construction. API is live.
        </p>
        <a
          href={docsUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block',
            background: '#133C2A',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Open API Docs →
        </a>
      </div>
    </main>
  )
}
