import * as React from "react";
import {
  Checkbox,
  TextField,
  Typography,
  Button,
  Fade,
  Box,
  Backdrop,
  FormControlLabel,
} from "@mui/material";
import Editor from "@monaco-editor/react";
import MuiModal from "@mui/material/Modal";

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
  initialConditionalEdge = false,
  nameLabel = "Nombre",
  language = "python",
  saveLabel = "Guardar",
  cancelLabel = "Cancelar",
  namePlaceholder,
  editorType = "code",
  contentLabel = "Contenido",
  textPlaceholder = "",
  showConditionalEdge = false,
}) {
  const [open, setOpen] = React.useState(!!isVisible);
  const [code, setCode] = React.useState(initialCode);
  const [nodeName, setNodeName] = React.useState(initialName);
  const [conditionalEdge, setConditionalEdge] = React.useState(
    !!initialConditionalEdge
  );
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

  React.useEffect(() => {
    if (isVisible) {
      setConditionalEdge(!!initialConditionalEdge);
    }
  }, [initialConditionalEdge, isVisible]);

  const isTextEditor = editorType === "text";
  const editorLanguage = language ?? "python";

  const handleSave = async () => {
    const result = await onSave?.(code, nodeName, conditionalEdge);
    if (result === false) {
      return;
    }
    onClose?.();
  };

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        open &&
        (event.ctrlKey || event.metaKey) &&
        event.key === "s"
      ) {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleSave]);

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
              placeholder={namePlaceholder ?? nameLabel}
            />
            {showConditionalEdge && (
              <FormControlLabel
                sx={{ marginLeft: "3.5rem", marginTop: "1.25rem" }}
                control={
                  <Checkbox
                    checked={conditionalEdge}
                    onChange={(e) => setConditionalEdge(e.target.checked)}
                  />
                }
                label="Conditional Edge"
              />
            )}
          </div>
          {isTextEditor ? (
            <TextField
              label={contentLabel}
              variant="outlined"
              margin="normal"
              fullWidth
              multiline
              minRows={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={textPlaceholder}
              sx={{ marginBottom: "1rem" }}
            />
          ) : (
            <div style={{ height: "300px", marginBottom: "1rem" }}>
              <Editor
                height="100%"
                defaultLanguage={editorLanguage}
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
          )}
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
