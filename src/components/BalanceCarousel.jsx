import { useRef, useState } from 'react';

// Full-width, one-at-a-time swipe carousel for the balance cards. Uses native
// CSS scroll-snap so touch swipe gets real iOS momentum + snapping; the dots
// track the snapped index and double as tap targets.
export default function BalanceCarousel({ cards }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);

  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  function goTo(i) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <div className="balance-carousel">
      <div className="balance-track" ref={trackRef} onScroll={handleScroll}>
        {cards.map((card, i) => (
          <div className="balance-slide" key={i}>{card}</div>
        ))}
      </div>
      <div className="balance-dots">
        {cards.map((_, i) => (
          <button
            key={i}
            className={`balance-dot ${i === index ? 'active' : ''}`}
            aria-label={`Show card ${i + 1} of ${cards.length}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
