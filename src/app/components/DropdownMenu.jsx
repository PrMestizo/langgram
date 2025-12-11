import React, { useState, useRef, useEffect } from "react";
import { useTransition, animated } from "@react-spring/web";
import { FaChevronDown } from "react-icons/fa";

const DropdownMenu = ({ options, children, backgroundColor = "rgba(17, 17, 17, 0.6)" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const transitions = useTransition(isOpen, {
    from: { opacity: 0, transform: "translateY(-10px) scale(0.95)" },
    enter: { opacity: 1, transform: "translateY(0px) scale(1)" },
    leave: { opacity: 0, transform: "translateY(-10px) scale(0.95)" },
    config: { tension: 300, friction: 30 },
  });

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={toggleDropdown}
        style={{
          padding: "8px 16px",
          backgroundColor: backgroundColor,
          color: "white",
          border: "none",
          borderRadius: "12px",
          backdropFilter: "blur(4px)",
          boxShadow: "0 0 20px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 500,
          outline: "none",
        }}
        onMouseEnter={(e) => {
           if (backgroundColor === "rgba(17, 17, 17, 0.6)") {
             e.currentTarget.style.backgroundColor = "rgba(17, 17, 17, 0.8)";
           } else {
             // Simply darken slightly/add opacity for other colors if needed, or leave as is
             e.currentTarget.style.opacity = "0.9";
           }
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = backgroundColor;
            e.currentTarget.style.opacity = "1";
        }}
      >
        {children ?? "Menu"}
        <div style={{
            display: 'flex',
            alignItems: 'center',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
        }}>
           <FaChevronDown style={{ fontSize: "12px" }} />
        </div>
      </button>

      {transitions((style, item) =>
        item ? (
          <animated.div
            style={{
              ...style,
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "8px",
              width: "192px",
              padding: "4px",
              backgroundColor: "#2564ebc9",
              backdropFilter: "blur(4px)",
              borderRadius: "12px",
              boxShadow: "0 0 20px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              zIndex: 1000,
              overflow: "hidden"
            }}
          >
            {options && options.length > 0 ? (
              options.map((option, index) => (
                <button
                  key={option.label || index}
                  onClick={() => {
                     if (option.onClick) option.onClick();
                     setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "white",
                    fontSize: "14px",
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "8px",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background-color 0.2s",
                    width: "100%",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  {option.Icon}
                  {option.label}
                </button>
              ))
            ) : (
                <div style={{ padding: "8px 12px", color: "white", fontSize: "12px" }}>No options</div>
            )}
          </animated.div>
        ) : null
      )}
    </div>
  );
};

export default DropdownMenu;
