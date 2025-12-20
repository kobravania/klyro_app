interface DashboardScreenProps {
  profile: any
}

function DashboardScreen({ profile }: DashboardScreenProps) {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Dashboard</h1>
        {profile && (
          <div style={styles.profile}>
            <div style={styles.profileItem}>
              <span style={styles.label}>Возраст:</span>
              <span>{profile.age}</span>
            </div>
            <div style={styles.profileItem}>
              <span style={styles.label}>Рост:</span>
              <span>{profile.height} см</span>
            </div>
            <div style={styles.profileItem}>
              <span style={styles.label}>Вес:</span>
              <span>{profile.weight} кг</span>
            </div>
            <div style={styles.profileItem}>
              <span style={styles.label}>Пол:</span>
              <span>{profile.gender === 'male' ? 'Мужской' : 'Женский'}</span>
            </div>
            <div style={styles.profileItem}>
              <span style={styles.label}>Цель:</span>
              <span>
                {profile.goal === 'lose' && 'Похудение'}
                {profile.goal === 'maintain' && 'Поддержание'}
                {profile.goal === 'gain' && 'Набор массы'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f7',
    padding: '20px',
  },
  content: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    fontSize: '32px',
    fontWeight: 600,
    marginBottom: '32px',
    color: '#1d1d1f',
  },
  profile: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  profileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #e5e5ea',
  },
  label: {
    fontWeight: 500,
    color: '#8e8e93',
  },
}

export default DashboardScreen

