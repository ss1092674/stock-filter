import { useState, useEffect } from "react";

export default function LiveTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="live-time">
      <h3>Current Time</h3>
      <div className="time-display">
        {time.toLocaleTimeString()}
      </div>
      <div className="date-display">
        {time.toLocaleDateString()}
      </div>
    </div>
  );
}