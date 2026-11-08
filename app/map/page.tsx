export default function MapPage() {
  const stores = [
    { name: '7-11 台北中山店', distance: '0.7 km', rating: '4.8' },
    { name: 'FamilyMart 復興店', distance: '1.2 km', rating: '4.6' },
    { name: 'OK Mart 忠孝店', distance: '2.0 km', rating: '4.7' },
  ];

  return (
    <div className="page-stack">
      <h1 className="page-title">超商地圖</h1>

      <div className="card" style={{ padding: '1.5rem' }}>
        <div
          style={{
            height: '320px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#1d4ed8',
          }}
        >
          地圖預覽區
        </div>

        <div className="page-stack" style={{ marginTop: '1.2rem' }}>
          {stores.map((store) => (
            <div key={store.name} className="row" style={{ justifyContent: 'space-between', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '12px' }}>
              <div>
                <strong>{store.name}</strong>
                <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>{store.distance}</p>
              </div>
              <span className="tag">⭐ {store.rating}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
