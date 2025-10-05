import * as React from "react";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import MuiModal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Editor from "@monaco-editor/react";
import TextField from "@mui/material/TextField";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

function CustomModal({
  isVisible,
  onClose,
  onSave,
  initialCode = "",
  initialName = "",
  title = "Editor de nodo personalizado",
  nameLabel = "Nombre",
  language = "python",
  saveLabel = "Guardar",
  cancelLabel = "Cancelar",
}) {
  const [open, setOpen] = React.useState(!!isVisible);
  const [code, setCode] = React.useState(initialCode);
  const [nodeName, setNodeName] = React.useState(initialName);

  React.useEffect(() => {
    setOpen(!!isVisible);
  }, [isVisible]);

  React.useEffect(() => {
    if (isVisible) {
      setCode(initialCode);
    }
  }, [initialCode, isVisible]);

  React.useEffect(() => {
    if (isVisible) {
      setNodeName(initialName);
    }
  }, [initialName, isVisible]);

  const handleSave = () => {
    onSave?.(code, nodeName);
    onClose?.();
  };

  return (
    <MuiModal
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={open}>
        <Box sx={style}>
          <Typography id="transition-modal-title" variant="h6" component="h2">
            {title}
          </Typography>
          <div style={{ marginBottom: "1rem" }}>
            <TextField
              label={nameLabel}
              variant="outlined"
              id="node-name"
              type="text"
              margin="normal"
              sx={{ width: "300px" }}
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              placeholder={nameLabel}
            />
          </div>
          <div style={{ height: "300px", marginBottom: "1rem" }}>
            <Editor
              height="100%"
              defaultLanguage={language}
              value={code}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
              }}
              onChange={(val) => setCode(val ?? "")}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <Button variant="contained" onClick={handleSave}>
              {saveLabel}
            </Button>
            <Button variant="outlined" onClick={onClose}>
              {cancelLabel}
            </Button>
          </div>
        </Box>
      </Fade>
    </MuiModal>
  );
}

export default CustomModal;
