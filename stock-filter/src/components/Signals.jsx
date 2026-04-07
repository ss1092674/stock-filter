export default function Signals({ stocks }) {
  return (
    <div>
      <h3>Signals</h3>

      {stocks.length === 0 ? (
        <div className="card">
          <p>No signals available from the server.</p>
        </div>
      ) : (
        stocks.map((item, i) => (
          <div key={i} className="signal-card">
            <div className="signal-header">
              <h4>{item.stock}</h4>
              <span className="timestamp">
                {item.timestamp || "Updated now"}
              </span>
            </div>

            {/* 🔥 SHOW EXACT SIGNALS FROM BACKEND */}
            {item.signals && item.signals.length > 0 ? (
              item.signals.map((s, j) => (
                <p key={j}>{s}</p>
              ))
            ) : (
              <p>No signals</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}