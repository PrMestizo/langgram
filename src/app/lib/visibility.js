export const Visibility = {
  PRIVATE: "PRIVATE",
  UNLISTED: "UNLISTED",
  PUBLIC: "PUBLIC",
};

const visibilityValues = new Set(Object.values(Visibility));

export function splitPublicationFields(payload = {}) {
  const {
    visibility,
    isGlobal,
    showInStore,
    showInSidebar,
    ...rest
  } = payload ?? {};

  return {
    rest,
    controls: { visibility, isGlobal, showInStore, showInSidebar },
  };
}

export function resolvePublicationState({
  controls = {},
  existing = {},
  isAdmin = false,
  isOwner = false,
}) {
  const errors = [];

  let finalVisibility = existing?.visibility ?? Visibility.PRIVATE;
  let finalIsGlobal = existing?.isGlobal ?? false;
  let finalShowInStore = existing?.showInStore ?? false;
  let finalShowInSidebar = existing?.showInSidebar ?? false;

  if (
    typeof controls.visibility !== "undefined" &&
    controls.visibility !== null
  ) {
    if (typeof controls.visibility !== "string") {
      errors.push("Invalid visibility value");
    } else if (!visibilityValues.has(controls.visibility)) {
      errors.push("Unknown visibility value");
    } else {
      finalVisibility = controls.visibility;
    }
  }

  if (typeof controls.isGlobal !== "undefined") {
    if (!isAdmin) {
      if (controls.isGlobal !== finalIsGlobal) {
        errors.push("Only administrators can change global ownership");
      }
    } else {
      finalIsGlobal = Boolean(controls.isGlobal);
    }
  }

  if (typeof controls.showInStore !== "undefined") {
    if (!isAdmin && !isOwner) {
      if (controls.showInStore !== finalShowInStore) {
        errors.push("You cannot change store visibility for this resource");
      }
    } else {
      finalShowInStore = Boolean(controls.showInStore);
      if (finalShowInStore) {
        finalVisibility = Visibility.PUBLIC;
      }
    }
  }

  if (typeof controls.showInSidebar !== "undefined") {
    if (!isAdmin) {
      if (controls.showInSidebar !== finalShowInSidebar) {
        errors.push("Only administrators can modify sidebar visibility");
      }
    } else {
      finalShowInSidebar = Boolean(controls.showInSidebar);
    }
  }

  if (errors.length) {
    return { errors };
  }

  if (finalVisibility === Visibility.UNLISTED) {
    finalShowInStore = false;
    finalShowInSidebar = false;
  }

  if (finalVisibility !== Visibility.PUBLIC) {
    finalShowInStore = false;
  }

  if (!finalIsGlobal) {
    finalShowInSidebar = false;
  }

  if (finalShowInSidebar) {
    if (!finalIsGlobal || finalVisibility !== Visibility.PUBLIC) {
      return {
        errors: [
          "Sidebar items must be global and public before they can be featured",
        ],
      };
    }
  }

  if (finalShowInStore && finalVisibility !== Visibility.PUBLIC) {
    finalVisibility = Visibility.PUBLIC;
  }

  return {
    publication: {
      visibility: finalVisibility,
      isGlobal: finalIsGlobal,
      showInStore: finalShowInStore,
      showInSidebar: finalShowInSidebar,
    },
  };
}
