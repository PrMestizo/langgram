import * as React from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ListItemText from "@mui/material/ListItemText";
import Switch from "@mui/material/Switch";

const ITEM_HEIGHT = 48;

export default function LongMenu({
  className,
  onOpenChange,
  onDelete,
  onEdit,
  isPublic,
  onToggleVisibility,
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    onOpenChange?.(true);
  };
  const handleClose = () => {
    setAnchorEl(null);
    onOpenChange?.(false);
  };

  const options = React.useMemo(() => {
    const list = [];
    if (typeof isPublic === "boolean" && onToggleVisibility) {
      list.push({
        key: "visibility",
        type: "toggle",
        label: "Visibilidad",
        checked: isPublic,
        onToggle: onToggleVisibility,
      });
    }
    if (onEdit) {
      list.push({ key: "edit", label: "Edit", action: onEdit });
    }
    if (onDelete) {
      list.push({ key: "delete", label: "Delete", action: onDelete });
    }
    return list;
  }, [onDelete, onEdit, isPublic, onToggleVisibility]);

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
        {options.map((option) => {
          if (option.type === "toggle") {
            return (
              <MenuItem
                key={option.key}
                disableRipple
                disableTouchRipple
                onClick={(event) => event.stopPropagation()}
                sx={{ display: "flex", gap: 1, alignItems: "center" }}
              >
                <ListItemText
                  primary={option.label}
                  secondary={option.checked ? "Público" : "Privado"}
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{
                    variant: "caption",
                    sx: { color: "text.secondary" },
                  }}
                />
                <Switch
                  edge="end"
                  checked={option.checked}
                  onChange={(event) => {
                    option.onToggle?.(event.target.checked);
                  }}
                  inputProps={{ "aria-label": option.label }}
                />
              </MenuItem>
            );
          }

          return (
            <MenuItem
              key={option.key}
              onClick={() => handleSelect(option.action)}
            >
              {option.label}
            </MenuItem>
          );
        })}
      </Menu>
    </div>
  );
}
