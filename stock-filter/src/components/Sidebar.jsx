export default function Sidebar({ setCurrentView }) {
  return (
    <div className="sidebar">
      <p onClick={() => setCurrentView("dashboard")}>Dashboard</p>
      <p onClick={() => setCurrentView("watchlist")}>Watchlist</p>
      <p onClick={() => setCurrentView("signals")}>Signals</p>
    </div>
  );
}