"use client";

import { useState, useRef, useEffect } from "react";

export default function AnimeDescription({ description }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);
  const descRef = useRef(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (descRef.current) {
        // Temporarily force clamped class if not present to measure accurately
        const hasClampedClass = descRef.current.classList.contains("clamped");
        if (!hasClampedClass) {
          descRef.current.classList.add("clamped");
        }
        const hasOverflow = descRef.current.scrollHeight > descRef.current.clientHeight;
        if (!hasClampedClass) {
          descRef.current.classList.remove("clamped");
        }
        setIsCollapsible(hasOverflow);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [description]);

  if (!description) {
    return <p className="detail-desc">No description available.</p>;
  }

  return (
    <div className="description-container">
      <p
        ref={descRef}
        className={`detail-desc ${!isExpanded ? "clamped" : ""}`}
      >
        {description}
      </p>
      
      {isCollapsible && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="desc-toggle-btn"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? "Show less" : "Show more"}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`desc-toggle-icon ${isExpanded ? "rotated" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}
