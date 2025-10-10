import * as React from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const ITEM_HEIGHT = 48;

export default function LongMenu({
  className,
  onOpenChange,
  onDelete,
  onEdit,
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    onOpenChange?.(true);
  };
  const handleClose = () => {
    setAnchorEl(null);
    onOpenChange?.(false);
  };

  const options = React.useMemo(() => {
    const list = [];
    if (onEdit) {
      list.push({ label: "Edit", action: onEdit });
    }
    if (onDelete) {
      list.push({ label: "Delete", action: onDelete });
    }
    return list;
  }, [onDelete, onEdit]);

  if (!options.length) {
    return null;
  }

  const handleSelect = (action) => {
    action?.();
    handleClose();
  };

  return (
    <div className={className}>
      <IconButton
        aria-label="more"
        id="long-button"
        aria-controls={open ? "long-menu" : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-haspopup="true"
        onClick={handleClick}
        sx={{ color: "white" }}
      >
        <MoreVertIcon sx={{ fontSize: 20 }} />
      </IconButton>
      <Menu
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        id="long-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            style: {
              maxHeight: ITEM_HEIGHT * 4.5,
              width: "20ch",
            },
          },
          list: {
            "aria-labelledby": "long-button",
          },
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.label}
            onClick={() => handleSelect(option.action)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
