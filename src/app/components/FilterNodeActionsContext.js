"use client";

import { createContext, useContext } from "react";

const FilterNodeActionsContext = createContext({
  onEditFilter: null,
  onOpenContextMenu: null,
  onApplyFilter: null,
  onSelectFilter: null,
});

export const useFilterNodeActions = () => useContext(FilterNodeActionsContext);

export default FilterNodeActionsContext;
