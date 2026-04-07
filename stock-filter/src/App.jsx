import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Watchlist from "./components/Watchlist";
import Signals from "./components/Signals";
import LiveTime from "./components/LiveTime";
import "./styles/main.css";

function App() {
  const [stocks, setStocks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [signalHistory, setSignalHistory] = useState([]);
  const [currentView, setCurrentView] = useState("dashboard");
  const [currentInterval, setCurrentInterval] = useState("1m");

  // ✅ Fetch signals from backend
  const fetchData = () => {
    fetch("http://localhost:5000/signals")
      .then(res => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      })
      .then(data => {
        const signalsWithTime = data.map(stock => ({
          ...stock,
          timestamp: new Date().toLocaleString()
        }));

        console.log("New Signals:", signalsWithTime);

        // ✅ Update stocks only if changed
        setStocks(prev => {
          const isSame =
            JSON.stringify(prev.map(s => ({ ...s, timestamp: "" }))) ===
            JSON.stringify(signalsWithTime.map(s => ({ ...s, timestamp: "" })));

          return isSame ? prev : [...signalsWithTime];
        });

        // ✅ Update history only if changed
        setSignalHistory(prev => {
          const last = prev[prev.length - 1];

          const isSame =
            last &&
            JSON.stringify(last.signals.map(s => ({ ...s, timestamp: "" }))) ===
            JSON.stringify(signalsWithTime.map(s => ({ ...s, timestamp: "" })));

          if (isSame) return prev;

          return [
            ...prev,
            {
              timestamp: new Date().toLocaleString(),
              signals: signalsWithTime
            }
          ];
        });
      })
      .catch(error => {
        console.error("Failed to fetch signals:", error);
      });
  };

  // ✅ Initial load + interval refresh
  useEffect(() => {
    fetch("http://localhost:5000/watchlist")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setWatchlist(data);
        } else {
          setWatchlist(["RELIANCE.NS", "TCS.NS", "INFY.NS"]);
        }
      })
      .catch(() => {
        setWatchlist(["RELIANCE.NS", "TCS.NS", "INFY.NS"]);
      });

    fetchData();

    // 🔥 Change interval if needed (5s = fast, 60s = normal)
    const interval = setInterval(fetchData, 60000);

    return () => clearInterval(interval);
  }, []);

  // ✅ Add stock
  const addStock = (stock) => {
    fetch("http://localhost:5000/watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ stock: stock.toUpperCase() })
    })
      .then(res => res.json())
      .then(setWatchlist);
  };

  // ✅ Remove stock
  const removeStock = (stock) => {
    fetch(`http://localhost:5000/watchlist/${stock}`, {
      method: "DELETE"
    })
      .then(res => res.json())
      .then(setWatchlist);
  };

  return (
    <div>
      <Navbar />
      <Sidebar setCurrentView={setCurrentView} />

      <div className="main">
        {currentView === "dashboard" && (
          <>
            <LiveTime />

            <div className="card timeframe-selector">
              <label>Timeframe: </label>
              <select
                value={currentInterval}
                onChange={(e) => {
                  const newInterval = e.target.value;
                  setCurrentInterval(newInterval);
                  fetch("http://localhost:5000/set-interval", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ interval: newInterval })
                  })
                    .then(() => fetchData())
                    .catch(error => console.error("Failed to set interval:", error));
                }}
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
              </select>
            </div>

            <div className="card history-summary">
              <h3>Signal History</h3>
              <p>
                {signalHistory.length} scan
                {signalHistory.length === 1 ? "" : "s"} saved
              </p>
            </div>

            <Watchlist
              watchlist={watchlist}
              addStock={addStock}
              removeStock={removeStock}
            />

            <Signals stocks={stocks} />
          </>
        )}

        {currentView === "watchlist" && (
          <Watchlist
            watchlist={watchlist}
            addStock={addStock}
            removeStock={removeStock}
          />
        )}

        {currentView === "signals" && <Signals stocks={stocks} />}
      </div>
    </div>
  );
}

export default App;