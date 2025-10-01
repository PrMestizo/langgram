import * as React from "react";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import MuiModal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Editor from "@monaco-editor/react";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

function CustomModal({ isVisible, onClose, onSave, initialCode = "" }) {
  const [open, setOpen] = React.useState(!!isVisible);
  const [code, setCode] = React.useState(initialCode);
  const [nodeName, setNodeName] = React.useState("");

  React.useEffect(() => {
    setOpen(!!isVisible);
  }, [isVisible]);

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
            Editor de nodo personalizado
          </Typography>
          <div style={{ marginBottom: '1rem' }}>
            <input
              id="node-name"
              className="input"
              type="text"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              placeholder="Nombre del nodo"
              style={{
                width: '100%',
                padding: '0.5rem',
                marginBottom: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
          </div>
          <div style={{ height: '300px', marginBottom: '1rem' }}>
            <Editor
              height="100%"
              defaultLanguage="python"
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="outlined" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Guardar
            </Button>
          </div>
        </Box>
      </Fade>
    </MuiModal>
  );
}

export default CustomModal;
