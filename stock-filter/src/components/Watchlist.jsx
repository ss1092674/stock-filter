import { useState } from "react";

export default function Watchlist({ watchlist, addStock, removeStock }) {
  const [input, setInput] = useState("");

  return (
    <div className="card">
      <h3>Watchlist</h3>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="INFY.NS"
      />
      <button onClick={() => {
        addStock(input);
        setInput("");
      }}>
        Add
      </button>

      {watchlist.map((stock, i) => (
        <div key={i} className="watchlist-item">
          {stock}
          <button onClick={() => removeStock(stock)}>❌</button>
        </div>
      ))}
    </div>
  );
}