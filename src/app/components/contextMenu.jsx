const ContextMenu = ({
  rightClickItem,
  positionX,
  positionY,
  isToggled,
  buttons,
  contextMenuRef,
}) => {
  return (
    <menu
      ref={contextMenuRef}
      role="menu"
      aria-hidden={!isToggled}
      style={{ top: positionY + 2 + "px", left: positionX + 2 + "px" }}
      className={`context-menu ${isToggled ? "active" : ""}`}
    >
      {buttons.map((button, index) => {
        function HandleClick(e) {
          e.stopPropagation();
          button.onClick?.(e, rightClickItem);
        }

        if (button.isSeparator) {
          return <div className="context-menu-hr" key={`sep-${index}`} />;
        }

        return (
          <button
            onClick={HandleClick}
            key={index}
            className="context-menu-button"
            role="menuitem"
          >
            <span className="context-menu-icon">{button.icon}</span>
            <span className="context-menu-text">{button.text}</span>
          </button>
        );
      })}
    </menu>
  );
};

export default ContextMenu;
